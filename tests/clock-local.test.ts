import {describe, expect, it} from 'vitest';
import {LocalMonotonicClock} from '../src/clock/index.js';
import {clockDomainSpec, validate} from '../src/contracts/index.js';

describe('local monotonic clock', () => {
  it('publishes a valid domain', () => {
    const clock = new LocalMonotonicClock();
    expect(validate(clockDomainSpec, clock.domain()).ok).toBe(true);
  });

  it('is its own reference, so it carries no uncertainty and no epoch', () => {
    const domain = new LocalMonotonicClock().domain();
    expect(domain.kind).toBe('local-monotonic');
    expect(domain.uncertaintyUs).toBe(0);
    expect(domain.epoch).toBe(0);
  });

  it('gives two sessions different domain ids', () => {
    // Two documents on one machine do not share a clock just because the
    // hardware is shared, and nothing downstream may assume they do.
    expect(new LocalMonotonicClock().domain().id).not.toBe(
      new LocalMonotonicClock().domain().id
    );
  });

  it('keeps one domain identity for the life of the clock', () => {
    const clock = new LocalMonotonicClock();
    expect(clock.domain()).toBe(clock.domain());
  });

  it('never goes backwards', () => {
    const clock = new LocalMonotonicClock();
    let previous = clock.nowUs();
    for (let index = 0; index < 100; index += 1) {
      const current = clock.nowUs();
      expect(current).toBeGreaterThanOrEqual(previous);
      previous = current;
    }
  });

  it('accepts an injected reading for deterministic tests', () => {
    let value = 1000;
    const clock = new LocalMonotonicClock({id: 'local:test', now: () => (value += 7)});
    expect(clock.domain().id).toBe('local:test');
    expect(clock.nowUs()).toBe(1007);
    expect(clock.nowUs()).toBe(1014);
  });
});
