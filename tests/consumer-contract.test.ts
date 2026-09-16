import {readFileSync, readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {describe, expect, it} from 'vitest';
import {
  describeIssues,
  parseOpticalTimeObservation,
  parsePlacementObservation,
  parsePlacementResult,
  parseReferenceDefinition,
  parseTimeCorrespondence,
  type ValidationResult
} from '../src/contracts/index.js';

const directory = new URL('../fixtures/', import.meta.url);

function read(name: string): unknown {
  return JSON.parse(readFileSync(new URL(`${name}.json`, directory), 'utf8'));
}

const parsers: Readonly<Record<string, (value: unknown) => ValidationResult<unknown>>> = {
  'optical-time-observation-v1': parseOpticalTimeObservation,
  'time-correspondence-v1': parseTimeCorrespondence,
  'placement-reference-v1': parseReferenceDefinition,
  'placement-observation-v1': parsePlacementObservation,
  'placement-result-v1': parsePlacementResult
};

/**
 * The samples a consumer checks its own reader against.
 *
 * They travel to other repositories, where the only thing that will notice a
 * mistake is somebody else's integration. So they are produced by running the
 * real estimator and solver, and checked here through the same parsers a
 * consumer would use.
 */
describe('the published contract fixtures', () => {
  it('publishes one sample for each contract and nothing else', () => {
    const published = readdirSync(fileURLToPath(directory))
      .filter((name) => name.endsWith('.json'))
      .map((name) => name.replace(/\.json$/u, ''))
      .sort();
    expect(published).toEqual(Object.keys(parsers).sort());
  });

  for (const [name, parse] of Object.entries(parsers)) {
    it(`accepts ${name} through its own parser`, () => {
      const result = parse(read(name));
      if (!result.ok) throw new Error(describeIssues(result.issues));
      expect(result.ok).toBe(true);
    });
  }

  it('names no consumer anywhere', () => {
    // A sample mentioning a particular extension's package, id or opcodes would
    // make this package depend on the packages that depend on it. The fixtures
    // are the one place that could happen by accident, because they are written
    // with a reader in mind.
    const forbidden = [
      'photogrammetry',
      'realtime-motion-capture',
      'visual-tracking',
      'aframe',
      'kubohiroyaar',
      'twrmc/'
    ];
    for (const name of Object.keys(parsers)) {
      const text = readFileSync(new URL(`${name}.json`, directory), 'utf8').toLowerCase();
      for (const term of forbidden) {
        expect(text.includes(term)).toBe(false);
      }
    }
  });
});

describe('what the samples show a reader', () => {
  it('reports a delay as an interval that does not collapse to a point', () => {
    const correspondence = read('time-correspondence-v1') as {
      displayToTimestampDelayUs: number;
      delayLoUs: number;
      delayHiUs: number;
      uncertaintyUs: number;
      unidentifiedComponents: string[];
    };
    expect(correspondence.delayHiUs).toBeGreaterThan(correspondence.delayLoUs);
    expect(correspondence.uncertaintyUs).toBeGreaterThan(0);
    expect(correspondence.displayToTimestampDelayUs).toBeGreaterThan(correspondence.delayLoUs);
    expect(correspondence.displayToTimestampDelayUs).toBeLessThan(correspondence.delayHiUs);
  });

  it('lists the clock offset as unidentified, because the sample crosses machines', () => {
    const correspondence = read('time-correspondence-v1') as {unidentifiedComponents: string[]};
    expect(correspondence.unidentifiedComponents).toContain('clockOffset');
    expect(correspondence.unidentifiedComponents).toContain('cameraPipelineDelay');
    expect(correspondence.unidentifiedComponents).toContain('displayPipelineDelay');
  });

  it('leaves out the planar ratio when there was no second solution', () => {
    // Absent rather than a very large number: the question did not arise.
    const placement = read('placement-result-v1') as {
      cameras: Array<Record<string, unknown>>;
    };
    for (const camera of placement.cameras) {
      expect('ippeErrorRatio' in camera).toBe(false);
    }
  });

  it('shows an independent distance check that passes by millimetres', () => {
    const placement = read('placement-result-v1') as {
      verification: Array<{residualMeters: number}>;
    };
    expect(placement.verification).toHaveLength(1);
    expect(Math.abs(placement.verification[0]?.residualMeters ?? 1)).toBeLessThan(0.01);
  });

  it('never claims a pose is known better than the reference was measured', () => {
    const placement = read('placement-result-v1') as {
      cameras: Array<{translationSigmaMeters: number}>;
    };
    for (const camera of placement.cameras) {
      expect(camera.translationSigmaMeters).toBeGreaterThan(0.0005);
    }
  });
});
