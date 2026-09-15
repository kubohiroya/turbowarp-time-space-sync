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
 * The four extreme corners of a set of points, in unit-square order.
 *
 * Picked by the two diagonal sums rather than by a bounding box, so a panel the
 * camera sees rotated keeps its own corners instead of acquiring the corners of
 * the box around it.
 */
export function cornersOf(points: readonly Point[]): Quad | undefined {
  if (points.length < 4) return undefined;
  let topLeft = points[0] as Point;
  let topRight = points[0] as Point;
  let bottomRight = points[0] as Point;
  let bottomLeft = points[0] as Point;
  for (const point of points) {
    if (point.x + point.y < topLeft.x + topLeft.y) topLeft = point;
    if (point.x - point.y > topRight.x - topRight.y) topRight = point;
    if (point.x + point.y > bottomRight.x + bottomRight.y) bottomRight = point;
    if (point.x - point.y < bottomLeft.x - bottomLeft.y) bottomLeft = point;
  }
  const quad: Quad = [topLeft, topRight, bottomRight, bottomLeft];
  return quadArea(quad) > 0 ? quad : undefined;
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
