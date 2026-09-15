import {columnOf, multiply, solveSymmetric, symmetricEigen, transpose} from './linear-algebra.js';
import {
  normalize,
  project,
  type Distortion,
  type ImagePoint,
  type Intrinsics,
  type NormalizedPoint
} from './camera-model.js';

/**
 * Where a camera stands relative to a flat reference it can see.
 *
 * A planar target admits two poses that project almost identically -- the plane
 * reflected about the line of sight -- and as the target flattens towards the
 * image plane their residuals converge until the solver is choosing between
 * them on noise. Both are found and both residuals are reported, because a
 * small residual on its own says nothing about whether the pose is determined.
 */

export interface PlanarPoint {
  readonly u: number;
  readonly v: number;
}

export interface Pose {
  /** Rotation, row-major 3x3, taking reference-plane points into the camera. */
  readonly rotation: readonly number[];
  readonly translation: readonly number[];
}

export interface PoseSolution extends Pose {
  readonly reprojectionRmsPx: number;
  readonly reprojectionMaxPx: number;
}

export interface PlanarPoseResult {
  readonly best: PoseSolution;
  /** The reflected solution, which exists whenever the target is planar. */
  readonly alternative: PoseSolution | undefined;
  /**
   * The rejected solution's error over the accepted one.
   *
   * Near one, the two fit equally well and the pose is not determined by the
   * measurement, however small the residual looks.
   */
  readonly errorRatio: number;
  readonly pointCount: number;
}

const REFINE_STEPS = 60;
/**
 * How well a point can be placed in the image, in pixels.
 *
 * An operator clicking a projected corner, or a detector finding one, lands
 * within about half a pixel on a good day. It is an assumption and it is stated
 * as one, rather than being left implicit in a residual that happens to be
 * small.
 */
const DEFAULT_IMAGE_SIGMA_PX = 0.5;
/**
 * How far apart two poses must be before they count as different solutions.
 *
 * Refining from the reflected start does not always reach a second minimum: for
 * a target showing plenty of perspective there is none, and the refinement
 * slides back onto the first. That case has to be told from a genuine second
 * solution, because both leave the two residuals equal and the ratio alone
 * cannot say which happened.
 */
const DISTINCT_SOLUTION_DEG = 1;

export function solvePlanarPose(
  planar: readonly PlanarPoint[],
  image: readonly ImagePoint[],
  intrinsics: Intrinsics,
  distortion: Distortion,
  imageSigmaPx = DEFAULT_IMAGE_SIGMA_PX
): PlanarPoseResult | undefined {
  if (planar.length < 4 || planar.length !== image.length) return undefined;
  const normalized = image.map((point) => normalize(point, intrinsics, distortion));
  const homography = homographyFrom(planar, normalized);
  if (!homography) return undefined;
  const initial = poseFromHomography(homography);
  if (!initial) return undefined;

  const first = refine(initial, planar, image, intrinsics, distortion);
  const mirrored = reflectAboutLineOfSight(first, planar);
  const second = mirrored ? refine(mirrored, planar, image, intrinsics, distortion) : undefined;

  const ordered =
    second && second.reprojectionRmsPx < first.reprojectionRmsPx
      ? [second, first]
      : [first, second];
  const best = ordered[0] as PoseSolution;
  const other = ordered[1];
  const distinct =
    other !== undefined && angleBetweenDeg(best.rotation, other.rotation) > DISTINCT_SOLUTION_DEG;
  const alternative = distinct ? other : undefined;
  // Two fits are the same fit when they differ by less than the points could
  // have been placed to. Comparing raw residuals instead would call a pair that
  // both land well inside the marking error "well separated" on the strength of
  // a hundredth of a pixel.
  const floor = Math.max(best.reprojectionRmsPx, imageSigmaPx);
  const errorRatio =
    alternative === undefined
      ? Number.POSITIVE_INFINITY
      : Math.max(alternative.reprojectionRmsPx, imageSigmaPx) / floor;
  return {best, alternative, errorRatio, pointCount: planar.length};
}

