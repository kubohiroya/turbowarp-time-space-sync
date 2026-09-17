import {featureFlags} from '../config/feature-flags.js';
import definitions from './block-definitions.json';
import {LocalMonotonicClock, SessionClock} from './clock/index.js';
import {extensionConfig} from './config.js';
import {
  TimeSpaceSyncError,
  errorCodeOf,
  isCurrent,
  type OpticalTimeObservation,
  type TimeCorrespondence,
  type TimeSpaceSyncErrorCode
} from './contracts/index.js';
import {
  OpticalTimeController,
  PATTERN_CORNER_IDS,
  PATTERN_PROFILE_V1,
  PATTERN_PROFILE_V2,
  PatternDisplay,
  VideoFramePump,
  VideoRegionReader,
  estimateTimeCorrespondence,
  measurePatternCorners,
  wrapUs,
  type DisposableRegionReader,
  type OpticalTimeStartOptions,
  type OpticalTimeState,
  type PatternProfile,
  type PhotosensitivityAcknowledgement,
  type RunningCornerMeasurement
} from './optical-time/index.js';
import {
  buildPatternReference,
  parseCameraModel,
  requireSupportedDistortion,
  solvePlacement,
  type CameraModelFor
} from './placement/index.js';
import {
  PLACEMENT_OBSERVATION_SCHEMA,
  PLACEMENT_VERSION,
  parsePlacementObservation,
  parseReferenceDefinition,
  type FramePumpPort,
  type PlacementObservation,
  type PlacementResult,
  type ReferenceDefinition
} from './contracts/index.js';
import {
  readCameraCalibration,
  readCaptureConditions,
  type CameraLease
} from './camera/camera-source.js';
import {
  createRuntimeCapability,
  runtimeCapabilityKey,
  type TimeSpaceSyncCapabilityV1
} from './runtime-capability.js';

type BlockTypeName = 'COMMAND' | 'REPORTER' | 'BOOLEAN';
type ArgumentTypeName = 'STRING' | 'NUMBER';
type FeatureName = 'opticalTimeSyncV1' | 'placementSolveV1';

interface DefinitionArgument {
  type: ArgumentTypeName;
  defaultValue: string | number;
}

interface BlockDefinition {
  opcode: string;
  feature: FeatureName;
  blockType: BlockTypeName;
  text: string;
  description: string;
  arguments: Record<string, DefinitionArgument>;
}

export interface TimeSpaceSyncExtensionOptions {
  readonly runtime?: TurboWarpRuntime;
  readonly opticalTimeEnabled?: boolean;
  readonly placementEnabled?: boolean;
  readonly profile?: PatternProfile;
  readonly clock?: SessionClock;
  readonly display?: PatternDisplay;
  readonly controller?: OpticalTimeController;
  /** Replaces the video frame pump, for running the decoder without a browser. */
  readonly createFramePump?: (lease: CameraLease, size: {width: number; height: number}) => FramePumpPort;
  /** Replaces the canvas that reads corner windows out of the video. */
  readonly createRegionReader?: (element: HTMLVideoElement | undefined) => DisposableRegionReader;
  /** Replaces the corner measurement's watchdog timer. */
  readonly schedule?: (callback: () => void, milliseconds: number) => () => void;
}

const blockDefinitions = definitions.blocks as readonly BlockDefinition[];
const ANALYSIS_WIDTH = 240;
const ANALYSIS_HEIGHT = 180;

/**
 * The profiles a project may choose between, by the id each one publishes.
 *
 * Listed explicitly rather than accepting a profile document: a display and a
 * decoder on different computers only agree if both chose from the same fixed
 * set, and an id is what travels in every observation.
 */
const PATTERN_PROFILES: ReadonlyMap<string, PatternProfile> = new Map(
  [PATTERN_PROFILE_V1, PATTERN_PROFILE_V2].map((profile) => [profile.id, profile])
);

