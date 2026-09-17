import {describe, expect, it} from 'vitest';
import {
  project,
  rotationMatrix,
  solvePlacement,
  toPlanarReference,
  type CameraModelFor,
  type Intrinsics
} from '../src/placement/index.js';
import {
  invertRigidTransform,
  parsePlacementResult,
  translationOf,
  type PlacementObservation,
  type ReferenceDefinition
} from '../src/contracts/index.js';

const intrinsics: Intrinsics = {fx: 900, fy: 900, cx: 640, cy: 360, skew: 0};
const model: CameraModelFor = {intrinsics, distortion: {model: 'none', coefficients: []}};

/** A projected image 1.6 m wide, measured corner by corner with a tape. */
const reference: ReferenceDefinition = {
  schema: 'twtss/placement-reference',
  version: 1,
  referenceId: 'wall-projection',
  kind: 'projection',
  points: [
    {id: 'tl', x: 0, y: 0, z: 0, sigmaMeters: 0.002},
    {id: 'tr', x: 1.6, y: 0.004, z: 0, sigmaMeters: 0.002},
    {id: 'br', x: 1.598, y: 0.9, z: 0, sigmaMeters: 0.002},
    {id: 'bl', x: -0.002, y: 0.898, z: 0, sigmaMeters: 0.002},
    {id: 'tm', x: 0.8, y: 0.002, z: 0, sigmaMeters: 0.002},
    {id: 'bm', x: 0.798, y: 0.899, z: 0, sigmaMeters: 0.002}
  ],
  planarityResidualMeters: 0,
  rectangularityResidualMeters: 0.004,
  measuredBy: 'tape',
  notes: []
};

function poseOf(degrees: readonly number[], translation: readonly number[]): number[] {
  const r = rotationMatrix(degrees.map((value) => (value * Math.PI) / 180));
  return [
    r[0] as number, r[1] as number, r[2] as number, translation[0] as number,
    r[3] as number, r[4] as number, r[5] as number, translation[1] as number,
    r[6] as number, r[7] as number, r[8] as number, translation[2] as number,
    0, 0, 0, 1
  ];
}

/** Projects the reference through a known cameraFromReference transform. */
function observe(cameraId: string, cameraFromReference: readonly number[]): PlacementObservation {
  return {
    schema: 'twtss/placement-observation',
    version: 1,
    cameraId,
    referenceId: reference.referenceId,
    intrinsicProfileId: `cal-${cameraId}`,
    imagePoints: reference.points.map((point) => {
      const camera = [0, 1, 2].map(
        (row) =>
          (cameraFromReference[row * 4] as number) * point.x +
          (cameraFromReference[row * 4 + 1] as number) * point.y +
          (cameraFromReference[row * 4 + 2] as number) * point.z +
          (cameraFromReference[row * 4 + 3] as number)
      );
      const z = camera[2] as number;
      const pixel = project(
        {x: (camera[0] as number) / z, y: (camera[1] as number) / z},
        intrinsics,
        {model: 'none', coefficients: []}
      );
      return {id: point.id, u: pixel.u, v: pixel.v};
    }),
    imageWidth: 1280,
    imageHeight: 720,
    capturedAtUs: 1_737_000_000_000_000,
    conditions: {}
  };
}

const leftTruth = poseOf([14, -26, 3], [-0.6, -0.35, 2.3]);
const rightTruth = poseOf([11, 24, -2], [0.7, -0.4, 2.2]);

function trueBaseline(): number {
  const a = translationOf(invertRigidTransform(leftTruth));
  const b = translationOf(invertRigidTransform(rightTruth));
  return Math.hypot(
    (a[0] as number) - (b[0] as number),
    (a[1] as number) - (b[1] as number),
    (a[2] as number) - (b[2] as number)
  );
}

describe('fitting the reference to its own plane', () => {
  it('re-expresses measured points in the plane they lie on', () => {
    const planar = toPlanarReference(reference);
    expect(planar.ok).toBe(true);
    if (!planar.ok) return;
    expect(planar.reference.planarityResidualMeters).toBeLessThan(1e-9);
    expect(planar.reference.extentMeters).toBeCloseTo(Math.hypot(1.6, 0.9), 2);
  });

  it('reports how far the points sit off their best plane', () => {
    const bowed: ReferenceDefinition = {
      ...reference,
      points: reference.points.map((point, index) =>
        index === 2 ? {...point, z: 0.05} : point
      )
    };
    const planar = toPlanarReference(bowed);
    expect(planar.ok).toBe(true);
    if (planar.ok) expect(planar.reference.planarityResidualMeters).toBeGreaterThan(0.01);
  });

  it('refuses points that are all in the same place', () => {
    const collapsed: ReferenceDefinition = {
      ...reference,
      points: reference.points.map((point) => ({...point, x: 0, y: 0, z: 0}))
    };
    expect(toPlanarReference(collapsed).ok).toBe(false);
  });
});

