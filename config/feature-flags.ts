/**
 * Startup-fixed feature flags.
 *
 * Read once, at module load, so a flag cannot change while a run is in
 * progress: a decoder that started under one setting would otherwise finish
 * under another, and nothing in its result would say which.
 *
 * Both paths are off by default. A project that loads this extension without
 * setting them gets no blocks, which is the intended state until the paths have
 * been verified on real hardware.
 */
export interface TimeSpaceSyncFeatureFlags {
  /** Optical time pattern: display, decoder, observations. */
  readonly opticalTimeSyncV1: boolean;
  /** Camera placement against a measured reference. */
  readonly placementSolveV1: boolean;
}

interface FeatureFlagGlobal {
  readonly __TWTSS_FEATURE_FLAGS__?: Partial<TimeSpaceSyncFeatureFlags>;
}

const overrides = (globalThis as FeatureFlagGlobal).__TWTSS_FEATURE_FLAGS__;

export const featureFlags: TimeSpaceSyncFeatureFlags = Object.freeze({
  opticalTimeSyncV1: overrides?.opticalTimeSyncV1 === true,
  placementSolveV1: overrides?.placementSolveV1 === true
});
