import {
  PATTERN_PROFILE_V2,
  applyHomography,
  drawPattern,
  encodePatternCells,
  homographyFromUnitSquare,
  invertHomography,
  type LuminanceFrame,
  type PatternProfile,
  type PatternSurface,
  type Point,
  type Quad,
  type RegionReader,
  type SourceRegion
} from '../../src/optical-time/index.js';

/**
 * A camera looking at the real pattern, without a browser.
 *
 * The panel is laid out by the display's own `drawPattern`, so the cell sizes
 * and gaps are the ones a projector would show, then carried into a camera
 * image through a homography: a flat display or wall seen by a pinhole camera
 * is exactly that. The source image is rendered at 2x2 supersampling, blurred
 * and read back with sensor noise; the analysis frames are the same coverage
 * averaged down, which is what drawing the video into a small canvas does.
 */

export const DISPLAY_WIDTH = 1920;
export const DISPLAY_HEIGHT = 1080;
export const PANEL_SCALE = 0.35;
/** Samples per source pixel edge when rendering the full-resolution image. */
const SOURCE_SUPERSAMPLING = 8;

export interface SceneOptions {
  /** Maps display pixels to source pixels (corner-origin coordinates). */
  readonly displayToSource: readonly number[];
  readonly profile?: PatternProfile;
  readonly sourceWidth?: number;
  readonly sourceHeight?: number;
  readonly analysisWidth?: number;
  readonly analysisHeight?: number;
  readonly blurSigmaPx?: number;
  readonly noiseSigma?: number;
  readonly light?: number;
  readonly dark?: number;
  readonly seed?: number;
}

export interface SyntheticScene {
  readonly profile: PatternProfile;
  readonly sourceWidth: number;
  readonly sourceHeight: number;
  readonly analysisWidth: number;
  readonly analysisHeight: number;
  /** The lit outer corners in source pixels, display orientation: tl, tr, br, bl. */
  readonly trueCorners: readonly [Point, Point, Point, Point];
  /** The same corners in display pixels. */
  readonly displayCorners: readonly [Point, Point, Point, Point];
  analysisFrame(code: number): LuminanceFrame;
  /** Reads windows of the full-resolution frame, with fresh noise on every read. */
  reader(): RegionReader & {reads: SourceRegion[]};
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The rectangles `drawPattern` fills, in row-major cell order. */
export function displayCellRects(profile: PatternProfile = PATTERN_PROFILE_V2): Rect[] {
  const rects: Rect[] = [];
  const surface: PatternSurface = {
    fillStyle: '',
    fillRect(x, y, width, height) {
      rects.push({x, y, width, height});
    }
  };
  drawPattern(surface, DISPLAY_WIDTH, DISPLAY_HEIGHT, encodePatternCells(0, profile), {
    profile,
    panelScale: PANEL_SCALE,
    palette: {light: '#fff', dark: '#000', surround: '#000'}
  });
  // The first fill is the surround.
  return rects.slice(1);
}

/** The panel square in display pixels, as `drawPattern` lays it out. */
export function displayPanelSquare(): Quad {
  const panel = Math.min(DISPLAY_WIDTH, DISPLAY_HEIGHT) * PANEL_SCALE;
  const x = (DISPLAY_WIDTH - panel) / 2;
  const y = (DISPLAY_HEIGHT - panel) / 2;
  return [
    {x, y},
    {x: x + panel, y},
    {x: x + panel, y: y + panel},
    {x, y: y + panel}
  ];
}

export function multiply3(a: readonly number[], b: readonly number[]): number[] {
  const out = new Array<number>(9).fill(0);
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      let total = 0;
      for (let k = 0; k < 3; k += 1) {
        total += (a[row * 3 + k] as number) * (b[k * 3 + column] as number);
      }
      out[row * 3 + column] = total;
    }
  }
  return out;
}

