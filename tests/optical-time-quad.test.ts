import {describe, expect, it} from 'vitest';
import {
  CellLevels,
  PanelRangeAccumulator,
  PATTERN_PROFILE_V1,
  PATTERN_PROFILE_V2,
  applyHomography,
  cornersOf,
  decodePatternCells,
  encodePatternCells,
  homographyFromUnitSquare,
  invertHomography,
  litCellCount,
  quadArea,
  sampleCellsThroughQuad,
  type LuminanceFrame,
  type PatternProfile,
  type Point,
  type Quad
} from '../src/optical-time/index.js';
import {codeCount, requireUsableProfile} from '../src/optical-time/pattern-profile.js';

const v2 = PATTERN_PROFILE_V2;
const WIDTH = 200;
const HEIGHT = 160;
const BACKGROUND = 10;
const LIGHT = 230;
const DARK = 20;

const SQUARE: Quad = [
  {x: 40, y: 30},
  {x: 160, y: 30},
  {x: 160, y: 130},
  {x: 40, y: 130}
];
const ROTATED: Quad = [
  {x: 62, y: 24},
  {x: 172, y: 58},
  {x: 140, y: 138},
  {x: 30, y: 104}
];
/** A projector thrown obliquely: the far edge is shorter than the near one. */
const KEYSTONED: Quad = [
  {x: 52, y: 40},
  {x: 150, y: 26},
  {x: 176, y: 140},
  {x: 28, y: 120}
];

/**
 * Draws a code into an arbitrary quadrilateral by mapping each pixel back into
 * the pattern's own coordinates, which is what a camera effectively does.
 */
function renderThroughQuad(
  code: number,
  quad: Quad,
  profile: PatternProfile = v2
): LuminanceFrame {
  const cells = encodePatternCells(code, profile);
  const inverse = invertHomography(homographyFromUnitSquare(quad));
  const data = new Uint8Array(WIDTH * HEIGHT).fill(BACKGROUND);
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const unit = applyHomography(inverse, x + 0.5, y + 0.5);
      if (!unit || unit.x < 0 || unit.x >= 1 || unit.y < 0 || unit.y >= 1) continue;
      const column = Math.floor(unit.x * profile.columns);
      const row = Math.floor(unit.y * profile.rows);
      data[y * WIDTH + x] = cells[row * profile.columns + column] ? LIGHT : DARK;
    }
  }
  return {width: WIDTH, height: HEIGHT, data};
}

function readBack(code: number, quad: Quad, profile: PatternProfile = v2): number | undefined {
  const levels = new CellLevels(profile);
  for (const learning of [0, 331, 662, 993, 1324, 1655, 1986, 2317, 2648, 2979, 3310, 3641]) {
    const values = sampleCellsThroughQuad(renderThroughQuad(learning, quad, profile), quad, profile);
    if (values) levels.add(values);
  }
  const values = sampleCellsThroughQuad(renderThroughQuad(code, quad, profile), quad, profile);
  return values ? levels.decode(values) : undefined;
}

describe('homography', () => {
  it('maps the unit square onto the quadrilateral it was built from', () => {
    for (const quad of [SQUARE, ROTATED, KEYSTONED]) {
      const homography = homographyFromUnitSquare(quad);
      const corners: Array<[number, number]> = [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1]
      ];
      corners.forEach(([x, y], index) => {
        const mapped = applyHomography(homography, x, y) as Point;
        expect(mapped.x).toBeCloseTo((quad[index] as Point).x, 9);
        expect(mapped.y).toBeCloseTo((quad[index] as Point).y, 9);
      });
    }
  });

  it('round trips through its inverse', () => {
    const homography = homographyFromUnitSquare(KEYSTONED);
    const inverse = invertHomography(homography);
    const there = applyHomography(homography, 0.37, 0.62) as Point;
    const back = applyHomography(inverse, there.x, there.y) as Point;
    expect(back.x).toBeCloseTo(0.37, 9);
    expect(back.y).toBeCloseTo(0.62, 9);
  });

  it('uses an exactly affine map for a parallelogram', () => {
    // A square-on view has no perspective at all, and saying so exactly avoids
    // a perspective row full of rounding noise.
    const homography = homographyFromUnitSquare(SQUARE);
    expect(homography[6]).toBe(0);
    expect(homography[7]).toBe(0);
  });

  it('refuses a collapsed quadrilateral', () => {
    const collapsed: Quad = [
      {x: 0, y: 0},
      {x: 10, y: 0},
      {x: 20, y: 0},
      {x: 30, y: 0}
    ];
    expect(homographyFromUnitSquare(collapsed)).toEqual([]);
  });

  it('recovers the corners of a rotated panel rather than its bounding box', () => {
    const points: Point[] = [];
    for (const corner of ROTATED) points.push(corner);
    const quad = cornersOf(points) as Quad;
    expect(quad[0]).toEqual(ROTATED[0]);
    expect(quad[2]).toEqual(ROTATED[2]);
    expect(quadArea(quad)).toBeGreaterThan(0);
  });
});

