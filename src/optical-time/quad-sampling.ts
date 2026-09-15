import {
  applyHomography,
  homographyFromUnitSquare,
  type Point,
  type Quad
} from './homography.js';
import {cellCount, type PatternProfile} from './pattern-profile.js';
import {type LuminanceFrame} from './sampling.js';

/** Points taken across each cell, per axis, when averaging it. */
const CELL_TAPS = 3;
/** Share of the cell left untouched at each edge. */
const CELL_INSET = 0.25;

/**
 * Reads each cell through the panel's own coordinates.
 *
 * The taps are placed in pattern space and mapped into the image, so a cell is
 * sampled from the part of the image that actually shows it whatever the camera
 * angle or the projector's keystone. Mapping the other way -- carving the image
 * into equal boxes -- is what makes an oblique view sample its neighbours.
 */
export function sampleCellsThroughQuad(
  frame: LuminanceFrame,
  quad: Quad,
  profile: PatternProfile
): number[] | undefined {
  const homography = homographyFromUnitSquare(quad);
  if (homography.length !== 9) return undefined;
  const values: number[] = [];
  for (let row = 0; row < profile.rows; row += 1) {
    for (let column = 0; column < profile.columns; column += 1) {
      let total = 0;
      let count = 0;
      for (let tapY = 0; tapY < CELL_TAPS; tapY += 1) {
        for (let tapX = 0; tapX < CELL_TAPS; tapX += 1) {
          const unit = cellTap(column, row, tapX, tapY, profile);
          const point = applyHomography(homography, unit.x, unit.y);
          if (!point) continue;
          const sample = pixelAt(frame, point);
          if (sample === undefined) continue;
          total += sample;
          count += 1;
        }
      }
      // A cell with no readable taps has left the frame; the reading is not of
      // this panel and must not be completed from the cells that did land.
      if (count === 0) return undefined;
      values.push(total / count);
    }
  }
  return values.length === cellCount(profile) ? values : undefined;
}

export function cellCentreInImage(
  quad: Quad,
  profile: PatternProfile,
  column: number,
  row: number
): Point | undefined {
  const homography = homographyFromUnitSquare(quad);
  return applyHomography(
    homography,
    (column + 0.5) / profile.columns,
    (row + 0.5) / profile.rows
  );
}

function cellTap(
  column: number,
  row: number,
  tapX: number,
  tapY: number,
  profile: PatternProfile
): Point {
  const span = 1 - CELL_INSET * 2;
  const offset = CELL_INSET + (span * tapX) / (CELL_TAPS - 1);
  const offsetY = CELL_INSET + (span * tapY) / (CELL_TAPS - 1);
  return {
    x: (column + offset) / profile.columns,
    y: (row + offsetY) / profile.rows
  };
}

function pixelAt(frame: LuminanceFrame, point: Point): number | undefined {
  const x = Math.round(point.x);
  const y = Math.round(point.y);
  if (x < 0 || y < 0 || x >= frame.width || y >= frame.height) return undefined;
  return frame.data[y * frame.width + x];
}
