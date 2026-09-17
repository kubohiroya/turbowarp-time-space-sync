import type {Point} from './homography.js';

/**
 * Straight lines through measured edge points.
 *
 * A corner is located as the meeting point of its two edges rather than as the
 * brightest or darkest pixel near it. An edge is sampled along its whole length,
 * so every point on it contributes to where the corner is; a corner read
 * directly is one blurred pixel neighbourhood, and it moves with the blur.
 */

export interface Line {
  /** A point on the line: the centroid of the points it was fitted to. */
  readonly point: Point;
  /** Unit direction along the line. */
  readonly direction: Point;
}

export interface LineFit {
  readonly line: Line;
  /** Root mean square perpendicular distance of the points from the line. */
  readonly rms: number;
  readonly count: number;
}

/**
 * The total least squares line: the one minimising perpendicular distances.
 *
 * Ordinary least squares minimises vertical distances, which is wrong for an
 * edge that can run at any angle and undefined for a vertical one.
 */
export function fitLine(points: readonly Point[]): LineFit | undefined {
  if (points.length < 2) return undefined;
  let meanX = 0;
  let meanY = 0;
  for (const point of points) {
    meanX += point.x;
    meanY += point.y;
  }
  meanX /= points.length;
  meanY /= points.length;
  let xx = 0;
  let xy = 0;
  let yy = 0;
  for (const point of points) {
    const dx = point.x - meanX;
    const dy = point.y - meanY;
    xx += dx * dx;
    xy += dx * dy;
    yy += dy * dy;
  }
  // The direction of largest scatter, from the closed form for a symmetric 2x2.
  const angle = 0.5 * Math.atan2(2 * xy, xx - yy);
  const direction = {x: Math.cos(angle), y: Math.sin(angle)};
  const line: Line = {point: {x: meanX, y: meanY}, direction};
  if (!(xx + yy > 0)) return undefined;
  let squares = 0;
  for (const point of points) squares += signedDistance(line, point) ** 2;
  return {line, rms: Math.sqrt(squares / points.length), count: points.length};
}

/**
 * Fits, drops the points far from the fit, and fits again.
 *
 * An edge sampled across a gap between cells, or through a speck of noise,
 * yields a point that is not on the edge at all. One such point moves a least
 * squares line a long way, so points further than `trimDistance` from the
 * previous fit are left out of the next.
 */
export function robustFitLine(
  points: readonly Point[],
  trimDistance: number,
  passes = 2
): LineFit | undefined {
  let fit = fitLine(points);
  for (let pass = 0; pass < passes && fit; pass += 1) {
    const current = fit.line;
    const kept = points.filter((point) => Math.abs(signedDistance(current, point)) <= trimDistance);
    if (kept.length === points.length) break;
    fit = fitLine(kept);
  }
  return fit;
}

/** Perpendicular distance, positive to the left of the direction in image axes. */
export function signedDistance(line: Line, point: Point): number {
  return (
    (point.x - line.point.x) * -line.direction.y + (point.y - line.point.y) * line.direction.x
  );
}

/**
 * Where two lines meet, or undefined when they are too near parallel to say.
 *
 * `minimumSine` bounds the angle between them: two nearly parallel edges meet
 * at a point that moves a long way for a small change in either, so a corner
 * found that way is not a measurement.
 */
export function intersectLines(a: Line, b: Line, minimumSine = 0.2): Point | undefined {
  const cross = a.direction.x * b.direction.y - a.direction.y * b.direction.x;
  if (!(Math.abs(cross) >= minimumSine)) return undefined;
  const dx = b.point.x - a.point.x;
  const dy = b.point.y - a.point.y;
  const t = (dx * b.direction.y - dy * b.direction.x) / cross;
  return {x: a.point.x + t * a.direction.x, y: a.point.y + t * a.direction.y};
}

/** The line moved sideways by `distance`, in the direction `signedDistance` counts positive. */
export function offsetLine(line: Line, distance: number): Line {
  return {
    point: {
      x: line.point.x - line.direction.y * distance,
      y: line.point.y + line.direction.x * distance
    },
    direction: line.direction
  };
}