/** The homography taking one quadrilateral onto another, corner for corner. */
export function quadToQuad(from: Quad, to: Quad): number[] {
  return multiply3(homographyFromUnitSquare(to), invertHomography(homographyFromUnitSquare(from)));
}

/** A display seen so that its panel square lands on `quad` in the source image. */
export function panelSeenAs(quad: Quad): number[] {
  return quadToQuad(displayPanelSquare(), quad);
}

export function createScene(options: SceneOptions): SyntheticScene {
  const profile = options.profile ?? PATTERN_PROFILE_V2;
  const sourceWidth = options.sourceWidth ?? 1280;
  const sourceHeight = options.sourceHeight ?? 720;
  const analysisWidth = options.analysisWidth ?? 240;
  const analysisHeight = options.analysisHeight ?? 180;
  const light = options.light ?? 210;
  const dark = options.dark ?? 22;
  const noiseSigma = options.noiseSigma ?? 2;
  const random = gaussianSource(options.seed ?? 7);
  const rects = displayCellRects(profile);
  const toDisplay = invertHomography(options.displayToSource);

  const first = rects[0] as Rect;
  const cellWidth = (rects[1] as Rect).x - first.x;
  const cellHeight = (rects[profile.columns] as Rect).y - first.y;
  const gapX = cellWidth - first.width;
  const gapY = cellHeight - first.height;
  const originX = first.x - gapX / 2;
  const originY = first.y - gapY / 2;

  const labelAt = (x: number, y: number): number => {
    const display = applyHomography(toDisplay, x, y);
    if (!display) return -1;
    const column = Math.floor((display.x - originX) / cellWidth);
    const row = Math.floor((display.y - originY) / cellHeight);
    if (column < 0 || row < 0 || column >= profile.columns || row >= profile.rows) return -1;
    const index = row * profile.columns + column;
    const rect = rects[index] as Rect;
    const inside =
      display.x >= rect.x &&
      display.x < rect.x + rect.width &&
      display.y >= rect.y &&
      display.y < rect.y + rect.height;
    return inside ? index : -1;
  };

  // Supersampled labels, restricted to where the panel can be.
  const superWidth = sourceWidth * 2;
  const superHeight = sourceHeight * 2;
  const labels = new Int8Array(superWidth * superHeight).fill(-1);
  const square = displayPanelSquare().map((corner) =>
    applyHomography(options.displayToSource, corner.x, corner.y)
  ) as Point[];
  const minX = Math.max(0, Math.floor(Math.min(...square.map((p) => p.x)) - 4) * 2);
  const maxX = Math.min(superWidth, Math.ceil(Math.max(...square.map((p) => p.x)) + 4) * 2);
  const minY = Math.max(0, Math.floor(Math.min(...square.map((p) => p.y)) - 4) * 2);
  const maxY = Math.min(superHeight, Math.ceil(Math.max(...square.map((p) => p.y)) + 4) * 2);
  for (let y = minY; y < maxY; y += 1) {
    for (let x = minX; x < maxX; x += 1) {
      labels[y * superWidth + x] = labelAt((x + 0.5) / 2, (y + 0.5) / 2);
    }
  }

  // Full-resolution image of the fixed cells, supersampled more finely than the
  // labels: coverage quantised to quarters leaves a staircase along a nearly
  // axis-aligned edge that biases where it is found by a tenth of a pixel or
  // more, which is the very quantity being measured. Only the fiducials matter
  // to the windows read around the corners, and they are lit in every code.
  const cells = encodePatternCells(0, profile);
  const fine = SOURCE_SUPERSAMPLING;
  const image = new Float32Array(sourceWidth * sourceHeight).fill(dark);
  const share = (light - dark) / (fine * fine);
  for (let y = minY >> 1; y < maxY >> 1; y += 1) {
    for (let x = minX >> 1; x < maxX >> 1; x += 1) {
      let lit = 0;
      for (let sy = 0; sy < fine; sy += 1) {
        for (let sx = 0; sx < fine; sx += 1) {
          const label = labelAt(x + (sx + 0.5) / fine, y + (sy + 0.5) / fine);
          if (label >= 0 && cells[label]) lit += 1;
        }
      }
      image[y * sourceWidth + x] = dark + lit * share;
    }
  }
  const blurred = gaussianBlur(image, sourceWidth, sourceHeight, options.blurSigmaPx ?? 1);

  // Coverage of each analysis pixel by each label, kept sparse.
  const analysisPixels = analysisWidth * analysisHeight;
  const histogram = new Map<number, Map<number, number>>();
  const perPixel = (superWidth * superHeight) / analysisPixels;
  for (let y = minY; y < maxY; y += 1) {
    const ay = Math.floor((((y + 0.5) / 2) * analysisHeight) / sourceHeight);
    for (let x = minX; x < maxX; x += 1) {
      const label = labels[y * superWidth + x] as number;
      if (label < 0) continue;
      const ax = Math.floor((((x + 0.5) / 2) * analysisWidth) / sourceWidth);
      const pixel = ay * analysisWidth + ax;
      let counts = histogram.get(pixel);
      if (!counts) {
        counts = new Map();
        histogram.set(pixel, counts);
      }
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }
  const coverage = [...histogram.entries()].map(([pixel, counts]) => ({
    pixel,
    counts: [...counts.entries()]
  }));

  const toSource = (point: Point): Point =>
    applyHomography(options.displayToSource, point.x, point.y) as Point;
  const tl = rects[0] as Rect;
  const tr = rects[profile.columns - 1] as Rect;
  const bl = rects[(profile.rows - 1) * profile.columns] as Rect;
  const br = rects[profile.rows * profile.columns - 1] as Rect;
  const displayCorners: [Point, Point, Point, Point] = [
    {x: tl.x, y: tl.y},
    {x: tr.x + tr.width, y: tr.y},
    {x: br.x + br.width, y: br.y + br.height},
    {x: bl.x, y: bl.y + bl.height}
  ];

  return {
    profile,
    sourceWidth,
    sourceHeight,
    analysisWidth,
    analysisHeight,
    displayCorners,
    trueCorners: displayCorners.map(toSource) as unknown as [Point, Point, Point, Point],
    analysisFrame(code) {
      const states = encodePatternCells(code, profile);
      const values = new Float32Array(analysisPixels).fill(dark);
      for (const {pixel, counts} of coverage) {
        let total = 0;
        for (const [label, count] of counts) {
          if (states[label]) total += count;
        }
        values[pixel] = dark + ((light - dark) * total) / perPixel;
      }
      const data = new Uint8Array(analysisPixels);
      for (let index = 0; index < analysisPixels; index += 1) {
        data[index] = clampByte((values[index] as number) + random() * (noiseSigma / 2));
      }
      return {width: analysisWidth, height: analysisHeight, data};
    },
    reader() {
      const reads: SourceRegion[] = [];
      return {
        reads,
        read(region) {
          reads.push(region);
          if (
            region.x < 0 ||
            region.y < 0 ||
            region.x + region.width > sourceWidth ||
            region.y + region.height > sourceHeight
          ) {
            return undefined;
          }
          const data = new Uint8Array(region.width * region.height);
          for (let y = 0; y < region.height; y += 1) {
            const row = (region.y + y) * sourceWidth;
            for (let x = 0; x < region.width; x += 1) {
              data[y * region.width + x] = clampByte(
                (blurred[row + region.x + x] as number) + random() * noiseSigma
              );
            }
          }
          return {width: region.width, height: region.height, data};
        }
      };
    }
  };
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function gaussianBlur(
  image: Float32Array,
  width: number,
  height: number,
  sigma: number
): Float32Array {
  if (sigma <= 0) return image;
  const radius = Math.ceil(sigma * 3);
  const kernel: number[] = [];
  let sum = 0;
  for (let k = -radius; k <= radius; k += 1) {
    const weight = Math.exp(-(k * k) / (2 * sigma * sigma));
    kernel.push(weight);
    sum += weight;
  }
  const normalized = kernel.map((weight) => weight / sum);
  const horizontal = new Float32Array(image.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let total = 0;
      for (let k = -radius; k <= radius; k += 1) {
        const xx = Math.min(width - 1, Math.max(0, x + k));
        total += (image[y * width + xx] as number) * (normalized[k + radius] as number);
      }
      horizontal[y * width + x] = total;
    }
  }
  const out = new Float32Array(image.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let total = 0;
      for (let k = -radius; k <= radius; k += 1) {
        const yy = Math.min(height - 1, Math.max(0, y + k));
        total += (horizontal[yy * width + x] as number) * (normalized[k + radius] as number);
      }
      out[y * width + x] = total;
    }
  }
  return out;
}

