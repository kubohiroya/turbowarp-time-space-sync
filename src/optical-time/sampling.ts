import {cellCount, type PatternProfile} from './pattern-profile.js';

export interface LuminanceFrame {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
}

export interface PanelRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Sampling rectangles for each cell, inset to tolerate a small misalignment.
 *
 * The panel is divided evenly, which assumes the camera sees it square on and
 * undistorted. That holds for the v1 profile and it is what the extraction
 * source did; a tilted or keystoned view needs the corner fiducials and a
 * homography, which arrive with the v2 profile.
 */
export function patternCellRects(
  panel: PanelRect,
  profile: PatternProfile,
  insetRatio = 0.25
): PanelRect[] {
  const cellWidth = panel.width / profile.columns;
  const cellHeight = panel.height / profile.rows;
  const insetX = cellWidth * insetRatio;
  const insetY = cellHeight * insetRatio;
  const rects: PanelRect[] = [];
  for (let row = 0; row < profile.rows; row += 1) {
    for (let column = 0; column < profile.columns; column += 1) {
      rects.push({
        x: Math.floor(panel.x + column * cellWidth + insetX),
        y: Math.floor(panel.y + row * cellHeight + insetY),
        width: Math.max(1, Math.ceil(cellWidth - insetX * 2)),
        height: Math.max(1, Math.ceil(cellHeight - insetY * 2))
      });
    }
  }
  return rects;
}

export function sampleCells(
  frame: LuminanceFrame,
  rects: readonly PanelRect[]
): number[] {
  return rects.map((rect) => meanLuminance(frame, rect));
}

export function expectedCellRectCount(profile: PatternProfile): number {
  return cellCount(profile);
}

export function meanLuminance(frame: LuminanceFrame, rect: PanelRect): number {
  const startX = Math.max(0, Math.min(frame.width - 1, rect.x));
  const startY = Math.max(0, Math.min(frame.height - 1, rect.y));
  const endX = Math.max(startX + 1, Math.min(frame.width, rect.x + rect.width));
  const endY = Math.max(startY + 1, Math.min(frame.height, rect.y + rect.height));
  let total = 0;
  let count = 0;
  for (let y = startY; y < endY; y += 1) {
    const row = y * frame.width;
    for (let x = startX; x < endX; x += 1) {
      total += frame.data[row + x] ?? 0;
      count += 1;
    }
  }
  return count === 0 ? 0 : total / count;
}
