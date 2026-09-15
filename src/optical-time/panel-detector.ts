import type {LuminanceFrame, PanelRect} from './sampling.js';
import type {PatternProfile} from './pattern-profile.js';

export interface PanelDetectionOptions {
  /** Smallest light-to-dark swing a panel pixel must show over the window. */
  readonly minimumRange?: number;
  /** Fraction of the strongest swing a pixel must reach to count as panel. */
  readonly rangeRatio?: number;
  /** Smallest analysis pixels per pattern cell. */
  readonly minimumCellPixels?: number;
  /** Smallest share of the bounding box the detected region must fill. */
  readonly minimumFillRatio?: number;
  /** Largest tolerated width-to-height ratio of the bounding box. */
  readonly maximumAspectSkew?: number;
  /**
   * How large a second region may be, relative to the winner, before the scene
   * counts as ambiguous.
   */
  readonly ambiguityRatio?: number;
}

const defaultOptions: Required<PanelDetectionOptions> = {
  minimumRange: 40,
  rangeRatio: 0.5,
  minimumCellPixels: 3,
  minimumFillRatio: 0.5,
  maximumAspectSkew: 2.5,
  ambiguityRatio: 0.5
};

/**
 * Why a detection did not produce a panel.
 *
 * `ambiguous` is kept apart from `not-found` because the two call for opposite
 * actions: one asks the operator to light the panel or point the camera at it,
 * the other asks them to remove the second one.
 */
export type PanelDetectionFailure =
  | 'too-few-frames'
  | 'no-changing-region'
  | 'too-small'
  | 'wrong-shape'
  | 'not-solid'
  | 'ambiguous';

export type PanelDetection =
  | {readonly ok: true; readonly panel: PanelRect}
  | {readonly ok: false; readonly reason: PanelDetectionFailure};

/**
 * Finds the panel by watching which pixels change over time.
 *
 * Every pattern cell toggles within a few seconds because the counter runs
 * through all of its bits, so the panel stands out as one connected region of
 * high temporal range while the rest of the room stays comparatively still.
 */
export class PanelRangeAccumulator {
  public readonly width: number;
  public readonly height: number;
  private readonly minimum: Uint8Array;
  private readonly maximum: Uint8Array;
  private frameCount = 0;

  public constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.minimum = new Uint8Array(width * height).fill(255);
    this.maximum = new Uint8Array(width * height);
  }

  public add(frame: LuminanceFrame): void {
    if (frame.width !== this.width || frame.height !== this.height) {
      throw new Error('Frame size does not match the accumulator.');
    }
    for (let index = 0; index < frame.data.length; index += 1) {
      const value = frame.data[index] ?? 0;
      if (value < (this.minimum[index] ?? 255)) this.minimum[index] = value;
      if (value > (this.maximum[index] ?? 0)) this.maximum[index] = value;
    }
    this.frameCount += 1;
  }

  public frames(): number {
    return this.frameCount;
  }

  public detect(
    profile: PatternProfile,
    options: PanelDetectionOptions = {}
  ): PanelDetection {
    if (this.frameCount < 2) return {ok: false, reason: 'too-few-frames'};
    const settings = {...defaultOptions, ...options};
    const pixels = this.width * this.height;
    let strongest = 0;
    for (let index = 0; index < pixels; index += 1) {
      const range = (this.maximum[index] ?? 0) - (this.minimum[index] ?? 0);
      if (range > strongest) strongest = range;
    }
    if (strongest < settings.minimumRange) return {ok: false, reason: 'no-changing-region'};
    const threshold = Math.max(settings.minimumRange, strongest * settings.rangeRatio);

    const mask = new Uint8Array(pixels);
    for (let index = 0; index < pixels; index += 1) {
      const range = (this.maximum[index] ?? 0) - (this.minimum[index] ?? 0);
      mask[index] = range >= threshold ? 1 : 0;
    }
    const regions = findRegions(mask, this.width, this.height);
    const best = regions[0];
    if (!best) return {ok: false, reason: 'no-changing-region'};

    // A second region of comparable size means the camera can see more than one
    // flickering panel: a second display, a reflection, a window. Taking the
    // larger one would read a time off whichever happened to win, with nothing
    // in the result to say which.
    const runnerUp = regions[1];
    if (runnerUp && runnerUp.area >= best.area * settings.ambiguityRatio) {
      return {ok: false, reason: 'ambiguous'};
    }

    const width = best.maxX - best.minX + 1;
    const height = best.maxY - best.minY + 1;
    if (
      width < profile.columns * settings.minimumCellPixels ||
      height < profile.rows * settings.minimumCellPixels
    ) {
      return {ok: false, reason: 'too-small'};
    }
    const skew = width / height;
    if (skew > settings.maximumAspectSkew || skew < 1 / settings.maximumAspectSkew) {
      return {ok: false, reason: 'wrong-shape'};
    }
    if (best.area / (width * height) < settings.minimumFillRatio) {
      return {ok: false, reason: 'not-solid'};
    }
    return {ok: true, panel: {x: best.minX, y: best.minY, width, height}};
  }
}

interface Region {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  area: number;
}

/** Connected regions of the mask, largest first. */
function findRegions(mask: Uint8Array, width: number, height: number): Region[] {
  const visited = new Uint8Array(mask.length);
  const stack: number[] = [];
  const regions: Region[] = [];
  for (let start = 0; start < mask.length; start += 1) {
    if (mask[start] !== 1 || visited[start] === 1) continue;
    visited[start] = 1;
    stack.push(start);
    let area = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    while (stack.length > 0) {
      const index = stack.pop() as number;
      const x = index % width;
      const y = (index - x) / width;
      area += 1;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x > 0) push(index - 1);
      if (x + 1 < width) push(index + 1);
      if (y > 0) push(index - width);
      if (y + 1 < height) push(index + width);
    }
    regions.push({minX, minY, maxX, maxY, area});
  }
  return regions.sort((left, right) => right.area - left.area);

  function push(index: number): void {
    if (mask[index] === 1 && visited[index] === 0) {
      visited[index] = 1;
      stack.push(index);
    }
  }
}
