import {
  PLACEMENT_REFERENCE_SCHEMA,
  PLACEMENT_VERSION,
  parseReferenceDefinition,
  type ReferenceDefinition
} from '../contracts/index.js';

/**
 * The reference a projected time pattern provides, from four tape measurements.
 *
 * The pattern's outer corners are what `measurePatternCorners` finds in each
 * camera, and they are named the same way here: `tl`, `tr`, `br`, `bl`, the
 * outer corners of the four lit corner cells in the orientation the pattern is
 * drawn. They are listed individually because a projection onto a wall is a
 * general quadrilateral; see ReferenceDefinition.
 */

export const PATTERN_REFERENCE_POINT_IDS = ['tl', 'tr', 'br', 'bl'] as const;

export interface PatternReferenceInput {
  readonly referenceId: string;
  /** `tlX,tlY;trX,trY;brX,brY;blX,blY`, metres in the wall plane. */
  readonly corners: string;
  readonly sigmaMeters: number;
  readonly measuredBy: string;
}

interface PlanePoint {
  readonly x: number;
  readonly y: number;
}

/**
 * Builds and validates the reference, or returns undefined.
 *
 * The wall is the plane z = 0 and the two in-plane axes are the operator's
 * choice -- x right and y up, or y down -- as long as they are at right angles
 * and in metres. Both choices describe the same physical corners; the solve
 * works in the plane's own basis and reports poses in whichever was given.
 *
 * Refused rather than repaired: four corners that are not numbers, do not form
 * a simple convex outline, or fail the placement-reference contract give
 * undefined. A reference quietly completed from a malformed measurement is a
 * wrong scale that nothing downstream can detect.
 */
export function buildPatternReference(input: PatternReferenceInput): ReferenceDefinition | undefined {
  const corners = parseCorners(input.corners);
  if (!corners || !isConvexQuadrilateral(corners)) return undefined;
  if (!Number.isFinite(input.sigmaMeters)) return undefined;
  const candidate = {
    schema: PLACEMENT_REFERENCE_SCHEMA,
    version: PLACEMENT_VERSION,
    referenceId: input.referenceId.trim(),
    kind: 'projection',
    points: corners.map((corner, index) => ({
      id: PATTERN_REFERENCE_POINT_IDS[index],
      x: corner.x,
      y: corner.y,
      z: 0,
      sigmaMeters: input.sigmaMeters
    })),
    // Every point is given on z = 0, so they are coplanar by construction. That
    // says nothing about whether the wall is flat, which four points on its
    // outline cannot show.
    planarityResidualMeters: 0,
    rectangularityResidualMeters: roundMeters(rectangularityResidual(corners)),
    measuredBy: input.measuredBy.trim(),
    notes: [
      'Outer corners of the lit corner cells of the projected time pattern, named in the orientation it is drawn.'
    ]
  };
  const parsed = parseReferenceDefinition(candidate);
  return parsed.ok ? parsed.value : undefined;
}

function parseCorners(text: string): PlanePoint[] | undefined {
  const parts = text.split(';');
  if (parts.length !== 4) return undefined;
  const corners: PlanePoint[] = [];
  for (const part of parts) {
    const values = part.split(',');
    if (values.length !== 2) return undefined;
    const [x, y] = values.map((value) => (value.trim() === '' ? Number.NaN : Number(value)));
    if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined;
    corners.push({x: x as number, y: y as number});
  }
  return corners;
}

/**
 * Whether the corners, in the order given, trace a simple convex outline.
 *
 * Every turn has the same sense and none is straight. A crossed order -- two
 * corners swapped -- turns both ways, and a solve against it would fit a pose
 * to corners that were never where they are said to be.
 */
function isConvexQuadrilateral(corners: readonly PlanePoint[]): boolean {
  let sign = 0;
  for (let index = 0; index < 4; index += 1) {
    const a = corners[index] as PlanePoint;
    const b = corners[(index + 1) % 4] as PlanePoint;
    const c = corners[(index + 2) % 4] as PlanePoint;
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (!(Math.abs(cross) > 0)) return false;
    const turn = Math.sign(cross);
    if (sign === 0) sign = turn;
    else if (turn !== sign) return false;
  }
  return true;
}

/**
 * How far the outline departs from a rectangle, in metres.
 *
 * The largest distance from a measured corner to the matching corner of the
 * rectangle that fits all four best in the least squares sense, with its
 * centre, rotation, width and height all free. It is zero exactly when the
 * corners form a rectangle, it is in the same units as the tape, and it does
 * not depend on where the axes were put. A diagonal difference, the obvious
 * alternative, is zero for any isosceles trapezoid, which is the shape a
 * projector tilted up at a wall throws.
 *
 * The fit has a closed form. With the centroid removed, the corners are
 * compared with `±w/2 e1 ± h/2 e2`, signs fixed by the corner names. For a
 * given direction e1 the best width and height are projections, and the
 * direction that leaves least error is the principal eigenvector of a 2x2
 * matrix built from two sign-weighted sums of the corners.
 */
export function rectangularityResidual(corners: readonly PlanePoint[]): number {
  const centre = {
    x: corners.reduce((total, corner) => total + corner.x, 0) / 4,
    y: corners.reduce((total, corner) => total + corner.y, 0) / 4
  };
  const q = corners.map((corner) => ({x: corner.x - centre.x, y: corner.y - centre.y}));
  // tl, tr, br, bl: signs along the first and second axes.
  const signs: ReadonlyArray<readonly [number, number]> = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1]
  ];
  let X = {x: 0, y: 0};
  let Y = {x: 0, y: 0};
  q.forEach((point, index) => {
    const [sx, sy] = signs[index] as readonly [number, number];
    X = {x: X.x + sx * point.x, y: X.y + sx * point.y};
    Y = {x: Y.x + sy * point.x, y: Y.y + sy * point.y};
  });
  // Y . rot90(e1) equals Z . e1 for Z = (Y.y, -Y.x).
  const Z = {x: Y.y, y: -Y.x};
  const m00 = X.x * X.x + Z.x * Z.x;
  const m01 = X.x * X.y + Z.x * Z.y;
  const m11 = X.y * X.y + Z.y * Z.y;
  const angle = 0.5 * Math.atan2(2 * m01, m00 - m11);
  const e1 = {x: Math.cos(angle), y: Math.sin(angle)};
  const e2 = {x: -e1.y, y: e1.x};
  const halfWidth = (X.x * e1.x + X.y * e1.y) / 4;
  const halfHeight = (Y.x * e2.x + Y.y * e2.y) / 4;
  let worst = 0;
  q.forEach((point, index) => {
    const [sx, sy] = signs[index] as readonly [number, number];
    const fitX = sx * halfWidth * e1.x + sy * halfHeight * e2.x;
    const fitY = sx * halfWidth * e1.y + sy * halfHeight * e2.y;
    worst = Math.max(worst, Math.hypot(point.x - fitX, point.y - fitY));
  });
  return worst;
}

/** A micrometre: well below what a tape can resolve, and stable across machines. */
function roundMeters(value: number): number {
  return Number(value.toFixed(6));
}
