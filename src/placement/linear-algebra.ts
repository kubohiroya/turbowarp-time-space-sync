/**
 * The small amount of linear algebra a planar pose needs.
 *
 * Written out rather than pulled in: the whole extension has no runtime
 * dependencies, and a matrix library would be paid for by everyone who loads it
 * to show a pattern. Nothing here is general -- the sizes are fixed by the
 * problem, and each routine states the shape it expects.
 */

export type Matrix = readonly number[];

export function multiply(
  left: Matrix,
  right: Matrix,
  rows: number,
  inner: number,
  columns: number
): number[] {
  const result = new Array<number>(rows * columns).fill(0);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      let total = 0;
      for (let k = 0; k < inner; k += 1) {
        total += (left[row * inner + k] ?? 0) * (right[k * columns + column] ?? 0);
      }
      result[row * columns + column] = total;
    }
  }
  return result;
}

export function transpose(values: Matrix, rows: number, columns: number): number[] {
  const result = new Array<number>(rows * columns).fill(0);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      result[column * rows + row] = values[row * columns + column] ?? 0;
    }
  }
  return result;
}

export interface Eigen {
  /** Ascending eigenvalues. */
  readonly values: number[];
  /** Column `i` of this row-major matrix is the vector for `values[i]`. */
  readonly vectors: number[];
}

/**
 * Eigen decomposition of a symmetric matrix, by cyclic Jacobi rotations.
 *
 * Used for two things: the smallest eigenvector of `AᵀA`, which is the
 * homogeneous least-squares solution a homography needs, and the parameter
 * covariance a refinement leaves behind. Jacobi is chosen over anything faster
 * because the matrices are nine by nine at most and it needs no pivoting, no
 * balancing and no special cases to be correct.
 */
export function symmetricEigen(matrix: Matrix, size: number, sweeps = 60): Eigen {
  const a = [...matrix];
  const v = new Array<number>(size * size).fill(0);
  for (let index = 0; index < size; index += 1) v[index * size + index] = 1;

  for (let sweep = 0; sweep < sweeps; sweep += 1) {
    let off = 0;
    for (let p = 0; p < size; p += 1) {
      for (let q = p + 1; q < size; q += 1) off += (a[p * size + q] ?? 0) ** 2;
    }
    if (off < 1e-24) break;
    for (let p = 0; p < size; p += 1) {
      for (let q = p + 1; q < size; q += 1) {
        const apq = a[p * size + q] ?? 0;
        if (Math.abs(apq) < 1e-30) continue;
        const app = a[p * size + p] ?? 0;
        const aqq = a[q * size + q] ?? 0;
        const theta = (aqq - app) / (2 * apq);
        const t =
          Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < size; k += 1) {
          const akp = a[k * size + p] ?? 0;
          const akq = a[k * size + q] ?? 0;
          a[k * size + p] = c * akp - s * akq;
          a[k * size + q] = s * akp + c * akq;
        }
        for (let k = 0; k < size; k += 1) {
          const apk = a[p * size + k] ?? 0;
          const aqk = a[q * size + k] ?? 0;
          a[p * size + k] = c * apk - s * aqk;
          a[q * size + k] = s * apk + c * aqk;
        }
        for (let k = 0; k < size; k += 1) {
          const vkp = v[k * size + p] ?? 0;
          const vkq = v[k * size + q] ?? 0;
          v[k * size + p] = c * vkp - s * vkq;
          v[k * size + q] = s * vkp + c * vkq;
        }
      }
    }
  }

  const order = Array.from({length: size}, (_, index) => index).sort(
    (left, right) => (a[left * size + left] ?? 0) - (a[right * size + right] ?? 0)
  );
  const values = order.map((index) => a[index * size + index] ?? 0);
  const vectors = new Array<number>(size * size).fill(0);
  order.forEach((source, target) => {
    for (let row = 0; row < size; row += 1) {
      vectors[row * size + target] = v[row * size + source] ?? 0;
    }
  });
  return {values, vectors};
}

/** Column `index` of a row-major square matrix. */
export function columnOf(matrix: Matrix, size: number, index: number): number[] {
  return Array.from({length: size}, (_, row) => matrix[row * size + index] ?? 0);
}

/**
 * Solves a symmetric positive definite system by Cholesky.
 *
 * Returns undefined rather than a large wrong answer when the matrix is not
 * positive definite, which is what a degenerate set of correspondences
 * produces: there the problem has no unique solution and saying so is the
 * result.
 */
export function solveSymmetric(matrix: Matrix, rhs: Matrix, size: number): number[] | undefined {
  const l = new Array<number>(size * size).fill(0);
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column <= row; column += 1) {
      let total = matrix[row * size + column] ?? 0;
      for (let k = 0; k < column; k += 1) {
        total -= (l[row * size + k] ?? 0) * (l[column * size + k] ?? 0);
      }
      if (row === column) {
        if (!(total > 0) || !Number.isFinite(total)) return undefined;
        l[row * size + column] = Math.sqrt(total);
      } else {
        const pivot = l[column * size + column] ?? 0;
        if (pivot === 0) return undefined;
        l[row * size + column] = total / pivot;
      }
    }
  }
  const y = new Array<number>(size).fill(0);
  for (let row = 0; row < size; row += 1) {
    let total = rhs[row] ?? 0;
    for (let k = 0; k < row; k += 1) total -= (l[row * size + k] ?? 0) * (y[k] ?? 0);
    y[row] = total / (l[row * size + row] ?? 1);
  }
  const x = new Array<number>(size).fill(0);
  for (let row = size - 1; row >= 0; row -= 1) {
    let total = y[row] ?? 0;
    for (let k = row + 1; k < size; k += 1) total -= (l[k * size + row] ?? 0) * (x[k] ?? 0);
    x[row] = total / (l[row * size + row] ?? 1);
  }
  return x.every((value) => Number.isFinite(value)) ? x : undefined;
}
