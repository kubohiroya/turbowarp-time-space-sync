import {
  cellCount,
  cellsPerBit,
  codeCount,
  dataCellCount,
  requireUsableProfile,
  wrapUs,
  type PatternProfile
} from './pattern-profile.js';

/**
 * The time code a display shows, and the reading of it.
 *
 * Data cells carry a counter; check cells reject a reading that mixed two
 * displayed frames, which happens whenever a camera exposure straddles a
 * display refresh.
 *
 * The check is a fold of the counter onto itself, so it is linear: single cell
 * errors are always caught, but of the 4095 non-zero error patterns across the
 * data cells, 255 leave the check unchanged and pass. An undetected mix reports
 * a time that can be wrong by most of the wrap period, so the check is a filter
 * and not a guarantee. A decoder that needs one adds a continuity gate against
 * a clock it already has; the encoding alone cannot provide it.
 */

const CHECK_SEED = 0b1010;

/** The code a display shows for a timestamp, in the display computer's clock. */
export function patternCodeForTimestamp(
  timestampUs: number,
  profile: PatternProfile
): number {
  const count = codeCount(profile);
  const steps = Math.floor(timestampUs / profile.stepUs);
  // Two remainders, because the first can be negative and a code cannot.
  return ((steps % count) + count) % count;
}

/** The display time a decoded code stands for, within the current wrap window. */
export function patternTimestampUs(code: number, profile: PatternProfile): number {
  return normalizeCode(code, profile) * profile.stepUs;
}

export function patternCheckBits(code: number, profile: PatternProfile): number {
  const mask = 2 ** profile.checkBits - 1;
  let folded = 0;
  for (let shift = 0; shift < profile.dataBits; shift += profile.checkBits) {
    folded ^= code >> shift;
  }
  return (folded & mask) ^ CHECK_SEED;
}

/** Cell states in row-major order. `true` is a light cell. */
export function encodePatternCells(code: number, profile: PatternProfile): boolean[] {
  requireUsableProfile(profile);
  const normalized = normalizeCode(code, profile);
  const check = patternCheckBits(normalized, profile);
  const bits: boolean[] = [];
  for (let index = 0; index < profile.dataBits; index += 1) {
    bits.push(bitAt(normalized, profile.dataBits - 1 - index));
  }
  for (let index = 0; index < profile.checkBits; index += 1) {
    bits.push(bitAt(check, profile.checkBits - 1 - index));
  }
  const payload: boolean[] = [];
  for (const bit of bits) {
    payload.push(bit);
    // The paired cell always holds the opposite state, so every code lights
    // exactly half the data cells and the panel's total output does not change
    // from one code to the next.
    if (profile.encoding === 'differential') payload.push(!bit);
  }
  while (payload.length < dataCellCount(profile)) payload.push(false);
  return layOut(payload, profile);
}

/**
 * Rebuilds the code from cell states.
 *
 * An undefined cell is one the reader could not tell apart from its opposite,
 * and any such cell rejects the whole reading rather than being guessed at: a
 * guessed cell that happens to satisfy the check produces a confident wrong
 * time.
 */
export function decodePatternCells(
  cells: readonly (boolean | undefined)[],
  profile: PatternProfile
): number | undefined {
  requireUsableProfile(profile);
  if (cells.length !== cellCount(profile)) return undefined;
  const fiducials = new Set(profile.fiducials);
  // A fiducial is lit in every code, so one that does not come back lit means
  // the cells were read from the wrong region and the data cells are not the
  // cells they are assumed to be.
  for (const index of fiducials) {
    if (cells[index] !== true) return undefined;
  }
  const payload = cells.filter((_, index) => !fiducials.has(index));
  const stride = cellsPerBit(profile);
  const bits: boolean[] = [];
  for (let index = 0; index < profile.dataBits + profile.checkBits; index += 1) {
    const bit = readBit(payload, index * stride, profile);
    if (bit === undefined) return undefined;
    bits.push(bit);
  }
  let code = 0;
  for (let index = 0; index < profile.dataBits; index += 1) {
    code = (code << 1) | (bits[index] === true ? 1 : 0);
  }
  let check = 0;
  for (let index = 0; index < profile.checkBits; index += 1) {
    check = (check << 1) | (bits[profile.dataBits + index] === true ? 1 : 0);
  }
  return check === patternCheckBits(code, profile) ? code : undefined;
}

/** How many light cells a code lights, which a constant-luminance profile fixes. */
export function litCellCount(code: number, profile: PatternProfile): number {
  return encodePatternCells(code, profile).filter((cell) => cell).length;
}

export {wrapUs};

function readBit(
  cells: readonly (boolean | undefined)[],
  offset: number,
  profile: PatternProfile
): boolean | undefined {
  const cell = cells[offset];
  if (profile.encoding !== 'differential') return cell;
  const opposite = cells[offset + 1];
  if (cell === undefined || opposite === undefined) return undefined;
  // Both cells reading the same way is not a bit at all: the pair was misread,
  // or the panel moved between them.
  return cell === opposite ? undefined : cell;
}

/** Places the payload cells around the fiducials, in row-major order. */
function layOut(payload: readonly boolean[], profile: PatternProfile): boolean[] {
  const fiducials = new Set(profile.fiducials);
  const cells: boolean[] = [];
  let next = 0;
  for (let index = 0; index < cellCount(profile); index += 1) {
    if (fiducials.has(index)) {
      cells.push(true);
      continue;
    }
    cells.push(payload[next] === true);
    next += 1;
  }
  return cells;
}

function normalizeCode(code: number, profile: PatternProfile): number {
  const count = codeCount(profile);
  const rounded = Math.trunc(code);
  return ((rounded % count) + count) % count;
}

function bitAt(value: number, bit: number): boolean {
  return ((value >> bit) & 1) === 1;
}
