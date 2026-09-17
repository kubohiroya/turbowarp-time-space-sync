import type {CameraLease} from '../camera/camera-source.js';
import {readCaptureConditions, requireCameraSource} from '../camera/camera-source.js';
import type {SessionClock} from '../clock/index.js';
import {
  OPTICAL_TIME_OBSERVATION_SCHEMA,
  OPTICAL_TIME_OBSERVATION_VERSION,
  TimeSpaceSyncError,
  errorCodeOf,
  type CapturedFrame,
  type ClockDomain,
  type FramePumpPort,
  type OpticalTimeObservation,
  type TimeSpaceSyncErrorCode
} from '../contracts/index.js';
import {CellLevels} from './cell-levels.js';
import {PanelRangeAccumulator, type PanelDetectionFailure} from './panel-detector.js';
import {patternTimestampUs} from './pattern.js';
import {
  minimumObservationUs,
  requireUsableProfile,
  wrapUs,
  type PatternProfile
} from './pattern-profile.js';
import {patternCellRects, sampleCells, type PanelRect} from './sampling.js';
import type {Quad} from './homography.js';
import {sampleCellsThroughQuad} from './quad-sampling.js';

export type OpticalTimeState =
  | 'idle'
  | 'acquiring-camera'
  | 'calibrating'
  | 'ready'
  | 'error';

export interface OpticalTimeStartOptions {
  readonly cameraId: string;
  readonly referenceId: string;
  readonly calibrationSeconds: number;
  /**
   * The refresh interval of the display showing the pattern, and how well it is
   * known.
   *
   * Supplied rather than assumed. It sets how long each code stays on screen,
   * which is the whole width of the constraint an observation carries, and
   * guessing 60 Hz for a projector running at 50 would bias every result
   * without anything in the output saying so.
   */
  readonly displayRefreshUs: number;
  readonly refreshUncertaintyUs: number;
  readonly displayDomain?: ClockDomain;
  readonly intrinsicProfileId?: string;
}

/**
 * How a delivered frame's reading related to the one before it.
 *
 * `continuous` is the only answer that says anything about the reading being
 * right: the check bits pass for some misreads, and a reading with no recent
 * predecessor has nothing to be compared against, so `first-reading` is
 * neither confirmation nor refusal.
 */
export type ReadingContinuity = 'no-reading' | 'first-reading' | 'continuous' | 'discontinuous';

/** One frame the running decoder handled, for work that needs the same frame. */
export interface DecodedFrame {
  readonly frame: CapturedFrame;
  /** The panel square in analysis pixels, starting at the display's top-left. */
  readonly quad: Quad;
  readonly analysisWidth: number;
  readonly analysisHeight: number;
  readonly continuity: ReadingContinuity;
}

/**
 * Something following the decoder frame by frame.
 *
 * `ended` is called once when the frames stop meaning what they meant --
 * the decoder stopped, failed, or started calibrating again and may find the
 * panel somewhere else -- and nothing more is delivered after it.
 */
export interface DecodedFrameListener {
  frame(event: DecodedFrame): void;
  ended(error: TimeSpaceSyncError): void;
}

export interface OpticalTimeControllerOptions {
  readonly runtime: TurboWarpRuntime;
  readonly clock: SessionClock;
  readonly profile: PatternProfile;
  readonly createFramePump: (lease: CameraLease) => FramePumpPort;
  readonly wait?: (milliseconds: number) => Promise<void>;
  readonly analysisWidth?: number;
  readonly analysisHeight?: number;
  /** How long an observation stays in the window, in microseconds. */
  readonly observationWindowUs?: number;
  /** Hard cap on retained observations, to bound memory. */
  readonly observationLimit?: number;
  readonly minimumDecodeRate?: number;
  readonly minimumContrast?: number;
}

const DEFAULT_ANALYSIS_WIDTH = 240;
const DEFAULT_ANALYSIS_HEIGHT = 180;
/**
 * A time window, not a count.
 *
 * The extraction source kept 600 observations. How long that spans depends on
 * the decode rate, so at 30 fps the same setting covered 22 seconds when
 * reading well and about 100 seconds when reading poorly: the same API
 * averaging over quite different stretches of time, with nothing saying which.
 */
