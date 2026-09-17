import {applyHomography, homographyFromUnitSquare, type Point, type Quad} from './homography.js';
import {intersectLines, robustFitLine, type Line} from './line-fit.js';
import {PATTERN_CELL_GAP_RATIO, litOutlineInset} from './pattern-geometry.js';
import type {PatternProfile} from './pattern-profile.js';
import type {LuminanceFrame} from './sampling.js';

/**
 * Locating the panel's outer corners to a fraction of a source pixel.
 *
 * The decoder finds the panel in a downscaled frame, where one pixel is several
 * source pixels wide and the corners it reports are good to a pixel or two of
 * that: plenty for sampling cells, far too coarse for solving where a camera
 * stands. Here the coarse corners only say where to look. Each corner is
 * measured again in a small window of the full-resolution frame, as the meeting
 * point of the two outer edges of the lit fiducial cell, each edge located
 * along its length and fitted as a straight line.
 *
 * Coordinates follow IMAGE_COORDINATE_FRAME: unmirrored source pixels, origin at
 * the top-left corner of the first pixel, so the centre of pixel (i, j) is at
 * (i + 0.5, j + 0.5).
 */

/** A rectangle of whole source pixels. */
export interface SourceRegion {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Reads a small part of the current full-resolution frame.
 *
 * Only regions are asked for, never the whole frame: reading back a 1080p frame
 * every refresh is what the downscaled decoder exists to avoid, and four small
 * windows cost a small fraction of it.
 */
export interface RegionReader {
  read(region: SourceRegion): LuminanceFrame | undefined;
}

export type CornerFailure =
  | 'outside-image'
  | 'low-contrast'
  | 'too-few-edge-points'
  | 'edge-not-straight'
  | 'corner-geometry';

export type CornerRefinement =
  | {
      readonly ok: true;
      /** Outer corners in the display's orientation: tl, tr, br, bl. */
      readonly corners: readonly [Point, Point, Point, Point];
      /** The worst edge fit of the four corners, RMS perpendicular pixels. */
      readonly worstEdgeRmsPx: number;
    }
  | {readonly ok: false; readonly reason: CornerFailure};

/**
 * How far the coarse corners may be from the real ones, in analysis pixels.
 *
 * The panel detector thresholds a range image and fits lines to the region's
 * boundary. Its corners land within about a pixel of the true ones; two leaves
 * room for blur and for a boundary broken up by the gaps between cells.
 */
export const COARSE_CORNER_UNCERTAINTY_ANALYSIS_PX = 2;
/** The same allowance for the second pass, which starts from a measured corner. */
const REFINED_CORNER_UNCERTAINTY_PX = 1.5;
/** Pixels either side of the expected edge beyond the corner uncertainty. */
const PROFILE_EXTRA_PX = 4;
const PROFILE_STEP_PX = 0.5;
/**
 * The smallest light-to-dark step, in luminance units, an edge must show.
 *
 * Matches the decoder's own contrast floor: an edge the decoder could not read
 * a cell across is not one to locate a corner on.
 */
const MINIMUM_EDGE_CONTRAST = 24;
/** Scanlines per edge; more cost time and add little once the edge is covered. */
const SCANLINES_PER_EDGE = 32;
const MINIMUM_EDGE_POINTS = 8;
/**
 * The largest RMS distance of edge points from their fitted line.
 *
 * A straight edge seen through ordinary sensor noise fits to a tenth of a pixel
 * or so. Half a pixel means the edge is not straight where it was sampled --
 * something is in front of it, the frame is smeared by motion, or the window
 * caught part of a neighbouring cell -- and a corner built on it is not a
 * measurement.
 */
const MAXIMUM_EDGE_RMS_PX = 0.5;
/** Edge points further than this from the first fit are dropped from the second. */
const EDGE_TRIM_PX = 1;
/**
 * The smallest angle two edges may meet at, as a sine: about 20 degrees.
 *
 * A square panel seen at any usable angle has corners far wider than this.
 * Narrower means the view is so oblique that a small error along either edge
 * moves the corner a long way.
 */
const MINIMUM_CORNER_SINE = 0.34;
/** Largest window read for one corner, per edge, so a huge panel costs no more. */
const MAXIMUM_EDGE_SPAN_PX = 96;
/** Where along the lit edge scanlines start and stop, as shares of its length. */
const EDGE_START_SHARE = 0.1;
const EDGE_END_SHARE = 0.85;
const MINIMUM_EDGE_START_PX = 2;

/**
 * Maps analysis coordinates onto source coordinates.
 *
 * The analysis frame is the whole source drawn into a smaller canvas, possibly
 * with a different aspect, so each axis scales on its own. Analysis positions
 * are pixel indices, whose centres are half a pixel in from their edges; the
 * half pixel is added before scaling and taken back afterwards only in the
 * analysis units, which is what places the result in the source frame's
 * corner-origin coordinates.
 */
export function sourceQuadFromAnalysis(
  quad: Quad,
  analysis: {width: number; height: number},
  source: {width: number; height: number}
): Quad {
  const sx = source.width / analysis.width;
  const sy = source.height / analysis.height;
  return quad.map((point) => ({x: (point.x + 0.5) * sx, y: (point.y + 0.5) * sy})) as unknown as Quad;
}

interface CornerPlan {
  readonly predicted: Point;
  /** Unit directions from the corner along its two lit edges, into the panel. */
  readonly along: readonly [Point, Point];
  /** Length of the lit fiducial edge in each direction, in source pixels. */
  readonly length: readonly [number, number];
}

/**
 * Refines all four outer corners of a panel.
 *
 * `panelQuad` is the panel square in source coordinates in the decoder's order,
 * which starts at the display's top-left (see `startAtTopLeft`). Every corner
 * must refine for the result to count: a panel with three good corners and a
 * guessed fourth gives a pose that is wrong by exactly the guess.
 */
export function refinePanelCorners(
  reader: RegionReader,
  panelQuad: Quad,
  profile: PatternProfile,
  source: {width: number; height: number},
  coarseUncertaintyPx: number
): CornerRefinement {
  const homography = homographyFromUnitSquare(panelQuad);
  if (homography.length !== 9) return {ok: false, reason: 'corner-geometry'};
  const corners: Point[] = [];
  let worst = 0;
  for (let index = 0; index < 4; index += 1) {
    const plan = planCorner(homography, profile, index);
    if (!plan) return {ok: false, reason: 'corner-geometry'};
    const result = refineCorner(reader, plan, source, coarseUncertaintyPx);
    if (!result.ok) return result;
    corners.push(result.corner);
    worst = Math.max(worst, result.rms);
  }
  return {
    ok: true,
    corners: corners as unknown as readonly [Point, Point, Point, Point],
    worstEdgeRmsPx: worst
  };
}

/** Where a corner should be and which way its edges run, from the coarse panel. */
function planCorner(homography: readonly number[], profile: PatternProfile, index: number): CornerPlan | undefined {
  const inset = litOutlineInset(profile);
  const signX = index === 0 || index === 3 ? 1 : -1;
  const signY = index === 0 || index === 1 ? 1 : -1;
  const unit = {
    x: signX > 0 ? inset.x : 1 - inset.x,
    y: signY > 0 ? inset.y : 1 - inset.y
  };
  const cellX = (1 - PATTERN_CELL_GAP_RATIO) / profile.columns;
  const cellY = (1 - PATTERN_CELL_GAP_RATIO) / profile.rows;
  const predicted = applyHomography(homography, unit.x, unit.y);
  const endX = applyHomography(homography, unit.x + signX * cellX, unit.y);
  const endY = applyHomography(homography, unit.x, unit.y + signY * cellY);
  if (!predicted || !endX || !endY) return undefined;
  const lengthX = Math.hypot(endX.x - predicted.x, endX.y - predicted.y);
  const lengthY = Math.hypot(endY.x - predicted.x, endY.y - predicted.y);
  if (!(lengthX > 0) || !(lengthY > 0)) return undefined;
  return {
    predicted,
    along: [
      {x: (endX.x - predicted.x) / lengthX, y: (endX.y - predicted.y) / lengthX},
      {x: (endY.x - predicted.x) / lengthY, y: (endY.y - predicted.y) / lengthY}
    ],
    length: [lengthX, lengthY]
  };
}

type CornerResult =
  | {readonly ok: true; readonly corner: Point; readonly rms: number}
  | {readonly ok: false; readonly reason: CornerFailure};

function refineCorner(
  reader: RegionReader,
  plan: CornerPlan,
  source: {width: number; height: number},
  coarseUncertaintyPx: number
): CornerResult {
  const uncertainty = Math.max(REFINED_CORNER_UNCERTAINTY_PX, coarseUncertaintyPx);
  const spans = plan.length.map((length) =>
    Math.min(MAXIMUM_EDGE_SPAN_PX, length * EDGE_END_SHARE - uncertainty)
  ) as [number, number];
  if (spans[0] <= MINIMUM_EDGE_START_PX * 2 || spans[1] <= MINIMUM_EDGE_START_PX * 2) {
    return {ok: false, reason: 'too-few-edge-points'};
  }
  const reach = uncertainty + PROFILE_EXTRA_PX;
  const region = regionAround(plan, spans, reach, source);
  if (!region) return {ok: false, reason: 'outside-image'};
  const frame = reader.read(region);
  if (!frame || frame.width !== region.width || frame.height !== region.height) {
    return {ok: false, reason: 'outside-image'};
  }
  const image = {frame, region};

  // First pass from the coarse corner, second from the first pass's corner and
  // edge directions. The second matters under perspective: the coarse
  // directions can be a degree or two out, which puts the scanlines' far ends
  // measurably further from the edge than their near ends.
  let corner = plan.predicted;
  let along = plan.along;
  let reachNow = reach;
  let result: CornerResult = {ok: false, reason: 'too-few-edge-points'};
  for (let pass = 0; pass < 2; pass += 1) {
    const lines: Line[] = [];
    let rms = 0;
    for (let edge = 0; edge < 2; edge += 1) {
      const direction = along[edge] as Point;
      const inward = along[1 - edge] as Point;
      const fit = locateEdge(image, corner, direction, inward, spans[edge] as number, plan.length[edge] as number, reachNow);
      if (!fit.ok) return fit;
      lines.push(fit.line);
      rms = Math.max(rms, fit.rms);
    }
    const [first, second] = lines as [Line, Line];
    const meeting = intersectLines(first, second, MINIMUM_CORNER_SINE);
    if (!meeting) return {ok: false, reason: 'corner-geometry'};
    if (Math.hypot(meeting.x - corner.x, meeting.y - corner.y) > reachNow) {
      // The edges met outside the window they were looked for in, so at least
      // one of them is not the edge that was meant.
      return {ok: false, reason: 'corner-geometry'};
    }
    corner = meeting;
    along = [
      orient(first.direction, along[0] as Point),
      orient(second.direction, along[1] as Point)
    ];
    reachNow = REFINED_CORNER_UNCERTAINTY_PX + PROFILE_EXTRA_PX;
    result = {ok: true, corner, rms};
  }
  if (!result.ok) return result;
  if (corner.x < 0 || corner.y < 0 || corner.x > source.width || corner.y > source.height) {
    return {ok: false, reason: 'outside-image'};
  }
  return result;
}

type EdgeResult =
  | {readonly ok: true; readonly line: Line; readonly rms: number}
  | {readonly ok: false; readonly reason: CornerFailure};

/**
 * Finds one straight edge running from the corner along `direction`.
 *
 * Each scanline crosses the edge at right angles, from outside the panel to
 * inside, and the edge is placed where the profile crosses halfway between the
 * dark and light levels measured at its own two ends. The halfway crossing is
 * where a symmetric blur leaves a step edge, so the estimate does not move with
 * focus; the levels are local, so uneven projection does not move it either.
 */
function locateEdge(
  image: {frame: LuminanceFrame; region: SourceRegion},
  corner: Point,
  direction: Point,
  inwardHint: Point,
  span: number,
  length: number,
  reach: number
): EdgeResult {
  let normal = {x: -direction.y, y: direction.x};
  if (normal.x * inwardHint.x + normal.y * inwardHint.y < 0) normal = {x: -normal.x, y: -normal.y};
  const start = Math.max(MINIMUM_EDGE_START_PX, length * EDGE_START_SHARE);
  if (span <= start) return {ok: false, reason: 'too-few-edge-points'};
  const steps = Math.ceil((reach * 2) / PROFILE_STEP_PX);
  const points: Point[] = [];
  let contrastFailures = 0;
  for (let line = 0; line < SCANLINES_PER_EDGE; line += 1) {
    const t = start + ((span - start) * line) / (SCANLINES_PER_EDGE - 1);
    const base = {x: corner.x + direction.x * t, y: corner.y + direction.y * t};
    const values: number[] = [];
    for (let step = 0; step <= steps; step += 1) {
      const s = -reach + step * PROFILE_STEP_PX;
      const value = bilinear(image, base.x + normal.x * s, base.y + normal.y * s);
      if (value === undefined) break;
      values.push(value);
    }
    if (values.length !== steps + 1) continue;
    const dark = mean(values.slice(0, 3));
    const light = mean(values.slice(-3));
    if (light - dark < MINIMUM_EDGE_CONTRAST) {
      contrastFailures += 1;
      continue;
    }
    const crossing = crossingNearestCentre(values, (dark + light) / 2, reach);
    if (crossing === undefined) continue;
    points.push({x: base.x + normal.x * crossing, y: base.y + normal.y * crossing});
  }
  if (points.length < MINIMUM_EDGE_POINTS) {
    return {
      ok: false,
      reason: contrastFailures > SCANLINES_PER_EDGE / 2 ? 'low-contrast' : 'too-few-edge-points'
    };
  }
  const fit = robustFitLine(points, EDGE_TRIM_PX);
  if (!fit || fit.count < MINIMUM_EDGE_POINTS) return {ok: false, reason: 'too-few-edge-points'};
  if (fit.rms > MAXIMUM_EDGE_RMS_PX) return {ok: false, reason: 'edge-not-straight'};
  return {ok: true, line: fit.line, rms: fit.rms};
}

/**
 * The dark-to-light crossing of `level` closest to the expected edge.
 *
 * Returned as a distance along the scanline from the expected edge. Linear
 * between samples: the samples are half a pixel apart on an image that is
 * itself interpolated, and a higher-order fit would be fitting the
 * interpolation.
 */
function crossingNearestCentre(values: readonly number[], level: number, reach: number): number | undefined {
  let best: number | undefined;
  for (let index = 1; index < values.length; index += 1) {
    const before = values[index - 1] as number;
    const after = values[index] as number;
    if (!(before < level && after >= level)) continue;
    const share = (level - before) / (after - before);
    const s = -reach + (index - 1 + share) * PROFILE_STEP_PX;
    if (best === undefined || Math.abs(s) < Math.abs(best)) best = s;
  }
  return best;
}

/** The window holding every sample either pass can take, or undefined when it leaves the image. */
function regionAround(
  plan: CornerPlan,
  spans: readonly [number, number],
  reach: number,
  source: {width: number; height: number}
): SourceRegion | undefined {
  const [a, b] = plan.along;
  // Both passes stay within `reach` of the coarse corner along either edge, so
  // the parallelograms swept by the scanlines, grown by `reach` for the second
  // pass's moved corner and by two pixels for interpolation, cover them.
  const grow = reach * 2 + 2;
  const xs: number[] = [];
  const ys: number[] = [];
  for (const [direction, span] of [
    [a, spans[0]],
    [b, spans[1]]
  ] as Array<[Point, number]>) {
    for (const t of [0, span]) {
      xs.push(plan.predicted.x + direction.x * t);
      ys.push(plan.predicted.y + direction.y * t);
    }
  }
  const minX = Math.floor(Math.min(...xs) - grow);
  const minY = Math.floor(Math.min(...ys) - grow);
  const maxX = Math.ceil(Math.max(...xs) + grow);
  const maxY = Math.ceil(Math.max(...ys) + grow);
  // A window that has to be clipped would leave some scanlines reading past the
  // frame. Refusing is better than locating the corner from the edges that
  // happened to fit, which near the frame edge is also where the lens distorts
  // most.
  if (minX < 0 || minY < 0 || maxX > source.width || maxY > source.height) return undefined;
  return {x: minX, y: minY, width: maxX - minX, height: maxY - minY};
}

function bilinear(
  image: {frame: LuminanceFrame; region: SourceRegion},
  x: number,
  y: number
): number | undefined {
  const {frame, region} = image;
  // Pixel (i, j) of the window holds the average over source pixel
  // (region.x + i, region.y + j), whose centre is half a pixel in.
  const fx = x - region.x - 0.5;
  const fy = y - region.y - 0.5;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  if (x0 < 0 || y0 < 0 || x0 + 1 >= frame.width || y0 + 1 >= frame.height) return undefined;
  const ax = fx - x0;
  const ay = fy - y0;
  const row = y0 * frame.width;
  const next = row + frame.width;
  const top = (frame.data[row + x0] as number) * (1 - ax) + (frame.data[row + x0 + 1] as number) * ax;
  const bottom = (frame.data[next + x0] as number) * (1 - ax) + (frame.data[next + x0 + 1] as number) * ax;
  return top * (1 - ay) + bottom * ay;
}

function orient(direction: Point, hint: Point): Point {
  return direction.x * hint.x + direction.y * hint.y >= 0
    ? direction
    : {x: -direction.x, y: -direction.y};
}

function mean(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}
