import {describe, expect, it} from 'vitest';
import observationFixture from './fixtures/contracts/optical-time-observation-valid.json';
import correspondenceFixture from './fixtures/contracts/time-correspondence-valid.json';
import referenceFixture from './fixtures/contracts/placement-reference-valid.json';
import placementObservationFixture from './fixtures/contracts/placement-observation-valid.json';
import placementResultFixture from './fixtures/contracts/placement-result-valid.json';
import {
  describeIssues,
  opticalTimeObservationIssues,
  panelCenterY,
  parseOpticalTimeObservation,
  parsePlacementObservation,
  parsePlacementResult,
  parseReferenceDefinition,
  parseTimeCorrespondence,
  isCurrent,
  type OpticalTimeObservation,
  type TimeCorrespondence
} from '../src/contracts/index.js';

function observation(patch: Record<string, unknown> = {}): unknown {
  return {...observationFixture, ...patch};
}

function correspondence(patch: Record<string, unknown> = {}): unknown {
  return {...correspondenceFixture, ...patch};
}

function without(source: Record<string, unknown>, key: string): Record<string, unknown> {
  const copy = {...source};
  delete copy[key];
  return copy;
}

describe('optical time observation', () => {
  it('accepts the fixture', () => {
    const result = parseOpticalTimeObservation(observationFixture);
    expect(result.ok).toBe(true);
  });

  it('rejects an empty constraint interval', () => {
    const result = parseOpticalTimeObservation(
      observation({constraintHiUs: observationFixture.constraintLoUs})
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(describeIssues(result.issues)).toContain('constraintHiUs');
  });

  it('rejects a pattern time outside the wrap window', () => {
    const result = parseOpticalTimeObservation(observation({patternCodeTimestampUs: 4096000}));
    expect(result.ok).toBe(false);
  });

  it('rejects a capture time paired with a missing capture time kind', () => {
    // Reporting "none" while carrying a timestamp is how a presentation time
    // gets laundered into a capture time.
    const result = parseOpticalTimeObservation(observation({captureTimeKind: 'none'}));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(describeIssues(result.issues)).toContain('captureTimeUs must be absent');
  });

  it('requires a capture time when one was reported', () => {
    const result = parseOpticalTimeObservation(without(observationFixture, 'captureTimeUs'));
    expect(result.ok).toBe(false);
  });

  it('accepts an observation with no capture time at all', () => {
    const result = parseOpticalTimeObservation({
      ...without(observationFixture, 'captureTimeUs'),
      captureTimeKind: 'none'
    });
    expect(result.ok).toBe(true);
  });

  it('rejects a panel that leaves the analysed image', () => {
    const result = parseOpticalTimeObservation(
      observation({panel: {x: 200, y: 32, width: 96, height: 96}})
    );
    expect(result.ok).toBe(false);
  });

  it('flags a long exposure without rejecting the reading', () => {
    const parsed = parseOpticalTimeObservation(
      observation({captureConditions: {...observationFixture.captureConditions, exposureTimeUs: 33000}})
    );
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(opticalTimeObservationIssues(parsed.value)).toContain('exposure-too-long');
    }
  });

  it('reports where the panel sat vertically', () => {
    expect(panelCenterY(observationFixture as OpticalTimeObservation)).toBeCloseTo(80 / 180, 6);
  });
});

describe('time correspondence', () => {
  it('accepts the fixture', () => {
    expect(parseTimeCorrespondence(correspondenceFixture).ok).toBe(true);
  });

  it('requires the point estimate to lie inside the interval', () => {
    const result = parseTimeCorrespondence(correspondence({displayToTimestampDelayUs: 99999}));
    expect(result.ok).toBe(false);
  });

  it('requires a cross-domain result to admit the clock offset is unidentified', () => {
    const result = parseTimeCorrespondence(
      correspondence({unidentifiedComponents: ['cameraPipelineDelay', 'displayPipelineDelay']})
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(describeIssues(result.issues)).toContain('clockOffset');
  });

  it('requires an empty result to declare itself degraded', () => {
    const result = parseTimeCorrespondence(
      correspondence({sampleCount: 0, degraded: false})
    );
    expect(result.ok).toBe(false);
  });

  it('requires an expiry after the measurement', () => {
    const result = parseTimeCorrespondence(
      correspondence({validUntilUs: correspondenceFixture.measuredAtUs})
    );
    expect(result.ok).toBe(false);
  });

  it('treats an expired result as no longer current', () => {
    const value = correspondenceFixture as TimeCorrespondence;
    expect(isCurrent(value, value.validUntilUs - 1)).toBe(true);
    expect(isCurrent(value, value.validUntilUs)).toBe(false);
  });
});

describe('placement payloads', () => {
  it('accepts the fixtures', () => {
    expect(parseReferenceDefinition(referenceFixture).ok).toBe(true);
    expect(parsePlacementObservation(placementObservationFixture).ok).toBe(true);
    expect(parsePlacementResult(placementResultFixture).ok).toBe(true);
  });

  it('requires at least four coplanar reference points', () => {
    const result = parseReferenceDefinition({
      ...referenceFixture,
      points: referenceFixture.points.slice(0, 3)
    });
    expect(result.ok).toBe(false);
  });

  it('rejects duplicate reference point ids', () => {
    const first = referenceFixture.points[0];
    const result = parseReferenceDefinition({
      ...referenceFixture,
      points: [first, first, ...referenceFixture.points.slice(2)]
    });
    expect(result.ok).toBe(false);
  });

  it('refuses a nominal reference that claims no measurement uncertainty', () => {
    const result = parseReferenceDefinition({
      ...referenceFixture,
      measuredBy: 'nominal',
      points: referenceFixture.points.map((point) => ({...point, sigmaMeters: 0}))
    });
    expect(result.ok).toBe(false);
  });

  it('rejects an image point outside the frame', () => {
    const result = parsePlacementObservation({
      ...placementObservationFixture,
      imagePoints: [
        {id: 'tl', u: 4000, v: 10},
        ...placementObservationFixture.imagePoints.slice(1)
      ]
    });
    expect(result.ok).toBe(false);
  });

  it('rejects a pair that names a camera without a placement', () => {
    const result = parsePlacementResult({
      ...placementResultFixture,
      pairs: [{...placementResultFixture.pairs[0], to: 'camera-absent'}]
    });
    expect(result.ok).toBe(false);
  });

  it('rejects a non-finite matrix element', () => {
    const cameras = placementResultFixture.cameras.map((camera, index) =>
      index === 0
        ? {...camera, cameraFromReference: [...camera.cameraFromReference.slice(0, 15), null]}
        : camera
    );
    expect(parsePlacementResult({...placementResultFixture, cameras}).ok).toBe(false);
  });
});
