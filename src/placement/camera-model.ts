import {TimeSpaceSyncError} from '../contracts/index.js';

/**
 * The lens, as far as a pose solve needs it.
 *
 * Kept as named members rather than a packed matrix: a nine number array cannot
 * say whether it is stored row-major or column-major, and a reader that guesses
 * wrong produces a projection that is plausible and wrong. This mirrors the
 * shape Camera Source publishes, so adopting its types later is a rename.
 */
export interface Intrinsics {
  readonly fx: number;
  readonly fy: number;
  readonly cx: number;
  readonly cy: number;
  readonly skew: number;
}

/**
 * Distortion, in the direction that adds it.
 *
 * The coefficients describe the map from ideal normalised coordinates to the
 * observed ones, which is the usual convention and the one the calibration was
 * solved in. Removing distortion is therefore the inverse, found by iterating.
 *
 * Only the models named here are accepted. A profile carrying some other model
 * is refused rather than read as the nearest familiar one: the wrong model does
 * not raise, it moves the solved pose, and the residual stays small while it
 * does.
 */
export interface Distortion {
  readonly model: 'none' | 'brown-conrady';
  readonly coefficients: readonly number[];
}

export interface ImagePoint {
  readonly u: number;
  readonly v: number;
}

export interface NormalizedPoint {
  readonly x: number;
  readonly y: number;
}

const UNDISTORT_ITERATIONS = 20;
/** Squared step below which the iteration has stopped moving, in normalised units. */
const UNDISTORT_TOLERANCE = 1e-26;

export function requireSupportedDistortion(distortion: Distortion): Distortion {
  if (distortion.model !== 'none' && distortion.model !== 'brown-conrady') {
    throw new TimeSpaceSyncError(
      'unsupported-distortion-model',
      `This build cannot undo ${String(distortion.model)} distortion, and guessing at the nearest model it knows would move the solved pose without changing the residual.`
    );
  }
  if (distortion.model === 'brown-conrady' && distortion.coefficients.length < 4) {
    throw new TimeSpaceSyncError(
      'unsupported-distortion-model',
      'Brown-Conrady distortion needs at least k1, k2, p1 and p2.'
    );
  }
  return distortion;
}

/** Pixels to ideal normalised image coordinates, with distortion removed. */
export function normalize(
  point: ImagePoint,
  intrinsics: Intrinsics,
  distortion: Distortion
): NormalizedPoint {
  const y = (point.v - intrinsics.cy) / intrinsics.fy;
  const x = (point.u - intrinsics.cx - intrinsics.skew * y) / intrinsics.fx;
  return distortion.model === 'none' ? {x, y} : undistort({x, y}, distortion.coefficients);
}

/** Ideal normalised coordinates back to pixels, distortion included. */
export function project(
  point: NormalizedPoint,
  intrinsics: Intrinsics,
  distortion: Distortion
): ImagePoint {
  const distorted =
    distortion.model === 'none' ? point : applyDistortion(point, distortion.coefficients);
  return {
    u: intrinsics.fx * distorted.x + intrinsics.skew * distorted.y + intrinsics.cx,
    v: intrinsics.fy * distorted.y + intrinsics.cy
  };
}

export function applyDistortion(
  point: NormalizedPoint,
  coefficients: readonly number[]
): NormalizedPoint {
  const k1 = coefficients[0] ?? 0;
  const k2 = coefficients[1] ?? 0;
  const p1 = coefficients[2] ?? 0;
  const p2 = coefficients[3] ?? 0;
  const k3 = coefficients[4] ?? 0;
  const r2 = point.x * point.x + point.y * point.y;
  const radial = 1 + k1 * r2 + k2 * r2 * r2 + k3 * r2 * r2 * r2;
  return {
    x: point.x * radial + 2 * p1 * point.x * point.y + p2 * (r2 + 2 * point.x * point.x),
    y: point.y * radial + p1 * (r2 + 2 * point.y * point.y) + 2 * p2 * point.x * point.y
  };
}

/**
 * Removes distortion by iterating the forward model.
 *
 * There is no closed form, so the observed point is used as the first guess and
 * corrected until it stops moving. Twenty steps is far more than the handful a
 * lens needs; the loop stops early once it converges.
 */
