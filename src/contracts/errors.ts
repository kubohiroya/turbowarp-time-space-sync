/**
 * Every reason this package refuses to produce a result.
 *
 * The codes are part of the contract: a consumer branches on them, so they are
 * enumerated rather than free text, and the message carries the detail. An
 * empty string means there is no error, which keeps a reporter block able to
 * return something for the idle case without inventing a code for it.
 */
export const TIME_SPACE_SYNC_ERROR_CODES = [
  '',
  // Decoder lifecycle, carried over from the extraction source.
  'invalid-duration',
  'camera-unavailable',
  'camera-ended',
  'panel-not-found',
  'low-contrast',
  'decode-unstable',
  // Conditions the extraction source could not tell apart from the ones above.
  'ambiguous-panel',
  'stale-levels',
  'frame-size-mismatch',
  'capture-time-unavailable',
  'exposure-too-long',
  // Clock and profile agreement.
  'clock-domain-mismatch',
  'clock-epoch-changed',
  'intrinsic-profile-mismatch',
  'unsupported-distortion-model',
  'webrtc-contract-mismatch',
  // Placement.
  'reference-unknown',
  'degenerate-view',
  'insufficient-points',
  'verification-failed',
  // Measuring the pattern's corners for placement.
  'decoder-not-running',
  'profile-without-fiducials',
  'intrinsic-profile-missing',
  'too-few-corner-frames',
  'corners-unstable',
  'orientation-unproven',
  // Display.
  'photosensitivity-unacknowledged',
  'display-unavailable',
  'unknown-pattern-profile',
  'pattern-profile-in-use',
  // Contract validation.
  'invalid-payload'
] as const;

export type TimeSpaceSyncErrorCode = (typeof TIME_SPACE_SYNC_ERROR_CODES)[number];

/**
 * The six codes the extraction source published.
 *
 * A compatibility adapter must map every new code onto one of these before it
 * reaches an old opcode. Existing projects compare the reporter against a
 * literal, so an unknown string reads to them as "no error I know about" and
 * the failure passes silently.
 */
export const LEGACY_FRAME_SYNC_ERROR_CODES = [
  '',
  'invalid-duration',
  'camera-unavailable',
  'camera-ended',
  'panel-not-found',
  'low-contrast',
  'decode-unstable'
] as const;

export type LegacyFrameSyncErrorCode = (typeof LEGACY_FRAME_SYNC_ERROR_CODES)[number];

const LEGACY_BY_CODE: Readonly<Record<TimeSpaceSyncErrorCode, LegacyFrameSyncErrorCode>> = {
  '': '',
  'invalid-duration': 'invalid-duration',
  'camera-unavailable': 'camera-unavailable',
  'camera-ended': 'camera-ended',
  'panel-not-found': 'panel-not-found',
  'low-contrast': 'low-contrast',
  'decode-unstable': 'decode-unstable',
  'ambiguous-panel': 'panel-not-found',
  'stale-levels': 'decode-unstable',
  'frame-size-mismatch': 'panel-not-found',
  'capture-time-unavailable': 'decode-unstable',
  'exposure-too-long': 'decode-unstable',
  'clock-domain-mismatch': 'camera-unavailable',
  'clock-epoch-changed': 'camera-unavailable',
  'intrinsic-profile-mismatch': 'camera-unavailable',
  'unsupported-distortion-model': 'camera-unavailable',
  'webrtc-contract-mismatch': 'camera-unavailable',
  'reference-unknown': 'camera-unavailable',
  'degenerate-view': 'camera-unavailable',
  'insufficient-points': 'camera-unavailable',
  'verification-failed': 'camera-unavailable',
  'decoder-not-running': 'camera-unavailable',
  'profile-without-fiducials': 'panel-not-found',
  'intrinsic-profile-missing': 'camera-unavailable',
  'too-few-corner-frames': 'panel-not-found',
  'corners-unstable': 'decode-unstable',
  'orientation-unproven': 'decode-unstable',
  'photosensitivity-unacknowledged': 'camera-unavailable',
  'display-unavailable': 'camera-unavailable',
  'unknown-pattern-profile': 'camera-unavailable',
  'pattern-profile-in-use': 'camera-unavailable',
  'invalid-payload': 'camera-unavailable'
};

/** Narrows a code to the vocabulary an old frame-sync opcode understands. */
export function toLegacyFrameSyncErrorCode(
  code: TimeSpaceSyncErrorCode
): LegacyFrameSyncErrorCode {
  return LEGACY_BY_CODE[code];
}

/**
 * A refusal carrying one of the codes above.
 *
 * Every path that gives up produces one of these rather than a bare `Error`,
 * so a caller can branch on the reason without parsing a message, and so a
 * block reporter has something stable to publish.
 */
export class TimeSpaceSyncError extends Error {
  public readonly code: TimeSpaceSyncErrorCode;

  public constructor(code: TimeSpaceSyncErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'TimeSpaceSyncError';
    this.code = code;
  }
}

/** The code of an error, or `invalid-payload` for anything not from this package. */
export function errorCodeOf(error: unknown): TimeSpaceSyncErrorCode {
  return error instanceof TimeSpaceSyncError ? error.code : 'invalid-payload';
}
