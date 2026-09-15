import {TimeSpaceSyncError, type CaptureConditions} from '../contracts/index.js';

export const CAMERA_SOURCE_EXTENSION_KEY = 'ext_kubohiroyacamerasource';

export interface CameraFrameSourcePort {
  readonly kind: 'video';
  readonly element: HTMLVideoElement;
  readonly width: number;
  readonly height: number;
  readonly deviceId: string;
}

export interface CameraLeasePort {
  getFrameSource(): CameraFrameSourcePort;
  release(): Promise<void>;
}

export interface CameraSourcePort {
  acquireCamera(options: {owner: string; cameraId: string}): Promise<CameraLeasePort>;
}

export function requireCameraSource(runtime: TurboWarpRuntime): CameraSourcePort {
  const candidate = runtime[CAMERA_SOURCE_EXTENSION_KEY];
  if (
    typeof candidate !== 'object' ||
    candidate === null ||
    typeof (candidate as {acquireCamera?: unknown}).acquireCamera !== 'function'
  ) {
    throw new TimeSpaceSyncError('camera-unavailable', 'Camera Source is not loaded.');
  }
  return candidate as unknown as CameraSourcePort;
}

/**
 * The capture settings the browser is willing to report.
 *
 * Recorded rather than controlled. Decoding fails whenever an exposure spans a
 * display refresh, so the decode rate is governed by the exposure time, and a
 * low rate caused by a long exposure looks exactly like one caused by a dim
 * panel while calling for the opposite remedy. Every field is optional because
 * every field genuinely may be absent, and an absent setting is left absent.
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
