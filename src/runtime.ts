/**
 * What another extension needs to talk to this one, without importing it.
 *
 * Consumers reach the extension through a key on the VM runtime, so what they
 * need from this package is declarations and a couple of constants -- not the
 * extension, which is a hundred and fifty kilobytes of pattern decoding and
 * pose solving they will never call.
 *
 * It is published as a sub-entry so that a consumer imports these instead of
 * writing its own copy. A copy is checked against nothing: this package could
 * change the shape, the consumer would still typecheck, and the mismatch would
 * surface in a browser. That has already happened once in this family, between
 * Camera Source and turbowarp-ar.
 *
 * Nothing here imports anything that touches a browser or a runtime, so the
 * cost to a consumer is the error tables and the constants below.
 */

export {
  LEGACY_FRAME_SYNC_ERROR_CODES,
  TIME_SPACE_SYNC_ERROR_CODES,
  toLegacyFrameSyncErrorCode,
  type LegacyFrameSyncErrorCode,
  type TimeSpaceSyncErrorCode
} from './contracts/errors.js';

export type {
  CaptureTimeKind,
  ClockDomain,
  ClockKind,
  OpticalTimeObservation,
  PlacementObservation,
  PlacementResult,
  ReferenceDefinition,
  TimeCorrespondence,
  UnidentifiedComponent
} from './contracts/index.js';

export {
  runtimeCapabilityKey,
  runtimeCapabilityVersion,
  type TimeSpaceSyncCapabilityV1
} from './runtime-capability.js';

export type {
  OpticalTimeStartOptions,
  OpticalTimeState,
  PatternProfile,
  PhotosensitivityAcknowledgement
} from './optical-time/index.js';

import {runtimeCapabilityKey, type TimeSpaceSyncCapabilityV1} from './runtime-capability.js';

/** The key this extension publishes itself on, for a consumer to read. */
export const timeSpaceSyncExtensionId = 'kubohiroyatimespacesync';

/**
 * Narrows a runtime value to this extension's capability.
 *
 * Returns undefined when the extension is absent or its feature is off, so a
 * consumer writes the same check once rather than each time. A version it does
 * not implement is a refusal from `requireVersion`, not an absence: the
 * extension is there and cannot do what was asked, which is a different thing
 * from it not being loaded and calls for a different message.
 */
export function readTimeSpaceSyncCapability(
  runtime: unknown
): TimeSpaceSyncCapabilityV1 | undefined {
  if (typeof runtime !== 'object' || runtime === null) return undefined;
  const candidate = (runtime as Record<string, unknown>)[runtimeCapabilityKey];
  if (typeof candidate !== 'object' || candidate === null) return undefined;
  const {requireVersion} = candidate as {requireVersion?: unknown};
  return typeof requireVersion === 'function'
    ? (candidate as TimeSpaceSyncCapabilityV1)
    : undefined;
}
