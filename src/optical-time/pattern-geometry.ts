import type {PatternProfile} from './pattern-profile.js';

/**
 * Where the lit parts of the panel are, in the panel's own unit square.
 *
 * Shared by the display, which draws them, and by everything that has to find
 * them again in a camera image. A second copy of the gap ratio in a detector
 * would drift from the one the display draws with, and nothing would fail: the
 * corners would simply be found a little way from where they are.
 */

/** Share of each cell left as a gap between neighbouring cells. */
export const PATTERN_CELL_GAP_RATIO = 0.08;

/**
 * The panel's outer corners, named in the display's own orientation.
 *
 * `tl` is the top-left of the pattern as it is drawn, whatever the camera makes
 * of it. Row-major and clockwise on screen, which is the order the unit square
 * uses: (0,0), (1,0), (1,1), (0,1).
 */
export const PATTERN_CORNER_IDS = ['tl', 'tr', 'br', 'bl'] as const;

export type PatternCornerId = (typeof PATTERN_CORNER_IDS)[number];

/**
 * How far the lit outline sits inside the panel square, per axis.
 *
 * Each cell is drawn inset by half a gap, so the outer edge of a corner cell
 * -- the edge a camera sees and a tape measures -- lies half a gap inside the
 * square the cells are laid out on. The data cells along an edge are inset by
 * the same amount, which is why the edge of the changing region and the outer
 * edge of a fiducial lie on one line.
 */
export function litOutlineInset(profile: PatternProfile): {x: number; y: number} {
  return {
    x: PATTERN_CELL_GAP_RATIO / 2 / profile.columns,
    y: PATTERN_CELL_GAP_RATIO / 2 / profile.rows
  };
}
