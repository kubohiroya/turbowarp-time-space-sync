import {
  cameraSourceRuntimeKey,
  readCameraSourceRuntime,
  type CameraFrameSource,
  type CameraLease,
  type CameraSourceRuntime
} from '@kubohiroya/turbowarp-camera-source/runtime';
import {TimeSpaceSyncError, type CaptureConditions} from '../contracts/index.js';

/**
 * The camera, as Camera Source describes it.
 *
 * These types are imported rather than declared. A copy written out here would
 * be checked against nothing: Camera Source could change the shape, this
 * repository would still typecheck, and the mismatch would surface in a browser
 * instead. That is not hypothetical -- turbowarp-ar was reading `mirrored` when
 * the member had been renamed to `previewFlip`, and nothing caught it until
 * somebody ran it.
 */
export type {CameraFrameSource, CameraLease, CameraSourceRuntime};
export {cameraSourceRuntimeKey};

/** Camera Source, or a refusal naming what is missing. */
export function requireCameraSource(runtime: TurboWarpRuntime): CameraSourceRuntime {
  const camera = readCameraSourceRuntime(runtime);
  if (!camera) {
    throw new TimeSpaceSyncError('camera-unavailable', 'Camera Source is not loaded.');
  }
  return camera;
}

/**
 * The capture settings the browser is willing to report.
 *
 * Read from the track rather than from Camera Source's capability, which is
 * published only when its own calibration flag is on: the decoder needs the
 * exposure whether or not anybody is calibrating, and a diagnosis that stops
 * working because a different extension is configured differently would be
 * worse than reading the track twice.
 *
 * Recorded, never set. Decoding fails whenever an exposure spans a display
 * refresh, so the decode rate is governed by the exposure time, and a low rate
 * caused by a long exposure looks exactly like one caused by a dim panel while
 * calling for the opposite remedy. Every field is optional because every field
 * genuinely may be absent, and an absent setting is left absent.
 */
export function readCaptureConditions(element: HTMLVideoElement): CaptureConditions {
  const track = videoTrackOf(element);
  if (!track) return {};
  let settings: Record<string, unknown>;
  try {
    settings = track.getSettings() as unknown as Record<string, unknown>;
  } catch {
    return {};
  }
  const conditions: {
    frameRate?: number;
    width?: number;
    height?: number;
    exposureTimeUs?: number;
  } = {};
  const frameRate = positive(settings.frameRate);
  if (frameRate !== undefined) conditions.frameRate = frameRate;
  const width = wholePositive(settings.width);
  if (width !== undefined) conditions.width = width;
  const height = wholePositive(settings.height);
  if (height !== undefined) conditions.height = height;
  // MediaTrackSettings reports exposureTime in hundred-microsecond units.
  const exposure = positive(settings.exposureTime);
  if (exposure !== undefined) conditions.exposureTimeUs = Math.round(exposure * 100);
  return conditions;
}

function videoTrackOf(element: HTMLVideoElement): MediaStreamTrack | undefined {
  const source = element.srcObject;
  if (typeof source !== 'object' || source === null) return undefined;
  const stream = source as {getVideoTracks?: () => MediaStreamTrack[]};
  if (typeof stream.getVideoTracks !== 'function') return undefined;
  return stream.getVideoTracks()[0];
}

function positive(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function wholePositive(value: unknown): number | undefined {
  const parsed = positive(value);
  return parsed === undefined ? undefined : Math.round(parsed);
}
