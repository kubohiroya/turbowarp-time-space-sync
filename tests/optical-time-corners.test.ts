import {describe, expect, it} from 'vitest';
import {
  CellLevels,
  COARSE_CORNER_UNCERTAINTY_ANALYSIS_PX,
  PanelRangeAccumulator,
  PATTERN_PROFILE_V1,
  PATTERN_PROFILE_V2,
  applyHomography,
  decodePatternCells,
  encodePatternCells,
  fitLine,
  homographyFromUnitSquare,
  intersectLines,
  litOutlineInset,
  refinePanelCorners,
  sampleCellsThroughQuad,
  sourceQuadFromAnalysis,
  startAtTopLeft,
  type Point,
  type Quad
} from '../src/optical-time/index.js';
import {
  createScene,
  displayThroughCamera,
  lookAt,
  panelSeenAs,
  quadToQuad,
  type SyntheticScene
} from './support/synthetic-camera.js';

const v2 = PATTERN_PROFILE_V2;
const SOURCE = {width: 1280, height: 720};
const ANALYSIS = {width: 240, height: 180};
/**
 * The accuracy the refinement is held to, per frame, in source pixels.
 *
 * A placement solve assumes about half a pixel; a third leaves room for the
 * lens and the sensor a synthetic image does not have.
 */
const REFINED_TOLERANCE_PX = 0.3;

function square(cx: number, cy: number, half: number, degrees = 0): Quad {
  const angle = (degrees * Math.PI) / 180;
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1]
  ].map(([x, y]) => ({
    x: cx + half * ((x as number) * Math.cos(angle) - (y as number) * Math.sin(angle)),
    y: cy + half * ((x as number) * Math.sin(angle) + (y as number) * Math.cos(angle))
  })) as unknown as Quad;
}

/** A 3.2 m wide projection, slightly keystoned, in wall metres per display pixel. */
const DISPLAY_TO_WALL = quadToQuad(
  [
    {x: 0, y: 0},
    {x: 1920, y: 0},
    {x: 1920, y: 1080},
    {x: 0, y: 1080}
  ],
  [
    {x: 0, y: 0},
    {x: 3.2, y: 0.04},
    {x: 3.17, y: 1.83},
    {x: 0.02, y: 1.8}
  ]
);
const INTRINSICS = {fx: 1000, fy: 1000, cx: 640, cy: 360};

const VIEWS: Record<string, number[]> = {
  'square on': panelSeenAs(square(640, 360, 230)),
  'rotated 20 degrees': panelSeenAs(square(620, 370, 200, 20)),
  keystoned: panelSeenAs([
    {x: 430, y: 170},
    {x: 850, y: 210},
    {x: 880, y: 590},
    {x: 400, y: 540}
  ]),
  'oblique camera': displayThroughCamera(
    INTRINSICS,
    lookAt([0.1, 1.3, -2.1], [1.6, 0.92, 0]),
    DISPLAY_TO_WALL
  ),
  'oblique camera rolled 20 degrees': displayThroughCamera(
    INTRINSICS,
    lookAt([3.1, 0.5, -2.3], [1.6, 0.92, 0], 20),
    DISPLAY_TO_WALL
  )
};

function detect(scene: SyntheticScene): Quad {
  const accumulator = new PanelRangeAccumulator(ANALYSIS.width, ANALYSIS.height);
  for (let code = 0; code < 4096; code += 97) accumulator.add(scene.analysisFrame(code));
  const detection = accumulator.detect(v2);
  if (!detection.ok) throw new Error(`panel not detected: ${detection.reason}`);
  return detection.quad;
}

/** The lit outer corners the coarse panel square implies, without refinement. */
function coarseCorners(panel: Quad): Point[] {
  const inset = litOutlineInset(v2);
  const homography = homographyFromUnitSquare(panel);
  return [
    [inset.x, inset.y],
    [1 - inset.x, inset.y],
    [1 - inset.x, 1 - inset.y],
    [inset.x, 1 - inset.y]
  ].map(([x, y]) => applyHomography(homography, x as number, y as number) as Point);
}

function errors(found: readonly Point[], truth: readonly Point[]): number[] {
  return found.map((point, index) =>
    Math.hypot(point.x - (truth[index] as Point).x, point.y - (truth[index] as Point).y)
  );
}

