import type {ReferenceDefinition, ReferencePoint} from '../contracts/index.js';
import {columnOf, symmetricEigen} from './linear-algebra.js';

/**
 * The reference expressed in its own plane.
 *
 * A planar pose is solved in two dimensions, so the measured points are fitted
 * to their best plane and re-expressed in a basis lying in it. The residual of
 * that fit is kept: it says how flat the thing actually is, which a screen is
 * and a projection onto a wall may not be, and a solve that silently treats a
 * bowed surface as flat produces a pose that looks fine.
 */
export interface PlanarReference {
  readonly referenceId: string;
  readonly ids: readonly string[];
  /** Point positions in the plane, metres, matching `ids`. */
  readonly planar: ReadonlyArray<{readonly u: number; readonly v: number}>;
  /** Origin of the planar basis in reference coordinates. */
  readonly origin: readonly number[];
  /** Orthonormal in-plane axes and the plane normal, in reference coordinates. */
  readonly axisU: readonly number[];
  readonly axisV: readonly number[];
  readonly normal: readonly number[];
  /** Largest distance of any point from the fitted plane, in metres. */
  readonly planarityResidualMeters: number;
  /** One standard deviation of the measurement, averaged over the points. */
  readonly sigmaMeters: number;
  /** Largest distance between any two points, in metres. */
  readonly extentMeters: number;
}

export type PlanarReferenceResult =
  | {readonly ok: true; readonly reference: PlanarReference}
  | {readonly ok: false; readonly message: string};

export function toPlanarReference(definition: ReferenceDefinition): PlanarReferenceResult {
  const points = definition.points;
  if (points.length < 4) {
    return {ok: false, message: 'A reference needs at least four measured points.'};
  }
  const origin = centroidOf(points);
  const covariance = scatterOf(points, origin);
  const {vectors} = symmetricEigen(covariance, 3);
  // The smallest scatter direction is the plane normal; the other two span it.
  const normal = columnOf(vectors, 3, 0);
  const axisU = columnOf(vectors, 3, 2);
  const axisV = columnOf(vectors, 3, 1);

  const planar = points.map((point) => ({
    u: dot(subtract(point, origin), axisU),
    v: dot(subtract(point, origin), axisV)
  }));
  const planarityResidualMeters = Math.max(
    ...points.map((point) => Math.abs(dot(subtract(point, origin), normal)))
  );
  let extentMeters = 0;
  for (let i = 0; i < planar.length; i += 1) {
    for (let j = i + 1; j < planar.length; j += 1) {
      const a = planar[i] as {u: number; v: number};
      const b = planar[j] as {u: number; v: number};
      extentMeters = Math.max(extentMeters, Math.hypot(a.u - b.u, a.v - b.v));
    }
  }
  if (!(extentMeters > 0)) {
    return {ok: false, message: 'The reference points are all in the same place.'};
  }
  return {
    ok: true,
    reference: {
      referenceId: definition.referenceId,
      ids: points.map((point) => point.id),
      planar,
      origin,
      axisU,
      axisV,
      normal,
      planarityResidualMeters,
      sigmaMeters:
        points.reduce((total, point) => total + point.sigmaMeters, 0) / points.length,
      extentMeters
    }
  };
}

function centroidOf(points: readonly ReferencePoint[]): number[] {
  const sum = [0, 0, 0];
  for (const point of points) {
    sum[0] = (sum[0] ?? 0) + point.x;
    sum[1] = (sum[1] ?? 0) + point.y;
    sum[2] = (sum[2] ?? 0) + point.z;
  }
  return sum.map((value) => value / points.length);
}

function scatterOf(points: readonly ReferencePoint[], origin: readonly number[]): number[] {
  const matrix = new Array<number>(9).fill(0);
  for (const point of points) {
    const d = subtract(point, origin);
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 3; column += 1) {
        matrix[row * 3 + column] =
          (matrix[row * 3 + column] ?? 0) + (d[row] ?? 0) * (d[column] ?? 0);
      }
    }
  }
  return matrix;
}

function subtract(point: ReferencePoint, origin: readonly number[]): number[] {
  return [point.x - (origin[0] ?? 0), point.y - (origin[1] ?? 0), point.z - (origin[2] ?? 0)];
}

function dot(left: readonly number[], right: readonly number[]): number {
  return (left[0] ?? 0) * (right[0] ?? 0) + (left[1] ?? 0) * (right[1] ?? 0) + (left[2] ?? 0) * (right[2] ?? 0);
}
