/**
 * Conventions every contract in this package obeys.
 *
 * These are recorded as values, not only prose, because the failures they
 * prevent are silent. A pose handed over in the wrong direction is still a
 * valid rigid transform, and a reprojection error computed from it can stay
 * small; a length read as centimetres is still a number. Nothing downstream
 * raises, and the result is merely wrong.
 */

/**
 * Transform names read `<target>From<source>`: `cameraFromReference` maps a
 * point expressed in the reference frame into the camera frame. Points are
 * column vectors, so composing reads right to left.
 *
 * `worldFrom...` is deliberately absent from this package. A world frame is a
 * claim that several cameras share one origin, and nothing here establishes
 * that; the reference frame is whatever physical object was solved against.
 */
export const TRANSFORM_NAMING = 'targetFromSource' as const;

/**
 * 4x4 rigid transforms travel as 16 numbers in row-major order, so indices
 * 3, 7 and 11 hold the translation and indices 12..15 are `0, 0, 0, 1`.
 */
export const MATRIX_LAYOUT = 'row-major' as const;

/** Camera axes follow OpenCV: X right, Y down, Z forward along the view. */
export const CAMERA_AXES = 'x-right-y-down-z-forward' as const;

/** Lengths are metres, angles are degrees, times and durations are microseconds. */
export const LENGTH_UNIT = 'meter' as const;
export const ANGLE_UNIT = 'degree' as const;
export const TIME_UNIT = 'microsecond' as const;

/**
 * Image points are expressed in unmirrored source pixels: the pixels a canvas
 * receives when it draws the video element, with the origin at the top-left
 * corner of the first pixel and Y increasing downwards.
 *
 * A preview may be presented mirrored. That is a rendering transform and it
 * never reaches these coordinates. Feeding preview coordinates into a solve
 * converges on a left-right reflected pose whose reprojection error stays
 * small, so the mistake does not show up in the quality figures.
 */
export const IMAGE_COORDINATE_FRAME = 'unmirrored-source' as const;
