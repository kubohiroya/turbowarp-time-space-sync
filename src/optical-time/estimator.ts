import {
  TIME_CORRESPONDENCE_SCHEMA,
  TIME_CORRESPONDENCE_VERSION,
  sameClockDomain,
  type OpticalTimeObservation,
  type RobustSummary,
  type TimeCorrespondence,
  type TimeSpaceSyncErrorCode,
  type UnidentifiedComponent
} from '../contracts/index.js';

/**
 * Turns decoded readings into a correspondence, by intersecting them.
 *
 * A reading does not measure a delay. A pattern code stays on screen for one
 * refresh, and the moment the frame was captured is known only to lie between
 * two bounds, so each observation says the delay falls somewhere in an interval
 * and nothing finer. Averaging the midpoints of those intervals treats each as
 * a measurement it is not, and inherits half a refresh of bias for free.
 *
 * Intersecting them instead produces the set of delays consistent with every
 * reading, which is the honest answer and carries its own uncertainty: the
 * width of what is left.
 */

export interface DelayInterval {
  readonly loUs: number;
  readonly hiUs: number;
}

export interface EstimateOptions {
  /** The observer's clock, for stamping the result and dating its expiry. */
  readonly nowUs: number;
  /** How long the result describes the present. */
  readonly validityUs?: number;
  readonly decodeRate?: number;
  readonly droppedCount?: number;
  readonly rejectedCount?: number;
  /** Share of the readings that must agree before a result is published. */
  readonly minimumAgreementRatio?: number;
}

export type EstimateResult =
  | {readonly ok: true; readonly correspondence: TimeCorrespondence}
  | {readonly ok: false; readonly code: TimeSpaceSyncErrorCode; readonly message: string};

const DEFAULT_VALIDITY_US = 30_000_000;
const DEFAULT_MINIMUM_AGREEMENT = 0.5;

/**
 * Folds a delay onto the half wrap period nearest zero.
 *
 * The pattern only says the time within its wrap window, so a delay is known
 * modulo that period. Folding to the nearest representative rather than to the
 * first positive residue keeps a slightly negative delay slightly negative: an
 * over-corrected capture time or a clock error would otherwise arrive as an
 * outlier just short of a full wrap and wreck every summary computed from it.
 *
 * The transport applies the same rule to the samples it collects. The two are
 * held together by a shared fixture rather than by shared code: the rule lives
 * in a module that package does not publish.
 */
export function foldDelayUs(delayUs: number, wrapUs = 0): number {
  if (!(wrapUs > 0)) return delayUs;
  const half = wrapUs / 2;
  return ((((delayUs + half) % wrapUs) + wrapUs) % wrapUs) - half;
}

/**
 * The delays one reading allows.
 *
 * The capture instant lies in `[constraintLo, constraintHi]` on the observer's
 * clock. The code it shows was on screen from its own timestamp until one
 * refresh later, give or take how well that refresh is known. The delay is the
 * first minus the second, so the widest difference and the narrowest bound the
 * interval.
 */
export function delayIntervalFor(observation: OpticalTimeObservation): DelayInterval {
  const onsetLoUs = observation.patternCodeTimestampUs - observation.refreshUncertaintyUs;
  const onsetHiUs =
    observation.patternCodeTimestampUs +
    observation.displayRefreshUs +
    observation.refreshUncertaintyUs;
  const loUs = observation.constraintLoUs - onsetHiUs;
  const hiUs = observation.constraintHiUs - onsetLoUs;
  // Both ends move by the same whole number of wrap periods, so folding the
  // centre and shifting the interval with it keeps the interval intact. Folding
  // each end separately could split one interval across the boundary.
  const centre = (loUs + hiUs) / 2;
  const shift = centre - foldDelayUs(centre, observation.wrapUs);
  return {loUs: loUs - shift, hiUs: hiUs - shift};
}

export interface Agreement {
  readonly loUs: number;
  readonly hiUs: number;
  /** How many of the intervals cover this region. */
  readonly agreed: number;
}

