import {
  PLACEMENT_RESULT_SCHEMA,
  PLACEMENT_VERSION,
  baselineMeters,
  composeRigidTransforms,
  invertRigidTransform,
  type CameraPair,
  type CameraPlacement,
  type PlacementObservation,
  type PlacementResult,
  type PlacementVerification,
  type ReferenceDefinition,
  type TimeSpaceSyncErrorCode
} from '../contracts/index.js';
import {requireSupportedDistortion, type Distortion, type Intrinsics} from './camera-model.js';
import {poseUncertainty, rigidFromPose, solvePlanarPose} from './planar-pose.js';
import {toPlanarReference} from './reference.js';

/**
 * What the camera is, for one observation.
 *
 * Supplied by the caller rather than read from a camera here. Which numbers
 * describe a frame is Camera Source's question -- it is the only thing that can
 * tell a scaled capture from a cropped one -- and duplicating that judgement
 * would let the same camera yield different geometry depending on who asked.
 */
export interface CameraModelFor {
  readonly intrinsics: Intrinsics;
  readonly distortion: Distortion;
}

export interface SolveOptions {
  readonly reference: ReferenceDefinition;
  readonly observations: readonly PlacementObservation[];
  /** The camera model for each `cameraId` appearing in the observations. */
  readonly models: Readonly<Record<string, CameraModelFor>>;
  readonly rigId: string;
  /** Independent distance checks between camera bodies, in metres. */
  readonly verification?: ReadonlyArray<{a: string; b: string; expectedMeters: number}>;
  /** How well a point can be placed in the image. */
  readonly imageSigmaPx?: number;
  /** Least separation the two planar solutions must show to be trusted apart. */
  readonly minimumErrorRatio?: number;
}

export type SolveResult =
  | {readonly ok: true; readonly result: PlacementResult}
  | {readonly ok: false; readonly code: TimeSpaceSyncErrorCode; readonly message: string};

const DEFAULT_MINIMUM_ERROR_RATIO = 2;

/**
 * Places every camera that saw the reference, and the cameras against each other.
 *
 * A pose is refused when the two planar solutions fit within a factor of each
 * other, however small the residual is. A residual says the pose explains the
 * image; it does not say the image picked that pose out of the alternatives,
 * and for a target showing little perspective it does not.
 */
export function solvePlacement(options: SolveOptions): SolveResult {
  const planar = toPlanarReference(options.reference);
  if (!planar.ok) {
    return {ok: false, code: 'reference-unknown', message: planar.message};
  }
  const reference = planar.reference;
  const byId = new Map(reference.ids.map((id, index) => [id, index]));
  const minimumRatio = options.minimumErrorRatio ?? DEFAULT_MINIMUM_ERROR_RATIO;
  const cameras: CameraPlacement[] = [];
  const poses = new Map<string, number[]>();
  const notes: string[] = [];
  let degraded = false;

  for (const observation of options.observations) {
    if (observation.referenceId !== reference.referenceId) {
      return {
        ok: false,
        code: 'reference-unknown',
        message: `Camera ${observation.cameraId} observed ${observation.referenceId}, not ${reference.referenceId}.`
      };
    }
    const model = options.models[observation.cameraId];
    if (!model) {
      return {
        ok: false,
        code: 'intrinsic-profile-mismatch',
        message: `No camera model was supplied for ${observation.cameraId}.`
      };
    }
    requireSupportedDistortion(model.distortion);

    const paired = pairPoints(observation, byId, reference);
    if (!paired) {
      return {
        ok: false,
        code: 'insufficient-points',
        message: `Camera ${observation.cameraId} did not mark at least four of the reference points.`
      };
    }
    const solution = solvePlanarPose(
      paired.planar,
      paired.image,
      model.intrinsics,
      model.distortion,
      options.imageSigmaPx
    );
    if (!solution) {
      return {
        ok: false,
        code: 'degenerate-view',
        message: `Camera ${observation.cameraId} produced no pose: its marks may be collinear.`
      };
    }
    if (solution.errorRatio < minimumRatio) {
      return {
        ok: false,
        code: 'degenerate-view',
        message: `Camera ${observation.cameraId} fits two poses about equally well (${solution.errorRatio.toFixed(2)}x apart), so the measurement does not choose between them. Tilt the reference or bring it closer.`
      };
    }
    const sigma = poseUncertainty(
      solution.best,
      paired.planar,
      paired.image,
      model.intrinsics,
      model.distortion,
      options.imageSigmaPx
    );
    // A reference measured to the nearest few millimetres carries that error
    // straight into the scale, and the scale multiplies the distance. Ignoring
    // it would report a pose known better than the tape measure allows.
    const scaleShare =
      reference.extentMeters > 0
        ? (reference.sigmaMeters / reference.extentMeters) *
          Math.hypot(...solution.best.translation)
        : 0;
    // The pose was solved against the plane's own basis. Composing with the map
    // from reference coordinates into that basis is what makes the published
    // transform take the points as they were measured, rather than as the
    // solver happened to re-express them.
    const cameraFromReference = composeRigidTransforms(
      rigidFromPose(solution.best),
      planarFromReference(reference)
    );
    poses.set(observation.cameraId, cameraFromReference);
    cameras.push({
      cameraId: observation.cameraId,
      cameraFromReference,
      reprojectionRmsPx: round(solution.best.reprojectionRmsPx),
      reprojectionMaxPx: round(solution.best.reprojectionMaxPx),
      pointCount: paired.planar.length,
      // Left out when the refinement found no second solution to compare
      // against: reporting a very large ratio would read as a measurement of
      // how much better this pose fits than one that was never there.
      ...(Number.isFinite(solution.errorRatio)
        ? {ippeErrorRatio: round(solution.errorRatio)}
        : {}),
      translationSigmaMeters: round(Math.hypot(sigma.translationSigmaMeters, scaleShare)),
      rotationSigmaDeg: round(sigma.rotationSigmaDeg)
    });
  }

  if (cameras.length === 0) {
    return {ok: false, code: 'insufficient-points', message: 'No camera observed the reference.'};
  }
  if (reference.planarityResidualMeters > reference.sigmaMeters * 5) {
    degraded = true;
    notes.push(
      `The reference points sit up to ${reference.planarityResidualMeters.toFixed(4)} m off their best plane, which is beyond how well they were measured.`
    );
  }

  const pairs: CameraPair[] = [];
  const ids = [...poses.keys()];
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const from = ids[i] as string;
      const to = ids[j] as string;
      const fromPose = poses.get(from) as number[];
      const toPose = poses.get(to) as number[];
      // cameraB_from_cameraA = cameraB_from_reference * reference_from_cameraA.
      const toFromFrom = composeRigidTransforms(toPose, invertRigidTransform(fromPose));
      const baseline = baselineMeters(fromPose, toPose);
      const sigmaFrom = cameras.find((entry) => entry.cameraId === from)?.translationSigmaMeters ?? 0;
      const sigmaTo = cameras.find((entry) => entry.cameraId === to)?.translationSigmaMeters ?? 0;
      pairs.push({
        from,
        to,
        toFromFrom: toFromFrom.map(round),
        baselineMeters: round(baseline),
        baselineSigmaMeters: round(Math.hypot(sigmaFrom, sigmaTo))
      });
    }
  }

  const verification: PlacementVerification[] = [];
  for (const check of options.verification ?? []) {
    const fromPose = poses.get(check.a);
    const toPose = poses.get(check.b);
    if (!fromPose || !toPose) {
      return {
        ok: false,
        code: 'verification-failed',
        message: `The distance check names ${check.a} and ${check.b}, and one of them has no placement.`
      };
    }
    const measured = baselineMeters(fromPose, toPose);
    verification.push({
      kind: 'distance',
      a: check.a,
      b: check.b,
      expectedMeters: check.expectedMeters,
      measuredMeters: round(measured),
      residualMeters: round(measured - check.expectedMeters)
    });
  }

  return {
    ok: true,
    result: {
      schema: PLACEMENT_RESULT_SCHEMA,
      version: PLACEMENT_VERSION,
      referenceId: reference.referenceId,
      rigId: options.rigId,
      cameras,
      pairs,
      verification,
      degraded,
      notes
    }
  };
}