export class TimeSpaceSyncExtension implements TurboWarpExtension {
  private readonly runtime: TurboWarpRuntime;
  private readonly opticalTimeEnabled: boolean;
  private readonly placementEnabled: boolean;
  private readonly defaultProfile: PatternProfile;
  private profile: PatternProfile;
  private profileErrorCode: TimeSpaceSyncErrorCode = '';
  private readonly clock: SessionClock;
  private readonly createFramePump:
    | ((lease: CameraLease, size: {width: number; height: number}) => FramePumpPort)
    | undefined;
  private readonly createRegionReader:
    | ((element: HTMLVideoElement | undefined) => DisposableRegionReader)
    | undefined;
  private readonly schedule: ((callback: () => void, milliseconds: number) => () => void) | undefined;
  /** Whether the display and controller were supplied, and so are not this object's to discard. */
  private readonly injectedDisplay: boolean;
  private readonly injectedController: boolean;
  private cornerMeasurement: RunningCornerMeasurement | undefined;
  private cornerObservation: PlacementObservation | undefined;
  private cornerErrorCode: TimeSpaceSyncErrorCode = '';
  private cornerSpread = 0;
  private display: PatternDisplay | undefined;
  private controller: OpticalTimeController | undefined;
  private acknowledgement: PhotosensitivityAcknowledgement | undefined;
  private observation: OpticalTimeObservation | undefined;
  private correspondence: TimeCorrespondence | undefined;
  private correspondenceError = '';
  private reference: ReferenceDefinition | undefined;
  private readonly placementObservations: PlacementObservation[] = [];
  private readonly cameraModels = new Map<string, CameraModelFor>();
  private placement: PlacementResult | undefined;
  private placementErrorCode = '';

  public constructor(options: TimeSpaceSyncExtensionOptions = {}) {
    this.runtime = options.runtime ?? Scratch.vm?.runtime ?? ({} as TurboWarpRuntime);
    this.opticalTimeEnabled = options.opticalTimeEnabled ?? featureFlags.opticalTimeSyncV1;
    this.placementEnabled = options.placementEnabled ?? featureFlags.placementSolveV1;
    this.defaultProfile = options.profile ?? PATTERN_PROFILE_V1;
    this.profile = this.defaultProfile;
    this.clock = options.clock ?? new SessionClock(new LocalMonotonicClock());
    this.display = options.display;
    this.controller = options.controller;
    this.injectedDisplay = options.display !== undefined;
    this.injectedController = options.controller !== undefined;
    this.createFramePump = options.createFramePump;
    this.createRegionReader = options.createRegionReader;
    this.schedule = options.schedule;
    this.publishCapability();
    this.watchRuntime();
  }

  public getInfo(): Record<string, unknown> {
    return {
      id: extensionConfig.id,
      name: Scratch.translate(definitions.extensionName),
      docsURI: extensionConfig.docsURI,
      blockIconURI: extensionConfig.blockIconURI,
      blocks: blockDefinitions
        .filter((block) => this.featureEnabled(block.feature))
        .map((block) => this.toScratchBlock(block))
    };
  }

  // Display ---------------------------------------------------------------

  public acknowledgePatternFlashing(): void {
    this.requireOpticalTime();
    this.acknowledgement = {
      acknowledgedByOperator: true,
      acknowledgedAtUs: this.clock.nowUs()
    };
  }

  public showTimePattern(): void {
    this.requireOpticalTime();
    this.requireDisplay().show();
  }

  public hideTimePattern(): void {
    this.display?.hide();
  }

  public timePatternShown(): boolean {
    return this.display?.visible() ?? false;
  }

  public timePatternStable(): boolean {
    return this.display?.stable() ?? false;
  }

  public timePatternRefreshUs(): number {
    return this.display?.refreshUs() ?? 0;
  }

  public timePatternWrapUs(): number {
    return wrapUs(this.profile);
  }

  public timePatternProfileId(): string {
    return this.profile.id;
  }

  /**
   * Chooses the pattern the display draws and the decoder reads.
   *
   * Only before either exists. A display already drawing one pattern, or a
   * decoder already calibrated against it, would otherwise carry on with the
   * old one while the reporter named the new one -- and a display and decoder
   * on different profiles decode nothing, with no error to say why. A refusal
   * changes nothing and leaves its reason in `time pattern profile error`.
   */
  public setTimePatternProfile(args: {PROFILE_ID: unknown}): void {
    this.requireOpticalTime();
    const id = Scratch.Cast.toString(args.PROFILE_ID).trim();
    const profile = PATTERN_PROFILES.get(id);
    if (!profile) {
      this.profileErrorCode = 'unknown-pattern-profile';
      return;
    }
    const inUse = [this.display?.patternProfile(), this.controller?.patternProfile()].find(
      (existing) => existing !== undefined && existing.id !== profile.id
    );
    if (inUse) {
      this.profileErrorCode = 'pattern-profile-in-use';
      return;
    }
    this.profile = profile;
    this.profileErrorCode = '';
  }