/**
 * The region the most intervals agree on.
 *
 * Plain intersection is not usable here: one reading that slipped past the
 * check bits empties it, and a result that disappears whenever a single frame
 * misreads is no result at all. Sweeping the edges finds the region the largest
 * number of readings cover, and reports how many that was, so a caller can see
 * the disagreement rather than having it silently averaged away.
 */
export function agreeOn(intervals: readonly DelayInterval[]): Agreement | undefined {
  if (intervals.length === 0) return undefined;
  const edges: Array<{at: number; delta: number}> = [];
  for (const interval of intervals) {
    if (interval.hiUs < interval.loUs) continue;
    edges.push({at: interval.loUs, delta: 1});
    edges.push({at: interval.hiUs, delta: -1});
  }
  if (edges.length === 0) return undefined;
  // An opening edge is taken before a closing one at the same value, so two
  // intervals that merely touch still count as agreeing at that point.
  edges.sort((left, right) => left.at - right.at || right.delta - left.delta);

  let running = 0;
  let best = 0;
  let loUs = 0;
  let hiUs = 0;
  for (let index = 0; index < edges.length; index += 1) {
    const edge = edges[index] as {at: number; delta: number};
    running += edge.delta;
    if (edge.delta === 1 && running > best) {
      best = running;
      loUs = edge.at;
      hiUs = edge.at;
      // The region runs to the next edge of any kind.
      const next = edges[index + 1];
      if (next) hiUs = next.at;
    }
  }
  return best === 0 ? undefined : {loUs, hiUs, agreed: best};
}

export function estimateTimeCorrespondence(
  observations: readonly OpticalTimeObservation[],
  options: EstimateOptions
): EstimateResult {
  if (observations.length === 0) {
    return {
      ok: false,
      code: 'insufficient-points',
      message: 'No observations have been collected for this camera.'
    };
  }
  const first = observations[0] as OpticalTimeObservation;
  const mismatch = firstMismatch(observations, first);
  if (mismatch) return mismatch;

  const intervals = observations.map((observation) => delayIntervalFor(observation));
  const agreement = agreeOn(intervals);
  if (!agreement) {
    return {
      ok: false,
      code: 'decode-unstable',
      message: 'No reading produced a usable interval.'
    };
  }
  const ratio = agreement.agreed / observations.length;
  const minimum = options.minimumAgreementRatio ?? DEFAULT_MINIMUM_AGREEMENT;
  // A strict majority, not merely the largest group. Readings split evenly
  // support two answers equally well, and choosing between them would be
  // arbitrary; readings that cannot be reconciled at all are not noise to be
  // averaged but a sign the model does not describe what happened, and a number
  // produced from one would look like a measurement.
  const outvoted = observations.length > 1 && agreement.agreed * 2 <= observations.length;
  if (ratio < minimum || outvoted) {
    return {
      ok: false,
      code: 'decode-unstable',
      message: `Only ${agreement.agreed} of ${observations.length} readings agree on any delay, so no interval describes them all.`
    };
  }

  const midpoints = intervals.map((interval) => (interval.loUs + interval.hiUs) / 2);
  const validityUs = options.validityUs ?? DEFAULT_VALIDITY_US;
  const degraded = ratio < 1 || observations.length < 2;
  const notes: string[] = [];
  if (agreement.agreed < observations.length) {
    notes.push(
      `${observations.length - agreement.agreed} of ${observations.length} readings lie outside the agreed interval.`
    );
  }
  if (observations.length < 2) {
    notes.push('A single reading bounds the delay but does not corroborate it.');
  }

  const correspondence: TimeCorrespondence = {
    schema: TIME_CORRESPONDENCE_SCHEMA,
    version: TIME_CORRESPONDENCE_VERSION,
    cameraId: first.cameraId,
    referenceId: first.referenceId,
    observerDomain: first.observerDomain,
    displayDomain: first.displayDomain,
    displayToTimestampDelayUs: Math.round((agreement.loUs + agreement.hiUs) / 2),
    delayLoUs: Math.round(agreement.loUs),
    delayHiUs: Math.round(agreement.hiUs),
    uncertaintyUs: Math.round((agreement.hiUs - agreement.loUs) / 2),
    sampleCount: observations.length,
    rejectedCount: options.rejectedCount ?? 0,
    droppedCount: options.droppedCount ?? 0,
    decodeRate: options.decodeRate ?? 0,
    decodeMarginMin: Math.min(...observations.map((entry) => entry.decodeMargin)),
    measuredAtUs: Math.round(options.nowUs),
    validUntilUs: Math.round(options.nowUs + validityUs),
    unidentifiedComponents: unidentifiedFor(first),
    degraded,
    notes,
    robust: summarize(midpoints)
  };
  return {ok: true, correspondence};
}