const DEFAULT_OBSERVATION_WINDOW_US = 30_000_000;
const DEFAULT_OBSERVATION_LIMIT = 2000;
const DEFAULT_MINIMUM_DECODE_RATE = 0.2;
const DEFAULT_MINIMUM_CONTRAST = 24;
const DECODE_RATE_WINDOW = 120;
const RANGE_PHASE_SHARE = 0.6;
const LEVELS_PHASE_SHARE = 1 - RANGE_PHASE_SHARE;
const CALIBRATION_MARGIN = 1.2;
const MAXIMUM_CALIBRATION_SECONDS = 60;

type CalibrationPhase = 'range' | 'levels';

interface Calibration {
  phase: CalibrationPhase;
  cancelled: boolean;
  operation: number;
  rangeDeadlineUs: number;
  levelsDeadlineUs: number;
  range: PanelRangeAccumulator;
  levels: CellLevels;
  rects: PanelRect[];
  quad: Quad | undefined;
  attempts: number;
  decodes: number;
  settle: (error?: Error) => void;
}

/**
 * Decodes the pattern out of one camera and publishes observations.
 *
 * Calibration runs in two phases against the live pattern: the first watches
 * which pixels change to locate the panel, the second learns each cell's levels
 * and checks that readings decode often enough to be worth measuring. Both
 * phases end on the monotonic clock, so neither a stalled camera nor a
 * re-estimated clock offset can leave the controller waiting.
 */
export class OpticalTimeController {
  private readonly runtime: TurboWarpRuntime;
  private readonly clock: SessionClock;
  private readonly profile: PatternProfile;
  private readonly createFramePump: (lease: CameraLease) => FramePumpPort;
  private readonly wait: (milliseconds: number) => Promise<void>;
  private readonly analysisWidth: number;
  private readonly analysisHeight: number;
  private readonly observationWindowUs: number;
  private readonly observationLimit: number;
  private readonly minimumDecodeRate: number;
  private readonly minimumContrast: number;
  private readonly observations: OpticalTimeObservation[] = [];
  private readonly recentDecodes: boolean[] = [];
  private readonly frameListeners = new Set<DecodedFrameListener>();
  private lease: CameraLease | undefined;
  private pump: FramePumpPort | undefined;
  private levels: CellLevels | undefined;
  private rects: PanelRect[] = [];
  private quad: Quad | undefined;
  private calibration: Calibration | undefined;
  private pipelineState: OpticalTimeState = 'idle';
  private code: TimeSpaceSyncErrorCode = '';
  private message = '';
  private start_: OpticalTimeStartOptions | undefined;
  /**
   * Distinguishes the run a late answer belongs to.
   *
   * Acquiring a camera is asynchronous. Without a token, a stop that lands
   * while the acquisition is still in flight is overwritten by the acquisition
   * finishing: the lease is stored, the pump starts, and a camera nobody asked
   * for goes on being held.
   */
  private operation = 0;
  private lastDecode: {code: number; monotonicAtUs: number} | undefined;
  private sequence = 0;
  private droppedObservations = 0;
  private rejectedObservations = 0;
  private lastDecodeMargin = 0;

  public constructor(options: OpticalTimeControllerOptions) {
    this.runtime = options.runtime;
    this.clock = options.clock;
    this.profile = requireUsableProfile(options.profile);
    this.createFramePump = options.createFramePump;
    this.wait = options.wait ?? defaultWait;
    this.analysisWidth = options.analysisWidth ?? DEFAULT_ANALYSIS_WIDTH;
    this.analysisHeight = options.analysisHeight ?? DEFAULT_ANALYSIS_HEIGHT;
    this.observationWindowUs = options.observationWindowUs ?? DEFAULT_OBSERVATION_WINDOW_US;
    this.observationLimit = options.observationLimit ?? DEFAULT_OBSERVATION_LIMIT;
    this.minimumDecodeRate = options.minimumDecodeRate ?? DEFAULT_MINIMUM_DECODE_RATE;
    this.minimumContrast = options.minimumContrast ?? DEFAULT_MINIMUM_CONTRAST;
  }

  public minimumCalibrationSeconds(): number {
    return (
      Math.ceil(
        (minimumObservationUs(this.profile) * CALIBRATION_MARGIN) / LEVELS_PHASE_SHARE / 100_000
      ) / 10
    );
  }

