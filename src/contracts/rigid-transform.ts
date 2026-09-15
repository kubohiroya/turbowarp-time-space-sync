import {finite, type Spec, tuple} from './spec.js';

/**
 * A rigid transform as 16 numbers, row-major, translation at 3, 7 and 11.
 *
 * The direction lives in the name of the field that holds it, never in the
 * matrix, so these helpers exist mainly to make the direction testable. An
 * inverted rigid transform is still orthonormal, still right-handed and still
 * has `0, 0, 0, 1` in its last row, so a consumer that validates those
 * properties accepts a matrix handed over backwards and produces a wrong
 * result with no error and no visible residual.
 */
export type RigidTransform = readonly number[];

export const rigidTransformSpec: Spec = tuple(finite(), 16);

const ORTHONORMAL_TOLERANCE = 1e-6;

export function identityRigidTransform(): number[] {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

export function isRigidTransform(matrix: RigidTransform, tolerance = 1e-3): boolean {
  if (matrix.length !== 16) return false;
  if (!matrix.every((value) => Number.isFinite(value))) return false;
  for (const [index, expected] of [[12, 0], [13, 0], [14, 0], [15, 1]] as const) {
    if (Math.abs(at(matrix, index) - expected) > ORTHONORMAL_TOLERANCE) return false;
  }
  const rotation = rotationOf(matrix);
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      let dot = 0;
      for (let k = 0; k < 3; k += 1) {
        dot += at(rotation, row * 3 + k) * at(rotation, column * 3 + k);
      }
      if (Math.abs(dot - (row === column ? 1 : 0)) > tolerance) return false;
    }
  }
  return determinant(rotation) > 0;
}

/** Rotation part in row-major 3x3 order. */
export function rotationOf(matrix: RigidTransform): number[] {
  return [0, 1, 2, 4, 5, 6, 8, 9, 10].map((index) => at(matrix, index));
}

export function translationOf(matrix: RigidTransform): number[] {
  return [3, 7, 11].map((index) => at(matrix, index));
}

/** `bFromA` composed after `cFromB` gives `cFromA`. */
export function composeRigidTransforms(
  cFromB: RigidTransform,
  bFromA: RigidTransform
): number[] {
  const result = new Array<number>(16).fill(0);
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      let total = 0;
      for (let k = 0; k < 4; k += 1) {
        total += at(cFromB, row * 4 + k) * at(bFromA, k * 4 + column);
      }
      result[row * 4 + column] = total;
    }
  }
  return result;
}

/** Turns `bFromA` into `aFromB`, transposing the rotation. */
export function invertRigidTransform(matrix: RigidTransform): number[] {
  const rotation = rotationOf(matrix);
  const translation = translationOf(matrix);
  const transposed = [0, 3, 6, 1, 4, 7, 2, 5, 8].map((index) => at(rotation, index));
  const moved = [0, 1, 2].map((row) => {
    let total = 0;
    for (let k = 0; k < 3; k += 1) total += at(transposed, row * 3 + k) * at(translation, k);
    return -total;
  });
  return [
    at(transposed, 0), at(transposed, 1), at(transposed, 2), at(moved, 0),
    at(transposed, 3), at(transposed, 4), at(transposed, 5), at(moved, 1),
    at(transposed, 6), at(transposed, 7), at(transposed, 8), at(moved, 2),
    0, 0, 0, 1
  ];
}

/** Distance between the origins of the two frames, in metres. */
export function baselineMeters(left: RigidTransform, right: RigidTransform): number {
  const a = translationOf(invertRigidTransform(left));
  const b = translationOf(invertRigidTransform(right));
  return Math.hypot(at(a, 0) - at(b, 0), at(a, 1) - at(b, 1), at(a, 2) - at(b, 2));
}

function determinant(rotation: readonly number[]): number {
  return (
    at(rotation, 0) * (at(rotation, 4) * at(rotation, 8) - at(rotation, 5) * at(rotation, 7)) -
    at(rotation, 1) * (at(rotation, 3) * at(rotation, 8) - at(rotation, 5) * at(rotation, 6)) +
    at(rotation, 2) * (at(rotation, 3) * at(rotation, 7) - at(rotation, 4) * at(rotation, 6))
  );
}

function at(values: readonly number[], index: number): number {
  return values[index] ?? 0;
}
