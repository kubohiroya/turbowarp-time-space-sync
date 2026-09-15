import {clockDomainSpec, type ClockDomain} from './clock.js';
import type {CaptureTimeKind} from './frame.js';
import {
  durationUs,
  enumOf,
  finite,
  identifier,
  integer,
  nullable,
  object,
  timestampUs,
  validate,
  type Spec,
  type ValidationResult
} from './spec.js';

export const OPTICAL_TIME_OBSERVATION_SCHEMA = 'twtss/optical-time-observation';
export const OPTICAL_TIME_OBSERVATION_VERSION = 1;

export interface PanelRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface CaptureConditions {
  readonly frameRate?: number;
  readonly width?: number;
  readonly height?: number;
  /**
   * Exposure duration, when the browser reports it.
   *
   * Decoding fails whenever an exposure spans a display refresh, so the decode
   * rate is roughly `1 - exposure / refresh`. Recorded because a low decode
   * rate caused by a long exposure looks exactly like one caused by a dim
   * panel, and the two need opposite remedies.
   */
  readonly exposureTimeUs?: number;
}

/**
 * One decoded pattern reading.
 *
 * The reading does not pin the capture instant to a point. A pattern code stays
 * on screen for one refresh interval, so a clean decode says the exposure fell
 * inside that interval and nothing finer; the encoded step is only the
 * quantisation of the displayed value. The pair `constraintLoUs`,
 * `constraintHiUs` carries that as the interval it is, in the observer's clock,
 * so an estimator can intersect constraints instead of averaging points and
 * inheriting half a refresh of bias.
 */
export interface OpticalTimeObservation {
  readonly schema: typeof OPTICAL_TIME_OBSERVATION_SCHEMA;
  readonly version: typeof OPTICAL_TIME_OBSERVATION_VERSION;
  readonly cameraId: string;
  readonly referenceId: string;
  readonly patternProfileId: string;
  readonly observerDomain: ClockDomain;
  /** The display's clock domain when it is known out of band, else null. */
  readonly displayDomain: ClockDomain | null;
  readonly deliveredAtUs: number;
  readonly monotonicAtUs: number;
  readonly captureTimeUs?: number;
  readonly captureTimeKind: CaptureTimeKind;
  /** The decoded time within the wrap window, in the display's own clock. */
  readonly patternCodeTimestampUs: number;
  readonly wrapUs: number;
  readonly stepUs: number;
  readonly displayRefreshUs: number;
  readonly refreshUncertaintyUs: number;
  readonly constraintLoUs: number;
  readonly constraintHiUs: number;
  /** Smallest per-cell decision margin in the reading, in luminance units. */
  readonly decodeMargin: number;
  readonly panel: PanelRect;
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly captureConditions: CaptureConditions;
  readonly intrinsicProfileId?: string;
  readonly sequence: number;
}

const panelSpec = object({
  x: finite({minimum: 0}),
  y: finite({minimum: 0}),
  width: finite({exclusiveMinimum: 0}),
  height: finite({exclusiveMinimum: 0})
});

const captureConditionsSpec = object(
  {
    frameRate: finite({exclusiveMinimum: 0}),
    width: integer({minimum: 1}),
    height: integer({minimum: 1}),
    exposureTimeUs: durationUs()
  },
  ['frameRate', 'width', 'height', 'exposureTimeUs']
);

export const opticalTimeObservationSpec: Spec = object(
  {
    schema: {kind: 'const', value: OPTICAL_TIME_OBSERVATION_SCHEMA},
    version: {kind: 'const', value: OPTICAL_TIME_OBSERVATION_VERSION},
    cameraId: identifier(),
    referenceId: identifier(),
    patternProfileId: identifier(),
    observerDomain: clockDomainSpec,
    displayDomain: nullable(clockDomainSpec),
    deliveredAtUs: timestampUs(),
    monotonicAtUs: timestampUs(),
    captureTimeUs: timestampUs(),
    captureTimeKind: enumOf(['capture', 'presentation', 'none']),
    patternCodeTimestampUs: durationUs(),
    wrapUs: integer({minimum: 1}),
    stepUs: integer({minimum: 1}),
    displayRefreshUs: integer({minimum: 1}),
    refreshUncertaintyUs: durationUs(),
    constraintLoUs: timestampUs(),
    constraintHiUs: timestampUs(),
    decodeMargin: finite({minimum: 0}),
    panel: panelSpec,
    imageWidth: integer({minimum: 1}),
    imageHeight: integer({minimum: 1}),
    captureConditions: captureConditionsSpec,
    intrinsicProfileId: identifier(),
    sequence: integer({minimum: 0})
  },
  ['captureTimeUs', 'intrinsicProfileId']
);

/**
 * Checks the relationships the field specs cannot express on their own.
 *
 * Each of these is a payload that is well formed field by field but cannot
 * describe a real reading, and each would otherwise be absorbed by an
 * estimator as if it were a measurement.
 */
export function opticalTimeObservationIssues(
  observation: OpticalTimeObservation
): string[] {
  const issues: string[] = [];
  if (observation.constraintHiUs <= observation.constraintLoUs) {
    issues.push('constraintHiUs must be greater than constraintLoUs');
  }
  if (observation.patternCodeTimestampUs >= observation.wrapUs) {
    issues.push('patternCodeTimestampUs must fall inside the wrap window');
  }
  if (observation.wrapUs % observation.stepUs !== 0) {
    issues.push('wrapUs must be a whole number of steps');
  }
  if (observation.patternCodeTimestampUs % observation.stepUs !== 0) {
    issues.push('patternCodeTimestampUs must be a whole number of steps');
  }
  if (observation.captureTimeKind === 'none' && observation.captureTimeUs !== undefined) {
    issues.push('captureTimeUs must be absent when no capture time was reported');
  }
  if (observation.captureTimeKind !== 'none' && observation.captureTimeUs === undefined) {
    issues.push('captureTimeUs is required when a capture time was reported');
  }
  if (
    observation.panel.x + observation.panel.width > observation.imageWidth ||
    observation.panel.y + observation.panel.height > observation.imageHeight
  ) {
    issues.push('panel must fall inside the analysed image');
  }
  const exposure = observation.captureConditions.exposureTimeUs;
  if (exposure !== undefined && exposure > observation.displayRefreshUs) {
    // Not rejected: a reading that decoded despite a long exposure is real. It
    // is flagged so the consumer can explain a falling decode rate.
    issues.push('exposure-too-long');
  }
  return issues;
}

export function parseOpticalTimeObservation(
  value: unknown
): ValidationResult<OpticalTimeObservation> {
  const result = validate<OpticalTimeObservation>(opticalTimeObservationSpec, value);
  if (!result.ok) return result;
  const issues = opticalTimeObservationIssues(result.value).filter(
    (issue) => issue !== 'exposure-too-long'
  );
  if (issues.length > 0) {
    return {ok: false, issues: issues.map((message) => ({path: '', message}))};
  }
  return result;
}

/** Where the panel sat vertically, as a fraction of image height. */
export function panelCenterY(observation: OpticalTimeObservation): number {
  return (observation.panel.y + observation.panel.height / 2) / observation.imageHeight;
}
