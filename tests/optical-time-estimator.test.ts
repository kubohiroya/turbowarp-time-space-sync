import {describe, expect, it} from 'vitest';
import unwrapGolden from './fixtures/optical-time/unwrap-cases.json';
import observationFixture from './fixtures/contracts/optical-time-observation-valid.json';
import {
  agreeOn,
  delayIntervalFor,
  estimateTimeCorrespondence,
  foldDelayUs,
  summarize
} from '../src/optical-time/index.js';
import {
  parseTimeCorrespondence,
  type ClockDomain,
  type OpticalTimeObservation
} from '../src/contracts/index.js';

const REFRESH_US = 16_667;
const base = observationFixture as OpticalTimeObservation;
const localDomain: ClockDomain = base.observerDomain;
const remoteDomain: ClockDomain = {
  id: 'webrtc:studio-host',
  kind: 'webrtc-synchronized',
  epoch: 2,
  uncertaintyUs: 450
};

/**
 * A reading of a display whose code onset sits `delayUs` before the capture.
 *
 * The capture instant is reported exactly, which is the favourable case: the
 * browser gave a capture time, so the interval is as narrow as the refresh
 * allows.
 */
function reading(
  sequence: number,
  delayUs: number,
  patch: Partial<OpticalTimeObservation> = {}
): OpticalTimeObservation {
  const onsetUs = (sequence * 33_000) % base.wrapUs;
  const captureUs = 1_737_000_000_000_000 + sequence * 33_000;
  return {
    ...base,
    sequence,
    patternCodeTimestampUs: onsetUs - (onsetUs % base.stepUs),
    displayRefreshUs: REFRESH_US,
    refreshUncertaintyUs: 120,
    captureTimeKind: 'capture',
    captureTimeUs: captureUs,
    constraintLoUs: captureUs,
    constraintHiUs: captureUs + 200,
    deliveredAtUs: captureUs + 200,
    monotonicAtUs: captureUs,
    ...patch
  };
}

/** Shifts a reading's pattern onset so the delay is exactly `delayUs`. */
function withDelay(sequence: number, delayUs: number): OpticalTimeObservation {
  const entry = reading(sequence, delayUs);
  const onset = entry.constraintLoUs - delayUs;
  const code = ((onset % base.wrapUs) + base.wrapUs) % base.wrapUs;
  return {...entry, patternCodeTimestampUs: code - (code % base.stepUs)};
}

describe('the fold rule shared with the transport', () => {
  it('reproduces every case the transport produces', () => {
    for (const entry of unwrapGolden.cases) {
      expect(foldDelayUs(entry.captureUs - entry.patternUs, entry.wrapUs)).toBe(entry.latencyUs);
    }
  });

  it('keeps a slightly negative delay negative', () => {
    // Folding to the first positive residue would turn a small clock error into
    // an outlier just short of a full wrap and wreck every summary built on it.
    expect(foldDelayUs(-1, 4_096_000)).toBe(-1);
    expect(foldDelayUs(-20_000, 4_096_000)).toBe(-20_000);
  });

  it('leaves a delay alone when there is no wrap', () => {
    expect(foldDelayUs(600, 0)).toBe(600);
  });
});

describe('what one reading allows', () => {
  it('bounds the delay by the refresh the code was on screen for', () => {
    const interval = delayIntervalFor(withDelay(1, 50_000));
    expect(interval.loUs).toBeLessThan(50_000);
    expect(interval.hiUs).toBeGreaterThan(50_000);
    // One refresh, the capture window, and the refresh uncertainty at each end.
    expect(interval.hiUs - interval.loUs).toBe(REFRESH_US + 200 + 240);
  });

  it('is nearly useless when the browser reported no capture time', () => {
    // The lower bound is then as wide as the wrap can resolve, so the reading
    // constrains the estimate through its upper bound alone.
    const entry = withDelay(2, 50_000);
    const vague = {
      ...entry,
      captureTimeKind: 'none' as const,
      constraintLoUs: entry.constraintHiUs - entry.wrapUs / 2
    };
    delete (vague as {captureTimeUs?: number}).captureTimeUs;
    const interval = delayIntervalFor(vague);
    expect(interval.hiUs - interval.loUs).toBeGreaterThan(entry.wrapUs / 2);
  });
});

describe('agreeing on a delay', () => {
  it('returns the region the intervals share', () => {
    const agreement = agreeOn([
      {loUs: 0, hiUs: 100},
      {loUs: 40, hiUs: 200},
      {loUs: 50, hiUs: 90}
    ]);
    expect(agreement).toMatchObject({loUs: 50, hiUs: 90, agreed: 3});
  });

  it('survives one interval that agrees with nothing', () => {
    // A reading that slipped past the check bits used to empty a plain
    // intersection, and a result that vanishes when one frame misreads is no
    // result at all.
    const agreement = agreeOn([
      {loUs: 0, hiUs: 100},
      {loUs: 10, hiUs: 90},
      {loUs: 900_000, hiUs: 900_100}
    ]);
    expect(agreement?.agreed).toBe(2);
    expect(agreement?.loUs).toBe(10);
  });

  it('counts intervals that merely touch as agreeing', () => {
    expect(agreeOn([{loUs: 0, hiUs: 50}, {loUs: 50, hiUs: 90}])?.agreed).toBe(2);
  });

  it('has nothing to say about no intervals', () => {
    expect(agreeOn([])).toBeUndefined();
  });
});

