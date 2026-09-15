import {TimeSpaceSyncError, type ClockDomain} from '../contracts/index.js';
import type {PeerClockBridge, PeerClockEstimate} from './peer-clock.js';

export const WEBRTC_EXTENSION_KEY = 'ext_kubohiroyawebrtc';

/**
 * The clock methods this adapter needs, in the shape the WebRTC extension
 * publishes them: block methods taking an arguments object.
 *
 * The clock is reached through the extension object rather than through
 * `kubohiroyaWebRtcCapability`, because that capability covers pairing and the
 * latest-data channel and does not include the clock. There is therefore no
 * version to require here, only the methods to feature-detect.
 */
interface WebRtcClockApi {
  localTime(): unknown;
  peerTime(args: {PEER: unknown}): unknown;
  clockOffset(args: {PEER: unknown}): unknown;
  clockUncertainty(args: {PEER: unknown}): unknown;
}

export interface WebRtcPeerClockOptions {
  /** Overrides the extension lookup; used by tests and by hosted runtimes. */
  readonly api?: WebRtcClockApi;
}

/**
 * Converts between this computer's clock and one peer's, using the estimate the
 * WebRTC extension already maintains.
 *
 * No clock estimation happens here. The WebRTC extension owns the probe
 * exchange, and running a second estimator against the same link would produce
 * a second answer with no way to tell which one a measurement used.
 */
export function createWebRtcPeerClock(
  runtime: TurboWarpRuntime,
  peer: string,
  options: WebRtcPeerClockOptions = {}
): PeerClockBridge {
  const api = options.api ?? requireWebRtcClockApi(runtime);
  const trimmed = peer.trim();
  if (trimmed === '') {
    throw new TimeSpaceSyncError('webrtc-contract-mismatch', 'A peer name is required.');
  }
  let epoch = 0;
  let last: {offsetUs: number; uncertaintyUs: number} | undefined;

  return {
    peer: trimmed,
    estimate(): PeerClockEstimate | undefined {
      if (!hasEstimate(api, trimmed)) {
        // Forget what we knew: a peer whose estimate has gone is a peer whose
        // next estimate is a new measurement, not a continuation of the old one.
        last = undefined;
        return undefined;
      }
      const offsetUs = asFinite(api.clockOffset({PEER: trimmed}));
      const uncertaintyUs = asFinite(api.clockUncertainty({PEER: trimmed}));
      if (offsetUs === undefined || uncertaintyUs === undefined || uncertaintyUs < 0) {
        return undefined;
      }
      if (last !== undefined && (last.offsetUs !== offsetUs || last.uncertaintyUs !== uncertaintyUs)) {
        // The WebRTC extension publishes no epoch of its own, so one is derived
        // from the estimate moving. Re-synchronising to a byte-identical offset
        // is indistinguishable from not re-synchronising, which is harmless:
        // an identical offset is the same mapping.
        epoch += 1;
      }
      last = {offsetUs, uncertaintyUs};
      return {
        domain: peerDomain(trimmed, epoch, uncertaintyUs),
        offsetUs,
        uncertaintyUs
      };
    }
  };
}

export function peerDomain(peer: string, epoch: number, uncertaintyUs: number): ClockDomain {
  return Object.freeze({
    id: `webrtc:${peer}`,
    kind: 'webrtc-synchronized',
    epoch,
    uncertaintyUs
  } as const);
}

/**
 * Asks whether the peer's clock has actually been estimated.
 *
 * `clockOffset` and `clockUncertainty` both answer 0 for a peer that was never
 * probed, which reads as "the two clocks agree exactly, and we are certain of
 * it" — the strongest possible claim, returned for the case where nothing is
 * known. `peerTime` is the one method that refuses instead, so it is used as
 * the probe and its answer is discarded.
 */
function hasEstimate(api: WebRtcClockApi, peer: string): boolean {
  try {
    return Number.isFinite(Number(api.peerTime({PEER: peer})));
  } catch {
    return false;
  }
}

export function requireWebRtcClockApi(runtime: TurboWarpRuntime): WebRtcClockApi {
  const candidate = runtime[WEBRTC_EXTENSION_KEY];
  if (typeof candidate !== 'object' || candidate === null) {
    throw new TimeSpaceSyncError(
      'webrtc-contract-mismatch',
      'TurboWarp WebRTC is not loaded, so peer clocks are unavailable.'
    );
  }
  const record = candidate as Record<string, unknown>;
  const missing = ['localTime', 'peerTime', 'clockOffset', 'clockUncertainty'].filter(
    (name) => typeof record[name] !== 'function'
  );
  if (missing.length > 0) {
    throw new TimeSpaceSyncError(
      'webrtc-contract-mismatch',
      `TurboWarp WebRTC does not publish the clock API: ${missing.join(', ')} missing.`
    );
  }
  return candidate as unknown as WebRtcClockApi;
}

function asFinite(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
