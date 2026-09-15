import {decodePatternCells} from './pattern.js';
import {cellCount, type PatternProfile} from './pattern-profile.js';

export interface CellLevelsOptions {
  /**
   * Share of the learning samples ignored at each end.
   *
   * The extraction source kept each cell's outright minimum and maximum, so a
   * single frame decided a cell's levels for the rest of the session: someone
   * walking through the shot, an auto-exposure step, one blown highlight. The
   * band between the levels is what rejects a mixed exposure, so a stretched
   * band does not fail loudly, it quietly stops rejecting.
   */
  readonly trimRatio?: number;
  /** How far from the midpoint a reading must sit to count as a state. */
  readonly marginRatio?: number;
  /** Learning samples kept per cell. */
  readonly windowSize?: number;
  /** Weight given to a new reading when tracking a confident decode. */
  readonly trackingRate?: number;
  /**
   * How far tracking may move a level in one step, as a share of the band.
   *
   * Without a cap a run of misreads can walk the levels onto the wrong side of
   * the band, after which the decoder confidently reads inverted cells.
   */
  readonly trackingLimitRatio?: number;
}

const defaults: Required<CellLevelsOptions> = {
  trimRatio: 0.05,
  marginRatio: 0.25,
  windowSize: 256,
  trackingRate: 0.02,
  trackingLimitRatio: 0.05
};

interface Level {
  low: number;
  high: number;
}

/**
 * Light and dark levels learned per cell.
 *
 * Projection is uneven, so one global threshold misreads the dim corners of the
 * panel. Each cell keeps its own pair of levels and rejects readings that land
 * in the band between them, which is where a mixed exposure shows up.
 */
export class CellLevels {
  private readonly profile: PatternProfile;
  private readonly options: Required<CellLevelsOptions>;
  private readonly samples: number[][];
  private readonly fiducials: ReadonlySet<number>;
  private levels: Level[] | undefined;

  public constructor(profile: PatternProfile, options: CellLevelsOptions = {}) {
    this.profile = profile;
    this.options = {...defaults, ...options};
    this.samples = Array.from({length: cellCount(profile)}, () => []);
    this.fiducials = new Set(profile.fiducials);
  }

  /** Adds one reading to the learning window. */
  public add(values: readonly number[]): void {
    for (let index = 0; index < this.samples.length; index += 1) {
      const value = values[index];
      if (value === undefined || !Number.isFinite(value)) continue;
      const bucket = this.samples[index] as number[];
      bucket.push(value);
      if (bucket.length > this.options.windowSize) bucket.shift();
    }
    this.levels = undefined;
  }

  public sampleCount(): number {
    return this.samples[0]?.length ?? 0;
  }

  /**
   * The narrowest band across the data cells: the panel's weakest contrast.
   *
   * Fiducials are excluded. They are lit in every code, so their band is zero
   * by construction, and counting them would report every panel carrying
   * fiducials as having no contrast at all.
   */
  public contrast(): number {
    let smallest = Number.POSITIVE_INFINITY;
    this.resolve().forEach((level, index) => {
      if (this.fiducials.has(index)) return;
      const span = level.high - level.low;
      if (span < smallest) smallest = span;
    });
    return Number.isFinite(smallest) ? smallest : 0;
  }

  /**
   * One threshold for cells that never change, taken across the data cells.
   *
   * A fiducial has no band of its own to be read against, so it is read against
   * the panel as a whole. That still answers the question the fiducial exists
   * for: is this part of the image the lit corner of the panel, or something
   * else the decoder has wandered onto.
   */
  private globalThreshold(): number {
    const lows: number[] = [];
    const highs: number[] = [];
    this.resolve().forEach((level, index) => {
      if (this.fiducials.has(index)) return;
      lows.push(level.low);
      highs.push(level.high);
    });
    if (lows.length === 0) return 0;
    lows.sort((left, right) => left - right);
    highs.sort((left, right) => left - right);
    return (percentile(lows, 0.5) + percentile(highs, 0.5)) / 2;
  }

