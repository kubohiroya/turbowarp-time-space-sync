import {describe, expect, it} from 'vitest';
import {
  createWebRtcPeerClock,
  requireWebRtcClockApi,
  WEBRTC_EXTENSION_KEY
} from '../src/clock/index.js';
import {errorCodeOf} from '../src/contracts/index.js';

interface FakeState {
  synced: boolean;
  offsetUs: number;
  uncertaintyUs: number;
  localUs: number;
}

function fakeApi(state: FakeState) {
  return {
    localTime: () => state.localUs,
    peerTime: () => {
      // The WebRTC extension refuses this one for a peer it has never probed.
      if (!state.synced) throw new Error('Sync the clock with peer first.');
      return state.localUs + state.offsetUs;
    },
    clockOffset: () => (state.synced ? state.offsetUs : 0),
    clockUncertainty: () => (state.synced ? state.uncertaintyUs : 0)
  };
}

function peerClock(state: FakeState) {
  return createWebRtcPeerClock({} as TurboWarpRuntime, 'studio-host', {api: fakeApi(state)});
}

describe('WebRTC peer clock', () => {
  it('reports no estimate for a peer that was never probed', () => {
    // clockOffset and clockUncertainty both answer 0 for an unprobed peer,
    // which reads as "the clocks agree exactly and we are sure of it". Taking
    // those at face value would turn a missing measurement into the most
    // confident possible one, so the bridge probes with peerTime instead.
    const state: FakeState = {synced: false, offsetUs: 0, uncertaintyUs: 0, localUs: 1000};
    expect(peerClock(state).estimate()).toBeUndefined();
  });

  it('reads the estimate once the peer has been probed', () => {
    const state: FakeState = {synced: true, offsetUs: 2500, uncertaintyUs: 450, localUs: 1000};
    const estimate = peerClock(state).estimate();
    expect(estimate).toMatchObject({offsetUs: 2500, uncertaintyUs: 450});
    expect(estimate?.domain).toMatchObject({
      id: 'webrtc:studio-host',
      kind: 'webrtc-synchronized',
      epoch: 0,
      uncertaintyUs: 450
    });
  });

  it('advances the epoch when the offset is re-estimated', () => {
    const state: FakeState = {synced: true, offsetUs: 2500, uncertaintyUs: 450, localUs: 1000};
    const bridge = peerClock(state);
    expect(bridge.estimate()?.domain.epoch).toBe(0);
    expect(bridge.estimate()?.domain.epoch).toBe(0);
    state.offsetUs = 2900;
    expect(bridge.estimate()?.domain.epoch).toBe(1);
    expect(bridge.estimate()?.domain.epoch).toBe(1);
  });

  it('advances the epoch when only the uncertainty moves', () => {
    const state: FakeState = {synced: true, offsetUs: 2500, uncertaintyUs: 450, localUs: 1000};
    const bridge = peerClock(state);
    bridge.estimate();
    state.uncertaintyUs = 120;
    expect(bridge.estimate()?.domain.epoch).toBe(1);
  });

  it('treats an estimate that came back after a gap as a new one', () => {
    // The epoch has to move at the gap, not when the next estimate arrives: by
    // then the old offset is gone and an estimate that came back different
    // would keep the old epoch, letting a timestamp from before the gap be
    // converted with the new offset.
    const state: FakeState = {synced: true, offsetUs: 2500, uncertaintyUs: 450, localUs: 1000};
    const bridge = peerClock(state);
    expect(bridge.estimate()?.domain.epoch).toBe(0);
    state.synced = false;
    expect(bridge.estimate()).toBeUndefined();
    state.synced = true;
    expect(bridge.estimate()?.domain.epoch).toBe(1);
  });

  it('advances the epoch even when the peer comes back with the same offset', () => {
    const state: FakeState = {synced: true, offsetUs: 2500, uncertaintyUs: 450, localUs: 1000};
    const bridge = peerClock(state);
    bridge.estimate();
    state.synced = false;
    bridge.estimate();
    state.synced = true;
    state.offsetUs = 9000;
    const estimate = bridge.estimate();
    expect(estimate?.domain.epoch).toBe(1);
    expect(estimate?.offsetUs).toBe(9000);
  });

  it('does not advance the epoch while the peer was never synced', () => {
    const state: FakeState = {synced: false, offsetUs: 0, uncertaintyUs: 0, localUs: 1000};
    const bridge = peerClock(state);
    bridge.estimate();
    bridge.estimate();
    state.synced = true;
    state.offsetUs = 2500;
    expect(bridge.estimate()?.domain.epoch).toBe(0);
  });

  it('refuses a non-finite offset', () => {
    const bridge = createWebRtcPeerClock({} as TurboWarpRuntime, 'studio-host', {
      api: {
        localTime: () => 1000,
        peerTime: () => 1000,
        clockOffset: () => Number.NaN,
        clockUncertainty: () => 450
      }
    });
    expect(bridge.estimate()).toBeUndefined();
  });

  it('refuses a negative uncertainty', () => {
    const bridge = createWebRtcPeerClock({} as TurboWarpRuntime, 'studio-host', {
      api: {
        localTime: () => 1000,
        peerTime: () => 1000,
        clockOffset: () => 2500,
        clockUncertainty: () => -1
      }
    });
    expect(bridge.estimate()).toBeUndefined();
  });

  it('rejects an empty peer name', () => {
    expect(() =>
      createWebRtcPeerClock({} as TurboWarpRuntime, '   ', {
        api: fakeApi({synced: true, offsetUs: 0, uncertaintyUs: 0, localUs: 0})
      })
    ).toThrowError(/peer name/);
  });
});

describe('WebRTC clock API discovery', () => {
  it('names the missing extension rather than failing later', () => {
    try {
      requireWebRtcClockApi({} as TurboWarpRuntime);
      expect.unreachable('should have refused');
    } catch (error) {
      expect(errorCodeOf(error)).toBe('webrtc-contract-mismatch');
      expect((error as Error).message).toContain('not loaded');
    }
  });

  it('names the missing methods when an older build is loaded', () => {
    const runtime = {[WEBRTC_EXTENSION_KEY]: {localTime: () => 0}} as unknown as TurboWarpRuntime;
    try {
      requireWebRtcClockApi(runtime);
      expect.unreachable('should have refused');
    } catch (error) {
      expect(errorCodeOf(error)).toBe('webrtc-contract-mismatch');
      expect((error as Error).message).toContain('peerTime');
    }
  });

  it('accepts a runtime that publishes the whole clock API', () => {
    const runtime = {
      [WEBRTC_EXTENSION_KEY]: fakeApi({
        synced: true,
        offsetUs: 0,
        uncertaintyUs: 0,
        localUs: 0
      })
    } as unknown as TurboWarpRuntime;
    expect(() => requireWebRtcClockApi(runtime)).not.toThrow();
  });
});