describe('refining the pattern corners at source resolution', () => {
  for (const [name, displayToSource] of Object.entries(VIEWS)) {
    it(`places every corner within ${REFINED_TOLERANCE_PX} px: ${name}`, () => {
      const scene = createScene({displayToSource, blurSigmaPx: 1.2, noiseSigma: 3, seed: 11});
      const coarse = sourceQuadFromAnalysis(detect(scene), ANALYSIS, SOURCE);
      const reader = scene.reader();
      const refined = refinePanelCorners(
        reader,
        coarse,
        v2,
        SOURCE,
        COARSE_CORNER_UNCERTAINTY_ANALYSIS_PX * (SOURCE.width / ANALYSIS.width)
      );
      if (!refined.ok) throw new Error(`refinement failed: ${refined.reason}`);
      const refinedErrors = errors(refined.corners, scene.trueCorners);
      const coarseErrors = errors(coarseCorners(coarse), scene.trueCorners);
      expect(Math.max(...refinedErrors)).toBeLessThan(REFINED_TOLERANCE_PX);
      // The coarse corners are what the downscaled decoder knows: good enough to
      // sample cells, and several times too coarse to solve a pose from.
      expect(Math.max(...coarseErrors)).toBeGreaterThan(Math.max(...refinedErrors) * 5);
      expect(Math.max(...coarseErrors)).toBeGreaterThan(REFINED_TOLERANCE_PX * 2);
      // Four windows, each a small part of the frame: nothing reads the whole of it.
      expect(reader.reads).toHaveLength(4);
      for (const region of reader.reads) {
        expect(region.width * region.height).toBeLessThan(SOURCE.width * SOURCE.height * 0.05);
      }
    });
  }

  it('holds the tolerance at 1920x1080 through a heavier blur', () => {
    const source = {width: 1920, height: 1080};
    const scene = createScene({
      displayToSource: panelSeenAs(square(900, 560, 300, -12)),
      sourceWidth: source.width,
      sourceHeight: source.height,
      blurSigmaPx: 2,
      noiseSigma: 4,
      seed: 5
    });
    const coarse = sourceQuadFromAnalysis(detect(scene), ANALYSIS, source);
    const refined = refinePanelCorners(scene.reader(), coarse, v2, source, 2 * (1920 / 240));
    if (!refined.ok) throw new Error(`refinement failed: ${refined.reason}`);
    expect(Math.max(...errors(refined.corners, scene.trueCorners))).toBeLessThan(REFINED_TOLERANCE_PX);
  });

  it('refuses a panel whose corner window leaves the frame', () => {
    const scene = createScene({displayToSource: panelSeenAs(square(250, 360, 245))});
    const coarse = sourceQuadFromAnalysis(detect(scene), ANALYSIS, SOURCE);
    const refined = refinePanelCorners(scene.reader(), coarse, v2, SOURCE, 10);
    expect(refined).toEqual({ok: false, reason: 'outside-image'});
  });

  it('refuses a panel too dim to have an edge', () => {
    const scene = createScene({displayToSource: panelSeenAs(square(640, 360, 230)), light: 40, dark: 30});
    const truth = sourceQuadFromAnalysis(
      square(640 / (1280 / 240) - 0.5, 360 / 4 - 0.5, 230 / 5.3333),
      ANALYSIS,
      SOURCE
    );
    const refined = refinePanelCorners(scene.reader(), truth, v2, SOURCE, 10);
    expect(refined).toEqual({ok: false, reason: 'low-contrast'});
  });

  it('refuses a reader that returns nothing', () => {
    const coarse = square(640, 360, 230);
    expect(refinePanelCorners({read: () => undefined}, coarse, v2, SOURCE, 10)).toEqual({
      ok: false,
      reason: 'outside-image'
    });
  });
});

describe('detecting a panel with corner fiducials', () => {
  it('finds the panel square rather than the corners of its notches', () => {
    // The fiducials never change, so the changing region lacks its corner
    // cells. Its extreme points are a cell away from the panel's corners, and
    // cells sampled through them miss their centres.
    for (const displayToSource of Object.values(VIEWS)) {
      const scene = createScene({displayToSource, blurSigmaPx: 1, noiseSigma: 2});
      const quad = detect(scene);
      const lit = coarseCorners(sourceQuadFromAnalysis(quad, ANALYSIS, SOURCE));
      expect(Math.max(...errors(lit, scene.trueCorners))).toBeLessThan(
        COARSE_CORNER_UNCERTAINTY_ANALYSIS_PX * (SOURCE.width / ANALYSIS.width)
      );
    }
  });

  it('keeps the panel whole when the gaps between cells span whole analysis pixels', () => {
    // A large panel in view: each gap is more than a pixel wide and never
    // changes, which without closing the mask splits the panel into cells.
    const scene = createScene({displayToSource: panelSeenAs(square(640, 360, 340))});
    expect(() => detect(scene)).not.toThrow();
  });

  it('decodes every sampled code through the detected quad', () => {
    const scene = createScene({displayToSource: VIEWS['oblique camera rolled 20 degrees'] as number[]});
    const quad = detect(scene);
    const levels = new CellLevels(v2);
    for (let code = 0; code < 4096; code += 331) {
      levels.add(sampleCellsThroughQuad(scene.analysisFrame(code), quad, v2) as number[]);
    }
    let decoded = 0;
    for (let code = 0; code < 4096; code += 97) {
      const values = sampleCellsThroughQuad(scene.analysisFrame(code), quad, v2);
      if (values && levels.decode(values) === code) decoded += 1;
    }
    expect(decoded).toBe(Math.ceil(4096 / 97));
  });

  it('leaves the v1 path to its bounding box', () => {
    const scene = createScene({
      displayToSource: panelSeenAs(square(640, 360, 230)),
      profile: PATTERN_PROFILE_V1
    });
    const accumulator = new PanelRangeAccumulator(ANALYSIS.width, ANALYSIS.height);
    for (let code = 0; code < 4096; code += 97) accumulator.add(scene.analysisFrame(code));
    const detection = accumulator.detect(PATTERN_PROFILE_V1);
    expect(detection.ok).toBe(true);
  });
});