describe('estimating a correspondence', () => {
  function readings(count: number, delayUs: number): OpticalTimeObservation[] {
    return Array.from({length: count}, (_, index) => withDelay(index + 1, delayUs));
  }

  it('recovers a delay the readings were built around', () => {
    const result = estimateTimeCorrespondence(readings(20, 50_000), {
      nowUs: 1_737_000_010_000_000,
      decodeRate: 0.7
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const {correspondence} = result;
    expect(correspondence.displayToTimestampDelayUs).toBeGreaterThan(50_000 - REFRESH_US);
    expect(correspondence.displayToTimestampDelayUs).toBeLessThan(50_000 + REFRESH_US);
    expect(correspondence.delayLoUs).toBeLessThanOrEqual(50_000);
    expect(correspondence.delayHiUs).toBeGreaterThanOrEqual(50_000);
    expect(parseTimeCorrespondence(correspondence).ok).toBe(true);
  });

  it('narrows as the readings pile up rather than staying put', () => {
    // Each reading is a bound, so more of them can only shrink what is left.
    const few = estimateTimeCorrespondence(readings(3, 50_000), {nowUs: 1});
    const many = estimateTimeCorrespondence(readings(60, 50_000), {nowUs: 1});
    expect(few.ok && many.ok).toBe(true);
    if (!few.ok || !many.ok) return;
    expect(many.correspondence.uncertaintyUs).toBeLessThanOrEqual(
      few.correspondence.uncertaintyUs
    );
  });

  it('never calls the answer a clock offset', () => {
    const result = estimateTimeCorrespondence(readings(10, 50_000), {nowUs: 1});
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // The camera and display delays are always folded in; the two clocks are
    // the same one here, so the offset is not.
    expect(result.correspondence.unidentifiedComponents).toContain('cameraPipelineDelay');
    expect(result.correspondence.unidentifiedComponents).toContain('displayPipelineDelay');
    expect(result.correspondence.unidentifiedComponents).not.toContain('clockOffset');
  });

  it('admits the clock offset is folded in once the clocks differ', () => {
    const across = readings(10, 50_000).map((entry) => ({...entry, displayDomain: remoteDomain}));
    const result = estimateTimeCorrespondence(across, {nowUs: 1});
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.correspondence.unidentifiedComponents).toContain('clockOffset');
    expect(parseTimeCorrespondence(result.correspondence).ok).toBe(true);
  });

  it('admits it when the display clock is unknown', () => {
    const anonymous = readings(6, 50_000).map((entry) => ({...entry, displayDomain: null}));
    const result = estimateTimeCorrespondence(anonymous, {nowUs: 1});
    expect(result.ok && result.correspondence.unidentifiedComponents).toContain('clockOffset');
  });

  it('refuses when the readings cannot be reconciled', () => {
    // Half pointing one way and half another is not noise to average. It means
    // the model does not describe what happened.
    const split = [...readings(6, 50_000), ...readings(6, 900_000).map((e, i) => ({...e, sequence: 100 + i}))];
    const result = estimateTimeCorrespondence(split, {nowUs: 1});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('decode-unstable');
  });

  it('marks a result degraded when some readings disagree', () => {
    const mostly = [...readings(9, 50_000), {...withDelay(99, 900_000), sequence: 99}];
    const result = estimateTimeCorrespondence(mostly, {nowUs: 1});
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.correspondence.degraded).toBe(true);
    expect(result.correspondence.notes.join(' ')).toMatch(/outside the agreed interval/);
  });

  it('refuses a clock that was re-estimated partway through', () => {
    const moved = readings(6, 50_000).map((entry, index) =>
      index < 3
        ? entry
        : {...entry, observerDomain: {...localDomain, epoch: localDomain.epoch + 1}}
    );
    const result = estimateTimeCorrespondence(moved, {nowUs: 1});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('clock-epoch-changed');
  });

  it('refuses readings stamped on different clocks', () => {
    const mixed = readings(4, 50_000).map((entry, index) =>
      index === 0 ? entry : {...entry, observerDomain: remoteDomain}
    );
    const result = estimateTimeCorrespondence(mixed, {nowUs: 1});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('clock-domain-mismatch');
  });

  it('refuses readings decoded under different pattern profiles', () => {
    const mixed = readings(4, 50_000).map((entry, index) =>
      index === 0 ? entry : {...entry, patternProfileId: 'twtss.pattern.v2'}
    );
    expect(estimateTimeCorrespondence(mixed, {nowUs: 1}).ok).toBe(false);
  });

  it('refuses when there is nothing to estimate from', () => {
    const result = estimateTimeCorrespondence([], {nowUs: 1});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('insufficient-points');
  });

  it('marks a single reading degraded, since nothing corroborates it', () => {
    const result = estimateTimeCorrespondence(readings(1, 50_000), {nowUs: 1});
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.correspondence.degraded).toBe(true);
  });

  it('dates its own expiry', () => {
    const result = estimateTimeCorrespondence(readings(5, 50_000), {
      nowUs: 1_000_000,
      validityUs: 5_000_000
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.correspondence.measuredAtUs).toBe(1_000_000);
    expect(result.correspondence.validUntilUs).toBe(6_000_000);
  });
});

describe('robust summary', () => {
  it('reports the middle and the spread', () => {
    expect(summarize([10, 20, 30, 40, 50])).toMatchObject({median: 30, p10: 14, p90: 46});
  });

  it('has an answer for nothing at all', () => {
    expect(summarize([])).toEqual({median: 0, mad: 0, p10: 0, p90: 0});
  });
});
