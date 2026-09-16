import {rigidTransformSpec, type RigidTransform} from './rigid-transform.js';
import {
  durationUs,
  enumOf,
  finite,
  identifier,
  integer,
  object,
  text,
  timestampUs,
  validate,
  type Spec,
  type ValidationResult
} from './spec.js';

export const PLACEMENT_REFERENCE_SCHEMA = 'twtss/placement-reference';
export const PLACEMENT_OBSERVATION_SCHEMA = 'twtss/placement-observation';
export const PLACEMENT_RESULT_SCHEMA = 'twtss/placement-result';
export const PLACEMENT_VERSION = 1;

/** The smallest number of coplanar correspondences a pose can be solved from. */
export const MINIMUM_REFERENCE_POINTS = 4;

export interface ReferencePoint {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** One standard deviation of the measurement of this point, in metres. */
  readonly sigmaMeters: number;
}

/**
 * A physical object several cameras can see, with its real size measured.
 *
 * Corners are listed individually rather than as a width and a height. An image
 * thrown obliquely onto a flat wall is a general quadrilateral whether or not
 * keystone correction is applied, so describing it by two lengths bakes a
 * systematic error into the scale, and scale error propagates straight into the
 * solved pose.
 */
export interface ReferenceDefinition {
  readonly schema: typeof PLACEMENT_REFERENCE_SCHEMA;
  readonly version: typeof PLACEMENT_VERSION;
  readonly referenceId: string;
  readonly kind: 'screen' | 'projection' | 'board' | 'custom';
  readonly points: readonly ReferencePoint[];
  /** How far the points sit from their best-fit plane, in metres. */
  readonly planarityResidualMeters: number;
  /** How far the outline departs from a rectangle, in metres. */
  readonly rectangularityResidualMeters: number;
  readonly measuredBy: 'tape' | 'laser' | 'nominal';
  readonly notes: readonly string[];
}

export interface ImagePoint {
  readonly id: string;
  /** Unmirrored source pixels; see IMAGE_COORDINATE_FRAME. */
  readonly u: number;
  readonly v: number;
}

export interface PlacementObservationConditions {
  readonly frameRate?: number;
  readonly exposureTimeUs?: number;
}

export interface PlacementObservation {
  readonly schema: typeof PLACEMENT_OBSERVATION_SCHEMA;
  readonly version: typeof PLACEMENT_VERSION;
  readonly cameraId: string;
  readonly referenceId: string;
  /** The intrinsic profile these pixels are to be interpreted with. */
  readonly intrinsicProfileId: string;
  readonly imagePoints: readonly ImagePoint[];
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly capturedAtUs: number;
  readonly conditions: PlacementObservationConditions;
}

export interface CameraPlacement {
  readonly cameraId: string;
  /** Maps reference-frame points into this camera's frame. */
  readonly cameraFromReference: RigidTransform;
  readonly reprojectionRmsPx: number;
  readonly reprojectionMaxPx: number;
  readonly pointCount: number;
  /**
   * Reprojection error of the rejected planar solution over the accepted one.
   *
   * A planar pose can have two solutions. As the target shows less perspective
   * their errors converge, and the solver starts choosing between them on
   * noise; a ratio near one means the pose is not determined however small the
   * residual looks.
   *
   * Absent when there is no second solution to compare against, which is what a
   * target showing plenty of perspective produces. Absent is not a very large
   * ratio: it says the question did not arise.
   */
  readonly ippeErrorRatio?: number;
  readonly translationSigmaMeters: number;
  readonly rotationSigmaDeg: number;
}

export interface CameraPair {
  readonly from: string;
  readonly to: string;
  /** Maps points in the `from` camera's frame into the `to` camera's frame. */
  readonly toFromFrom: RigidTransform;
  readonly baselineMeters: number;
  readonly baselineSigmaMeters: number;
}

export interface PlacementVerification {
  readonly kind: 'distance';
  readonly a: string;
  readonly b: string;
  readonly expectedMeters: number;
  readonly measuredMeters: number;
  readonly residualMeters: number;
}

export interface PlacementResult {
  readonly schema: typeof PLACEMENT_RESULT_SCHEMA;
  readonly version: typeof PLACEMENT_VERSION;
  readonly referenceId: string;
  readonly rigId: string;
  readonly cameras: readonly CameraPlacement[];
  readonly pairs: readonly CameraPair[];
  readonly verification: readonly PlacementVerification[];
  readonly degraded: boolean;
  readonly notes: readonly string[];
}

const referencePointSpec = object({
  id: identifier(),
  x: finite(),
  y: finite(),
  z: finite(),
  sigmaMeters: finite({minimum: 0})
});

export const referenceDefinitionSpec: Spec = object({
  schema: {kind: 'const', value: PLACEMENT_REFERENCE_SCHEMA},
  version: {kind: 'const', value: PLACEMENT_VERSION},
  referenceId: identifier(),
  kind: enumOf(['screen', 'projection', 'board', 'custom']),
  points: {
    kind: 'array',
    items: referencePointSpec,
    minItems: MINIMUM_REFERENCE_POINTS,
    maxItems: 1024
  },
  planarityResidualMeters: finite({minimum: 0}),
  rectangularityResidualMeters: finite({minimum: 0}),
  measuredBy: enumOf(['tape', 'laser', 'nominal']),
  notes: {kind: 'array', items: text(), maxItems: 32}
});

