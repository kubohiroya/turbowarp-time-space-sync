import {TimeSpaceSyncError} from '../contracts/index.js';
import {
  applyHomography,
  cornersOf,
  homographyFromUnitSquare,
  invertHomography,
  quadArea,
  type Point,
  type Quad
} from './homography.js';
import {intersectLines, offsetLine, robustFitLine, signedDistance, type Line} from './line-fit.js';
import {litOutlineInset} from './pattern-geometry.js';
import type {LuminanceFrame, PanelRect} from './sampling.js';
import type {PatternProfile} from './pattern-profile.js';

export interface PanelDetectionOptions {
  /** Smallest light-to-dark swing a panel pixel must show over the window. */
  readonly minimumRange?: number;
  /** Fraction of the strongest swing a pixel must reach to count as panel. */
  readonly rangeRatio?: number;
  /** Smallest analysis pixels per pattern cell. */
  readonly minimumCellPixels?: number;
  /** Smallest share of the region's own corner quadrilateral it must fill. */
  readonly minimumFillRatio?: number;
  /**
   * Smallest share of the axis-aligned bounding box the region must fill.
   *
   * Looser than the quadrilateral bound, because a rotated panel genuinely does
   * not fill its box: a square turned 45 degrees fills half of it. It is still
   * needed, because a long thin band fills its own quadrilateral completely
   * while filling almost none of its box, and the quadrilateral bound alone
   * would accept it.
   */
  readonly minimumBoxFillRatio?: number;
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
  minimumBoxFillRatio: 0.35,
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
  | {readonly ok: true; readonly panel: PanelRect; readonly quad: Quad}
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
      throw new TimeSpaceSyncError(
        'frame-size-mismatch',
        `The camera delivered a ${frame.width}x${frame.height} frame but the decoder is analysing ${this.width}x${this.height}.`
      );
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
    // The display draws a dark gap between cells, and once the panel is large
    // enough in the frame a gap is a whole analysis pixel wide and never
    // changes. The panel then falls apart into one region per cell, which reads
    // as many panels at once. Closing the mask bridges gaps that narrow without
    // joining anything that is genuinely separate.
    closeMask(mask, this.width, this.height, MASK_CLOSING_RADIUS);
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
    // A rotated panel does not fill its bounding box, so the fill check is made
    // against the corners the panel actually has rather than the box around it.
    const extremes = cornersOf(best.points);
    if (!extremes) return {ok: false, reason: 'wrong-shape'};
    if (
      best.area / Math.abs(quadArea(extremes)) < settings.minimumFillRatio ||
      best.area / (width * height) < settings.minimumBoxFillRatio
    ) {
      return {ok: false, reason: 'not-solid'};
    }
    let quad: Quad = extremes;
    if (profile.fiducials.length > 0) {
      // The fiducials are lit in every code, so they never change and the
      // changing region is the panel with its corner cells cut away. Its extreme
      // points are the corners of those notches, a cell away from the panel's
      // own corners, and a homography built on them samples every cell off
      // centre. The panel's edges survive the notches, so its corners are
      // recovered where those edges meet.
      const outline = fitPanelOutline(best.boundary, extremes);
      if (!outline) return {ok: false, reason: 'wrong-shape'};
      quad = startAtTopLeft(panelSquareFromOutline(outline, profile));
    }
    return {ok: true, panel: {x: best.minX, y: best.minY, width, height}, quad};
  }
}

/**
 * Analysis pixels bridged between neighbouring cells: gaps up to twice this.
 *
 * The gap is 8% of a cell, so two pixels either side covers every panel whose
 * cells are under fifty analysis pixels, which is larger than a panel that
 * still fits in the frame. Two separate flickering things closer than four
 * pixels are not told apart, which at this resolution they could not be anyway.
 */
const MASK_CLOSING_RADIUS = 2;

/**
 * Morphological closing with a square window, in place.
 *
 * Dilation then erosion, each separable into a row pass and a column pass.
 * Outside the image counts as set during the erosion, so a panel touching the
 * frame edge is not eaten away from that side.
 */
function closeMask(mask: Uint8Array, width: number, height: number, radius: number): void {
  const scratch = new Uint8Array(mask.length);
  sweep(mask, scratch, width, height, radius, 'dilate', 'rows');
  sweep(scratch, mask, width, height, radius, 'dilate', 'columns');
  sweep(mask, scratch, width, height, radius, 'erode', 'rows');
  sweep(scratch, mask, width, height, radius, 'erode', 'columns');
}

/**
 * One pass of a running maximum or minimum along rows or columns.
 *
 * The window is tracked as a running count of set pixels, so a pass costs the
 * same whatever the radius.
 */
