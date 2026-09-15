import {clockDomainSpec, type ClockDomain} from './clock.js';
import {
  durationUs,
  enumOf,
  finite,
  identifier,
  integer,
  nullable,
  object,
  text,
  timestampUs,
  validate,
  type Spec,
  type ValidationResult
} from './spec.js';

export const TIME_CORRESPONDENCE_SCHEMA = 'twtss/time-correspondence';
export const TIME_CORRESPONDENCE_VERSION = 1;

/**
 * Quantities an optical measurement cannot separate.
 *
 * Three unknowns sit between the displayed time and the timestamp on a frame:
 * the offset between the two clocks, the camera's capture-to-timestamp delay,
 * and the display's draw-to-photons delay. Optical observations constrain only
 * their sum. Naming the sum honestly, and listing what is folded into it, is
 * the difference between a figure a user can act on and one they will mistake
 * for a clock offset.
 */
export const UNIDENTIFIED_COMPONENTS = [
  'clockOffset',
  'cameraPipelineDelay',
  'displayPipelineDelay',
  'rollingShutterSkew'
] as const;

export type UnidentifiedComponent = (typeof UNIDENTIFIED_COMPONENTS)[number];

export interface RobustSummary {
  readonly median: number;
  readonly mad: number;
  readonly p10: number;
  readonly p90: number;
}

export interface TimeCorrespondence {
  readonly schema: typeof TIME_CORRESPONDENCE_SCHEMA;
  readonly version: typeof TIME_CORRESPONDENCE_VERSION;
  readonly cameraId: string;
  readonly referenceId: string;
  readonly observerDomain: ClockDomain;
  readonly displayDomain: ClockDomain | null;
  /**
   * The identifiable combination: how much later a frame is stamped than the
   * pattern it shows was drawn. Not a clock offset; see
   * `unidentifiedComponents`.
   */
  readonly displayToTimestampDelayUs: number;
  /** The intersection of the observation constraints, in the observer's clock. */
  readonly delayLoUs: number;
  readonly delayHiUs: number;
  readonly uncertaintyUs: number;
  readonly sampleCount: number;
  readonly rejectedCount: number;
  readonly droppedCount: number;
  readonly decodeRate: number;
  readonly decodeMarginMin: number;
  readonly measuredAtUs: number;
  /**
   * When this result stops being current, in the observer's clock.
   *
   * Every result expires. A correspondence measured before the camera refocused
   * or the clock was re-synchronised is not a smaller measurement, it is not a
   * measurement of the present at all.
   */
  readonly validUntilUs: number;
  readonly unidentifiedComponents: readonly UnidentifiedComponent[];
  readonly degraded: boolean;
  readonly notes: readonly string[];
  readonly robust: RobustSummary;
}

export const timeCorrespondenceSpec: Spec = object({
  schema: {kind: 'const', value: TIME_CORRESPONDENCE_SCHEMA},
  version: {kind: 'const', value: TIME_CORRESPONDENCE_VERSION},
  cameraId: identifier(),
  referenceId: identifier(),
  observerDomain: clockDomainSpec,
  displayDomain: nullable(clockDomainSpec),
  displayToTimestampDelayUs: timestampUs(),
  delayLoUs: timestampUs(),
  delayHiUs: timestampUs(),
  uncertaintyUs: durationUs(),
  sampleCount: integer({minimum: 0}),
  rejectedCount: integer({minimum: 0}),
  droppedCount: integer({minimum: 0}),
  decodeRate: finite({minimum: 0, maximum: 1}),
  decodeMarginMin: finite({minimum: 0}),
  measuredAtUs: timestampUs(),
  validUntilUs: timestampUs(),
  unidentifiedComponents: {
    kind: 'array',
    items: enumOf(UNIDENTIFIED_COMPONENTS),
    maxItems: UNIDENTIFIED_COMPONENTS.length
  },
  degraded: {kind: 'boolean'},
  notes: {kind: 'array', items: text(), maxItems: 32},
  robust: object({median: finite(), mad: finite({minimum: 0}), p10: finite(), p90: finite()})
});

export function timeCorrespondenceIssues(result: TimeCorrespondence): string[] {
  const issues: string[] = [];
  if (result.delayHiUs < result.delayLoUs) {
    issues.push('delayHiUs must not be below delayLoUs');
  }
  if (
    result.displayToTimestampDelayUs < result.delayLoUs ||
    result.displayToTimestampDelayUs > result.delayHiUs
  ) {
    issues.push('displayToTimestampDelayUs must lie inside the estimated interval');
  }
  if (result.validUntilUs <= result.measuredAtUs) {
    issues.push('validUntilUs must be after measuredAtUs');
  }
  if (result.sampleCount === 0 && !result.degraded) {
    issues.push('a result with no samples must be marked degraded');
  }
  if (
    result.displayDomain !== null &&
    result.displayDomain.id !== result.observerDomain.id &&
    !result.unidentifiedComponents.includes('clockOffset')
  ) {
    // Across domains the clock offset is inseparable from the pipeline delays,
    // so a result that omits it is claiming a separation it cannot support.
    issues.push('a cross-domain result must list clockOffset as unidentified');
  }
  return issues;
}

export function parseTimeCorrespondence(value: unknown): ValidationResult<TimeCorrespondence> {
  const result = validate<TimeCorrespondence>(timeCorrespondenceSpec, value);
  if (!result.ok) return result;
  const issues = timeCorrespondenceIssues(result.value);
  if (issues.length > 0) {
    return {ok: false, issues: issues.map((message) => ({path: '', message}))};
  }
  return result;
}

/** True when the result still describes the present, on the observer's clock. */
export function isCurrent(result: TimeCorrespondence, nowUs: number): boolean {
  return nowUs < result.validUntilUs;
}