/**
 * The homography taking plane coordinates to normalised image coordinates.
 *
 * Both sets are conditioned first. Without it the rows of the design matrix
 * differ by the square of the target's size in metres, and the smallest
 * eigenvector of a matrix with that spread is dominated by rounding rather than
 * by the measurement.
 */
export function homographyFrom(
  planar: readonly PlanarPoint[],
  normalized: readonly NormalizedPoint[]
): number[] | undefined {
  const source = conditionPlanar(planar);
  const target = conditionNormalized(normalized);
  const rows: number[] = [];
  for (let index = 0; index < planar.length; index += 1) {
    const s = source.points[index] as PlanarPoint;
    const t = target.points[index] as NormalizedPoint;
    rows.push(-s.u, -s.v, -1, 0, 0, 0, t.x * s.u, t.x * s.v, t.x);
    rows.push(0, 0, 0, -s.u, -s.v, -1, t.y * s.u, t.y * s.v, t.y);
  }
  const a = rows;
  const count = planar.length * 2;
  const ata = multiply(transpose(a, count, 9), a, 9, count, 9);
  const {vectors} = symmetricEigen(ata, 9);
  const h = columnOf(vectors, 9, 0);
  if (!h.every((value) => Number.isFinite(value))) return undefined;
  // Undo both conditionings: H = T⁻¹ · Ĥ · S.
  const undone = multiply(multiply(target.inverse, h, 3, 3, 3), source.matrix, 3, 3, 3);
  const scale = undone[8] ?? 0;
  if (scale === 0 || !Number.isFinite(scale)) return undefined;
  return undone.map((value) => value / scale);
}

/**
 * Splits a homography into a rotation and a translation.
 *
 * The first two columns are the images of the plane's axes, so they carry the
 * same scale as the translation; the third rotation column is their cross
 * product. The result is only approximately orthonormal, so it is squared up
 * before use and refined afterwards.
 */
export function poseFromHomography(homography: readonly number[]): Pose | undefined {
  const h1 = [homography[0] ?? 0, homography[3] ?? 0, homography[6] ?? 0];
  const h2 = [homography[1] ?? 0, homography[4] ?? 0, homography[7] ?? 0];
  const h3 = [homography[2] ?? 0, homography[5] ?? 0, homography[8] ?? 0];
  const norm1 = length(h1);
  const norm2 = length(h2);
  if (!(norm1 > 0) || !(norm2 > 0)) return undefined;
  const scale = 2 / (norm1 + norm2);
  let r1 = h1.map((value) => value * scale);
  let r2 = h2.map((value) => value * scale);
  let t = h3.map((value) => value * scale);
  // The reference must sit in front of the camera; a homography is only defined
  // up to sign, so the whole solution flips when it does not.
  if ((t[2] ?? 0) < 0) {
    r1 = r1.map((value) => -value);
    r2 = r2.map((value) => -value);
    t = t.map((value) => -value);
  }
  const rotation = orthonormalize(r1, r2);
  return rotation ? {rotation, translation: t} : undefined;
}

/**
 * The other pose a planar target allows.
 *
 * Two board orientations project a plane almost identically: tilted one way
 * about an axis lying in the image, and tilted the same amount the other way.
 * The second is built by reflecting the board's normal about the ray through
 * its centre and turning the board by the smallest rotation that does it, which
 * leaves the in-plane orientation alone. The board's centre is held where it
 * was, so the two solutions differ in tilt and not in where the thing is.
 *
 * As the tilt goes to zero the reflected normal converges on the original and
 * the second solution becomes the first. That is not a failure of the
 * construction but the shape of the problem: a target showing little
 * perspective does not determine which way it leans.
 */