  public analysisSize(): {width: number; height: number} {
    return {width: this.analysisWidth, height: this.analysisHeight};
  }

  public state(): OpticalTimeState {
    return this.pipelineState;
  }

  public errorCode(): TimeSpaceSyncErrorCode {
    return this.code;
  }

  public errorMessage(): string {
    return this.message;
  }

  public cameraId(): string {
    return this.start_?.cameraId ?? '';
  }

  public referenceId(): string {
    return this.start_?.referenceId ?? '';
  }

  public patternProfile(): PatternProfile {
    return this.profile;
  }

  /** The panel square found by calibration, or undefined unless the decoder is ready. */
  public panelQuad(): Quad | undefined {
    return this.pipelineState === 'ready' ? this.quad : undefined;
  }

  /** The video element frames are drawn from, while a camera is held. */
  public frameElement(): HTMLVideoElement | undefined {
    return this.lease?.getFrameSource().element;
  }

  /**
   * Follows the running decoder frame by frame.
   *
   * Refused unless the decoder is ready: before then there is no calibrated
   * panel for a follower to rely on. Returns the function that stops following.
   */
  public observeFrames(listener: DecodedFrameListener): () => void {
    if (this.pipelineState !== 'ready' || !this.quad) {
      throw new TimeSpaceSyncError(
        'decoder-not-running',
        'The optical time decoder must be running and calibrated first.'
      );
    }
    this.frameListeners.add(listener);
    return () => {
      this.frameListeners.delete(listener);
    };
  }

  public decodeRate(): number {
    if (this.recentDecodes.length === 0) return 0;
    return this.recentDecodes.filter((value) => value).length / this.recentDecodes.length;
  }

  public decodeMargin(): number {
    return this.lastDecodeMargin;
  }

  public droppedCount(): number {
    return this.droppedObservations;
  }

  /** Readings thrown out for disagreeing with the clock rather than failing to decode. */
  public rejectedCount(): number {
    return this.rejectedObservations;
  }

  public pendingObservations(): number {
    this.expire();
    return this.observations.length;
  }

  public takeObservation(): OpticalTimeObservation | undefined {
    this.expire();
    return this.observations.shift();
  }

  public drainObservations(): OpticalTimeObservation[] {
    this.expire();
    return this.observations.splice(0, this.observations.length);
  }

  public async start(options: OpticalTimeStartOptions): Promise<void> {
    await this.stop();
    const token = (this.operation += 1);
    const cameraId = options.cameraId.trim();
    const referenceId = options.referenceId.trim();
    if (!cameraId) {
      this.fail('camera-unavailable', new Error('Camera ID must not be empty.'));
    }
    if (!referenceId) {
      this.fail('reference-unknown', new Error('A reference ID must not be empty.'));
    }
    this.requireCalibrationSeconds(options.calibrationSeconds);
    this.requireDisplayTiming(options);
    this.start_ = {...options, cameraId, referenceId};
    this.pipelineState = 'acquiring-camera';
    this.code = '';
    this.message = '';
    let lease: CameraLease;
    try {
      lease = await requireCameraSource(this.runtime).acquireCamera({
        owner: 'time-space-sync',
        cameraId
      });
    } catch (error) {
      if (this.operation !== token) return;
      this.fail('camera-unavailable', error);
    }
    if (this.operation !== token) {
      // The run was cancelled while the camera was being acquired. Nothing here
      // will ever use this lease, and holding it would keep the device open for
      // the rest of the session.
      await lease.release().catch(() => undefined);
      return;
    }
    this.lease = lease;
    const pump = this.createFramePump(lease);
    this.pump = pump;
    pump.start((frame) => this.consume(frame));
    await this.runCalibration(options.calibrationSeconds, token);
  }

  public async recalibrate(seconds: number): Promise<void> {
    if (!this.pump) {
      this.fail(
        'camera-unavailable',
        new Error('Start the decoder before calibrating.')
      );
    }
    await this.runCalibration(seconds, this.operation);
  }

