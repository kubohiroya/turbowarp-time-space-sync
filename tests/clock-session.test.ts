import {describe, expect, it} from 'vitest';
import {LocalMonotonicClock, SessionClock, peerDomain} from '../src/clock/index.js';
import type {PeerClockBridge, PeerClockEstimate} from '../src/clock/index.js';
import type {ClockDomain} from '../src/contracts/index.js';

function clock(): {session: SessionClock; local: LocalMonotonicClock} {
  let value = 1_000_000;
  const local = new LocalMonotonicClock({id: 'local:test', now: () => (value += 1000)});
  return {session: new SessionClock(local), local};
}

function bridge(peer: string, estimate: () => PeerClockEstimate | undefined): PeerClockBridge {
  return {peer, estimate};
}

const remote: ClockDomain = peerDomain('studio-host', 0, 450);

describe('session clock', () => {
  it('serves deadlines from the monotonic clock, not from a converted one', () => {
    const {session, local} = clock();
    expect(session.monotonic()).toBe(local);
  });

  it('converts within its own domain exactly', () => {
    const {session} = clock();
    expect(session.convertFrom(session.domain(), 42)).toEqual({
      timestampUs: 42,
      uncertaintyUs: 0
    });
  });

  it('refuses a foreign domain when no peer is registered', () => {
    // This is the single-computer case. Several cameras on one machine share a
    // clock; a timestamp from another machine simply cannot be placed on it.
    const {session} = clock();
    expect(session.convertFrom(remote, 42)).toBeUndefined();
  });

  it('converts a peer timestamp once the peer has been estimated', () => {
    const {session} = clock();
    session.registerPeer(
      bridge('studio-host', () => ({domain: remote, offsetUs: 2500, uncertaintyUs: 450}))
    );
    // localUs + offsetUs = peerUs, so the inverse subtracts.
    expect(session.convertFrom(remote, 12_500)).toEqual({
      timestampUs: 10_000,
      uncertaintyUs: 450
    });
    expect(session.convertTo(remote, 10_000)).toEqual({
      timestampUs: 12_500,
      uncertaintyUs: 450
    });
  });

  it('refuses a timestamp taken under a superseded epoch', () => {
    // The offset moved after that timestamp was read. Applying today's offset
    // would shift it by the whole correction and the result would look like an
    // ordinary measurement.
    const {session} = clock();
    session.registerPeer(
      bridge('studio-host', () => ({
        domain: peerDomain('studio-host', 4, 450),
        offsetUs: 2500,
        uncertaintyUs: 450
      }))
    );
    expect(session.convertFrom(peerDomain('studio-host', 3, 450), 12_500)).toBeUndefined();
    expect(session.convertFrom(peerDomain('studio-host', 4, 450), 12_500)).toBeDefined();
  });

  it('refuses while the peer has no estimate yet', () => {
    const {session} = clock();
    session.registerPeer(bridge('studio-host', () => undefined));
    expect(session.convertFrom(remote, 12_500)).toBeUndefined();
  });

  it('refuses a non-finite timestamp in either direction', () => {
    const {session} = clock();
    session.registerPeer(
      bridge('studio-host', () => ({domain: remote, offsetUs: 2500, uncertaintyUs: 450}))
    );
    expect(session.convertFrom(remote, Number.NaN)).toBeUndefined();
    expect(session.convertTo(remote, Number.POSITIVE_INFINITY)).toBeUndefined();
  });

  it('stops converting for a forgotten peer', () => {
    const {session} = clock();
    session.registerPeer(
      bridge('studio-host', () => ({domain: remote, offsetUs: 2500, uncertaintyUs: 450}))
    );
    expect(session.peers()).toEqual(['studio-host']);
    session.forgetPeer('studio-host');
    expect(session.peers()).toEqual([]);
    expect(session.convertFrom(remote, 12_500)).toBeUndefined();
  });

  it('lists only the domains it can actually reach', () => {
    const {session} = clock();
    session.registerPeer(bridge('quiet', () => undefined));
    session.registerPeer(
      bridge('studio-host', () => ({domain: remote, offsetUs: 0, uncertaintyUs: 450}))
    );
    expect(session.reachableDomains().map((domain) => domain.id)).toEqual([
      'local:test',
      'webrtc:studio-host'
    ]);
  });
});