export function reflectAboutLineOfSight(
  pose: Pose,
  planar: readonly PlanarPoint[]
): Pose | undefined {
  const centre = centroidInCamera(pose, planar);
  const view = normalizeVector(centre);
  if (!view) return undefined;
  const normal = [pose.rotation[2] ?? 0, pose.rotation[5] ?? 0, pose.rotation[8] ?? 0];
  const projection = dot(normal, view);
  const reflected = normal.map((value, index) => 2 * projection * (view[index] ?? 0) - value);
  const turn = rotationBetween(normal, reflected);
  if (!turn) return undefined;
  const rotation = multiply(turn, pose.rotation, 3, 3, 3);
  const planarCentre = planarCentroid(planar);
  // Hold the board's centre where the first solution put it.
  const translation = [0, 1, 2].map(
    (row) =>
      (centre[row] ?? 0) -
      ((rotation[row * 3] ?? 0) * planarCentre.u + (rotation[row * 3 + 1] ?? 0) * planarCentre.v)
  );
  return {rotation, translation};
}

/** The smallest rotation taking one unit vector onto another. */
function rotationBetween(from: readonly number[], to: readonly number[]): number[] | undefined {
  const a = normalizeVector(from);
  const b = normalizeVector(to);
  if (!a || !b) return undefined;
  const axis = cross(a, b);
  const sine = length(axis);
  const cosine = Math.min(1, Math.max(-1, dot(a, b)));
  if (sine < 1e-12) {
    // Already aligned, or opposed. Opposed cannot arise here: a reflection
    // about the view ray cannot turn a normal completely around.
    return cosine > 0 ? [1, 0, 0, 0, 1, 0, 0, 0, 1] : undefined;
  }
  return rotationMatrix(axis.map((value) => (value / sine) * Math.atan2(sine, cosine)));
}

function planarCentroid(planar: readonly PlanarPoint[]): PlanarPoint {
  let u = 0;
  let v = 0;
  for (const point of planar) {
    u += point.u;
    v += point.v;
  }
  return {u: u / planar.length, v: v / planar.length};
}

/**
 * Levenberg-Marquardt on the six pose parameters.
 *
 * The Jacobian is taken numerically. With six parameters and a handful of
 * points the cost is nothing, and a hand-written analytic Jacobian is a place
 * for a sign error to hide where it would look like a slightly worse fit.
 */
export function refine(
  initial: Pose,
  planar: readonly PlanarPoint[],
  image: readonly ImagePoint[],
  intrinsics: Intrinsics,
  distortion: Distortion
): PoseSolution {
  let parameters = [...rotationVector(initial.rotation), ...initial.translation];
  let lambda = 1e-3;
  let current = residualsOf(parameters, planar, image, intrinsics, distortion);
  let cost = sumSquares(current);

  for (let step = 0; step < REFINE_STEPS; step += 1) {
    const jacobian = jacobianOf(parameters, planar, image, intrinsics, distortion);
    const jt = transpose(jacobian, current.length, 6);
    const jtj = multiply(jt, jacobian, 6, current.length, 6);
    const jtr = multiply(jt, current, 6, current.length, 1);
    let applied = false;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const damped = [...jtj];
      for (let index = 0; index < 6; index += 1) {
        damped[index * 6 + index] = (damped[index * 6 + index] ?? 0) * (1 + lambda);
      }
      const delta = solveSymmetric(damped, jtr, 6);
      if (!delta) {
        lambda *= 10;
        continue;
      }
      const candidate = parameters.map((value, index) => value - (delta[index] ?? 0));
      const candidateResiduals = residualsOf(candidate, planar, image, intrinsics, distortion);
      const candidateCost = sumSquares(candidateResiduals);
      if (candidateCost < cost) {
        parameters = candidate;
        current = candidateResiduals;
        cost = candidateCost;
        lambda = Math.max(lambda / 10, 1e-12);
        applied = true;
        break;
      }
      lambda *= 10;
    }
    if (!applied) break;
  }

  const rotation = rotationMatrix(parameters.slice(0, 3));
  const translation = parameters.slice(3, 6);
  const errors = pointErrors(current);
  return {
    rotation,
    translation,
    reprojectionRmsPx: Math.sqrt(cost / Math.max(1, errors.length)),
    reprojectionMaxPx: errors.length === 0 ? 0 : Math.max(...errors)
  };
}

