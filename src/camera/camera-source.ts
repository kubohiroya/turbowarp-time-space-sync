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

/**
 * What Camera Source knows about a camera's lens, as far as placement needs it.
 *
 * Camera Source 0.7.0 publishes this through a versioned runtime capability
 * whose declarations are not part of its `runtime` entry point, so the shape is
 * narrowed here member by member at runtime rather than trusted. Anything that
 * does not match reads as absent: a profile id or intrinsics taken from a
 * shape that merely looks similar would label an observation with a lens it
 * was not taken through.
 */
export interface CameraProfileSummary {
  readonly profileId: string;
  readonly distortion: {readonly model: string; readonly coefficients: readonly number[]};
}

export interface UsableIntrinsics {
  readonly fx: number;
  readonly fy: number;
  readonly cx: number;
  readonly cy: number;
  readonly skew: number;
  /** The frame size these numbers were adapted to. */
  readonly width: number;
  readonly height: number;
}

export interface CameraCalibrationReader {
  profileFor(cameraId: string): CameraProfileSummary | undefined;
  /** Intrinsics adapted to the current frame, or undefined when they cannot be established. */
  intrinsicsFor(cameraId: string): UsableIntrinsics | undefined;
}

/** Where Camera Source publishes its calibration capability. */
export const cameraSourceCalibrationKey = 'kubohiroyaCameraSourceCapability';
const CAMERA_SOURCE_CALIBRATION_VERSION = 1;

/**
 * Camera Source's calibration surface, or undefined when it is not published.
 *
 * It is absent whenever Camera Source was loaded without its calibration flag,
 * which is an ordinary configuration and not a fault.
 */
export function readCameraCalibration(runtime: unknown): CameraCalibrationReader | undefined {
  if (typeof runtime !== 'object' || runtime === null) return undefined;
  const candidate = (runtime as Record<string, unknown>)[cameraSourceCalibrationKey];
  if (typeof candidate !== 'object' || candidate === null) return undefined;
  const requireVersion = (candidate as {requireVersion?: unknown}).requireVersion;
  if (typeof requireVersion !== 'function') return undefined;
  let capability: unknown;
  try {
    capability = requireVersion.call(candidate, CAMERA_SOURCE_CALIBRATION_VERSION);
  } catch {
    return undefined;
  }
  if (typeof capability !== 'object' || capability === null) return undefined;
  const {profileFor, intrinsicsFor} = capability as {profileFor?: unknown; intrinsicsFor?: unknown};
  if (typeof profileFor !== 'function' || typeof intrinsicsFor !== 'function') return undefined;
  return {
    profileFor: (cameraId) => readProfileSummary(profileFor.call(capability, cameraId)),
    intrinsicsFor: (cameraId) => readUsableIntrinsics(intrinsicsFor.call(capability, cameraId))
  };
}

function readProfileSummary(value: unknown): CameraProfileSummary | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const {profileId, distortion} = value as {profileId?: unknown; distortion?: unknown};
  if (typeof profileId !== 'string' || profileId.length === 0) return undefined;
  if (typeof distortion !== 'object' || distortion === null) return undefined;
  const {model, coefficients} = distortion as {model?: unknown; coefficients?: unknown};
  if (typeof model !== 'string' || !Array.isArray(coefficients)) return undefined;
  if (!coefficients.every((entry) => typeof entry === 'number' && Number.isFinite(entry))) {
    return undefined;
  }
  return {profileId, distortion: {model, coefficients: [...(coefficients as number[])]}};
}

function readUsableIntrinsics(value: unknown): UsableIntrinsics | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const record = value as Record<string, unknown>;
  const numbers = ['fx', 'fy', 'cx', 'cy', 'skew', 'width', 'height'].map((key) => record[key]);
  if (!numbers.every((entry) => typeof entry === 'number' && Number.isFinite(entry))) {
    return undefined;
  }
  const [fx, fy, cx, cy, skew, width, height] = numbers as number[];
  if (!((fx as number) > 0) || !((fy as number) > 0) || !((width as number) > 0) || !((height as number) > 0)) {
    return undefined;
  }
  return {
    fx: fx as number,
    fy: fy as number,
    cx: cx as number,
    cy: cy as number,
    skew: skew as number,
    width: width as number,
    height: height as number
  };
}