  public timePatternProfileError(): string {
    return this.profileErrorCode;
  }

  // Decoder ---------------------------------------------------------------

  public async startOpticalTimeDecoder(args: {
    CAMERA_ID: unknown;
    REFERENCE_ID: unknown;
    SECONDS: unknown;
    REFRESH_US: unknown;
  }): Promise<void> {
    this.requireOpticalTime();
    await this.requireController().start({
      cameraId: Scratch.Cast.toString(args.CAMERA_ID),
      referenceId: Scratch.Cast.toString(args.REFERENCE_ID),
      calibrationSeconds: Scratch.Cast.toNumber(args.SECONDS),
      displayRefreshUs: Math.round(Scratch.Cast.toNumber(args.REFRESH_US)),
      refreshUncertaintyUs: this.refreshUncertaintyUs()
    });
  }

  public async calibrateOpticalTimeDecoder(args: {SECONDS: unknown}): Promise<void> {
    this.requireOpticalTime();
    await this.requireController().recalibrate(Scratch.Cast.toNumber(args.SECONDS));
  }

  public async stopOpticalTimeDecoder(): Promise<void> {
    // The controller ends the measurement as it stops; cancelling here as well
    // covers a measurement whose decoder was never started by this object.
    this.cancelCornerMeasurement('The optical time decoder was stopped.');
    await this.controller?.stop();
    this.observation = undefined;
  }

  public opticalTimeDecoderState(): string {
    return this.controller?.state() ?? 'idle';
  }

  public opticalTimeDecoderError(): string {
    return this.controller?.errorCode() ?? '';
  }

  public opticalTimeDecodeRate(): number {
    return this.controller?.decodeRate() ?? 0;
  }

  public opticalTimeDecodeMargin(): number {
    return this.controller?.decodeMargin() ?? 0;
  }

  public opticalTimeObservationAvailable(): boolean {
    return (this.controller?.pendingObservations() ?? 0) > 0;
  }

  public opticalTimeObservationCount(): number {
    return this.controller?.pendingObservations() ?? 0;
  }

  public opticalTimeDroppedCount(): number {
    return this.controller?.droppedCount() ?? 0;
  }

  public opticalTimeRejectedCount(): number {
    return this.controller?.rejectedCount() ?? 0;
  }

  public takeOpticalTimeObservation(): void {
    this.observation = this.controller?.takeObservation();
  }

  public latestOpticalTimeObservationJson(): string {
    return this.observation ? JSON.stringify(this.observation) : '';
  }

  // Estimation -----------------------------------------------------------

  public estimateTimeCorrespondence(): void {
    this.requireOpticalTime();
    const controller = this.requireController();
    // Draining rather than peeking: an estimate is made from a stretch of
    // readings, and leaving them queued would let the next estimate count the
    // same ones again and report a confidence they do not support.
    const observations = controller.drainObservations();
    const result = estimateTimeCorrespondence(observations, {
      nowUs: this.clock.nowUs(),
      decodeRate: controller.decodeRate(),
      droppedCount: controller.droppedCount(),
      rejectedCount: controller.rejectedCount()
    });
    if (result.ok) {
      this.correspondence = result.correspondence;
      this.correspondenceError = '';
      return;
    }
    // The previous estimate is dropped rather than left standing: it describes
    // a stretch of time that has passed, and a reader asking again now is
    // asking about now.
    this.correspondence = undefined;
    this.correspondenceError = result.code;
  }

  public timeCorrespondenceJson(): string {
    return this.correspondence ? JSON.stringify(this.correspondence) : '';
  }

  public timeCorrespondenceError(): string {
    return this.correspondenceError;
  }

  public displayToTimestampDelayUs(): number {
    return this.correspondence?.displayToTimestampDelayUs ?? 0;
  }

  public timeCorrespondenceUncertaintyUs(): number {
    return this.correspondence?.uncertaintyUs ?? 0;
  }

  public timeCorrespondenceCurrent(): boolean {
    const correspondence = this.correspondence;
    return correspondence !== undefined && isCurrent(correspondence, this.clock.nowUs());
  }

