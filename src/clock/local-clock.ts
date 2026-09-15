import type {ClockDomain, MonotonicClockPort} from '../contracts/index.js';

/**
 * This computer's own clock.
 *
 * It advances steadily and never jumps, which is what deadlines and durations
 * need, and it is exact within itself, which is why its domain carries zero
 * uncertainty. What it cannot do is say anything about another computer's
 * clock; that is a conversion, and it lives in `SessionClock`.
 */
export class LocalMonotonicClock implements MonotonicClockPort {
  private readonly domainValue: ClockDomain;
  private readonly read: () => number;

  public constructor(options: {id?: string; now?: () => number} = {}) {
    this.domainValue = Object.freeze({
      id: options.id ?? `local:${sessionSuffix()}`,
      kind: 'local-monotonic',
      // A local clock is never re-estimated, so its mapping never moves and the
      // epoch never advances. Only a converted domain needs one.
      epoch: 0,
      uncertaintyUs: 0
    } as const);
    this.read = options.now ?? defaultNowUs;
  }

  public domain(): ClockDomain {
    return this.domainValue;
  }

  public nowUs(): number {
    return this.read();
  }
}

/**
 * `performance.timeOrigin` is a constant and `performance.now()` is monotonic,
 * so their sum advances steadily even when the operating system's wall clock is
 * corrected underneath it. `Date.now` is the fallback for environments without
 * a performance timeline, and it does not have that property; it is used
 * because a clock that can step is still better than no clock, and the
 * difference shows up as a rejected measurement rather than a wrong one.
 */
function defaultNowUs(): number {
  if (typeof performance === 'object' && typeof performance.now === 'function') {
    return Math.round((performance.timeOrigin + performance.now()) * 1000);
  }
  return Date.now() * 1000;
}

function sessionSuffix(): string {
  const cryptoRef = globalThis.crypto;
  if (cryptoRef !== undefined && typeof cryptoRef.randomUUID === 'function') {
    return cryptoRef.randomUUID().replace(/-/g, '').slice(0, 16);
  }
  return Math.floor(Math.random() * 0xffffffff)
    .toString(16)
    .padStart(8, '0');
}
