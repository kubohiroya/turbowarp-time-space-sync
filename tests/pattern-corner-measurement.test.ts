import {describe, expect, it, vi} from 'vitest';
import {TimeSpaceSyncError} from '../src/contracts/index.js';
import {
  MAXIMUM_CORNER_SPREAD_PX,
  MINIMUM_CORNER_FRAMES,
  PATTERN_PROFILE_V1,
  PATTERN_PROFILE_V2,
  measurePatternCorners,
  type DecodedFrame,
  type DecodedFrameListener,
  type DisposableRegionReader,
  type Quad,
  type ReadingContinuity,
  type RegionReader
} from '../src/optical-time/index.js';
import {createScene, panelSeenAs, type SyntheticScene} from './support/synthetic-camera.js';

const FRAME_US = 33_333;

function square(cx: number, cy: number, half: number): Quad {
  return [
    {x: cx - half, y: cy - half},
    {x: cx + half, y: cy - half},
    {x: cx + half, y: cy + half},
    {x: cx - half, y: cy + half}
  ];
}

let sharedScene: SyntheticScene | undefined;
function scene(): SyntheticScene {
  sharedScene ??= createScene({displayToSource: panelSeenAs(square(640, 360, 220)), seed: 21});
  return sharedScene;
}

/** A decoder that is running, reduced to the frames it hands to a follower. */
function harness(options: {reader?: () => RegionReader} = {}) {
  let nowUs = 5_000_000;
  let listener: DecodedFrameListener | undefined;
  let subscriptions = 0;
  const disposed = vi.fn();
  const cancelled = vi.fn();
  let armed: (() => void) | undefined;
  const quad = detectedQuad();
  const source = {
    observeFrames: (next: DecodedFrameListener) => {
      listener = next;
      subscriptions += 1;
      return () => {
        listener = undefined;
      };
    }
  };
  return {
    source,
    clock: {nowUs: () => nowUs},
    createReader: (): DisposableRegionReader => {
      const inner = options.reader?.() ?? scene().reader();
      return {read: (region) => inner.read(region), dispose: disposed};
    },
    schedule: (callback: () => void) => {
      armed = callback;
      return () => {
        armed = undefined;
        cancelled();
      };
    },
    disposed,
    cancelled,
    fireWatchdog: () => armed?.(),
    watchdogArmed: () => armed !== undefined,
    listening: () => listener !== undefined,
    subscriptions: () => subscriptions,
    deliver(continuity: ReadingContinuity = 'continuous', count = 1, extra: Partial<DecodedFrame['frame']> = {}): void {
      for (let index = 0; index < count; index += 1) {
        nowUs += FRAME_US;
        const event: DecodedFrame = {
          frame: {
            luminance: {width: 240, height: 180, data: new Uint8Array(0)},
            deliveredAtUs: 1_737_000_000_000_000 + nowUs,
            monotonicAtUs: nowUs,
            captureTimeKind: 'none',
            sourceWidth: 1280,
            sourceHeight: 720,
            ...extra
          },
          quad,
          analysisWidth: 240,
          analysisHeight: 180,
          continuity
        };
        listener?.frame(event);
      }
    },
    end(): void {
      listener?.ended(new TimeSpaceSyncError('decoder-not-running', 'stopped'));
    }
  };
}

/** The panel square as the analysis path would report it, near but not on the truth. */
function detectedQuad(): Quad {
  // 220 source px half-size around (640, 360), in analysis pixel-index units,
  // nudged by a pixel so the refinement has something to correct.
  const sx = 1280 / 240;
  const sy = 720 / 180;
  return [
    {x: 420 / sx - 0.5 + 0.6, y: 140 / sy - 0.5 - 0.4},
    {x: 860 / sx - 0.5 - 0.5, y: 140 / sy - 0.5 + 0.3},
    {x: 860 / sx - 0.5 + 0.2, y: 580 / sy - 0.5 + 0.5},
    {x: 420 / sx - 0.5 - 0.7, y: 580 / sy - 0.5 - 0.2}
  ];
}

function start(h: ReturnType<typeof harness>, seconds = 1, profile = PATTERN_PROFILE_V2) {
  return measurePatternCorners({
    source: h.source,
    profile,
    seconds,
    clock: h.clock,
    createReader: h.createReader,
    schedule: h.schedule
  });
}