  public opticalTimeMinimumCalibrationSeconds(): number {
    return this.requireController().minimumCalibrationSeconds();
  }

  // Placement -------------------------------------------------------------

  public defineReference(args: {REFERENCE_JSON: unknown}): void {
    this.requirePlacement();
    const parsed = parseReferenceDefinition(readJson(args.REFERENCE_JSON));
    if (!parsed.ok) {
      this.placementErrorCode = 'invalid-payload';
      return;
    }
    this.reference = parsed.value;
    this.placementErrorCode = '';
  }

  public addPlacementObservation(args: {OBSERVATION_JSON: unknown}): void {
    this.requirePlacement();
    const parsed = parsePlacementObservation(readJson(args.OBSERVATION_JSON));
    if (!parsed.ok) {
      this.placementErrorCode = 'invalid-payload';
      return;
    }
    // One observation per camera: a second look replaces the first rather than
    // being averaged with it, since the camera may have moved between them.
    const index = this.placementObservations.findIndex(
      (entry) => entry.cameraId === parsed.value.cameraId
    );
    if (index >= 0) this.placementObservations.splice(index, 1);
    this.placementObservations.push(parsed.value);
    this.placementErrorCode = '';
  }

  public setCameraModel(args: {CAMERA_ID: unknown; MODEL_JSON: unknown}): void {
    this.requirePlacement();
    const cameraId = Scratch.Cast.toString(args.CAMERA_ID).trim();
    if (!cameraId) {
      this.placementErrorCode = 'invalid-payload';
      return;
    }
    const parsed = parseCameraModel(readJson(args.MODEL_JSON));
    if (!parsed.ok) {
      this.placementErrorCode = parsed.code;
      return;
    }
    const model: CameraModelFor = {
      intrinsics: parsed.intrinsics,
      distortion: parsed.distortion,
      ...(parsed.intrinsicProfileId === undefined ? {} : {intrinsicProfileId: parsed.intrinsicProfileId}),
      ...(parsed.imageWidth === undefined ? {} : {imageWidth: parsed.imageWidth}),
      ...(parsed.imageHeight === undefined ? {} : {imageHeight: parsed.imageHeight})
    };
    try {
      // Refused when set rather than when solved, so the error names the block
      // that supplied the model.
      requireSupportedDistortion(model.distortion);
    } catch (error) {
      this.placementErrorCode = errorCodeOf(error);
      return;
    }
    this.cameraModels.set(cameraId, model);
    this.placementErrorCode = '';
  }

  /**
   * The camera model for `set camera model`, built from Camera Source's calibration.
   *
   * Camera Source's own `camera intrinsics JSON` gives the pinhole numbers
   * adapted to the current frame but leaves the distortion in the profile, so
   * the two are joined here, on the computer that holds both, along with the
   * profile id and frame size a solve checks observations against. Empty when
   * Camera Source publishes no calibration, has no profile for the camera, or
   * cannot adapt it to the frame being delivered.
   */
  public cameraModelJson(args: {CAMERA_ID: unknown}): string {
    const cameraId = Scratch.Cast.toString(args.CAMERA_ID).trim();
    const calibration = readCameraCalibration(this.runtime);
    const profile = calibration?.profileFor(cameraId);
    const intrinsics = calibration?.intrinsicsFor(cameraId);
    if (!profile || !intrinsics) return '';
    return JSON.stringify({
      intrinsics: {
        fx: intrinsics.fx,
        fy: intrinsics.fy,
        cx: intrinsics.cx,
        cy: intrinsics.cy,
        skew: intrinsics.skew
      },
      distortion: profile.distortion,
      intrinsicProfileId: profile.profileId,
      imageWidth: intrinsics.width,
      imageHeight: intrinsics.height
    });
  }

  // Pattern corners ------------------------------------------------------