function sweep(
  input: Uint8Array,
  output: Uint8Array,
  width: number,
  height: number,
  radius: number,
  operation: 'dilate' | 'erode',
  direction: 'rows' | 'columns'
): void {
  const dilate = operation === 'dilate';
  const rows = direction === 'rows';
  const lines = rows ? height : width;
  const length = rows ? width : height;
  const window = radius * 2 + 1;
  const outside = dilate ? 0 : 1;
  for (let line = 0; line < lines; line += 1) {
    const step = rows ? 1 : width;
    const base = rows ? line * width : line;
    const valueAt = (position: number): number =>
      position < 0 || position >= length ? outside : (input[base + position * step] as number);
    let count = 0;
    for (let position = -radius; position <= radius; position += 1) count += valueAt(position);
    for (let position = 0; position < length; position += 1) {
      output[base + position * step] = dilate ? (count > 0 ? 1 : 0) : count === window ? 1 : 0;
      count += valueAt(position + radius + 1) - valueAt(position - radius);
    }
  }
}

/** Share of an edge, at each end, not used to fit it: the notches live there. */
const OUTLINE_EDGE_MARGIN = 0.2;
/**
 * How far from an edge, in unit-square terms, a boundary point may lie and count for it.
 *
 * Wide on the first pass, because the first estimate comes from the notch
 * corners and can have an edge a whole cell inside the real one. Measured in
 * that shrunken estimate's own units a cell is a quarter of it, and a small
 * panel adds a pixel or two of rounding on top. Narrow afterwards, so the
 * notch sides and anything else near the panel stop contributing once the
 * edges are roughly known.
 */
const OUTLINE_FIRST_EDGE_BAND = 0.45;
const OUTLINE_EDGE_BAND = 0.1;
/** Analysis pixels beyond which a boundary point is dropped from an edge fit. */
const OUTLINE_TRIM_PIXELS = 1.5;
const OUTLINE_PASSES = 3;
const OUTLINE_MINIMUM_EDGE_POINTS = 4;

/**
 * The quadrilateral whose edges the changing region's boundary follows.
 *
 * Each boundary pixel is assigned to the nearest edge of the current estimate,
 * but only from the middle of that edge: near its ends are the notches, whose
 * sides run across the edge rather than along it. Lines are fitted to each
 * edge and intersected, and the result is used to assign the points again, so
 * a first estimate a whole cell out at each corner still settles on the panel.
 */
function fitPanelOutline(boundary: readonly Point[], initial: Quad): Quad | undefined {
  let quad = initial;
  for (let pass = 0; pass < OUTLINE_PASSES; pass += 1) {
    const inverse = invertHomography(homographyFromUnitSquare(quad));
    if (inverse.length !== 9) return undefined;
    const edges: Point[][] = [[], [], [], []];
    for (const point of boundary) {
      const unit = applyHomography(inverse, point.x, point.y);
      if (!unit) continue;
      // Distance to each unit edge, and the position along it.
      const candidates: Array<[number, number]> = [
        [Math.abs(unit.y), unit.x],
        [Math.abs(1 - unit.x), unit.y],
        [Math.abs(1 - unit.y), unit.x],
        [Math.abs(unit.x), unit.y]
      ];
      let nearest = 0;
      candidates.forEach(([distance], index) => {
        if (distance < (candidates[nearest] as [number, number])[0]) nearest = index;
      });
      const [distance, along] = candidates[nearest] as [number, number];
      if (distance > (pass === 0 ? OUTLINE_FIRST_EDGE_BAND : OUTLINE_EDGE_BAND)) continue;
      if (along < OUTLINE_EDGE_MARGIN || along > 1 - OUTLINE_EDGE_MARGIN) continue;
      (edges[nearest] as Point[]).push(point);
    }
    const centre = quadCentre(quad);
    const lines: Line[] = [];
    for (const points of edges) {
      if (points.length < OUTLINE_MINIMUM_EDGE_POINTS) return undefined;
      const fit = robustFitLine(points, OUTLINE_TRIM_PIXELS);
      if (!fit || fit.count < OUTLINE_MINIMUM_EDGE_POINTS) return undefined;
      // Boundary pixels are the outermost pixels inside the region, so their
      // centres sit about half a pixel inside the edge they belong to.
      const outward = signedDistance(fit.line, centre) > 0 ? -0.5 : 0.5;
      lines.push(offsetLine(fit.line, outward));
    }
    const corners: Point[] = [];
    for (let index = 0; index < 4; index += 1) {
      const corner = intersectLines(lines[(index + 3) % 4] as Line, lines[index] as Line);
      if (!corner) return undefined;
      corners.push(corner);
    }
    const next = corners as unknown as Quad;
    if (!(quadArea(next) > 0)) return undefined;
    quad = next;
  }
  return quad;
}

