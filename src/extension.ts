import {featureFlags} from '../config/feature-flags.js';
import definitions from './block-definitions.json';
import {LocalMonotonicClock, SessionClock} from './clock/index.js';
import {extensionConfig} from './config.js';
import {
  TimeSpaceSyncError,
  errorCodeOf,
  type OpticalTimeObservation,
  type TimeSpaceSyncErrorCode
} from './contracts/index.js';
import {
  OpticalTimeController,
  PATTERN_PROFILE_V1,
  PatternDisplay,
  VideoFramePump,
  wrapUs,
  type OpticalTimeStartOptions,
  type OpticalTimeState,
  type PatternProfile,
  type PhotosensitivityAcknowledgement
} from './optical-time/index.js';
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
}

const blockDefinitions = definitions.blocks as readonly BlockDefinition[];
const ANALYSIS_WIDTH = 240;
const ANALYSIS_HEIGHT = 180;

export class TimeSpaceSyncExtension implements TurboWarpExtension {
  private readonly runtime: TurboWarpRuntime;
  private readonly opticalTimeEnabled: boolean;
  private readonly placementEnabled: boolean;
  private readonly profile: PatternProfile;
  private readonly clock: SessionClock;
  private display: PatternDisplay | undefined;
  private controller: OpticalTimeController | undefined;
  private acknowledgement: PhotosensitivityAcknowledgement | undefined;
  private observation: OpticalTimeObservation | undefined;

  public constructor(options: TimeSpaceSyncExtensionOptions = {}) {
    this.runtime = options.runtime ?? Scratch.vm?.runtime ?? ({} as TurboWarpRuntime);
    this.opticalTimeEnabled = options.opticalTimeEnabled ?? featureFlags.opticalTimeSyncV1;
    this.placementEnabled = options.placementEnabled ?? featureFlags.placementSolveV1;
    this.profile = options.profile ?? PATTERN_PROFILE_V1;
    this.clock = options.clock ?? new SessionClock(new LocalMonotonicClock());
    this.display = options.display;
    this.controller = options.controller;
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

  public opticalTimeMinimumCalibrationSeconds(): number {
    return this.requireController().minimumCalibrationSeconds();
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
      this.controller = new OpticalTimeController({
        runtime: this.runtime,
        clock: this.clock,
        profile: this.profile,
        analysisWidth: ANALYSIS_WIDTH,
        analysisHeight: ANALYSIS_HEIGHT,
        createFramePump: (lease) =>
          new VideoFramePump({
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
      void this.controller?.stop().catch(() => undefined);
      this.display?.hide();
      this.observation = undefined;
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

export {errorCodeOf};