  public async stop(): Promise<void> {
    this.operation += 1;
    this.endFrameListeners('Optical time decoding stopped.');
    const calibration = this.calibration;
    if (calibration) {
      calibration.cancelled = true;
      calibration.settle(new Error('Optical time decoding stopped.'));
    }
    this.calibration = undefined;
    this.pump?.stop();
    this.pump = undefined;
    const lease = this.lease;
    this.lease = undefined;
    this.levels = undefined;
    this.rects = [];
    this.quad = undefined;
    this.observations.length = 0;
    this.recentDecodes.length = 0;
    this.lastDecode = undefined;
    this.start_ = undefined;
    if (this.pipelineState !== 'error') {
      this.pipelineState = 'idle';
      this.code = '';
      this.message = '';
    }
    if (lease) await lease.release().catch(() => undefined);
  }

  private requireCalibrationSeconds(seconds: number): void {
    const minimum = this.minimumCalibrationSeconds();
    if (!Number.isFinite(seconds) || seconds < minimum || seconds > MAXIMUM_CALIBRATION_SECONDS) {
      this.fail(
        'invalid-duration',
        new Error(
          `Calibration must run between ${minimum} and ${MAXIMUM_CALIBRATION_SECONDS} seconds so that every pattern cell changes at least once.`
        )
      );
    }
  }

  private requireDisplayTiming(options: OpticalTimeStartOptions): void {
    if (!Number.isFinite(options.displayRefreshUs) || options.displayRefreshUs <= 0) {
      this.fail(
        'invalid-duration',
        new Error('The display refresh interval must be a positive number of microseconds.')
      );
    }
    if (!Number.isFinite(options.refreshUncertaintyUs) || options.refreshUncertaintyUs < 0) {
      this.fail(
        'invalid-duration',
        new Error('The refresh uncertainty must not be negative.')
      );
    }
  }

  private async runCalibration(seconds: number, token: number): Promise<void> {
    this.requireCalibrationSeconds(seconds);
    // A follower was relying on the panel where calibration last found it.
    this.endFrameListeners('The optical time decoder started calibrating again.');
    this.pipelineState = 'calibrating';
    this.code = '';
    this.message = '';
    this.levels = undefined;
    this.rects = [];
    this.quad = undefined;
    this.observations.length = 0;
    this.recentDecodes.length = 0;
    this.lastDecode = undefined;
    // Deadlines run on the monotonic clock. On the shared one a re-estimated
    // offset can move them, ending a phase the moment it starts or pushing it
    // beyond reach.
    const startUs = this.clock.monotonic().nowUs();
    const totalUs = seconds * 1_000_000;
    const finished = new Promise<void>((resolve, reject) => {
      this.calibration = {
        phase: 'range',
        cancelled: false,
        operation: token,
        rangeDeadlineUs: startUs + totalUs * RANGE_PHASE_SHARE,
        levelsDeadlineUs: startUs + totalUs,
        range: new PanelRangeAccumulator(this.analysisWidth, this.analysisHeight),
        levels: new CellLevels(this.profile),
        rects: [],
        quad: undefined,
        attempts: 0,
        decodes: 0,
        settle: (error) => {
          this.calibration = undefined;
          if (error) reject(error);
          else resolve();
        }
      };
    });
    const pending = this.calibration;
    void this.wait(seconds * 1000 + 2000).then(() => {
      if (this.calibration !== pending) return;
      pending?.settle(new Error('The camera stopped delivering frames while calibrating.'));
    });
    try {
      await finished;
    } catch (error) {
      // Stopping is not a failure: `stop` settles the pending calibration, and
      // reporting that as a camera fault would leave the decoder stuck in the
      // error state after an ordinary stop or a project halt.
      if (pending?.cancelled) return;
      this.fail(this.code || 'camera-ended', error);
    }
  }

  private consume(frame: CapturedFrame): void {
    try {
      this.consumeFrame(frame);
    } catch (error) {
      // Without this the exception escapes the frame callback, where nothing is
      // waiting for it, and the calibration hangs until its watchdog fires with
      // the real reason already lost.
      const calibration = this.calibration;
      this.code = errorCodeOf(error);
      if (calibration) {
        calibration.settle(error instanceof Error ? error : new Error(String(error)));
        return;
      }
      this.pipelineState = 'error';
      this.message = error instanceof Error ? error.message : String(error);
      this.endFrameListeners(this.message);
    }
  }