/** A seeded standard normal source, so a failing run can be reproduced. */
export function gaussianSource(seed: number): () => number {
  let state = seed >>> 0;
  const uniform = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return () => {
    const u = Math.max(uniform(), 1e-12);
    const v = uniform();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
}

export interface PinholeIntrinsics {
  readonly fx: number;
  readonly fy: number;
  readonly cx: number;
  readonly cy: number;
}

/**
 * A camera placed at `centre` and looking at `target`, both in wall metres.
 *
 * The wall frame has x right, y down and z into the wall, and the camera frame
 * follows OpenCV. `rollDeg` turns the camera about its own view axis. Returns
 * cameraFromWall as a row-major 4x4.
 */
export function lookAt(
  centre: readonly [number, number, number],
  target: readonly [number, number, number],
  rollDeg = 0
): number[] {
  const z = normalize([target[0] - centre[0], target[1] - centre[1], target[2] - centre[2]]);
  let x = normalize(cross([0, 1, 0], z));
  let y = cross(z, x);
  const roll = (rollDeg * Math.PI) / 180;
  const c = Math.cos(roll);
  const s = Math.sin(roll);
  [x, y] = [
    [0, 1, 2].map((i) => c * (x[i] as number) + s * (y[i] as number)),
    [0, 1, 2].map((i) => -s * (x[i] as number) + c * (y[i] as number))
  ];
  const rows = [x, y, z];
  const t = rows.map((row) => -((row[0] as number) * centre[0] + (row[1] as number) * centre[1] + (row[2] as number) * centre[2]));
  return [
    ...(x as number[]), t[0] as number,
    ...(y as number[]), t[1] as number,
    ...(z as number[]), t[2] as number,
    0, 0, 0, 1
  ];
}

/** Display pixels to source pixels for a projector throwing the display onto the wall. */
export function displayThroughCamera(
  intrinsics: PinholeIntrinsics,
  cameraFromWall: readonly number[],
  displayToWall: readonly number[]
): number[] {
  const m = (row: number, column: number): number => cameraFromWall[row * 4 + column] as number;
  // A point (x, y, 0) on the wall: camera = x r1 + y r2 + t.
  const wallToCamera = [m(0, 0), m(0, 1), m(0, 3), m(1, 0), m(1, 1), m(1, 3), m(2, 0), m(2, 1), m(2, 3)];
  const k = [intrinsics.fx, 0, intrinsics.cx, 0, intrinsics.fy, intrinsics.cy, 0, 0, 1];
  return multiply3(multiply3(k, wallToCamera), displayToWall);
}

function cross(a: readonly number[], b: readonly number[]): number[] {
  return [
    (a[1] as number) * (b[2] as number) - (a[2] as number) * (b[1] as number),
    (a[2] as number) * (b[0] as number) - (a[0] as number) * (b[2] as number),
    (a[0] as number) * (b[1] as number) - (a[1] as number) * (b[0] as number)
  ];
}

function normalize(v: readonly number[]): number[] {
  const length = Math.hypot(...v);
  return v.map((value) => value / length);
}