  /**
   * Measures the pattern's four outer corners in this camera's full-resolution image.
   *
   * Needs the decoder running on a profile with corner fiducials, and a
   * calibration profile for the camera in Camera Source: an observation is
   * useless to a solve without the lens it was seen through. Never throws for a
   * failed measurement; the reason is left in `pattern corner error`, and the
   * previous observation is cleared so a stale one cannot be sent on as fresh.
   */
  public async measurePatternCorners(args: {SECONDS: unknown}): Promise<void> {
    this.requirePlacement();
    this.cancelCornerMeasurement('A new corner measurement replaced this one.');
    this.cornerObservation = undefined;
    this.cornerSpread = 0;
    this.cornerErrorCode = '';

    const controller = this.controller;
    if (!controller || controller.state() !== 'ready') {
      this.cornerErrorCode = 'decoder-not-running';
      return;
    }
    const profile = controller.patternProfile();
    if (profile.fiducials.length === 0) {
      this.cornerErrorCode = 'profile-without-fiducials';
      return;
    }
    const cameraId = controller.cameraId();
    const referenceId = controller.referenceId();
    const intrinsicProfile = readCameraCalibration(this.runtime)?.profileFor(cameraId);
    if (!intrinsicProfile) {
      this.cornerErrorCode = 'intrinsic-profile-missing';
      return;
    }

    const element = controller.frameElement();
    const running = measurePatternCorners({
      source: controller,
      profile,
      seconds: Scratch.Cast.toNumber(args.SECONDS),
      clock: this.clock.monotonic(),
      createReader: () =>
        this.createRegionReader
          ? this.createRegionReader(element)
          : new VideoRegionReader({element: requireElement(element)}),
      ...(this.schedule ? {schedule: this.schedule} : {})
    });
    this.cornerMeasurement = running;
    const result = await running.result;
    if (this.cornerMeasurement !== running) return;
    this.cornerMeasurement = undefined;
    if (!result.ok) {
      this.cornerErrorCode = result.code;
      this.cornerSpread = result.spreadPx ?? 0;
      return;
    }
    const {measurement} = result;
    this.cornerSpread = roundPixels(measurement.spreadPx);

    // Read again at the end: a profile replaced or made unusable during the
    // window would otherwise label these pixels with a lens they were not
    // measured through.
    const calibration = readCameraCalibration(this.runtime);
    const profileNow = calibration?.profileFor(cameraId);
    if (!profileNow) {
      this.cornerErrorCode = 'intrinsic-profile-missing';
      return;
    }
    const intrinsics = calibration?.intrinsicsFor(cameraId);
    if (
      profileNow.profileId !== intrinsicProfile.profileId ||
      !intrinsics ||
      intrinsics.width !== measurement.sourceWidth ||
      intrinsics.height !== measurement.sourceHeight
    ) {
      this.cornerErrorCode = 'intrinsic-profile-mismatch';
      return;
    }
    const conditions = element ? readCaptureConditions(element) : {};
    const observation: PlacementObservation = {
      schema: PLACEMENT_OBSERVATION_SCHEMA,
      version: PLACEMENT_VERSION,
      cameraId,
      referenceId,
      intrinsicProfileId: profileNow.profileId,
      imagePoints: measurement.corners.map((corner, index) => ({
        id: PATTERN_CORNER_IDS[index] as string,
        u: roundPixels(corner.x),
        v: roundPixels(corner.y)
      })),
      imageWidth: measurement.sourceWidth,
      imageHeight: measurement.sourceHeight,
      capturedAtUs: measurement.capturedAtUs,
      conditions: {
        ...(conditions.frameRate === undefined ? {} : {frameRate: conditions.frameRate}),
        ...(conditions.exposureTimeUs === undefined
          ? {}
          : {exposureTimeUs: conditions.exposureTimeUs})
      }
    };
    const parsed = parsePlacementObservation(observation);
    if (!parsed.ok) {
      // Only reachable if a corner fell on the frame edge or an id failed the
      // identifier pattern; publishing it anyway would hand the consumer a
      // document its own parser refuses.
      this.cornerErrorCode = 'invalid-payload';
      return;
    }
    this.cornerObservation = parsed.value;
  }

  public patternCornerObservationJson(): string {
    return this.cornerObservation ? JSON.stringify(this.cornerObservation) : '';
  }

  public patternCornerError(): string {
    return this.cornerErrorCode;
  }

  public patternCornerSpreadPx(): number {
    return this.cornerSpread;
  }