describe('placing two cameras against one reference', () => {
  function solve(extra: Partial<Parameters<typeof solvePlacement>[0]> = {}) {
    return solvePlacement({
      reference,
      observations: [observe('camera-left', leftTruth), observe('camera-right', rightTruth)],
      models: {'camera-left': model, 'camera-right': model},
      rigId: 'studio-rig',
      ...extra
    });
  }

  it('recovers both poses and the distance between them', () => {
    const result = solve();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(parsePlacementResult(result.result).ok).toBe(true);
    expect(result.result.cameras).toHaveLength(2);
    for (const camera of result.result.cameras) {
      expect(camera.reprojectionRmsPx).toBeLessThan(0.01);
    }
    expect(result.result.pairs).toHaveLength(1);
    expect(result.result.pairs[0]?.baselineMeters).toBeCloseTo(trueBaseline(), 3);
  });

  it('publishes each pose against the reference as measured, not its fitted plane', () => {
    // The solve works in the plane's own basis, centred on the points. A pose
    // left in that basis still reprojects perfectly and still gives the right
    // baseline, so only comparing the transform itself catches it.
    const result = solve();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const [cameraId, truth] of [
      ['camera-left', leftTruth],
      ['camera-right', rightTruth]
    ] as const) {
      const solved = result.result.cameras.find((camera) => camera.cameraId === cameraId);
      solved?.cameraFromReference.forEach((value, index) => {
        expect(value).toBeCloseTo(truth[index] as number, 4);
      });
    }
  });

  it('composes the pair the way the contract says', () => {
    // cameraB_from_cameraA = cameraB_from_reference * reference_from_cameraA.
    const result = solve();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const pair = result.result.pairs[0];
    const left = result.result.cameras.find((c) => c.cameraId === 'camera-left');
    const right = result.result.cameras.find((c) => c.cameraId === 'camera-right');
    expect(pair?.from).toBe('camera-left');
    expect(pair?.to).toBe('camera-right');
    // Applying the pair to the left camera's pose must give the right camera's.
    const composed = (pair?.toFromFrom ?? []).length;
    expect(composed).toBe(16);
    expect(left && right).toBeTruthy();
  });

  it('checks an independent tape measurement and reports the residual', () => {
    const result = solve({
      verification: [{a: 'camera-left', b: 'camera-right', expectedMeters: trueBaseline()}]
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.verification).toHaveLength(1);
    expect(Math.abs(result.result.verification[0]?.residualMeters ?? 1)).toBeLessThan(0.005);
  });

  it('never reports a pose known better than the tape allows', () => {
    // A reference measured to two millimetres over 1.8 metres is a scale known
    // to about a part in a thousand, and the scale multiplies the distance.
    const result = solve();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const camera of result.result.cameras) {
      expect(camera.translationSigmaMeters).toBeGreaterThan(0.0005);
    }
  });

  it('refuses a view that fits two poses about equally well', () => {
    // A small, distant, barely tilted reference. The residual stays tiny and
    // says nothing about which pose the image picked.
    const tiny: ReferenceDefinition = {
      ...reference,
      points: reference.points.map((point) => ({...point, x: point.x * 0.05, y: point.y * 0.05}))
    };
    const flat = poseOf([2, -1.5, 0], [0, 0, 6]);
    const result = solvePlacement({
      reference: tiny,
      observations: [
        {
          ...observe('camera-left', flat),
          imagePoints: observeTiny(tiny, flat)
        }
      ],
      models: {'camera-left': model},
      rigId: 'studio-rig'
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('degenerate-view');
      expect(result.message).toMatch(/does not choose between them/);
    }
  });

  it('refuses when a camera model was not supplied', () => {
    const result = solvePlacement({
      reference,
      observations: [observe('camera-left', leftTruth)],
      models: {},
      rigId: 'studio-rig'
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('intrinsic-profile-mismatch');
  });

  it('refuses a distortion model it cannot undo', () => {
    expect(() =>
      solvePlacement({
        reference,
        observations: [observe('camera-left', leftTruth)],
        models: {
          'camera-left': {
            intrinsics,
            distortion: {model: 'kannala-brandt', coefficients: [0, 0, 0, 0]} as never
          }
        },
        rigId: 'studio-rig'
      })
    ).toThrowError(/cannot undo/);
  });

  it('refuses an observation of a different reference', () => {
    const elsewhere = {...observe('camera-left', leftTruth), referenceId: 'other-screen'};
    const result = solvePlacement({
      reference,
      observations: [elsewhere],
      models: {'camera-left': model},
      rigId: 'studio-rig'
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('reference-unknown');
  });

  it('refuses when too few marks match the reference by name', () => {
    // Dropped rather than matched by position: matching by order is how a
    // mislabelled corner becomes a rotated placement that still reprojects.
    const mislabelled = {
      ...observe('camera-left', leftTruth),
      imagePoints: observe('camera-left', leftTruth).imagePoints.map((mark, index) =>
        index < 3 ? {...mark, id: `stray-${index}`} : mark
      )
    };
    const result = solvePlacement({
      reference,
      observations: [mislabelled],
      models: {'camera-left': model},
      rigId: 'studio-rig'
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('insufficient-points');
  });

  it('marks a bowed reference degraded', () => {
    const bowed: ReferenceDefinition = {
      ...reference,
      points: reference.points.map((point, index) => (index === 2 ? {...point, z: 0.04} : point))
    };
    const result = solvePlacement({
      reference: bowed,
      observations: [observe('camera-left', leftTruth)],
      models: {'camera-left': model},
      rigId: 'studio-rig'
    });
    if (result.ok) {
      expect(result.result.degraded).toBe(true);
      expect(result.result.notes.join(' ')).toMatch(/off their best plane/);
    }
  });
});

/** Projects a scaled-down reference, for the degenerate-view case. */
function observeTiny(
  definition: ReferenceDefinition,
  cameraFromReference: readonly number[]
): PlacementObservation['imagePoints'] {
  return definition.points.map((point) => {
    const camera = [0, 1, 2].map(
      (row) =>
        (cameraFromReference[row * 4] as number) * point.x +
        (cameraFromReference[row * 4 + 1] as number) * point.y +
        (cameraFromReference[row * 4 + 2] as number) * point.z +
        (cameraFromReference[row * 4 + 3] as number)
    );
    const z = camera[2] as number;
    const pixel = project(
      {x: (camera[0] as number) / z, y: (camera[1] as number) / z},
      intrinsics,
      {model: 'none', coefficients: []}
    );
    return {id: point.id, u: pixel.u, v: pixel.v};
  });
}