describe('orientation', () => {
  /** Reads display cell (row, column) where a camera turned or mirrored would put it. */
  function transformed(cells: readonly boolean[], map: (row: number, column: number) => [number, number]): boolean[] {
    const out: boolean[] = [];
    for (let row = 0; row < 6; row += 1) {
      for (let column = 0; column < 6; column += 1) {
        const [r, c] = map(row, column);
        out.push(cells[r * 6 + c] as boolean);
      }
    }
    return out;
  }

  function decodedShare(map: (row: number, column: number) => [number, number]): number {
    let decoded = 0;
    for (let code = 0; code < 4096; code += 1) {
      if (decodePatternCells(transformed(encodePatternCells(code, v2), map), v2) !== undefined) {
        decoded += 1;
      }
    }
    return decoded / 4096;
  }

  it('reads nothing at all from a view turned by a quarter, a half or three quarters', () => {
    // The fiducials are symmetric, so they cannot tell; the differential pairs
    // and check bits can, and they refuse every code.
    expect(decodedShare((row, column) => [column, 5 - row])).toBe(0);
    expect(decodedShare((row, column) => [5 - row, 5 - column])).toBe(0);
    expect(decodedShare((row, column) => [5 - column, row])).toBe(0);
    expect(decodedShare((row, column) => [column, row])).toBe(0);
  });

  it('reads one code in eight from a mirrored view, which the continuity guard has to catch', () => {
    // Seen from behind a rear-projection screen. The share is below the
    // calibration gate, and the corner measurement also requires readings that
    // advance with real time; see the measurement tests.
    expect(decodedShare((row, column) => [row, 5 - column])).toBe(0.125);
    expect(decodedShare((row, column) => [5 - row, column])).toBe(0.125);
  });

  it('names the top-left corner the same way for any roll within 45 degrees', () => {
    for (const degrees of [-40, -20, 0, 20, 40]) {
      const quad = square(120, 90, 60, degrees);
      const shuffled: Quad = [quad[2], quad[3], quad[0], quad[1]];
      expect(startAtTopLeft(shuffled)[0]).toEqual(quad[0]);
    }
  });

  it('fails to calibrate a camera rolled a quarter turn', () => {
    const scene = createScene({displayToSource: panelSeenAs(square(640, 360, 230, 90))});
    const quad = detect(scene);
    const levels = new CellLevels(v2);
    let decoded = 0;
    for (let code = 0; code < 4096; code += 97) {
      const values = sampleCellsThroughQuad(scene.analysisFrame(code), quad, v2) as number[];
      levels.add(values);
    }
    for (let code = 0; code < 4096; code += 97) {
      const values = sampleCellsThroughQuad(scene.analysisFrame(code), quad, v2) as number[];
      if (levels.decode(values) !== undefined) decoded += 1;
    }
    expect(decoded).toBe(0);
  });
});

describe('line fitting', () => {
  it('fits a vertical line, which ordinary least squares cannot', () => {
    const fit = fitLine([0, 1, 2, 3, 4].map((y) => ({x: 7, y})));
    expect(fit?.rms).toBeCloseTo(0, 9);
    expect(Math.abs(fit?.line.direction.y ?? 0)).toBeCloseTo(1, 9);
  });

  it('refuses to intersect lines that are nearly parallel', () => {
    const a = {point: {x: 0, y: 0}, direction: {x: 1, y: 0}};
    const b = {point: {x: 0, y: 1}, direction: {x: Math.cos(0.05), y: Math.sin(0.05)}};
    expect(intersectLines(a, b)).toBeUndefined();
    expect(intersectLines(a, {point: {x: 3, y: 5}, direction: {x: 0, y: 1}})).toEqual({x: 3, y: 0});
  });
});