  private consumeFrame(frame: CapturedFrame): void {
    const calibration = this.calibration;
    if (calibration) {
      this.calibrateWith(calibration, frame);
      return;
    }
    if (this.pipelineState !== 'ready') return;
    const levels = this.levels;
    const start = this.start_;
    if (!levels || !start) return;
    const samples = this.sample(frame.luminance);
    if (!samples) {
      this.recordDecodeAttempt(false);
      this.notifyFrame(frame, 'no-reading');
      return;
    }
    const code = levels.decode(samples);
    this.lastDecodeMargin = levels.decodeMargin(samples);
    this.recordDecodeAttempt(code !== undefined);
    if (code === undefined) {
      this.notifyFrame(frame, 'no-reading');
      return;
    }
    const continuity = this.continuityOf(code, frame);
    if (continuity === 'discontinuous') {
      this.rejectedObservations += 1;
      this.notifyFrame(frame, continuity);
      return;
    }
    levels.track(samples);
    this.observations.push(this.observationFor(code, frame, start, levels, samples));
    this.expire();
    this.notifyFrame(frame, continuity);
  }

  private notifyFrame(frame: CapturedFrame, continuity: ReadingContinuity): void {
    const quad = this.quad;
    if (!quad || this.frameListeners.size === 0) return;
    const event: DecodedFrame = {
      frame,
      quad,
      analysisWidth: this.analysisWidth,
      analysisHeight: this.analysisHeight,
      continuity
    };
    for (const listener of [...this.frameListeners]) {
      // A follower's failure is its own. Letting it escape would stop the
      // decoder over work the decoder was never asked to do.
      try {
        listener.frame(event);
      } catch {
        // The follower is expected to settle itself; nothing to do here.
      }
    }
  }

  private endFrameListeners(message: string): void {
    if (this.frameListeners.size === 0) return;
    const listeners = [...this.frameListeners];
    this.frameListeners.clear();
    const error = new TimeSpaceSyncError('decoder-not-running', message);
    for (const listener of listeners) {
      try {
        listener.ended(error);
      } catch {
        // As above: ending is the follower's to handle.
      }
    }
  }

  /**
   * Rejects a decode that cannot follow the previous one in real time.
   *
   * The check bits are a fold of the counter onto itself and therefore linear,
   * so 255 of the 4095 non-zero data error patterns pass them; a frozen panel
   * decodes perfectly as well. Comparing successive codes against the elapsed
   * time on this computer's own clock catches both, and needs no agreement with
   * any other clock to do it.
   */
  private continuityOf(code: number, frame: CapturedFrame): ReadingContinuity {
    const previous = this.lastDecode;
    this.lastDecode = {code, monotonicAtUs: frame.monotonicAtUs};
    if (!previous) return 'first-reading';
    const elapsedUs = frame.monotonicAtUs - previous.monotonicAtUs;
    if (elapsedUs <= 0) return 'first-reading';
    const wrap = wrapUs(this.profile);
    if (elapsedUs >= wrap / 2) return 'first-reading';
    const advanced =
      patternTimestampUs(code, this.profile) - patternTimestampUs(previous.code, this.profile);
    // Folded to the half period nearest zero, so a reading that went slightly
    // backwards stays slightly negative instead of becoming an outlier just
    // under a full wrap.
    const half = wrap / 2;
    const signed = ((((advanced + half) % wrap) + wrap) % wrap) - half;
    // The pattern advances with real time, so the two must agree to within the
    // display's quantisation and a little scheduling jitter. Too much is an
    // impossible jump; too little is a panel that has stopped updating, which
    // decodes perfectly and reports a stale time.
    // One refresh covers the quantisation of two refresh-aligned readings; the
    // stated uncertainty covers the display's own prediction. Frame timestamp
    // jitter beyond that costs an occasional good sample, which is the side to
    // err on: a rejected reading costs one measurement, an accepted stale one
    // costs correctness.
    const allowance =
      (this.start_?.displayRefreshUs ?? 0) + (this.start_?.refreshUncertaintyUs ?? 0);
    return Math.abs(signed - elapsedUs) <= allowance ? 'continuous' : 'discontinuous';
  }