describe('reading a pattern through a quadrilateral', () => {
  it('reads a square-on panel', () => {
    expect(readBack(1234, SQUARE)).toBe(1234);
  });

  it('reads a rotated panel', () => {
    // The v1 path divides a bounding box evenly, which on this view samples
    // each cell partly from its neighbours.
    expect(readBack(1234, ROTATED)).toBe(1234);
  });

  it('reads a keystoned projection', () => {
    expect(readBack(2718, KEYSTONED)).toBe(2718);
  });

  it('reads every code through a keystoned view', () => {
    const levels = new CellLevels(v2);
    for (let code = 0; code < 4096; code += 331) {
      const values = sampleCellsThroughQuad(renderThroughQuad(code, KEYSTONED), KEYSTONED, v2);
      if (values) levels.add(values);
    }
    let decoded = 0;
    for (let code = 0; code < 4096; code += 97) {
      const values = sampleCellsThroughQuad(renderThroughQuad(code, KEYSTONED), KEYSTONED, v2);
      if (values && levels.decode(values) === code) decoded += 1;
    }
    expect(decoded).toBe(Math.ceil(4096 / 97));
  });

  it('refuses to complete a reading from the cells that stayed in frame', () => {
    const offScreen: Quad = [
      {x: 150, y: 120},
      {x: 400, y: 120},
      {x: 400, y: 300},
      {x: 150, y: 300}
    ];
    const frame = renderThroughQuad(0, SQUARE);
    expect(sampleCellsThroughQuad(frame, offScreen, v2)).toBeUndefined();
  });
});

describe('the v2 profile', () => {
  it('is a usable profile', () => {
    expect(() => requireUsableProfile(v2)).not.toThrow();
  });

  it('lights the same number of cells for every code', () => {
    // Constant total output: the panel does not pulse from code to code, which
    // is the component of the flashing that the area limit cannot address.
    const counts = new Set<number>();
    for (let code = 0; code < codeCount(v2); code += 1) counts.add(litCellCount(code, v2));
    expect([...counts]).toEqual([v2.fiducials.length + v2.dataBits + v2.checkBits]);
  });

  it('lights its fiducials in every code', () => {
    for (const code of [0, 1, 2047, 4095]) {
      const cells = encodePatternCells(code, v2);
      for (const index of v2.fiducials) expect(cells[index]).toBe(true);
    }
  });

  it('round trips every code', () => {
    for (let code = 0; code < codeCount(v2); code += 1) {
      expect(decodePatternCells(encodePatternCells(code, v2), v2)).toBe(code);
    }
  });

  it('rejects a reading whose fiducials did not come back lit', () => {
    // A dark fiducial means the cells were read from the wrong region, so the
    // data cells are not the cells they are assumed to be.
    const cells = encodePatternCells(1234, v2);
    cells[v2.fiducials[0] as number] = false;
    expect(decodePatternCells(cells, v2)).toBeUndefined();
  });

  it('refuses a profile whose fiducials fall outside the grid', () => {
    expect(() => requireUsableProfile({...v2, fiducials: [99]})).toThrowError(/outside/);
  });

  it('refuses a profile with repeated fiducials', () => {
    expect(() => requireUsableProfile({...v2, fiducials: [0, 0]})).toThrowError(/distinct/);
  });

  it('refuses a grid whose fiducials leave too few cells', () => {
    expect(() =>
      requireUsableProfile({...v2, fiducials: [0, 1, 2, 3, 4, 5, 6]})
    ).toThrowError(/needs 32/);
  });
});

describe('detection returns the panel corners', () => {
  it('finds the corners of a rotated panel', () => {
    const accumulator = new PanelRangeAccumulator(WIDTH, HEIGHT);
    for (let code = 0; code < 4096; code += 331) {
      accumulator.add(renderThroughQuad(code, ROTATED));
    }
    const detection = accumulator.detect(v2, {minimumCellPixels: 2});
    expect(detection.ok).toBe(true);
    if (!detection.ok) return;
    // The fiducials never change, so the changing region stops short of the
    // true corners; it still follows the panel's rotation rather than the axes.
    const box = detection.panel;
    expect(box.width).toBeGreaterThan(0);
    expect(quadArea(detection.quad)).toBeGreaterThan(0);
    expect(Math.abs(quadArea(detection.quad))).toBeLessThan(box.width * box.height);
  });

  it('still reports a bounding box for the v1 grid path', () => {
    const accumulator = new PanelRangeAccumulator(WIDTH, HEIGHT);
    for (let code = 0; code < 4096; code += 331) {
      accumulator.add(renderThroughQuad(code, SQUARE, PATTERN_PROFILE_V1));
    }
    const detection = accumulator.detect(PATTERN_PROFILE_V1, {minimumCellPixels: 2});
    expect(detection.ok).toBe(true);
    if (detection.ok) {
      expect(detection.panel.width).toBeGreaterThan(100);
    }
  });
});

describe('finding corners at any angle', () => {
  function diamondPoints(centre: number, radius: number): Point[] {
    const points: Point[] = [];
    for (let y = centre - radius; y <= centre + radius; y += 1) {
      for (let x = centre - radius; x <= centre + radius; x += 1) {
        if (Math.abs(x - centre) + Math.abs(y - centre) <= radius) points.push({x, y});
      }
    }
    return points;
  }

  it('finds the corners of a square turned 45 degrees', () => {
    // Along each edge of a 45-degree square, x + y is constant, so the diagonal
    // extremes pick an arbitrary point on that edge and can collapse two
    // corners onto one. The axis extremes are exact here, which is why both
    // sets are kept.
    const quad = cornersOf(diamondPoints(60, 40)) as Quad;
    expect(quad).toBeDefined();
    expect(Math.abs(quadArea(quad))).toBeCloseTo(2 * 40 * 40, -2);
  });

  it('finds the corners of an axis-aligned rectangle', () => {
    const points: Point[] = [];
    for (let y = 10; y <= 50; y += 1) {
      for (let x = 20; x <= 100; x += 1) points.push({x, y});
    }
    const quad = cornersOf(points) as Quad;
    expect(quadArea(quad)).toBeCloseTo(80 * 40, -2);
  });

  it('reads a panel the camera sees turned 45 degrees', () => {
    const turned: Quad = [
      {x: 100, y: 20},
      {x: 170, y: 90},
      {x: 100, y: 160},
      {x: 30, y: 90}
    ];
    expect(readBack(1234, turned)).toBe(1234);
  });
});