  /**
   * How much room the weakest cell of a reading had to spare.
   *
   * Published continuously so a panel that is drifting out of readability shows
   * as a falling margin rather than as a sudden run of failures.
   */
  public decodeMargin(values: readonly number[]): number {
    const levels = this.resolve();
    let smallest = Number.POSITIVE_INFINITY;
    for (let index = 0; index < levels.length; index += 1) {
      if (this.fiducials.has(index)) continue;
      const level = levels[index] as Level;
      const value = values[index];
      if (value === undefined || !Number.isFinite(value)) return 0;
      const threshold = (level.low + level.high) / 2;
      const margin =
        Math.abs(value - threshold) - (level.high - level.low) * this.options.marginRatio;
      if (margin < smallest) smallest = margin;
    }
    return Number.isFinite(smallest) ? smallest : 0;
  }

  public decodeCells(values: readonly number[]): (boolean | undefined)[] {
    const levels = this.resolve();
    const globalThreshold = this.fiducials.size > 0 ? this.globalThreshold() : 0;
    const cells: (boolean | undefined)[] = [];
    for (let index = 0; index < levels.length; index += 1) {
      const level = levels[index] as Level;
      const value = values[index];
      if (this.fiducials.has(index)) {
        cells.push(
          value === undefined || !Number.isFinite(value) ? undefined : value > globalThreshold
        );
        continue;
      }
      const threshold = (level.low + level.high) / 2;
      const margin = (level.high - level.low) * this.options.marginRatio;
      if (value === undefined || !Number.isFinite(value) || Math.abs(value - threshold) < margin) {
        cells.push(undefined);
      } else {
        cells.push(value > threshold);
      }
    }
    return cells;
  }

  public decode(values: readonly number[]): number | undefined {
    return decodePatternCells(this.decodeCells(values), this.profile);
  }

  /**
   * Nudges the levels towards a reading that decoded cleanly.
   *
   * Only confident decodes are used, and each step is capped, so lighting and
   * exposure can drift over a session without the levels being able to chase a
   * run of misreads across the band.
   */
  public track(values: readonly number[]): void {
    const levels = this.resolve();
    const code = this.decode(values);
    if (code === undefined) return;
    const cells = this.decodeCells(values);
    for (let index = 0; index < levels.length; index += 1) {
      if (this.fiducials.has(index)) continue;
      const level = levels[index] as Level;
      const value = values[index];
      const cell = cells[index];
      if (value === undefined || cell === undefined) continue;
      const limit = (level.high - level.low) * this.options.trackingLimitRatio;
      if (cell) {
        level.high = level.high + clamp((value - level.high) * this.options.trackingRate, limit);
      } else {
        level.low = level.low + clamp((value - level.low) * this.options.trackingRate, limit);
      }
      if (level.high <= level.low) {
        // Tracking must never invert a cell's band; that would make every
        // further reading of it confidently wrong.
        const midpoint = (level.high + level.low) / 2;
        level.low = midpoint - 0.5;
        level.high = midpoint + 0.5;
      }
    }
  }

  /** The learned levels, for diagnostics and for saving a calibration. */
  public snapshot(): {low: number; high: number}[] {
    return this.resolve().map((level) => ({...level}));
  }

  private resolve(): Level[] {
    if (this.levels) return this.levels;
    this.levels = this.samples.map((bucket) => {
      if (bucket.length === 0) return {low: 0, high: 0};
      const sorted = [...bucket].sort((left, right) => left - right);
      return {
        low: percentile(sorted, this.options.trimRatio),
        high: percentile(sorted, 1 - this.options.trimRatio)
      };
    });
    return this.levels;
  }
}

function clamp(value: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.max(-limit, Math.min(limit, value));
}

function percentile(sorted: readonly number[], fraction: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0] as number;
  const position = (sorted.length - 1) * Math.min(1, Math.max(0, fraction));
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const low = sorted[lower] as number;
  const high = sorted[upper] ?? low;
  return low + (high - low) * (position - lower);
}
