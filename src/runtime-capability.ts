import type {
  OpticalTimeObservation,
  TimeSpaceSyncErrorCode
} from './contracts/index.js';
import type {
  OpticalTimeStartOptions,
  OpticalTimeState,
  PatternProfile,
  PhotosensitivityAcknowledgement
} from './optical-time/index.js';

export const runtimeCapabilityKey = 'kubohiroyaTimeSpaceSyncCapability';
export const runtimeCapabilityVersion = 1 as const;

/**
 * What another extension may use without going through blocks.
 *
 * Published under a versioned key rather than as the raw extension object, so a
 * consumer states which contract it was written against and gets a clear
 * refusal instead of a missing method at the worst moment.
 */
export interface TimeSpaceSyncCapabilityV1 {
  readonly version: typeof runtimeCapabilityVersion;
  requireVersion(version: number): TimeSpaceSyncCapabilityV1;
  patternProfile(): PatternProfile;
  showPattern(acknowledgement: PhotosensitivityAcknowledgement): void;
  hidePattern(): void;
  patternShown(): boolean;
  patternRefreshUs(): number | undefined;
  startDecoder(options: OpticalTimeStartOptions): Promise<void>;
  stopDecoder(): Promise<void>;
  decoderState(): OpticalTimeState;
  decoderError(): TimeSpaceSyncErrorCode;
  takeObservation(): OpticalTimeObservation | undefined;
  drainObservations(): OpticalTimeObservation[];
}

export function createRuntimeCapability(
  host: Omit<TimeSpaceSyncCapabilityV1, 'version' | 'requireVersion'>
): TimeSpaceSyncCapabilityV1 {
  const capability: TimeSpaceSyncCapabilityV1 = {
    version: runtimeCapabilityVersion,
    requireVersion(version) {
      if (version !== runtimeCapabilityVersion) {
        throw new Error(
          `Unsupported Time Space Sync runtime capability version: ${version}; this build provides ${runtimeCapabilityVersion}.`
        );
      }
      return capability;
    },
    patternProfile: () => host.patternProfile(),
    showPattern: (acknowledgement) => host.showPattern(acknowledgement),
    hidePattern: () => host.hidePattern(),
    patternShown: () => host.patternShown(),
    patternRefreshUs: () => host.patternRefreshUs(),
    startDecoder: (options) => host.startDecoder(options),
    stopDecoder: () => host.stopDecoder(),
    decoderState: () => host.decoderState(),
    decoderError: () => host.decoderError(),
    takeObservation: () => host.takeObservation(),
    drainObservations: () => host.drainObservations()
  };
  return Object.freeze(capability);
}
