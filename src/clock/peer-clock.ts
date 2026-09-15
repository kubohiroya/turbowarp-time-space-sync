import type {ClockDomain} from '../contracts/index.js';

/**
 * A measured relationship between this computer's clock and a peer's.
 *
 * `offsetUs` is defined so that `localUs + offsetUs` is the same instant read
 * on the peer's clock.
 */
export interface PeerClockEstimate {
  readonly domain: ClockDomain;
  readonly offsetUs: number;
  readonly uncertaintyUs: number;
}

/**
 * A source of that relationship for one peer.
 *
 * `estimate` returns `undefined` while the relationship is unknown, which is
 * the state the session starts in and returns to whenever a peer reconnects.
 * An unknown offset is not a zero offset, and the two must not be allowed to
 * look alike: zero says the clocks agree exactly, which is a strong claim to
 * make about a machine nobody has probed.
 */
export interface PeerClockBridge {
  readonly peer: string;
  estimate(): PeerClockEstimate | undefined;
}
