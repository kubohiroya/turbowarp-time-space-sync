import {describe, expect, it} from 'vitest';
import placementResultFixture from './fixtures/contracts/placement-result-valid.json';
import {
  baselineMeters,
  composeRigidTransforms,
  identityRigidTransform,
  invertRigidTransform,
  isRigidTransform,
  rotationOf,
  translationOf,
  toLegacyFrameSyncErrorCode,
  TIME_SPACE_SYNC_ERROR_CODES,
  LEGACY_FRAME_SYNC_ERROR_CODES
} from '../src/contracts/index.js';

const [left, right] = placementResultFixture.cameras;
const pair = placementResultFixture.pairs[0];

function expectClose(actual: readonly number[], expected: readonly number[]): void {
  expect(actual.length).toBe(expected.length);
  actual.forEach((value, index) => expect(value).toBeCloseTo(expected[index] ?? 0, 9));
}

describe('rigid transforms', () => {
  it('round trips through its own inverse', () => {
    const matrix = left?.cameraFromReference ?? [];
    expectClose(invertRigidTransform(invertRigidTransform(matrix)), matrix);
  });

  it('composes a camera pair the way the fixture records it', () => {
    // cameraB_from_cameraA = cameraB_from_reference * reference_from_cameraA.
    const derived = composeRigidTransforms(
      right?.cameraFromReference ?? [],
      invertRigidTransform(left?.cameraFromReference ?? [])
    );
    expectClose(derived, pair?.toFromFrom ?? []);
  });

  it('measures the baseline between the camera origins', () => {
    expect(
      baselineMeters(left?.cameraFromReference ?? [], right?.cameraFromReference ?? [])
    ).toBeCloseTo(pair?.baselineMeters ?? 0, 6);
  });

  it('accepts an inverted transform as rigid, which is why direction needs a fixture', () => {
    // This is the whole reason the fixture above exists. Orthonormality, a
    // positive determinant and a `0 0 0 1` bottom row all survive inversion, so
    // a consumer that validates those properties cannot notice a pose handed
    // over backwards; it just produces a wrong answer with a clean residual.
    const matrix = left?.cameraFromReference ?? [];
    expect(isRigidTransform(matrix)).toBe(true);
    expect(isRigidTransform(invertRigidTransform(matrix))).toBe(true);
  });

  it('keeps cameraFromReference distinguishable from its inverse', () => {
    const matrix = right?.cameraFromReference ?? [];
    const reversed = invertRigidTransform(matrix);
    expect(translationOf(matrix)).not.toEqual(translationOf(reversed));
  });

  it('places the reference origin in front of a camera that looks at it', () => {
    // cameraFromReference maps reference points into camera coordinates, so the
    // reference origin must land at a positive Z with OpenCV axes.
    const origin = translationOf(left?.cameraFromReference ?? []);
    expect(origin[2]).toBeGreaterThan(0);
  });

  it('rejects a matrix that is not a rotation', () => {
    const scaled = identityRigidTransform();
    scaled[0] = 2;
    expect(isRigidTransform(scaled)).toBe(false);
  });

  it('rejects a mirrored rotation', () => {
    const mirrored = identityRigidTransform();
    mirrored[0] = -1;
    // Still orthonormal, but left-handed: a reflection, not a placement.
    expect(rotationOf(mirrored)[0]).toBe(-1);
    expect(isRigidTransform(mirrored)).toBe(false);
  });

  it('rejects a matrix with a non-affine bottom row', () => {
    const skewed = identityRigidTransform();
    skewed[12] = 0.5;
    expect(isRigidTransform(skewed)).toBe(false);
  });
});

describe('error codes', () => {
  it('maps every code onto the legacy vocabulary', () => {
    for (const code of TIME_SPACE_SYNC_ERROR_CODES) {
      expect(LEGACY_FRAME_SYNC_ERROR_CODES).toContain(toLegacyFrameSyncErrorCode(code));
    }
  });

  it('leaves the legacy codes unchanged', () => {
    for (const code of LEGACY_FRAME_SYNC_ERROR_CODES) {
      expect(toLegacyFrameSyncErrorCode(code)).toBe(code);
    }
  });

  it('never turns a failure into the empty code', () => {
    // An old project compares the reporter against a literal, so a new code
    // arriving as '' would read as success.
    for (const code of TIME_SPACE_SYNC_ERROR_CODES) {
      if (code === '') continue;
      expect(toLegacyFrameSyncErrorCode(code)).not.toBe('');
    }
  });
});