describe('measuring the corners over a window', () => {
  it('aggregates the frames into corners within a tenth of a pixel', async () => {
    const h = harness();
    const running = start(h);
    h.deliver('continuous', 31);
    const result = await running.result;
    if (!result.ok) throw new Error(`${result.code}: ${result.message}`);
    const {measurement} = result;
    measurement.corners.forEach((corner, index) => {
      const truth = scene().trueCorners[index];
      expect(Math.hypot(corner.x - (truth?.x ?? 0), corner.y - (truth?.y ?? 0))).toBeLessThan(0.15);
    });
    expect(measurement.frameCount).toBeGreaterThanOrEqual(MINIMUM_CORNER_FRAMES);
    expect(measurement.spreadPx).toBeLessThan(MAXIMUM_CORNER_SPREAD_PX);
    expect(measurement.sourceWidth).toBe(1280);
    expect(Number.isSafeInteger(measurement.capturedAtUs)).toBe(true);
  });

  it('releases the reader, the listener and the watchdog once it concludes', async () => {
    const h = harness();
    const running = start(h);
    h.deliver('continuous', 31);
    await running.result;
    expect(h.disposed).toHaveBeenCalledTimes(1);
    expect(h.listening()).toBe(false);
    expect(h.watchdogArmed()).toBe(false);
    expect(h.cancelled).toHaveBeenCalled();
  });

  it('refuses a window in which too few frames gave four corners', async () => {
    const h = harness({reader: () => ({read: () => undefined})});
    const running = start(h);
    h.deliver('continuous', 31);
    const result = await running.result;
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('too-few-corner-frames');
      expect(result.message).toMatch(/outside-image/);
    }
  });

  it('refuses corners that moved during the window and says by how much', async () => {
    let reads = 0;
    const h = harness({
      reader: () => {
        const inner = scene().reader();
        return {
          read: (region) => {
            // Every other frame's windows come back shifted, as if the camera
            // were knocked back and forth.
            const frame = Math.floor(reads++ / 4);
            const shift = frame % 2 === 0 ? 0 : 2;
            return inner.read({...region, x: region.x + shift});
          }
        };
      }
    });
    const running = start(h);
    h.deliver('continuous', 31);
    const result = await running.result;
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('corners-unstable');
      expect(result.spreadPx).toBeGreaterThan(MAXIMUM_CORNER_SPREAD_PX);
    }
  });

  it('refuses to name corners when the readings do not advance with real time', async () => {
    // A mirrored view passes the check bits for one code in eight, but its
    // readings do not follow each other: the names would be mirrored too.
    const h = harness();
    const running = start(h);
    for (let index = 0; index < 31; index += 1) {
      h.deliver(index % 8 === 0 ? 'discontinuous' : 'no-reading');
    }
    const result = await running.result;
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('orientation-unproven');
  });

  it('refuses a mostly discontinuous run even with a few lucky readings', async () => {
    const h = harness();
    const running = start(h);
    for (let index = 0; index < 31; index += 1) {
      h.deliver(index % 5 === 0 ? 'continuous' : 'discontinuous');
    }
    const result = await running.result;
    expect(result.ok ? '' : result.code).toBe('orientation-unproven');
  });
});

describe('preconditions and cancellation', () => {
  it('refuses a profile without fiducials before following anything', async () => {
    const h = harness();
    const result = await start(h, 1, PATTERN_PROFILE_V1).result;
    expect(result.ok ? '' : result.code).toBe('profile-without-fiducials');
    expect(h.subscriptions()).toBe(0);
  });

  it('refuses a window outside the accepted range', async () => {
    for (const seconds of [0, 0.5, 61, Number.NaN]) {
      const result = await start(harness(), seconds).result;
      expect(result.ok ? '' : result.code).toBe('invalid-duration');
    }
  });

  it('reports a decoder that is not running as such', async () => {
    const h = harness();
    const result = await measurePatternCorners({
      source: {
        observeFrames: () => {
          throw new TimeSpaceSyncError('decoder-not-running', 'not ready');
        }
      },
      profile: PATTERN_PROFILE_V2,
      seconds: 1,
      clock: h.clock,
      createReader: h.createReader,
      schedule: h.schedule
    }).result;
    expect(result.ok ? '' : result.code).toBe('decoder-not-running');
    expect(h.watchdogArmed()).toBe(false);
  });

  it('settles when the decoder ends underneath it, releasing everything', async () => {
    const h = harness();
    const running = start(h, 3);
    h.deliver('continuous', 5);
    h.end();
    const result = await running.result;
    expect(result.ok ? '' : result.code).toBe('decoder-not-running');
    expect(h.disposed).toHaveBeenCalledTimes(1);
    expect(h.watchdogArmed()).toBe(false);
    expect(h.listening()).toBe(false);
  });

  it('settles on cancel and ignores frames that arrive afterwards', async () => {
    const h = harness();
    const running = start(h, 3);
    h.deliver('continuous', 3);
    running.cancel('decoder-not-running', 'stopped');
    h.deliver('continuous', 100);
    const result = await running.result;
    expect(result.ok ? '' : result.code).toBe('decoder-not-running');
    expect(h.disposed).toHaveBeenCalledTimes(1);
  });

  it('gives up when the camera stops delivering', async () => {
    const h = harness();
    const running = start(h, 3);
    h.deliver('continuous', 2);
    h.fireWatchdog();
    const result = await running.result;
    expect(result.ok ? '' : result.code).toBe('camera-ended');
    expect(h.listening()).toBe(false);
  });

  it('refuses a camera that changes resolution mid-window', async () => {
    const h = harness();
    const running = start(h);
    h.deliver('continuous', 3);
    h.deliver('continuous', 1, {sourceWidth: 640, sourceHeight: 360});
    const result = await running.result;
    expect(result.ok ? '' : result.code).toBe('frame-size-mismatch');
  });
});
