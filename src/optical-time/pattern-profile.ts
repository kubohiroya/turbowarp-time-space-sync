import {TimeSpaceSyncError} from '../contracts/index.js';

/**
 * How one pattern encodes a time into cells.
 *
 * The extraction source hard-coded a 4x4 grid, a twelve bit counter and a one
 * millisecond step. Those are made into a profile here, not because v1 needs
 * the freedom, but because the display and the decoder have to agree on them:
 * a mismatch decodes nothing at all, and an identifier in the observation is
 * what lets the two sides notice.
 */
export interface PatternProfile {
  readonly id: string;
  readonly columns: number;
  readonly rows: number;
  readonly dataBits: number;
  readonly checkBits: number;
  /** Microseconds per counter step: the quantisation of the displayed value. */
  readonly stepUs: number;
  /**
   * How each bit is drawn.
   *
   * `absolute` gives one cell per bit and reads it against a learned light and
   * dark level. `differential` gives each bit a pair of cells in opposite
   * states, which keeps the lit cell count constant for every code.
   */
  readonly encoding: 'absolute' | 'differential';
  /**
   * How the decoder finds each cell in the image.
   *
   * `grid` divides the panel's bounding box evenly, which is what the
   * extraction source did and is only correct for a square-on, undistorted
   * view. `quad` maps the panel's four corners through a homography, which
   * survives a tilted camera and a keystoned projection.
   */
  readonly sampling: 'grid' | 'quad';
  /**
   * Cells that are lit in every code.
   *
   * They give the panel four corners that do not move with the data, so the
   * homography has something fixed to be fitted to, and a reading whose
   * fiducials do not come back lit is a reading of the wrong region.
   */
  readonly fiducials: readonly number[];
}

/** The profile the extraction source published, reproduced exactly. */
export const PATTERN_PROFILE_V1: PatternProfile = Object.freeze({
  id: 'twtss.pattern.v1',
  columns: 4,
  rows: 4,
  dataBits: 12,
  checkBits: 4,
  stepUs: 1000,
  encoding: 'absolute',
  sampling: 'grid',
  fiducials: []
});

/**
 * A constant-luminance profile with corner fiducials.
 *
 * Each bit takes a pair of cells in opposite states, so every code lights
 * exactly the same number of cells and the panel's total output does not change
 * from one code to the next. That removes the whole-panel brightness pulsing,
 * and it also makes each bit a comparison between two neighbouring cells rather
 * than a reading against a learned level -- which is what made the v1 levels
 * vulnerable to uneven projection and to drift.
 *
 * Sixteen bits need thirty-two cells; with four corner fiducials that is a 6x6
 * grid. The cost is resolution: cells are smaller, so the panel has to be
 * larger in the camera image than v1 needed.
 */
export const PATTERN_PROFILE_V2: PatternProfile = Object.freeze({
  id: 'twtss.pattern.v2',
  columns: 6,
  rows: 6,
  dataBits: 12,
  checkBits: 4,
  stepUs: 1000,
  encoding: 'differential',
  sampling: 'quad',
  fiducials: Object.freeze([0, 5, 30, 35])
});

export function cellCount(profile: PatternProfile): number {
  return profile.columns * profile.rows;
}

export function codeCount(profile: PatternProfile): number {
  return 2 ** profile.dataBits;
}

/**
 * The period after which the encoded time repeats.
 *
 * A reading is only a time within the current window. The consumer resolves
 * which window by comparing against a clock it already has, which holds as long
 * as the measured latency stays well inside half the period.
 */
export function wrapUs(profile: PatternProfile): number {
  return codeCount(profile) * profile.stepUs;
}

/** Cells used per bit: one, or two for a constant-luminance pattern. */
export function cellsPerBit(profile: PatternProfile): number {
  return profile.encoding === 'differential' ? 2 : 1;
}

/** Cells available to the encoding, once the fiducials have taken theirs. */
export function dataCellCount(profile: PatternProfile): number {
  return cellCount(profile) - profile.fiducials.length;
}

export function requireUsableProfile(profile: PatternProfile): PatternProfile {
  const bits = profile.dataBits + profile.checkBits;
  const needed = bits * cellsPerBit(profile);
  if (profile.columns < 1 || profile.rows < 1) {
    throw new TimeSpaceSyncError('invalid-payload', 'A pattern needs at least one cell.');
  }
  if (profile.dataBits < 1 || profile.checkBits < 1) {
    throw new TimeSpaceSyncError(
      'invalid-payload',
      'A pattern needs both data and check bits.'
    );
  }
  if (profile.stepUs < 1 || !Number.isSafeInteger(profile.stepUs)) {
    throw new TimeSpaceSyncError('invalid-payload', 'The pattern step must be whole microseconds.');
  }
  for (const index of profile.fiducials) {
    if (!Number.isInteger(index) || index < 0 || index >= cellCount(profile)) {
      throw new TimeSpaceSyncError(
        'invalid-payload',
        `Fiducial cell ${index} is outside the ${profile.columns}x${profile.rows} grid.`
      );
    }
  }
  if (new Set(profile.fiducials).size !== profile.fiducials.length) {
    throw new TimeSpaceSyncError('invalid-payload', 'Fiducial cells must be distinct.');
  }
  if (needed > dataCellCount(profile)) {
    throw new TimeSpaceSyncError(
      'invalid-payload',
      `The ${profile.columns}x${profile.rows} grid leaves ${dataCellCount(profile)} cells for data but the encoding needs ${needed}.`
    );
  }
  return profile;
}

/**
 * The shortest window in which every cell is guaranteed to change state.
 *
 * The slowest bit is the top data bit, which holds its value for half the wrap
 * period. Calibrating for less than that can leave a cell at one level for the
 * whole window, and it would then be located from an incomplete region or read
 * as low contrast: a failure the operator cannot act on, because nothing was
 * actually wrong.
 */
export function minimumObservationUs(profile: PatternProfile): number {
  return wrapUs(profile) / 2;
}