  /**
   * The reference the pattern's corners are measured against, from a tape.
   *
   * Empty when any corner is not a number, the four do not trace a convex
   * outline in the order given, or the result would fail the contract.
   */
  public patternReferenceJson(args: {
    REFERENCE_ID: unknown;
    CORNERS: unknown;
    SIGMA_METERS: unknown;
    MEASURED_BY: unknown;
  }): string {
    this.requirePlacement();
    const reference = buildPatternReference({
      referenceId: Scratch.Cast.toString(args.REFERENCE_ID),
      corners: Scratch.Cast.toString(args.CORNERS),
      sigmaMeters: readFiniteNumber(args.SIGMA_METERS),
      measuredBy: Scratch.Cast.toString(args.MEASURED_BY)
    });
    return reference ? JSON.stringify(reference) : '';
  }

  private cancelCornerMeasurement(message: string): void {
    const running = this.cornerMeasurement;
    if (!running) return;
    this.cornerMeasurement = undefined;
    running.cancel('decoder-not-running', message);
    this.cornerErrorCode = 'decoder-not-running';
    this.cornerObservation = undefined;
  }

  public solvePlacement(args: {RIG_ID: unknown}): void {
    this.requirePlacement();
    const reference = this.reference;
    if (!reference) {
      this.placementErrorCode = 'reference-unknown';
      return;
    }
    let result;
    try {
      result = solvePlacement({
        reference,
        observations: this.placementObservations,
        models: Object.fromEntries(this.cameraModels),
        rigId: Scratch.Cast.toString(args.RIG_ID)
      });
    } catch (error) {
      this.placement = undefined;
      this.placementErrorCode = errorCodeOf(error);
      return;
    }
    if (result.ok) {
      this.placement = result.result;
      this.placementErrorCode = '';
      return;
    }
    // The previous placement is dropped: it described a different set of
    // observations, and a reader asking now is asking about these.
    this.placement = undefined;
    this.placementErrorCode = result.code;
  }

  public placementResultJson(): string {
    return this.placement ? JSON.stringify(this.placement) : '';
  }

  public placementError(): string {
    return this.placementErrorCode;
  }

  public placementReprojectionRms(args: {CAMERA_ID: unknown}): number {
    const cameraId = Scratch.Cast.toString(args.CAMERA_ID);
    return (
      this.placement?.cameras.find((camera) => camera.cameraId === cameraId)
        ?.reprojectionRmsPx ?? 0
    );
  }

  public clearPlacement(): void {
    this.reference = undefined;
    this.placementObservations.length = 0;
    this.cameraModels.clear();
    this.placement = undefined;
    this.placementErrorCode = '';
  }

  private requirePlacement(): void {
    if (!this.placementEnabled) {
      throw new TimeSpaceSyncError(
        'invalid-payload',
        'Placement solve v1 is disabled. Enable it before the project starts.'
      );
    }
  }

  // Wiring ----------------------------------------------------------------

  /**
   * How well the display's refresh interval is known.
   *
   * When the pattern is being shown from this machine the display has measured
   * the spread of its own frames and that figure is used. When it is not -- the
   * display is on another computer and the interval arrived as a block argument
   * -- nothing here measured anything, and the honest floor is one pattern
   * step: the displayed value is quantised to that, so the moment a code
   * appeared cannot be stated more precisely however well the refresh is known.
   * Reporting zero would claim an exactness no part of this run established.
   */
  private refreshUncertaintyUs(): number {
    return this.display?.refreshUncertaintyUs() ?? this.profile.stepUs;
  }

  private featureEnabled(feature: FeatureName): boolean {
    return feature === 'placementSolveV1' ? this.placementEnabled : this.opticalTimeEnabled;
  }

  private requireOpticalTime(): void {
    if (!this.opticalTimeEnabled) {
      throw new TimeSpaceSyncError(
        'invalid-payload',
        'Optical time sync v1 is disabled. Enable it before the project starts.'
      );
    }
  }

  private requireDisplay(): PatternDisplay {
    const acknowledgement = this.acknowledgement;
    if (!acknowledgement) {
      throw new TimeSpaceSyncError(
        'photosensitivity-unacknowledged',
        'Acknowledge that the time pattern flashes before showing it.'
      );
    }
    if (!this.display) {
      this.display = new PatternDisplay({
        clock: this.clock.monotonic(),
        profile: this.profile,
        acknowledgement
      });
    }
    return this.display;
  }

