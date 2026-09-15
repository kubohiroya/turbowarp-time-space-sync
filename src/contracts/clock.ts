import {durationUs, enumOf, identifier, integer, object, timestampUs, type Spec} from './spec.js';

/**
 * How a clock relates to the other computers in a session.
 *
 * `local-monotonic` is one machine's own steadily advancing clock. It never
 * jumps and it is exact within itself, but it says nothing about any other
 * machine.
 *
 * `webrtc-synchronized` is a local clock plus an offset estimated against a
 * peer. It carries an uncertainty, and re-estimating the offset moves it, which
 * is what `epoch` records.
 */
export type ClockKind = 'local-monotonic' | 'webrtc-synchronized';

export interface ClockDomain {
  /** Stable within a session, for example `local:<uuid>` or `webrtc:<peer>`. */
  readonly id: string;
  readonly kind: ClockKind;
  /**
   * Incremented whenever the mapping onto this domain changes.
   *
   * A synchronized clock is a local clock plus an estimated offset, so
   * re-estimating that offset moves every timestamp in the domain, possibly
   * backwards. Timestamps taken under different epochs are not comparable and
   * must not be pooled into one estimate: the jump would be absorbed as
   * measurement spread and quietly widen or bias the result.
   */
  readonly epoch: number;
  /**
   * Half-width of the interval this domain's timestamps are known within, in
   * microseconds. Zero for `local-monotonic`, which is its own reference.
   */
  readonly uncertaintyUs: number;
}

export const clockDomainSpec: Spec = object({
  id: identifier(),
  kind: enumOf(['local-monotonic', 'webrtc-synchronized']),
  epoch: integer({minimum: 0}),
  uncertaintyUs: durationUs()
});

export interface ConvertedTimestamp {
  readonly timestampUs: number;
  readonly uncertaintyUs: number;
}

/**
 * A clock for deadlines, elapsed time and timeouts.
 *
 * Durations must never be measured on a synchronized clock. Re-estimating its
 * offset moves it, so a deadline set before the jump can already be in the past
 * afterwards, ending a calibration the instant it started, or recede far enough
 * that it never arrives.
 */
export interface MonotonicClockPort {
  nowUs(): number;
}

/**
 * A clock for stamping observations and for converting between domains.
 *
 * `convertFrom` returns `undefined` when no conversion exists, rather than a
 * best guess. A caller that wants to compare two domains has to handle their
 * being incomparable; returning zero, or the raw value, would let a
 * cross-domain comparison look like a measurement.
 */
export interface SharedClockPort {
  domain(): ClockDomain;
  nowUs(): number;
  convertFrom(source: ClockDomain, timestampUs: number): ConvertedTimestamp | undefined;
}

/** True when two domain readings may be compared without conversion. */
export function sameClockDomain(left: ClockDomain, right: ClockDomain): boolean {
  return left.id === right.id && left.epoch === right.epoch;
}

export const timestampSpec = timestampUs;
