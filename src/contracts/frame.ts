/**
 * Frames as they reach the decoder.
 *
 * These types carry a typed array and only ever live inside one runtime, so
 * they have no JSON Schema. What crosses a boundary is the observation derived
 * from them.
 */

export interface LuminanceFrame {
  readonly width: number;
  readonly height: number;
  /** Row-major luminance, one byte per pixel. */
  readonly data: Uint8Array;
}

/**
 * Where a frame's capture time came from.
 *
 * `capture` is the camera's own capture instant, which browsers report for
 * some sources and not others. `presentation` is when the user agent submitted
 * the frame for composition, which is a different quantity: it sits near the
 * delivery time, so a latency computed from it is close to zero regardless of
 * the real capture latency. `none` means the browser reported neither.
 *
 * The three are kept apart because collapsing them is how the extraction source
 * reported "no latency" for ordinary local cameras.
 */
export type CaptureTimeKind = 'capture' | 'presentation' | 'none';

export interface CapturedFrame {
  readonly luminance: LuminanceFrame;
  /**
   * The shared clock read inside the frame callback, before any pixel work.
   *
   * Reading it later — after downscaling and luminance conversion — moves the
   * reference point by the cost of that work, which then hides inside any
   * latency computed against it.
   */
  readonly deliveredAtUs: number;
  /** The monotonic clock read at the same instant, for durations and deadlines. */
  readonly monotonicAtUs: number;
  /**
   * The capture instant, in the same clock as `deliveredAtUs`, when the browser
   * reported one. Absent rather than zero when it did not: an absent
   * measurement and a measured zero lead to different decisions.
   */
  readonly captureTimeUs?: number;
  readonly captureTimeKind: CaptureTimeKind;
  readonly sourceWidth: number;
  readonly sourceHeight: number;
}

export interface FramePumpPort {
  start(handler: (frame: CapturedFrame) => void): void;
  stop(): void;
}