export const placementObservationSpec: Spec = object({
  schema: {kind: 'const', value: PLACEMENT_OBSERVATION_SCHEMA},
  version: {kind: 'const', value: PLACEMENT_VERSION},
  cameraId: identifier(),
  referenceId: identifier(),
  intrinsicProfileId: identifier(),
  imagePoints: {
    kind: 'array',
    items: object({id: identifier(), u: finite({minimum: 0}), v: finite({minimum: 0})}),
    minItems: MINIMUM_REFERENCE_POINTS,
    maxItems: 1024
  },
  imageWidth: integer({minimum: 1}),
  imageHeight: integer({minimum: 1}),
  capturedAtUs: timestampUs(),
  conditions: object(
    {frameRate: finite({exclusiveMinimum: 0}), exposureTimeUs: durationUs()},
    ['frameRate', 'exposureTimeUs']
  )
});

export const placementResultSpec: Spec = object({
  schema: {kind: 'const', value: PLACEMENT_RESULT_SCHEMA},
  version: {kind: 'const', value: PLACEMENT_VERSION},
  referenceId: identifier(),
  rigId: identifier(),
  cameras: {
    kind: 'array',
    items: object({
      cameraId: identifier(),
      cameraFromReference: rigidTransformSpec,
      reprojectionRmsPx: finite({minimum: 0}),
      reprojectionMaxPx: finite({minimum: 0}),
      pointCount: integer({minimum: MINIMUM_REFERENCE_POINTS}),
      ippeErrorRatio: finite({minimum: 0}),
      translationSigmaMeters: finite({minimum: 0}),
      rotationSigmaDeg: finite({minimum: 0})
    }, ['ippeErrorRatio']),
    minItems: 1,
    maxItems: 64
  },
  pairs: {
    kind: 'array',
    items: object({
      from: identifier(),
      to: identifier(),
      toFromFrom: rigidTransformSpec,
      baselineMeters: finite({minimum: 0}),
      baselineSigmaMeters: finite({minimum: 0})
    }),
    maxItems: 2048
  },
  verification: {
    kind: 'array',
    items: object({
      kind: enumOf(['distance']),
      a: identifier(),
      b: identifier(),
      expectedMeters: finite({minimum: 0}),
      measuredMeters: finite({minimum: 0}),
      residualMeters: finite()
    }),
    maxItems: 64
  },
  degraded: {kind: 'boolean'},
  notes: {kind: 'array', items: text(), maxItems: 32}
});

export function referenceDefinitionIssues(reference: ReferenceDefinition): string[] {
  const issues: string[] = [];
  const ids = new Set(reference.points.map((point) => point.id));
  if (ids.size !== reference.points.length) {
    issues.push('reference point ids must be unique');
  }
  if (reference.measuredBy === 'nominal' && reference.points.some((p) => p.sigmaMeters === 0)) {
    // A nominal size is a catalogue figure, not a measurement. Recording it
    // with zero uncertainty would let it dominate a solve it never earned.
    issues.push('a nominal reference must carry a non-zero measurement sigma');
  }
  return issues;
}

export function placementObservationIssues(observation: PlacementObservation): string[] {
  const issues: string[] = [];
  const ids = new Set(observation.imagePoints.map((point) => point.id));
  if (ids.size !== observation.imagePoints.length) {
    issues.push('image point ids must be unique');
  }
  for (const point of observation.imagePoints) {
    if (point.u > observation.imageWidth || point.v > observation.imageHeight) {
      issues.push(`image point ${point.id} falls outside the image`);
      break;
    }
  }
  return issues;
}

export function placementResultIssues(result: PlacementResult): string[] {
  const issues: string[] = [];
  const known = new Set(result.cameras.map((camera) => camera.cameraId));
  if (known.size !== result.cameras.length) issues.push('camera ids must be unique');
  for (const pair of result.pairs) {
    if (!known.has(pair.from) || !known.has(pair.to)) {
      issues.push(`pair ${pair.from}->${pair.to} names a camera without a placement`);
      break;
    }
  }
  for (const camera of result.cameras) {
    if (camera.reprojectionMaxPx < camera.reprojectionRmsPx) {
      issues.push(`camera ${camera.cameraId} reports a maximum below its RMS`);
      break;
    }
  }
  return issues;
}

export function parseReferenceDefinition(value: unknown): ValidationResult<ReferenceDefinition> {
  return parseWith<ReferenceDefinition>(referenceDefinitionSpec, value, referenceDefinitionIssues);
}

export function parsePlacementObservation(value: unknown): ValidationResult<PlacementObservation> {
  return parseWith<PlacementObservation>(
    placementObservationSpec,
    value,
    placementObservationIssues
  );
}

export function parsePlacementResult(value: unknown): ValidationResult<PlacementResult> {
  return parseWith<PlacementResult>(placementResultSpec, value, placementResultIssues);
}

function parseWith<T>(
  spec: Spec,
  value: unknown,
  extra: (parsed: T) => string[]
): ValidationResult<T> {
  const result = validate<T>(spec, value);
  if (!result.ok) return result;
  const issues = extra(result.value);
  if (issues.length > 0) {
    return {ok: false, issues: issues.map((message) => ({path: '', message}))};
  }
  return result;
}