/**
 * Extends the lit outline out to the square the cells are laid out on.
 *
 * Every cell is drawn inset by half a gap, so the region's edge lies half a gap
 * inside the panel square. Sampling maps the square, so the corners are moved
 * out through the outline's own homography rather than by a fixed number of
 * pixels, which would be wrong on any view that is not square on.
 */
function panelSquareFromOutline(outline: Quad, profile: PatternProfile): Quad {
  const inset = litOutlineInset(profile);
  const ex = inset.x / (1 - 2 * inset.x);
  const ey = inset.y / (1 - 2 * inset.y);
  const homography = homographyFromUnitSquare(outline);
  const corner = (x: number, y: number): Point => applyHomography(homography, x, y) ?? {x, y};
  return [
    corner(-ex, -ey),
    corner(1 + ex, -ey),
    corner(1 + ex, 1 + ey),
    corner(-ex, 1 + ey)
  ];
}

/**
 * Starts the corner order at the corner nearest the image's top-left.
 *
 * Which corner a detector calls the origin decides which cell it reads as
 * which, so it has to be fixed by something other than the order the pixels
 * happened to be visited in. The top-left-most corner is the display's own
 * top-left for any camera roll within 45 degrees either way. Beyond that the
 * cells are read turned, and a turned reading of the constant-luminance
 * pattern fails its pairs and its check bits for every code.
 */
export function startAtTopLeft(quad: Quad): Quad {
  let start = 0;
  quad.forEach((point, index) => {
    const best = quad[start] as Point;
    if (point.x + point.y < best.x + best.y) start = index;
  });
  return [0, 1, 2, 3].map((offset) => quad[(start + offset) % 4] as Point) as unknown as Quad;
}

function quadCentre(quad: Quad): Point {
  return {
    x: quad.reduce((total, point) => total + point.x, 0) / 4,
    y: quad.reduce((total, point) => total + point.y, 0) / 4
  };
}

/**
 * The functionals whose maxima are candidate corners.
 *
 * Maxima only; a minimum is the maximum of the negated measure, which keeps the
 * running update to a single comparison per measure.
 */
const EXTREME_MEASURES: ReadonlyArray<(point: Point) => number> = [
  (point) => -(point.x + point.y),
  (point) => point.x - point.y,
  (point) => point.x + point.y,
  (point) => point.y - point.x,
  (point) => -point.y,
  (point) => point.x,
  (point) => point.y,
  (point) => -point.x
];

interface Region {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  area: number;
  /**
   * Extreme points along both diagonals and both axes.
   *
   * Both sets are kept because each is degenerate where the other is sharp: the
   * diagonal extremes pin the corners of a panel seen square on, the axis
   * extremes pin them when it is turned about 45 degrees.
   */
  points: Point[];
  /** Region pixels with a neighbour outside the region or outside the image. */
  boundary: Point[];
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
    const extremes: Point[] = [];
    const boundary: Point[] = [];
    while (stack.length > 0) {
      const index = stack.pop() as number;
      const x = index % width;
      const y = (index - x) / width;
      area += 1;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      trackExtreme(extremes, {x, y});
      if (
        x === 0 ||
        y === 0 ||
        x + 1 === width ||
        y + 1 === height ||
        mask[index - 1] !== 1 ||
        mask[index + 1] !== 1 ||
        mask[index - width] !== 1 ||
        mask[index + width] !== 1
      ) {
        boundary.push({x, y});
      }
      if (x > 0) push(index - 1);
      if (x + 1 < width) push(index + 1);
      if (y > 0) push(index - width);
      if (y + 1 < height) push(index + width);
    }
    regions.push({minX, minY, maxX, maxY, area, points: extremes, boundary});
  }
  return regions.sort((left, right) => right.area - left.area);

  /** Keeps the running extremes of both diagonals and both axes. */
  function trackExtreme(extremes: Point[], point: Point): void {
    if (extremes.length < EXTREME_MEASURES.length) {
      while (extremes.length < EXTREME_MEASURES.length) extremes.push(point);
      return;
    }
    EXTREME_MEASURES.forEach((measure, index) => {
      const current = extremes[index] as Point;
      if (measure(point) > measure(current)) extremes[index] = point;
    });
  }

  function push(index: number): void {
    if (mask[index] === 1 && visited[index] === 0) {
      visited[index] = 1;
      stack.push(index);
    }
  }
}
