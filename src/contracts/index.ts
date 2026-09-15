/**
 * The published contracts of this extension.
 *
 * Nothing here reaches for a browser API or a TurboWarp runtime, so a consumer
 * can validate a payload without loading the extension, and the runtime stages
 * can be built against a contract that is already fixed.
 */

export * from './conventions.js';
export * from './errors.js';
export * from './spec.js';
export * from './clock.js';
export * from './frame.js';
export * from './rigid-transform.js';
export * from './optical-time-observation.js';
export * from './time-correspondence.js';
export * from './placement.js';

import {opticalTimeObservationSpec} from './optical-time-observation.js';
import {
  placementObservationSpec,
  placementResultSpec,
  referenceDefinitionSpec
} from './placement.js';
import type {Spec} from './spec.js';
import {timeCorrespondenceSpec} from './time-correspondence.js';

/** Every published payload contract, keyed by the file it is generated into. */
export const publishedContracts: Readonly<Record<string, {title: string; spec: Spec}>> = {
  'optical-time-observation-v1': {
    title: 'Optical time observation, version 1',
    spec: opticalTimeObservationSpec
  },
  'time-correspondence-v1': {
    title: 'Time correspondence, version 1',
    spec: timeCorrespondenceSpec
  },
  'placement-reference-v1': {
    title: 'Placement reference, version 1',
    spec: referenceDefinitionSpec
  },
  'placement-observation-v1': {
    title: 'Placement observation, version 1',
    spec: placementObservationSpec
  },
  'placement-result-v1': {title: 'Placement result, version 1', spec: placementResultSpec}
};