/**
 * How much the marking accuracy of the points could have moved the pose.
 *
 * The inverse of JᵀJ scaled by a measurement variance is the usual covariance,
 * and a flat minimum -- the near square-on view -- turns a small marking error
 * into a large pose error, which is what this is for.
 *
 * The variance is the larger of what the residuals show and what the points
 * were marked to. Taking only the residuals reports certainty that does not
 * exist: a solve fitted to points placed by hand can leave almost no residual
 * and still be a guess, and synthetic points leave none at all.
 */
export function poseUncertainty(
  pose: Pose,
  planar: readonly PlanarPoint[],
  image: readonly ImagePoint[],
  intrinsics: Intrinsics,
  distortion: Distortion,
  imageSigmaPx = DEFAULT_IMAGE_SIGMA_PX
): {translationSigmaMeters: number; rotationSigmaDeg: number} {
  const parameters = [...rotationVector(pose.rotation), ...pose.translation];
  const residuals = residualsOf(parameters, planar, image, intrinsics, distortion);
  const degreesOfFreedom = Math.max(1, residuals.length - 6);
  const variance = Math.max(sumSquares(residuals) / degreesOfFreedom, imageSigmaPx ** 2);
  const jacobian = jacobianOf(parameters, planar, image, intrinsics, distortion);
  const jt = transpose(jacobian, residuals.length, 6);
  const jtj = multiply(jt, jacobian, 6, residuals.length, 6);
  const {values, vectors} = symmetricEigen(jtj, 6);
  let rotationVariance = 0;
  let translationVariance = 0;
  for (let mode = 0; mode < 6; mode += 1) {
    const eigenvalue = values[mode] ?? 0;
    if (!(eigenvalue > 1e-12)) {
      // A direction the measurement does not constrain at all.
      return {translationSigmaMeters: Number.POSITIVE_INFINITY, rotationSigmaDeg: Number.POSITIVE_INFINITY};
    }
    const vector = columnOf(vectors, 6, mode);
    const share = variance / eigenvalue;
    for (let index = 0; index < 3; index += 1) {
      rotationVariance += share * (vector[index] ?? 0) ** 2;
      translationVariance += share * (vector[index + 3] ?? 0) ** 2;
    }
  }
  return {
    translationSigmaMeters: Math.sqrt(translationVariance),
    rotationSigmaDeg: (Math.sqrt(rotationVariance) * 180) / Math.PI
  };
}

export function rigidFromPose(pose: Pose): number[] {
  const r = pose.rotation;
  const t = pose.translation;
  return [
    r[0] ?? 0, r[1] ?? 0, r[2] ?? 0, t[0] ?? 0,
    r[3] ?? 0, r[4] ?? 0, r[5] ?? 0, t[1] ?? 0,
    r[6] ?? 0, r[7] ?? 0, r[8] ?? 0, t[2] ?? 0,
    0, 0, 0, 1
  ];
}

function residualsOf(
  parameters: readonly number[],
  planar: readonly PlanarPoint[],
  image: readonly ImagePoint[],
  intrinsics: Intrinsics,
  distortion: Distortion
): number[] {
  const rotation = rotationMatrix(parameters.slice(0, 3));
  const translation = parameters.slice(3, 6);
  const residuals: number[] = [];
  for (let index = 0; index < planar.length; index += 1) {
    const point = planar[index] as PlanarPoint;
    const observed = image[index] as ImagePoint;
    const camera = [
      (rotation[0] ?? 0) * point.u + (rotation[1] ?? 0) * point.v + (translation[0] ?? 0),
      (rotation[3] ?? 0) * point.u + (rotation[4] ?? 0) * point.v + (translation[1] ?? 0),
      (rotation[6] ?? 0) * point.u + (rotation[7] ?? 0) * point.v + (translation[2] ?? 0)
    ];
    const z = camera[2] ?? 0;
    if (!(Math.abs(z) > 1e-9)) {
      residuals.push(1e6, 1e6);
      continue;
    }
    const projected = project({x: (camera[0] ?? 0) / z, y: (camera[1] ?? 0) / z}, intrinsics, distortion);
    residuals.push(projected.u - observed.u, projected.v - observed.v);
  }
  return residuals;
}

