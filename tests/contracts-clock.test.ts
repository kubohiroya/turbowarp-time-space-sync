import {describe, expect, it} from 'vitest';
import {
  clockDomainSpec,
  sameClockDomain,
  validate,
  type ClockDomain,
  type SharedClockPort
} from '../src/contracts/index.js';

const local: ClockDomain = {
  id: 'local:9f1c5a2e',
  kind: 'local-monotonic',
  epoch: 0,
  uncertaintyUs: 0
};
const remote: ClockDomain = {
  id: 'webrtc:studio-host',
  kind: 'webrtc-synchronized',
  epoch: 3,
  uncertaintyUs: 450
};

describe('clock domains', () => {
  it('accepts both kinds', () => {
    expect(validate(clockDomainSpec, local).ok).toBe(true);
    expect(validate(clockDomainSpec, remote).ok).toBe(true);
  });

  it('rejects a negative uncertainty', () => {
    expect(validate(clockDomainSpec, {...remote, uncertaintyUs: -1}).ok).toBe(false);
  });

  it('treats a re-estimated offset as a different domain reading', () => {
    // Timestamps either side of a re-estimate are not comparable: the offset
    // moved underneath them, so pooling the two would absorb the jump as
    // measurement spread.
    expect(sameClockDomain(remote, remote)).toBe(true);
    expect(sameClockDomain(remote, {...remote, epoch: 4})).toBe(false);
  });

  it('does not confuse two domains that share an epoch', () => {
    expect(sameClockDomain(local, {...remote, epoch: 0})).toBe(false);
  });
});

describe('shared clock port', () => {
  const clock: SharedClockPort = {
    domain: () => local,
    nowUs: () => 1_737_000_000_000_000,
    convertFrom: (source, timestampUs) =>
      source.id === local.id && source.epoch === local.epoch
        ? {timestampUs, uncertaintyUs: 0}
        : undefined
  };

  it('converts within its own domain', () => {
    expect(clock.convertFrom(local, 42)).toEqual({timestampUs: 42, uncertaintyUs: 0});
  });

  it('reports that a foreign domain cannot be converted', () => {
    // Not zero, and not the raw value: a caller must handle the two clocks
    // being incomparable rather than receive something that looks measured.
    expect(clock.convertFrom(remote, 42)).toBeUndefined();
  });

  it('reports that a stale epoch cannot be converted', () => {
    expect(clock.convertFrom({...local, epoch: 1}, 42)).toBeUndefined();
  });
});
