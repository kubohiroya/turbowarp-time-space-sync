import {describe, expect, it} from 'vitest';
import opticalTimeObservationSchema from '../schemas/optical-time-observation-v1.schema.json';
import placementObservationSchema from '../schemas/placement-observation-v1.schema.json';
import placementReferenceSchema from '../schemas/placement-reference-v1.schema.json';
import placementResultSchema from '../schemas/placement-result-v1.schema.json';
import timeCorrespondenceSchema from '../schemas/time-correspondence-v1.schema.json';
import {publishedContracts} from '../src/contracts/index.js';
import {toJsonSchema} from '../src/contracts/spec.js';

const committed: Record<string, unknown> = {
  'optical-time-observation-v1': opticalTimeObservationSchema,
  'time-correspondence-v1': timeCorrespondenceSchema,
  'placement-reference-v1': placementReferenceSchema,
  'placement-observation-v1': placementObservationSchema,
  'placement-result-v1': placementResultSchema
};

describe('published JSON Schema files', () => {
  it('covers every published contract', () => {
    expect(Object.keys(committed).sort()).toEqual(Object.keys(publishedContracts).sort());
  });

  for (const [name, contract] of Object.entries(publishedContracts)) {
    it(`matches the descriptor for ${name}`, () => {
      // The validator and the schema come from one descriptor, so a consumer
      // that checks a payload against the published file reaches the same
      // verdict as the runtime that produced it.
      expect(committed[name]).toMatchObject(toJsonSchema(contract.spec));
    });
  }
});
