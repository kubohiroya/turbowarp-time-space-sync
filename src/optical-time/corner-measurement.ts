import {
  TimeSpaceSyncError,
  errorCodeOf,
  type MonotonicClockPort,
  type TimeSpaceSyncErrorCode
} from '../contracts/index.js';
import type {DecodedFrame, DecodedFrameListener} from './controller.js';
import {
  COARSE_CORNER_UNCERTAINTY_ANALYSIS_PX,
  refinePanelCorners,
  sourceQuadFromAnalysis,
  type CornerFailure,
  type RegionReader
} from './corner-refinement.js';
import type {Point} from './homography.js';
import type {PatternProfile} from './pattern-profile.js';

/**
 * Measuring the panel's outer corners over a stretch of frames.
 *
 * One frame's corners carry that frame's noise, and a single bad frame -- a
 * compression block across an edge, a person's hand -- carries a bad corner. A
 * per-coordinate median over many frames is unmoved by a minority of bad
 * frames, and the spread of the frames around it is published so a consumer
 * can see how steady the view actually was.
 */

/**
 * Fewest frames whose four corners all refined.
 *
 * Fifteen is half a second at 30 fps or a second at 15 fps. A median of fifteen
 * tolerates seven arbitrarily bad frames, and averaging brings per-frame noise
 * down by a factor of three or so, which is what takes a corner that is good to
 * a few tenths of a pixel per frame to about a tenth.
 */
export const MINIMUM_CORNER_FRAMES = 15;
/**
 * Largest RMS distance of per-frame corners from the aggregate, in pixels.
 *
 * The placement solve assumes a corner is placed to about half a pixel
 * (DEFAULT_IMAGE_SIGMA_PX). Per-frame corners from a steady camera scatter by
 * well under that. A spread beyond it means the corners moved during the
 * window -- the camera was knocked, the projector is vibrating, auto-focus was
 * hunting -- and the median is then an average of two places, not either of
 * them.
 */
export const MAXIMUM_CORNER_SPREAD_PX = 0.5;
/**
 * Readings that must be confirmed by the one before them.
 *
 * The corner names come from the decoder's cell order, so they are only right
 * if the decoder is reading the panel the right way round. A turned view fails
 * every code; a mirrored one passes the pairs and check bits for one code in
 * eight, but those readings do not advance with real time. Requiring readings
 * that do, and more of them than readings that do not, is what makes `tl` the
 * display's top-left rather than whichever corner the image put first.
 */
export const MINIMUM_CONTINUOUS_READINGS = 3;
export const MINIMUM_CORNER_SECONDS = 1;
export const MAXIMUM_CORNER_SECONDS = 60;
/** How long past the window to wait for a frame before calling the camera stopped. */
const WATCHDOG_GRACE_MS = 2000;

export interface CornerFrameSource {
  observeFrames(listener: DecodedFrameListener): () => void;
}

export interface CornerMeasurementOptions {
  readonly source: CornerFrameSource;
  readonly profile: PatternProfile;
  readonly seconds: number;
  /** The decoder's own monotonic clock, so the window cannot be moved by a re-estimated offset. */
  readonly clock: MonotonicClockPort;
  readonly createReader: () => DisposableRegionReader;
  /**
   * Arms the watchdog and returns what disarms it.
   *
   * Cancellable rather than a promise to wait on, so a measurement that ends
   * early leaves no timer behind holding it.
   */
  readonly schedule?: (callback: () => void, milliseconds: number) => () => void;
}

export interface DisposableRegionReader extends RegionReader {
  dispose(): void;
}

export interface PatternCornerMeasurement {
  /** Outer corners in source pixels, display orientation: tl, tr, br, bl. */
  readonly corners: readonly [Point, Point, Point, Point];
  readonly spreadPx: number;
  readonly frameCount: number;
  readonly rejectedFrameCount: number;
  /** Median delivery time of the frames used, on the observer's shared clock. */
  readonly capturedAtUs: number;
  readonly sourceWidth: number;
  readonly sourceHeight: number;
}

export type CornerMeasurementResult =
  | {readonly ok: true; readonly measurement: PatternCornerMeasurement}
  | {
      readonly ok: false;
      readonly code: TimeSpaceSyncErrorCode;
      readonly message: string;
      /** Present when the frames were gathered and only their agreement failed. */
      readonly spreadPx?: number;
    };

export interface RunningCornerMeasurement {
  readonly result: Promise<CornerMeasurementResult>;
  /** Settles the measurement as failed, releasing everything it holds. */
  cancel(code: TimeSpaceSyncErrorCode, message: string): void;
}

interface CornerSample {
  readonly corners: readonly Point[];
  readonly deliveredAtUs: number;
}