function jacobianOf(
  parameters: readonly number[],
  planar: readonly PlanarPoint[],
  image: readonly ImagePoint[],
  intrinsics: Intrinsics,
  distortion: Distortion
): number[] {
  const rows = planar.length * 2;
  const jacobian = new Array<number>(rows * 6).fill(0);
  for (let column = 0; column < 6; column += 1) {
    const step = column < 3 ? 1e-7 : 1e-7 * Math.max(1, Math.abs(parameters[column] ?? 0));
    const forward = [...parameters];
    const backward = [...parameters];
    forward[column] = (forward[column] ?? 0) + step;
    backward[column] = (backward[column] ?? 0) - step;
    const plus = residualsOf(forward, planar, image, intrinsics, distortion);
    const minus = residualsOf(backward, planar, image, intrinsics, distortion);
    for (let row = 0; row < rows; row += 1) {
      jacobian[row * 6 + column] = ((plus[row] ?? 0) - (minus[row] ?? 0)) / (2 * step);
    }
  }
  return jacobian;
}

function pointErrors(residuals: readonly number[]): number[] {
  const errors: number[] = [];
  for (let index = 0; index < residuals.length; index += 2) {
    errors.push(Math.hypot(residuals[index] ?? 0, residuals[index + 1] ?? 0));
  }
  return errors;
}

function sumSquares(values: readonly number[]): number {
  return values.reduce((total, value) => total + value * value, 0);
}

/** The angle of the rotation taking one orientation onto the other. */
export function angleBetweenDeg(left: readonly number[], right: readonly number[]): number {
  let trace = 0;
  for (let index = 0; index < 3; index += 1) {
    for (let k = 0; k < 3; k += 1) {
      if (index === 0) trace += 0;
    }
  }
  trace = 0;
  for (let index = 0; index < 3; index += 1) {
    let total = 0;
    for (let k = 0; k < 3; k += 1) {
      total += (left[k * 3 + index] ?? 0) * (right[k * 3 + index] ?? 0);
    }
    trace += total;
  }
  const cosine = Math.min(1, Math.max(-1, (trace - 1) / 2));
  return (Math.acos(cosine) * 180) / Math.PI;
}

function centroidInCamera(pose: Pose, planar: readonly PlanarPoint[]): number[] {
  let u = 0;
  let v = 0;
  for (const point of planar) {
    u += point.u;
    v += point.v;
  }
  u /= planar.length;
  v /= planar.length;
  const r = pose.rotation;
  const t = pose.translation;
  return [
    (r[0] ?? 0) * u + (r[1] ?? 0) * v + (t[0] ?? 0),
    (r[3] ?? 0) * u + (r[4] ?? 0) * v + (t[1] ?? 0),
    (r[6] ?? 0) * u + (r[7] ?? 0) * v + (t[2] ?? 0)
  ];
}

function orthonormalize(r1: readonly number[], r2: readonly number[]): number[] | undefined {
  const a = normalizeVector(r1);
  if (!a) return undefined;
  const projection = dot(r2, a);
  const b = normalizeVector(r2.map((value, index) => value - projection * (a[index] ?? 0)));
  if (!b) return undefined;
  const c = cross(a, b);
  return [
    a[0] ?? 0, b[0] ?? 0, c[0] ?? 0,
    a[1] ?? 0, b[1] ?? 0, c[1] ?? 0,
    a[2] ?? 0, b[2] ?? 0, c[2] ?? 0
  ];
}

