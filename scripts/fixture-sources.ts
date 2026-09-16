import {
  OPTICAL_TIME_OBSERVATION_SCHEMA,
  OPTICAL_TIME_OBSERVATION_VERSION,
  PLACEMENT_REFERENCE_SCHEMA,
  PLACEMENT_VERSION,
  type ClockDomain,
  type OpticalTimeObservation,
  type PlacementObservation,
  type ReferenceDefinition
} from '../src/contracts/index.js';
import {estimateTimeCorrespondence} from '../src/optical-time/index.js';
import {project, rotationMatrix, solvePlacement, type Intrinsics} from '../src/placement/index.js';

/**
 * Builds the published samples by running the real code.
 *
 * The scene is deliberately mundane: one camera watching a projected image at
 * 60 Hz, two cameras placed against a screen whose corners were measured with a
 * tape. What a consumer needs from these is the shape and the vocabulary, not
 * an interesting measurement.
 */

const REFRESH_US = 16_667;
const OBSERVER: ClockDomain = {
  id: 'local:9f1c5a2e',
  kind: 'local-monotonic',
  epoch: 0,
  uncertaintyUs: 0
};
const DISPLAY: ClockDomain = {
  id: 'webrtc:studio-host',
  kind: 'webrtc-synchronized',
  epoch: 3,
  uncertaintyUs: 450
};
const START_US = 1_737_000_000_000_000;
const DELAY_US = 48_000;

const intrinsics: Intrinsics = {fx: 900, fy: 900, cx: 640, cy: 360, skew: 0};

const reference: ReferenceDefinition = {
  schema: PLACEMENT_REFERENCE_SCHEMA,
  version: PLACEMENT_VERSION,
  referenceId: 'wall-projection',
  kind: 'projection',
  points: [
    {id: 'tl', x: 0, y: 0, z: 0, sigmaMeters: 0.002},
    {id: 'tr', x: 1.612, y: 0.004, z: 0, sigmaMeters: 0.002},
    {id: 'br', x: 1.609, y: 0.908, z: 0, sigmaMeters: 0.002},
    {id: 'bl', x: -0.003, y: 0.905, z: 0, sigmaMeters: 0.002},
    {id: 'tm', x: 0.806, y: 0.002, z: 0, sigmaMeters: 0.002},
    {id: 'bm', x: 0.803, y: 0.906, z: 0, sigmaMeters: 0.002}
  ],
  planarityResidualMeters: 0,
  rectangularityResidualMeters: 0.004,
  measuredBy: 'tape',
  notes: ['Corners measured individually; the projected outline is not a rectangle.']
};

function observation(sequence: number): OpticalTimeObservation {
  const captureUs = START_US + sequence * 33_000;
  // The display changes on its own refresh grid rather than exactly one delay
  // before each capture, so the captures fall at different phases of the code
  // that was on screen. That is what lets a run of readings narrow the answer:
  // identical phases would give identical intervals and intersect to no more
  // than one of them.
  const onsetUs = Math.floor((captureUs - DELAY_US) / REFRESH_US) * REFRESH_US;
  const wrapUs = 4_096_000;
  const code = ((onsetUs % wrapUs) + wrapUs) % wrapUs;
  return {
    schema: OPTICAL_TIME_OBSERVATION_SCHEMA,
    version: OPTICAL_TIME_OBSERVATION_VERSION,
    cameraId: 'camera-left',
    referenceId: 'wall-projection',
    patternProfileId: 'twtss.pattern.v1',
    observerDomain: OBSERVER,
    displayDomain: DISPLAY,
    deliveredAtUs: captureUs + 210,
    monotonicAtUs: 421_000_000 + sequence * 33_000,
    captureTimeUs: captureUs,
    captureTimeKind: 'capture',
    patternCodeTimestampUs: code - (code % 1000),
    wrapUs,
    stepUs: 1000,
    displayRefreshUs: REFRESH_US,
    refreshUncertaintyUs: 120,
    constraintLoUs: captureUs,
    constraintHiUs: captureUs + 210,
    decodeMargin: 41.5,
    panel: {x: 68, y: 32, width: 96, height: 96},
    imageWidth: 240,
    imageHeight: 180,
    captureConditions: {frameRate: 30, width: 1280, height: 720, exposureTimeUs: 8000},
    intrinsicProfileId: 'cal-2026-09-15-left',
    sequence
  };
}