  private observationFor(
    code: number,
    frame: CapturedFrame,
    start: OpticalTimeStartOptions,
    levels: CellLevels,
    samples: readonly number[]
  ): OpticalTimeObservation {
    const panel = this.panelRect();
    const conditions = this.lease
      ? readCaptureConditions(this.lease.getFrameSource().element)
      : {};
    this.sequence += 1;
    return {
      schema: OPTICAL_TIME_OBSERVATION_SCHEMA,
      version: OPTICAL_TIME_OBSERVATION_VERSION,
      cameraId: start.cameraId,
      referenceId: start.referenceId,
      patternProfileId: this.profile.id,
      observerDomain: this.clock.domain(),
      displayDomain: start.displayDomain ?? null,
      deliveredAtUs: frame.deliveredAtUs,
      monotonicAtUs: frame.monotonicAtUs,
      ...(frame.captureTimeUs === undefined ? {} : {captureTimeUs: frame.captureTimeUs}),
      captureTimeKind: frame.captureTimeKind,
      patternCodeTimestampUs: patternTimestampUs(code, this.profile),
      wrapUs: wrapUs(this.profile),
      stepUs: this.profile.stepUs,
      displayRefreshUs: start.displayRefreshUs,
      refreshUncertaintyUs: start.refreshUncertaintyUs,
      ...this.constraintFor(frame),
      decodeMargin: levels.decodeMargin(samples),
      panel,
      imageWidth: this.analysisWidth,
      imageHeight: this.analysisHeight,
      captureConditions: conditions,
      ...(start.intrinsicProfileId === undefined
        ? {}
        : {intrinsicProfileId: start.intrinsicProfileId}),
      sequence: this.sequence
    };
  }

  /**
   * The window the capture instant is known to lie in, on the observer's clock.
   *
   * The frame existed by the time it was delivered, which is the upper bound.
   * When the browser reported a capture time that is the lower bound; when it
   * did not, the bound is set as wide as the wrap period can resolve, so the
   * observation constrains an estimate only through its upper bound. Choosing a
   * narrower figure would mean inventing a latency the run never measured.
   */
  private constraintFor(frame: CapturedFrame): {
    constraintLoUs: number;
    constraintHiUs: number;
  } {
    const hi = frame.deliveredAtUs;
    const lo =
      frame.captureTimeUs !== undefined
        ? Math.min(frame.captureTimeUs, hi - 1)
        : hi - Math.floor(wrapUs(this.profile) / 2);
    return {constraintLoUs: lo, constraintHiUs: hi};
  }

  private panelRect(): PanelRect {
    const first = this.rects[0];
    const last = this.rects[this.rects.length - 1];
    if (!first || !last) return {x: 0, y: 0, width: this.analysisWidth, height: this.analysisHeight};
    return {
      x: first.x,
      y: first.y,
      width: last.x + last.width - first.x,
      height: last.y + last.height - first.y
    };
  }

  private expire(): void {
    const cutoff = this.clock.monotonic().nowUs() - this.observationWindowUs;
    while (this.observations.length > 0 && (this.observations[0]?.monotonicAtUs ?? 0) < cutoff) {
      this.observations.shift();
      this.droppedObservations += 1;
    }
    while (this.observations.length > this.observationLimit) {
      this.observations.shift();
      this.droppedObservations += 1;
    }
  }

  private calibrateWith(calibration: Calibration, frame: CapturedFrame): void {
    const now = this.clock.monotonic().nowUs();
    if (calibration.phase === 'range') {
      calibration.range.add(frame.luminance);
      if (now < calibration.rangeDeadlineUs) return;
      const detection = calibration.range.detect(this.profile);
      if (!detection.ok) {
        this.code = codeForDetectionFailure(detection.reason);
        calibration.settle(new Error(messageForDetectionFailure(detection.reason)));
        return;
      }
      calibration.rects = patternCellRects(detection.panel, this.profile);
      calibration.quad = detection.quad;
      calibration.phase = 'levels';
      return;
    }
    const samples = this.sampleWith(frame.luminance, calibration.rects, calibration.quad);
    if (!samples) return;
    calibration.levels.add(samples);
    calibration.attempts += 1;
    if (calibration.levels.decode(samples) !== undefined) calibration.decodes += 1;
    if (now < calibration.levelsDeadlineUs) return;
    if (calibration.levels.contrast() < this.minimumContrast) {
      this.code = 'low-contrast';
      calibration.settle(new Error('The pattern is too dim or too washed out to read.'));
      return;
    }
    const rate = calibration.attempts === 0 ? 0 : calibration.decodes / calibration.attempts;
    if (rate < this.minimumDecodeRate) {
      this.code = this.exposureIsTooLong() ? 'exposure-too-long' : 'decode-unstable';
      calibration.settle(new Error(this.decodeRateMessage(rate)));
      return;
    }
    this.levels = calibration.levels;
    this.rects = calibration.rects;
    this.quad = calibration.quad;
    this.recentDecodes.length = 0;
    this.pipelineState = 'ready';
    this.code = '';
    this.message = '';
    calibration.settle();
  }

