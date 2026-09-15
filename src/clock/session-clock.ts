import {
  sameClockDomain,
  type ClockDomain,
  type ConvertedTimestamp,
  type MonotonicClockPort,
  type SharedClockPort
} from '../contracts/index.js';
import type {LocalMonotonicClock} from './local-clock.js';
import type {PeerClockBridge} from './peer-clock.js';

/**
 * The clock the rest of the extension stamps observations with.
 *
 * It is this computer's clock, plus whatever conversions to other computers
 * happen to be available. With no peers registered it still works, which is the
 * single-computer case: several cameras on one machine already share a clock
 * and need nothing negotiated.
 *
 * Deadlines are deliberately not served from here. `monotonic()` hands out the
 * local clock for that, because a converted timestamp moves whenever the offset
 * behind it is re-estimated, and a deadline that moves is not a deadline.
 */
export class SessionClock implements SharedClockPort {
  private readonly local: LocalMonotonicClock;
  private readonly bridges = new Map<string, PeerClockBridge>();

  public constructor(local: LocalMonotonicClock) {
    this.local = local;
  }

  public monotonic(): MonotonicClockPort {
    return this.local;
  }

  public domain(): ClockDomain {
    return this.local.domain();
  }

  public nowUs(): number {
    return this.local.nowUs();
  }

  public registerPeer(bridge: PeerClockBridge): void {
    this.bridges.set(bridge.peer, bridge);
  }

  public forgetPeer(peer: string): void {
    this.bridges.delete(peer);
  }

  public peers(): string[] {
    return [...this.bridges.keys()].sort();
  }

  /** Domains this clock can currently convert from, including its own. */
  public reachableDomains(): ClockDomain[] {
    const domains = [this.domain()];
    for (const bridge of this.bridges.values()) {
      const estimate = bridge.estimate();
      if (estimate) domains.push(estimate.domain);
    }
    return domains;
  }

  public convertFrom(source: ClockDomain, timestampUs: number): ConvertedTimestamp | undefined {
    if (!Number.isFinite(timestampUs)) return undefined;
    if (sameClockDomain(source, this.domain())) {
      return {timestampUs, uncertaintyUs: 0};
    }
    const estimate = this.estimateFor(source);
    if (!estimate) return undefined;
    return {
      timestampUs: timestampUs - estimate.offsetUs,
      uncertaintyUs: estimate.uncertaintyUs
    };
  }

  /** The reverse direction: a local instant expressed on another computer's clock. */
  public convertTo(target: ClockDomain, timestampUs: number): ConvertedTimestamp | undefined {
    if (!Number.isFinite(timestampUs)) return undefined;
    if (sameClockDomain(target, this.domain())) {
      return {timestampUs, uncertaintyUs: 0};
    }
    const estimate = this.estimateFor(target);
    if (!estimate) return undefined;
    return {
      timestampUs: timestampUs + estimate.offsetUs,
      uncertaintyUs: estimate.uncertaintyUs
    };
  }

  /**
   * Finds the current relationship to a domain, and refuses when the epoch the
   * caller holds is not the one in force.
   *
   * A stale epoch means the offset was re-estimated after that timestamp was
   * taken. Converting it with today's offset would silently move it by the
   * whole correction, and the result would look like an ordinary measurement.
   */
  private estimateFor(domain: ClockDomain) {
    for (const bridge of this.bridges.values()) {
      const estimate = bridge.estimate();
      if (!estimate || estimate.domain.id !== domain.id) continue;
      if (estimate.domain.epoch !== domain.epoch) return undefined;
      return estimate;
    }
    return undefined;
  }
}
