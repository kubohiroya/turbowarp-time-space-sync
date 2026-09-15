/**
 * The projective map between the pattern's own coordinates and the image.
 *
 * Dividing a bounding box evenly, as the v1 path does, assumes the camera sees
 * the panel square on and undistorted. A tilted camera or a projector throwing
 * an oblique image makes the panel a general quadrilateral, and an even split
 * then samples the wrong part of each cell -- towards the edges it samples the
 * neighbouring cell. The reading either fails the check bits or, in the 255
 * error patterns they cannot catch, comes back wrong.
 */

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Corners in order: (0,0), (1,0), (1,1), (0,1) of the pattern's own square. */
export type Quad = readonly [Point, Point, Point, Point];

/** A 3x3 projective transform, row-major. */
export type Homography = readonly number[];

/**
 * The map taking the unit square onto a quadrilateral.
 *
 * Closed form rather than a least-squares fit: four correspondences determine a
 * homography exactly, so there is nothing to minimise and no iteration to
 * converge.
 */
export function homographyFromUnitSquare(quad: Quad): number[] {
  const [p0, p1, p2, p3] = quad;
  const dx1 = p1.x - p2.x;
  const dx2 = p3.x - p2.x;
  const dy1 = p1.y - p2.y;
  const dy2 = p3.y - p2.y;
  const sx = p0.x - p1.x + p2.x - p3.x;
  const sy = p0.y - p1.y + p2.y - p3.y;

  if (sx === 0 && sy === 0) {
    // The quadrilateral is a parallelogram, so the map is affine and the
    // perspective row is exactly zero rather than nearly so.
    return [p1.x - p0.x, p2.x - p1.x, p0.x, p1.y - p0.y, p2.y - p1.y, p0.y, 0, 0, 1];
  }

  const denominator = dx1 * dy2 - dx2 * dy1;
  if (denominator === 0) {
    // Three corners are collinear: the quadrilateral has collapsed and no
    // projective map exists.
    return [];
  }
  const g = (sx * dy2 - dx2 * sy) / denominator;
  const h = (dx1 * sy - sx * dy1) / denominator;
  return [
    p1.x - p0.x + g * p1.x,
    p3.x - p0.x + h * p3.x,
    p0.x,
    p1.y - p0.y + g * p1.y,
    p3.y - p0.y + h * p3.y,
    p0.y,
    g,
    h,
    1
  ];
}

export function applyHomography(homography: Homography, x: number, y: number): Point | undefined {
  if (homography.length !== 9) return undefined;
  const w = at(homography, 6) * x + at(homography, 7) * y + at(homography, 8);
  if (w === 0 || !Number.isFinite(w)) return undefined;
  return {
    x: (at(homography, 0) * x + at(homography, 1) * y + at(homography, 2)) / w,
    y: (at(homography, 3) * x + at(homography, 4) * y + at(homography, 5)) / w
  };
}

export function invertHomography(homography: Homography): number[] {
  if (homography.length !== 9) return [];
  const [a, b, c, d, e, f, g, h, i] = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) =>
    at(homography, index)
  ) as [number, number, number, number, number, number, number, number, number];
  const determinant =
    a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (determinant === 0 || !Number.isFinite(determinant)) return [];
  return [
    (e * i - f * h) / determinant,
    (c * h - b * i) / determinant,
    (b * f - c * e) / determinant,
    (f * g - d * i) / determinant,
    (a * i - c * g) / determinant,
    (c * d - a * f) / determinant,
    (d * h - e * g) / determinant,
    (b * g - a * h) / determinant,
    (a * e - b * d) / determinant
  ];
}

/**
 * The four corners of a region, in unit-square order.
 *
 * Two candidate quadrilaterals are built and the larger one wins. The diagonal
 * extremes find the corners of a panel the camera sees square on; the axis
 * extremes find them when it sees the panel turned about 45 degrees. Each is
 * degenerate exactly where the other is sharp: along an edge of a
 * 45-degree-rotated square, `x + y` is constant, so the diagonal extremes pick
 * an arbitrary point on that edge and can collapse two corners onto one. Taking
 * whichever quadrilateral encloses more area avoids a detector that works at
 * every angle except the middle of its range.
 *
 * Which corner is treated as the pattern's own origin still follows from the
 * image, so a panel rotated by a whole quarter turn is read with its cells
 * transposed. Recovering that needs a pattern whose corners are not all alike.
 */
export function cornersOf(points: readonly Point[]): Quad | undefined {
  if (points.length < 4) return undefined;
  const diagonal = extremesBy(
    points,
    (point) => point.x + point.y,
    (point) => point.x - point.y
  );
  const axis = extremesBy(
    points,
    (point) => point.y,
    (point) => point.x
  );
  const candidates = [diagonal, axis]
    .map((quad) => ({quad, area: quadArea(quad)}))
    .filter((entry) => entry.area > 0)
    .sort((left, right) => right.area - left.area);
  return candidates[0]?.quad;
}

/**
 * The extremes of two functionals, ordered so the quadrilateral does not cross.
 *
 * `first` runs from the start corner to the opposite one; `second` separates
 * the two remaining corners.
 */
function extremesBy(
  points: readonly Point[],
  first: (point: Point) => number,
  second: (point: Point) => number
): Quad {
  let start = points[0] as Point;
  let end = points[0] as Point;
  let low = points[0] as Point;
  let high = points[0] as Point;
  for (const point of points) {
    if (first(point) < first(start)) start = point;
    if (first(point) > first(end)) end = point;
    if (second(point) > second(high)) high = point;
    if (second(point) < second(low)) low = point;
  }
  return [start, high, end, low];
}

/** Twice the signed area; positive for corners in the expected order. */
export function quadArea(quad: Quad): number {
  let total = 0;
  for (let index = 0; index < 4; index += 1) {
    const current = quad[index] as Point;
    const next = quad[(index + 1) % 4] as Point;
    total += current.x * next.y - next.x * current.y;
  }
  return total / 2;
}

function at(values: readonly number[], index: number): number {
  return values[index] ?? 0;
}