  /**
   * Whether the camera's exposure can explain the failures on its own.
   *
   * A reading only decodes when the whole exposure falls inside one displayed
   * code, so the achievable rate is roughly `1 - exposure / refresh`. Saying so
   * turns an unactionable "unstable" into a specific instruction.
   */
  private exposureIsTooLong(): boolean {
    const exposure = this.lease
      ? readCaptureConditions(this.lease.getFrameSource().element).exposureTimeUs
      : undefined;
    const refresh = this.start_?.displayRefreshUs;
    return exposure !== undefined && refresh !== undefined && exposure > refresh;
  }

  private decodeRateMessage(rate: number): string {
    const percent = Math.round(rate * 100);
    if (this.exposureIsTooLong()) {
      return `Only ${percent}% of frames decoded: the camera's exposure is longer than one display refresh, so most exposures span two codes.`;
    }
    return `Only ${percent}% of the frames decoded during calibration.`;
  }

  /**
   * Reads the cells the way the profile asks for.
   *
   * The grid path divides the panel's bounding box evenly, which the extraction
   * source did and which only holds for a square-on, undistorted view. The quad
   * path maps the panel's own corners, so a tilted camera or a keystoned
   * projection reads the cell it is aiming at rather than part of its
   * neighbour.
   */
  private sample(frame: CapturedFrame['luminance']): number[] | undefined {
    return this.sampleWith(frame, this.rects, this.quad);
  }

  private sampleWith(
    frame: CapturedFrame['luminance'],
    rects: readonly PanelRect[],
    quad: Quad | undefined
  ): number[] | undefined {
    if (this.profile.sampling === 'quad') {
      return quad ? sampleCellsThroughQuad(frame, quad, this.profile) : undefined;
    }
    return sampleCells(frame, rects);
  }

  private recordDecodeAttempt(decoded: boolean): void {
    this.recentDecodes.push(decoded);
    while (this.recentDecodes.length > DECODE_RATE_WINDOW) this.recentDecodes.shift();
  }

  private fail(code: TimeSpaceSyncErrorCode, error: unknown): never {
    this.pipelineState = 'error';
    this.code = code;
    this.message = error instanceof Error ? error.message : String(error);
    this.endFrameListeners(this.message);
    this.pump?.stop();
    this.pump = undefined;
    const lease = this.lease;
    this.lease = undefined;
    if (lease) void lease.release().catch(() => undefined);
    throw error instanceof TimeSpaceSyncError
      ? error
      : new TimeSpaceSyncError(code, this.message, {cause: error});
  }
}

function codeForDetectionFailure(reason: PanelDetectionFailure): TimeSpaceSyncErrorCode {
  return reason === 'ambiguous' ? 'ambiguous-panel' : 'panel-not-found';
}

function messageForDetectionFailure(reason: PanelDetectionFailure): string {
  switch (reason) {
    case 'ambiguous':
      return 'More than one flickering panel is in view, so which one was read would not be recorded.';
    case 'too-small':
      return 'The pattern is too small in the camera image to sample its cells.';
    case 'wrong-shape':
      return 'The changing region is not shaped like the pattern panel.';
    case 'not-solid':
      return 'The changing region is not solid enough to be the pattern panel.';
    case 'too-few-frames':
      return 'The camera delivered too few frames to locate the pattern.';
    default:
      return 'No pattern was found in the camera image.';
  }
}

function defaultWait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