export function measurePatternCorners(options: CornerMeasurementOptions): RunningCornerMeasurement {
  let settle: (result: CornerMeasurementResult) => void = () => undefined;
  const result = new Promise<CornerMeasurementResult>((resolve) => {
    settle = resolve;
  });
  let settled = false;
  let unsubscribe: (() => void) | undefined;
  let reader: DisposableRegionReader | undefined;
  let disarm: (() => void) | undefined;

  const finish = (outcome: CornerMeasurementResult): void => {
    if (settled) return;
    settled = true;
    unsubscribe?.();
    unsubscribe = undefined;
    disarm?.();
    disarm = undefined;
    reader?.dispose();
    reader = undefined;
    settle(outcome);
  };
  const fail = (code: TimeSpaceSyncErrorCode, message: string, spreadPx?: number): void => {
    finish(spreadPx === undefined ? {ok: false, code, message} : {ok: false, code, message, spreadPx});
  };
  const running: RunningCornerMeasurement = {result, cancel: fail};

  const seconds = options.seconds;
  if (!Number.isFinite(seconds) || seconds < MINIMUM_CORNER_SECONDS || seconds > MAXIMUM_CORNER_SECONDS) {
    fail(
      'invalid-duration',
      `Corner measurement must run between ${MINIMUM_CORNER_SECONDS} and ${MAXIMUM_CORNER_SECONDS} seconds.`
    );
    return running;
  }
  if (options.profile.fiducials.length === 0) {
    // Without cells that are lit in every code there is no fixed corner to
    // measure: the panel's outline changes with the data.
    fail(
      'profile-without-fiducials',
      `Pattern profile ${options.profile.id} has no corner fiducials to measure.`
    );
    return running;
  }

  const deadlineUs = options.clock.nowUs() + seconds * 1_000_000;
  const samples: CornerSample[] = [];
  const failures = new Map<CornerFailure, number>();
  let rejected = 0;
  let continuous = 0;
  let discontinuous = 0;
  let size: {width: number; height: number} | undefined;

  const listener: DecodedFrameListener = {
    frame: (event) => {
      if (settled) return;
      try {
        take(event);
      } catch (error) {
        fail(errorCodeOf(error), error instanceof Error ? error.message : String(error));
      }
    },
    ended: (error) => fail(error.code, error.message)
  };

  const take = (event: DecodedFrame): void => {
    const {frame} = event;
    if (event.continuity === 'continuous') continuous += 1;
    if (event.continuity === 'discontinuous') discontinuous += 1;
    const source = {width: frame.sourceWidth, height: frame.sourceHeight};
    if (!size) size = source;
    if (size.width !== source.width || size.height !== source.height) {
      throw new TimeSpaceSyncError(
        'frame-size-mismatch',
        `The camera changed from ${size.width}x${size.height} to ${source.width}x${source.height} while the corners were being measured.`
      );
    }
    const analysis = {width: event.analysisWidth, height: event.analysisHeight};
    const quad = sourceQuadFromAnalysis(event.quad, analysis, source);
    const scale = Math.max(source.width / analysis.width, source.height / analysis.height);
    reader ??= options.createReader();
    const refined = refinePanelCorners(
      reader,
      quad,
      options.profile,
      source,
      COARSE_CORNER_UNCERTAINTY_ANALYSIS_PX * scale
    );
    if (refined.ok) {
      samples.push({corners: refined.corners, deliveredAtUs: frame.deliveredAtUs});
    } else {
      rejected += 1;
      failures.set(refined.reason, (failures.get(refined.reason) ?? 0) + 1);
    }
    if (options.clock.nowUs() >= deadlineUs) conclude();
  };

  const conclude = (): void => {
    if (samples.length < MINIMUM_CORNER_FRAMES || !size) {
      fail(
        'too-few-corner-frames',
        `Only ${samples.length} frames gave all four corners; ${MINIMUM_CORNER_FRAMES} are needed.${describeFailures(failures)}`
      );
      return;
    }
    if (continuous < MINIMUM_CONTINUOUS_READINGS || continuous < discontinuous) {
      fail(
        'orientation-unproven',
        `Only ${continuous} readings advanced with real time against ${discontinuous} that did not, so the panel may be seen turned over and its corners cannot be named.`
      );
      return;
    }
    const corners = [0, 1, 2, 3].map((index) => ({
      x: median(samples.map((sample) => (sample.corners[index] as Point).x)),
      y: median(samples.map((sample) => (sample.corners[index] as Point).y))
    }));
    let squares = 0;
    for (const sample of samples) {
      sample.corners.forEach((point, index) => {
        const aggregate = corners[index] as Point;
        squares += (point.x - aggregate.x) ** 2 + (point.y - aggregate.y) ** 2;
      });
    }
    const spreadPx = Math.sqrt(squares / (samples.length * 4));
    if (spreadPx > MAXIMUM_CORNER_SPREAD_PX) {
      fail(
        'corners-unstable',
        `The corners moved by ${spreadPx.toFixed(2)} px RMS during the measurement; at most ${MAXIMUM_CORNER_SPREAD_PX} px is accepted.`,
        spreadPx
      );
      return;
    }
    const delivered = samples.map((sample) => sample.deliveredAtUs).sort((a, b) => a - b);
    finish({
      ok: true,
      measurement: {
        corners: corners as unknown as readonly [Point, Point, Point, Point],
        spreadPx,
        frameCount: samples.length,
        rejectedFrameCount: rejected,
        // The lower middle rather than an average of the two middle values, so
        // the time is one a frame was actually delivered at.
        capturedAtUs: delivered[Math.floor((delivered.length - 1) / 2)] as number,
        sourceWidth: size.width,
        sourceHeight: size.height
      }
    });
  };

  try {
    unsubscribe = options.source.observeFrames(listener);
  } catch (error) {
    fail(errorCodeOf(error), error instanceof Error ? error.message : String(error));
    return running;
  }
  const schedule = options.schedule ?? defaultSchedule;
  disarm = schedule(() => {
    fail('camera-ended', 'The camera stopped delivering frames while the corners were being measured.');
  }, seconds * 1000 + WATCHDOG_GRACE_MS);
  // The listener may already have settled synchronously; the timer must not outlive it.
  if (settled) {
    disarm();
    disarm = undefined;
  }
  return running;
}

function describeFailures(failures: ReadonlyMap<CornerFailure, number>): string {
  if (failures.size === 0) return '';
  const worst = [...failures.entries()].sort((left, right) => right[1] - left[1])[0];
  return worst ? ` The most common refusal was ${worst[0]} (${worst[1]} frames).` : '';
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[middle] as number)
    : ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2;
}

function defaultSchedule(callback: () => void, milliseconds: number): () => void {
  const handle = setTimeout(callback, milliseconds);
  return () => clearTimeout(handle);
}
