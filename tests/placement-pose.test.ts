import {describe, expect, it} from 'vitest';
import {
  homographyFrom,
  normalize,
  poseFromHomography,
  project,
  refine,
  poseUncertainty,
  rotationMatrix,
  rotationVector,
  solvePlanarPose,
  undistort,
  applyDistortion,
  requireSupportedDistortion,
  symmetricEigen,
  type Distortion,
  type ImagePoint,
  type Intrinsics,
  type PlanarPoint,
  type Pose
} from '../src/placement/index.js';
import {errorCodeOf} from '../src/contracts/index.js';

const intrinsics: Intrinsics = {fx: 900, fy: 900, cx: 640, cy: 360, skew: 0};
const noDistortion: Distortion = {model: 'none', coefficients: []};
const lens: Distortion = {model: 'brown-conrady', coefficients: [-0.21, 0.06, 0.0008, -0.0005]};

/** A screen 1.6 m by 0.9 m, corners and a couple of interior marks. */
const board: PlanarPoint[] = [
  {u: -0.8, v: -0.45},
  {u: 0.8, v: -0.45},
  {u: 0.8, v: 0.45},
  {u: -0.8, v: 0.45},
  {u: 0, v: -0.45},
  {u: 0, v: 0.45}
];

function poseOf(rotationDeg: readonly number[], translation: readonly number[]): Pose {
  const radians = rotationDeg.map((value) => (value * Math.PI) / 180);
  return {rotation: rotationMatrix(radians), translation};
}

function renderPose(pose: Pose, distortion: Distortion = noDistortion): ImagePoint[] {
  return board.map((point) => {
    const r = pose.rotation;
    const t = pose.translation;
    const camera = [
      (r[0] as number) * point.u + (r[1] as number) * point.v + (t[0] as number),
      (r[3] as number) * point.u + (r[4] as number) * point.v + (t[1] as number),
      (r[6] as number) * point.u + (r[7] as number) * point.v + (t[2] as number)
    ];
    const z = camera[2] as number;
    return project({x: (camera[0] as number) / z, y: (camera[1] as number) / z}, intrinsics, distortion);
  });
}

function poseError(found: Pose, truth: Pose): {translation: number; rotationDeg: number} {
  const translation = Math.hypot(
    (found.translation[0] as number) - (truth.translation[0] as number),
    (found.translation[1] as number) - (truth.translation[1] as number),
    (found.translation[2] as number) - (truth.translation[2] as number)
  );
  // Angle of the rotation taking one onto the other.
  let trace = 0;
  for (let row = 0; row < 3; row += 1) {
    for (let k = 0; k < 3; k += 1) {
      if (row === 0) trace += 0;
    }
  }
  const relative: number[] = [];
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      let total = 0;
      for (let k = 0; k < 3; k += 1) {
        total += (found.rotation[k * 3 + row] as number) * (truth.rotation[k * 3 + column] as number);
      }
      relative.push(total);
    }
  }
  trace = (relative[0] as number) + (relative[4] as number) + (relative[8] as number);
  const angle = Math.acos(Math.min(1, Math.max(-1, (trace - 1) / 2)));
  return {translation, rotationDeg: (angle * 180) / Math.PI};
}

describe('rotation parameterisation', () => {
  it('round trips a rotation through its vector', () => {
    for (const degrees of [[0, 0, 0], [30, 0, 0], [0, -25, 0], [10, 20, 30], [180, 0, 0]]) {
      const matrix = rotationMatrix(degrees.map((value) => (value * Math.PI) / 180));
      const back = rotationMatrix(rotationVector(matrix));
      matrix.forEach((value, index) => expect(back[index]).toBeCloseTo(value, 9));
    }
  });
});

describe('symmetric eigen decomposition', () => {
  it('orders the eigenvalues and returns matching vectors', () => {
    const matrix = [4, 1, 0, 1, 3, 0, 0, 0, 9];
    const {values, vectors} = symmetricEigen(matrix, 3);
    expect(values[0]).toBeLessThan(values[1] as number);
    expect(values[2]).toBeCloseTo(9, 9);
    // Each column must satisfy A v = lambda v.
    for (let mode = 0; mode < 3; mode += 1) {
      const v = [0, 1, 2].map((row) => vectors[row * 3 + mode] as number);
      const av = [0, 1, 2].map((row) =>
        [0, 1, 2].reduce((total, k) => total + (matrix[row * 3 + k] as number) * (v[k] as number), 0)
      );
      av.forEach((value, index) =>
        expect(value).toBeCloseTo((values[mode] as number) * (v[index] as number), 9)
      );
    }
  });
});

describe('distortion', () => {
  it('undoes what it applies', () => {
    for (const point of [{x: 0, y: 0}, {x: 0.3, y: -0.2}, {x: -0.5, y: 0.45}]) {
      const there = applyDistortion(point, lens.coefficients);
      const back = undistort(there, lens.coefficients);
      expect(back.x).toBeCloseTo(point.x, 12);
      expect(back.y).toBeCloseTo(point.y, 12);
    }
  });

  it('refuses a model it cannot undo rather than using the nearest it knows', () => {
    // The wrong model does not raise; it moves the pose while the residual
    // stays small.
    try {
      requireSupportedDistortion({model: 'kannala-brandt', coefficients: [0, 0, 0, 0]} as never);
      expect.unreachable('should have refused');
    } catch (error) {
      expect(errorCodeOf(error)).toBe('unsupported-distortion-model');
    }
  });

  it('refuses Brown-Conrady with too few coefficients', () => {
    expect(() =>
      requireSupportedDistortion({model: 'brown-conrady', coefficients: [0.1]})
    ).toThrowError(/k1, k2, p1 and p2/);
  });

  it('normalising undoes projecting', () => {
    const point = {x: 0.21, y: -0.14};
    const pixels = project(point, intrinsics, lens);
    const back = normalize(pixels, intrinsics, lens);
    expect(back.x).toBeCloseTo(point.x, 8);
    expect(back.y).toBeCloseTo(point.y, 8);
  });
});