export function rotationVector(rotation: readonly number[]): number[] {
  const trace = (rotation[0] ?? 0) + (rotation[4] ?? 0) + (rotation[8] ?? 0);
  const cosine = Math.min(1, Math.max(-1, (trace - 1) / 2));
  const angle = Math.acos(cosine);
  if (angle < 1e-9) return [0, 0, 0];
  const sine = Math.sin(angle);
  if (Math.abs(sine) < 1e-9) {
    // A half turn: the antisymmetric part vanishes, so the axis is read from
    // the diagonal instead.
    const axis = [
      Math.sqrt(Math.max(0, ((rotation[0] ?? 0) + 1) / 2)),
      Math.sqrt(Math.max(0, ((rotation[4] ?? 0) + 1) / 2)),
      Math.sqrt(Math.max(0, ((rotation[8] ?? 0) + 1) / 2))
    ];
    return axis.map((value) => value * angle);
  }
  const factor = angle / (2 * sine);
  return [
    ((rotation[7] ?? 0) - (rotation[5] ?? 0)) * factor,
    ((rotation[2] ?? 0) - (rotation[6] ?? 0)) * factor,
    ((rotation[3] ?? 0) - (rotation[1] ?? 0)) * factor
  ];
}

export function rotationMatrix(vector: readonly number[]): number[] {
  const angle = length(vector);
  if (angle < 1e-12) return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  const axis = vector.map((value) => value / angle);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;
  const [x, y, z] = [axis[0] ?? 0, axis[1] ?? 0, axis[2] ?? 0];
  return [
    t * x * x + c, t * x * y - s * z, t * x * z + s * y,
    t * x * y + s * z, t * y * y + c, t * y * z - s * x,
    t * x * z - s * y, t * y * z + s * x, t * z * z + c
  ];
}

function conditionPlanar(points: readonly PlanarPoint[]): {
  points: PlanarPoint[];
  matrix: number[];
} {
  let cu = 0;
  let cv = 0;
  for (const point of points) {
    cu += point.u;
    cv += point.v;
  }
  cu /= points.length;
  cv /= points.length;
  let spread = 0;
  for (const point of points) spread += Math.hypot(point.u - cu, point.v - cv);
  const scale = spread > 0 ? (points.length * Math.SQRT2) / spread : 1;
  return {
    points: points.map((point) => ({u: (point.u - cu) * scale, v: (point.v - cv) * scale})),
    matrix: [scale, 0, -scale * cu, 0, scale, -scale * cv, 0, 0, 1]
  };
}

function conditionNormalized(points: readonly NormalizedPoint[]): {
  points: NormalizedPoint[];
  inverse: number[];
} {
  let cx = 0;
  let cy = 0;
  for (const point of points) {
    cx += point.x;
    cy += point.y;
  }
  cx /= points.length;
  cy /= points.length;
  let spread = 0;
  for (const point of points) spread += Math.hypot(point.x - cx, point.y - cy);
  const scale = spread > 0 ? (points.length * Math.SQRT2) / spread : 1;
  return {
    points: points.map((point) => ({x: (point.x - cx) * scale, y: (point.y - cy) * scale})),
    inverse: [1 / scale, 0, cx, 0, 1 / scale, cy, 0, 0, 1]
  };
}

function normalizeVector(vector: readonly number[]): number[] | undefined {
  const norm = length(vector);
  return norm > 0 ? vector.map((value) => value / norm) : undefined;
}

function cross(a: readonly number[], b: readonly number[]): number[] {
  return [
    (a[1] ?? 0) * (b[2] ?? 0) - (a[2] ?? 0) * (b[1] ?? 0),
    (a[2] ?? 0) * (b[0] ?? 0) - (a[0] ?? 0) * (b[2] ?? 0),
    (a[0] ?? 0) * (b[1] ?? 0) - (a[1] ?? 0) * (b[0] ?? 0)
  ];
}

function dot(a: readonly number[], b: readonly number[]): number {
  return (a[0] ?? 0) * (b[0] ?? 0) + (a[1] ?? 0) * (b[1] ?? 0) + (a[2] ?? 0) * (b[2] ?? 0);
}

function length(vector: readonly number[]): number {
  return Math.sqrt(dot(vector, vector));
}