  private requireController(): OpticalTimeController {
    if (!this.controller) {
      const size = {width: ANALYSIS_WIDTH, height: ANALYSIS_HEIGHT};
      this.controller = new OpticalTimeController({
        runtime: this.runtime,
        clock: this.clock,
        profile: this.profile,
        analysisWidth: ANALYSIS_WIDTH,
        analysisHeight: ANALYSIS_HEIGHT,
        createFramePump: (lease) =>
          this.createFramePump
            ? this.createFramePump(lease, size)
            : new VideoFramePump({
                element: lease.getFrameSource().element,
                width: ANALYSIS_WIDTH,
                height: ANALYSIS_HEIGHT,
                clock: this.clock,
                monotonic: this.clock.monotonic()
              })
      });
    }
    return this.controller;
  }

  private publishCapability(): void {
    const capability: TimeSpaceSyncCapabilityV1 = createRuntimeCapability({
      patternProfile: () => this.profile,
      showPattern: (acknowledgement) => {
        this.acknowledgement = acknowledgement;
        this.requireDisplay().show();
      },
      hidePattern: () => this.hideTimePattern(),
      patternShown: () => this.timePatternShown(),
      patternRefreshUs: () => this.display?.refreshUs(),
      startDecoder: (options: OpticalTimeStartOptions) => this.requireController().start(options),
      stopDecoder: () => this.stopOpticalTimeDecoder(),
      decoderState: (): OpticalTimeState => this.controller?.state() ?? 'idle',
      decoderError: (): TimeSpaceSyncErrorCode => this.controller?.errorCode() ?? '',
      takeObservation: () => this.controller?.takeObservation(),
      drainObservations: () => this.controller?.drainObservations() ?? []
    });
    this.runtime[runtimeCapabilityKey] = capability;
  }

  /**
   * Takes the camera and the overlay down when the project does.
   *
   * A held camera and a full screen overlay both outlive the project unless
   * something releases them, and the overlay takes no pointer events, so a
   * project that stops with one up leaves the machine covered.
   */
  private watchRuntime(): void {
    const stop = (): void => {
      // A measurement cut short keeps its error, so a script waiting on it can
      // still tell it did not finish; otherwise the corner state is cleared
      // with everything else.
      const measuring = this.cornerMeasurement !== undefined;
      this.cancelCornerMeasurement('The project stopped.');
      if (!measuring) this.cornerErrorCode = '';
      this.cornerObservation = undefined;
      this.cornerSpread = 0;
      void this.controller?.stop().catch(() => undefined);
      this.display?.hide();
      // Discarded, so the next run can choose its pattern profile again. Only
      // what this object made: a supplied display or controller is its owner's.
      if (!this.injectedController) this.controller = undefined;
      if (!this.injectedDisplay) this.display = undefined;
      this.profile = this.defaultProfile;
      this.profileErrorCode = '';
      this.observation = undefined;
      this.correspondence = undefined;
      this.correspondenceError = '';
      this.clearPlacement();
      this.acknowledgement = undefined;
    };
    for (const event of ['PROJECT_STOP_ALL', 'PROJECT_LOADED', 'RUNTIME_DISPOSED']) {
      this.runtime.on?.(event, stop);
    }
  }

  private toScratchBlock(block: BlockDefinition): Record<string, unknown> {
    return {
      opcode: block.opcode,
      blockType: Scratch.BlockType[block.blockType],
      text: Scratch.translate(block.text),
      arguments: Object.fromEntries(
        Object.entries(block.arguments).map(([name, argument]) => [
          name,
          {
            type: Scratch.ArgumentType[argument.type],
            defaultValue: argument.defaultValue
          }
        ])
      )
    };
  }
}

function requireElement(element: HTMLVideoElement | undefined): HTMLVideoElement {
  if (!element) {
    throw new TimeSpaceSyncError('camera-unavailable', 'The decoder holds no camera to read corners from.');
  }
  return element;
}

/** Thousandths of a pixel: finer than any corner here is measured, and stable to print. */
function roundPixels(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** A number from a block argument, or NaN for empty text rather than Scratch's zero. */
function readFiniteNumber(value: unknown): number {
  const text = Scratch.Cast.toString(value).trim();
  return text === '' ? Number.NaN : Number(text);
}

/** Parses block text as JSON, treating anything unparseable as absent. */
function readJson(value: unknown): unknown {
  try {
    return JSON.parse(Scratch.Cast.toString(value));
  } catch {
    return undefined;
  }
}

export {errorCodeOf};