describe('solving a planar pose', () => {
  const truth = poseOf([12, -28, 4], [0.05, -0.02, 2.4]);

  it('recovers a pose from an undistorted view', () => {
    const result = solvePlanarPose(board, renderPose(truth), intrinsics, noDistortion);
    expect(result).toBeDefined();
    if (!result) return;
    const error = poseError(result.best, truth);
    expect(error.translation).toBeLessThan(1e-6);
    expect(error.rotationDeg).toBeLessThan(1e-4);
    expect(result.best.reprojectionRmsPx).toBeLessThan(1e-6);
  });

  it('recovers a pose through a distorted lens', () => {
    const result = solvePlanarPose(board, renderPose(truth, lens), intrinsics, lens);
    expect(result).toBeDefined();
    if (!result) return;
    expect(poseError(result.best, truth).translation).toBeLessThan(1e-5);
  });

  it('gets the homography right before any refinement', () => {
    const image = renderPose(truth);
    const normalized = image.map((point) => normalize(point, intrinsics, noDistortion));
    const homography = homographyFrom(board, normalized);
    expect(homography).toBeDefined();
    const pose = poseFromHomography(homography as number[]);
    expect(pose).toBeDefined();
    if (!pose) return;
    expect(poseError(pose, truth).translation).toBeLessThan(0.02);
  });

  it('finds no second solution when the target shows plenty of perspective', () => {
    // Refining from the reflected start slides back onto the same pose: there
    // is no second minimum to reach, which is what a determined pose looks
    // like.
    const result = solvePlanarPose(board, renderPose(truth), intrinsics, noDistortion);
    expect(result?.alternative).toBeUndefined();
    expect(result?.errorRatio).toBe(Number.POSITIVE_INFINITY);
  });

  it('cannot separate them when the target is small and far away', () => {
    // The ambiguity is about how much perspective the target shows, not about
    // tilt alone: a board spanning a few dozen pixels projects almost the same
    // either way round. This is the case a small residual hides -- both poses
    // fit, and the solver is choosing between them on noise.
    const small = board.map((point) => ({u: point.u * 0.09, v: point.v * 0.09}));
    const distant = poseOf([18, -14, 0], [0, 0, 7]);
    const image = small.map((point) => {
      const r = distant.rotation;
      const t = distant.translation;
      const camera = [
        (r[0] as number) * point.u + (r[1] as number) * point.v + (t[0] as number),
        (r[3] as number) * point.u + (r[4] as number) * point.v + (t[1] as number),
        (r[6] as number) * point.u + (r[7] as number) * point.v + (t[2] as number)
      ];
      const z = camera[2] as number;
      return project(
        {x: (camera[0] as number) / z, y: (camera[1] as number) / z},
        intrinsics,
        noDistortion
      );
    });
    const result = solvePlanarPose(small, image, intrinsics, noDistortion);
    expect(result).toBeDefined();
    if (!result) return;
    expect(result.best.reprojectionRmsPx).toBeLessThan(1e-3);
    expect(result.errorRatio).toBeLessThan(5);
  });

  it('survives noise on the image points', () => {
    let seed = 7;
    const random = (): number => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648 - 0.5;
    };
    const noisy = renderPose(truth).map((point) => ({
      u: point.u + random() * 0.6,
      v: point.v + random() * 0.6
    }));
    const result = solvePlanarPose(board, noisy, intrinsics, noDistortion);
    expect(result).toBeDefined();
    if (!result) return;
    expect(poseError(result.best, truth).translation).toBeLessThan(0.01);
    expect(result.best.reprojectionRmsPx).toBeLessThan(1);
  });

  it('refuses fewer than four correspondences', () => {
    expect(
      solvePlanarPose(board.slice(0, 3), renderPose(truth).slice(0, 3), intrinsics, noDistortion)
    ).toBeUndefined();
  });

  it('reports a wider uncertainty for a nearly square-on view', () => {
    // Same assumed marking accuracy either way; what differs is how much a
    // marking error moves the pose.
    const tilted = poseOf([25, -30, 0], [0, 0, 2.4]);
    const flat = poseOf([0.5, 0.5, 0], [0, 0, 2.4]);
    const tiltedSigma = poseUncertainty(
      refine(tilted, board, renderPose(tilted), intrinsics, noDistortion),
      board,
      renderPose(tilted),
      intrinsics,
      noDistortion
    );
    const flatSigma = poseUncertainty(
      refine(flat, board, renderPose(flat), intrinsics, noDistortion),
      board,
      renderPose(flat),
      intrinsics,
      noDistortion
    );
    expect(flatSigma.rotationSigmaDeg).toBeGreaterThan(tiltedSigma.rotationSigmaDeg);
  });
});