/**
 * What the result folds together and cannot separate.
 *
 * The camera's capture-to-timestamp delay and the display's draw-to-photons
 * delay are always in there; optical readings constrain only their sum. The
 * clock offset joins them whenever the two clocks are not the same one, which
 * is the price of measuring across machines and the reason the same-computer
 * case is worth keeping simple. Rolling shutter is listed because the panel
 * occupies part of the frame and the rows carrying it are exposed at their own
 * time, which nothing here models.
 */
function unidentifiedFor(observation: OpticalTimeObservation): UnidentifiedComponent[] {
  const components: UnidentifiedComponent[] = [
    'cameraPipelineDelay',
    'displayPipelineDelay',
    'rollingShutterSkew'
  ];
  const display = observation.displayDomain;
  if (display === null || !sameClockDomain(display, observation.observerDomain)) {
    components.unshift('clockOffset');
  }
  return components;
}

/** Refuses a set of readings that cannot be summarised as one measurement. */
function firstMismatch(
  observations: readonly OpticalTimeObservation[],
  first: OpticalTimeObservation
): {ok: false; code: TimeSpaceSyncErrorCode; message: string} | undefined {
  for (const observation of observations) {
    if (observation.cameraId !== first.cameraId || observation.referenceId !== first.referenceId) {
      return {
        ok: false,
        code: 'invalid-payload',
        message: 'The readings do not all come from one camera watching one reference.'
      };
    }
    if (observation.patternProfileId !== first.patternProfileId) {
      return {
        ok: false,
        code: 'invalid-payload',
        message: 'The readings were decoded under different pattern profiles.'
      };
    }
    if (observation.observerDomain.id !== first.observerDomain.id) {
      return {
        ok: false,
        code: 'clock-domain-mismatch',
        message: 'The readings were stamped on different clocks.'
      };
    }
    if (observation.observerDomain.epoch !== first.observerDomain.epoch) {
      // The mapping onto the clock moved partway through. Pooling readings from
      // either side would absorb the correction as measurement spread.
      return {
        ok: false,
        code: 'clock-epoch-changed',
        message: 'The clock was re-estimated partway through, so the readings are not comparable.'
      };
    }
  }
  return undefined;
}

export function summarize(values: readonly number[]): RobustSummary {
  const sorted = [...values].filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (sorted.length === 0) return {median: 0, mad: 0, p10: 0, p90: 0};
  const median = percentile(sorted, 0.5);
  const deviations = sorted.map((value) => Math.abs(value - median)).sort((a, b) => a - b);
  return {
    median: Math.round(median),
    mad: Math.round(percentile(deviations, 0.5)),
    p10: Math.round(percentile(sorted, 0.1)),
    p90: Math.round(percentile(sorted, 0.9))
  };
}

function percentile(sorted: readonly number[], fraction: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0] as number;
  const position = (sorted.length - 1) * Math.min(1, Math.max(0, fraction));
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const low = sorted[lower] as number;
  const high = sorted[upper] ?? low;
  return low + (high - low) * (position - lower);
}