/**
 * The rigid map from reference coordinates into the plane's own basis.
 *
 * A planar pose treats the plane as z = 0 with its third axis the cross product
 * of the two in-plane axes. The fitted plane normal is only known up to sign, so
 * it is not used here: taking it as found would make the map a reflection for
 * half of all references, and a reflected pose still reprojects perfectly.
 */
function planarFromReference(reference: {
  origin: readonly number[];
  axisU: readonly number[];
  axisV: readonly number[];
}): number[] {
  const u = reference.axisU;
  const v = reference.axisV;
  const w = [
    (u[1] ?? 0) * (v[2] ?? 0) - (u[2] ?? 0) * (v[1] ?? 0),
    (u[2] ?? 0) * (v[0] ?? 0) - (u[0] ?? 0) * (v[2] ?? 0),
    (u[0] ?? 0) * (v[1] ?? 0) - (u[1] ?? 0) * (v[0] ?? 0)
  ];
  const rows = [u, v, w];
  const o = reference.origin;
  return [
    ...rows.flatMap((row) => [
      row[0] ?? 0,
      row[1] ?? 0,
      row[2] ?? 0,
      -((row[0] ?? 0) * (o[0] ?? 0) + (row[1] ?? 0) * (o[1] ?? 0) + (row[2] ?? 0) * (o[2] ?? 0))
    ]),
    0,
    0,
    0,
    1
  ];
}

/**
 * Matches marked image points to measured reference points by name.
 *
 * Only the points both sides name are used. A mark whose name is not in the
 * reference is dropped rather than matched by position: matching by order is
 * how a mislabelled corner becomes a rotated placement that still reprojects
 * neatly.
 */
function pairPoints(
  observation: PlacementObservation,
  byId: ReadonlyMap<string, number>,
  reference: {planar: ReadonlyArray<{u: number; v: number}>}
): {planar: Array<{u: number; v: number}>; image: Array<{u: number; v: number}>} | undefined {
  const planar: Array<{u: number; v: number}> = [];
  const image: Array<{u: number; v: number}> = [];
  for (const mark of observation.imagePoints) {
    const index = byId.get(mark.id);
    if (index === undefined) continue;
    const point = reference.planar[index];
    if (!point) continue;
    planar.push({u: point.u, v: point.v});
    image.push({u: mark.u, v: mark.v});
  }
  return planar.length >= 4 ? {planar, image} : undefined;
}

/**
 * Trims the published numbers to a precision a camera could support.
 *
 * Nine decimals on a metre is a nanometre, which is not a measurement but the
 * tail of an iterative solve, and it differs between machines that agree about
 * everything that matters. Six is a micrometre: far finer than any of this can
 * see, and stable.
 */
function round(value: number): number {
  return Number.isFinite(value) ? Number(value.toFixed(6)) : 0;
}