export function undistort(
  point: NormalizedPoint,
  coefficients: readonly number[]
): NormalizedPoint {
  let current = point;
  for (let step = 0; step < UNDISTORT_ITERATIONS; step += 1) {
    const forward = applyDistortion(current, coefficients);
    const dx = forward.x - point.x;
    const dy = forward.y - point.y;
    current = {x: current.x - dx, y: current.y - dy};
    if (dx * dx + dy * dy < UNDISTORT_TOLERANCE) break;
  }
  return current;
}

export type CameraModelParse =
  | {
      readonly ok: true;
      readonly intrinsics: Intrinsics;
      readonly distortion: Distortion;
      readonly intrinsicProfileId?: string;
      readonly imageWidth?: number;
      readonly imageHeight?: number;
    }
  | {readonly ok: false; readonly code: 'invalid-payload' | 'unsupported-distortion-model'; readonly message: string};

/**
 * Reads a camera model document, refusing anything that does not state its lens fully.
 *
 * The accepted shape is `{intrinsics: {fx, fy, cx, cy, skew}, distortion:
 * {model, coefficients}}`, optionally with `intrinsicProfileId`, `imageWidth`
 * and `imageHeight`; the pattern corner blocks produce exactly that.
 *
 * Camera Source's `camera intrinsics JSON` is refused with
 * `unsupported-distortion-model`. It carries the pinhole numbers adapted to the
 * frame but no distortion, and reading its absence as "no distortion" would
 * move every pose solved through a webcam lens while the residual stayed small.
 * The distortion is in the profile Camera Source holds, so the model is built
 * on the camera's own computer, where both are available.
 */
export function parseCameraModel(value: unknown): CameraModelParse {
  if (typeof value !== 'object' || value === null) {
    return {ok: false, code: 'invalid-payload', message: 'A camera model must be a JSON object.'};
  }
  const record = value as Record<string, unknown>;
  if (record.intrinsics === undefined && typeof record.fx === 'number') {
    return {
      ok: false,
      code: 'unsupported-distortion-model',
      message:
        'These intrinsics state no distortion model. Use the camera model JSON block on the camera computer, which adds the distortion from the registered profile.'
    };
  }
  const intrinsics = record.intrinsics as Record<string, unknown> | undefined;
  const keys = ['fx', 'fy', 'cx', 'cy', 'skew'] as const;
  if (
    typeof intrinsics !== 'object' ||
    intrinsics === null ||
    !keys.every((key) => typeof intrinsics[key] === 'number' && Number.isFinite(intrinsics[key])) ||
    !((intrinsics.fx as number) > 0) ||
    !((intrinsics.fy as number) > 0)
  ) {
    return {ok: false, code: 'invalid-payload', message: 'The intrinsics need finite fx, fy, cx, cy and skew.'};
  }
  const distortion = record.distortion as Record<string, unknown> | undefined;
  if (typeof distortion !== 'object' || distortion === null || typeof distortion.model !== 'string') {
    return {
      ok: false,
      code: 'unsupported-distortion-model',
      message: 'The camera model states no distortion model.'
    };
  }
  const coefficients = distortion.coefficients;
  if (
    !Array.isArray(coefficients) ||
    !coefficients.every((entry) => typeof entry === 'number' && Number.isFinite(entry))
  ) {
    return {ok: false, code: 'invalid-payload', message: 'Distortion coefficients must be finite numbers.'};
  }
  const profileId = record.intrinsicProfileId;
  if (profileId !== undefined && (typeof profileId !== 'string' || profileId.length === 0)) {
    return {ok: false, code: 'invalid-payload', message: 'intrinsicProfileId must be a non-empty string.'};
  }
  for (const key of ['imageWidth', 'imageHeight'] as const) {
    const size = record[key];
    if (size !== undefined && !(Number.isInteger(size) && (size as number) > 0)) {
      return {ok: false, code: 'invalid-payload', message: `${key} must be a positive integer.`};
    }
  }
  return {
    ok: true,
    intrinsics: {
      fx: intrinsics.fx as number,
      fy: intrinsics.fy as number,
      cx: intrinsics.cx as number,
      cy: intrinsics.cy as number,
      skew: intrinsics.skew as number
    },
    distortion: {
      model: distortion.model as Distortion['model'],
      coefficients: [...(coefficients as number[])]
    },
    ...(profileId === undefined ? {} : {intrinsicProfileId: profileId as string}),
    ...(record.imageWidth === undefined ? {} : {imageWidth: record.imageWidth as number}),
    ...(record.imageHeight === undefined ? {} : {imageHeight: record.imageHeight as number})
  };
}