function poseOf(degrees: readonly number[], translation: readonly number[]): number[] {
  const r = rotationMatrix(degrees.map((value) => (value * Math.PI) / 180));
  return [
    r[0] as number, r[1] as number, r[2] as number, translation[0] as number,
    r[3] as number, r[4] as number, r[5] as number, translation[1] as number,
    r[6] as number, r[7] as number, r[8] as number, translation[2] as number,
    0, 0, 0, 1
  ];
}

/**
 * Marks placed about a third of a pixel from where the geometry puts them.
 *
 * Without it the sample is solved from points that are exact to the last bit,
 * and the numbers that come back carry fifteen digits of floating point noise
 * where a measurement would have none. Two machines then disagree about the
 * sample while agreeing about the measurement. The jitter is generated from a
 * fixed seed, so the file is the same everywhere; what it buys is a sample
 * whose residuals look like a camera rather than like arithmetic.
 */
function jitter(seed: number): number {
  const value = (seed * 1103515245 + 12345) % 2147483648;
  return (value / 2147483648 - 0.5) * 0.7;
}

function placementObservation(
  cameraId: string,
  cameraFromReference: readonly number[]
): PlacementObservation {
  return {
    schema: 'twtss/placement-observation',
    version: PLACEMENT_VERSION,
    cameraId,
    referenceId: reference.referenceId,
    intrinsicProfileId: `cal-2026-09-15-${cameraId}`,
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
      const seed = point.id.charCodeAt(0) * 7919 + point.id.length * 104729 + cameraId.length;
      return {
        id: point.id,
        u: round(pixel.u + jitter(seed)),
        v: round(pixel.v + jitter(seed + 1))
      };
    }),
    imageWidth: 1280,
    imageHeight: 720,
    capturedAtUs: START_US,
    conditions: {frameRate: 30}
  };
}

export function buildFixtures(): Record<string, unknown> {
  const observations = Array.from({length: 24}, (_, index) => observation(index + 1));
  const estimate = estimateTimeCorrespondence(observations, {
    nowUs: START_US + 1_000_000,
    decodeRate: 0.63,
    droppedCount: 0,
    rejectedCount: 2
  });
  if (!estimate.ok) throw new Error(`the estimator refused the sample: ${estimate.message}`);

  const left = placementObservation('camera-left', poseOf([14, -26, 3], [-0.6, -0.35, 2.3]));
  const right = placementObservation('camera-right', poseOf([11, 24, -2], [0.7, -0.4, 2.2]));
  const placement = solvePlacement({
    reference,
    observations: [left, right],
    models: {
      'camera-left': {intrinsics, distortion: {model: 'none', coefficients: []}},
      'camera-right': {intrinsics, distortion: {model: 'none', coefficients: []}}
    },
    rigId: 'studio-rig',
    // An independent tape measurement between the camera bodies. The residual
    // is what a consumer should be looking at, so the sample shows a check that
    // passes by a couple of millimetres rather than one that fails.
    verification: [{a: 'camera-left', b: 'camera-right', expectedMeters: 0.755}]
  });
  if (!placement.ok) throw new Error(`the solver refused the sample: ${placement.message}`);

  return {
    'optical-time-observation-v1': observations[0],
    'time-correspondence-v1': estimate.correspondence,
    'placement-reference-v1': reference,
    'placement-observation-v1': left,
    'placement-result-v1': placement.result
  };
}

function round(value: number): number {
  return Number(value.toFixed(4));
}
