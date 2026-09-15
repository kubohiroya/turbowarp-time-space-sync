import {describe, expect, it} from 'vitest';
import {
  PatternDisplay,
  PATTERN_PROFILE_V1,
  blankCells,
  decodePatternCells,
  drawPattern,
  encodePatternCells,
  patternCodeForTimestamp,
  type PatternProfile,
  type PatternSurface,
  type PhotosensitivityAcknowledgement
} from '../src/optical-time/index.js';
import {errorCodeOf, type MonotonicClockPort} from '../src/contracts/index.js';

const v1 = PATTERN_PROFILE_V1;
const REFRESH_US = 16_667;
const acknowledged: PhotosensitivityAcknowledgement = {
  acknowledgedByOperator: true,
  acknowledgedAtUs: 1_737_000_000_000_000
};

interface Painted {
  style: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

function surface(): {context: PatternSurface; painted: Painted[]} {
  const painted: Painted[] = [];
  const context: PatternSurface = {
    fillStyle: '',
    fillRect(x, y, width, height) {
      painted.push({style: context.fillStyle, x, y, width, height});
    }
  };
  return {context, painted};
}

function harness(options: {profile?: PatternProfile; startUs?: number} = {}) {
  const {context, painted} = surface();
  let nowUs = options.startUs ?? 1_737_000_000_000_000;
  const clock: MonotonicClockPort = {nowUs: () => nowUs};
  const listeners = new Map<string, Array<(event: unknown) => void>>();
  let visibilityState = 'visible';
  let attached = 0;
  const canvas = {
    style: {cssText: ''},
    width: 0,
    height: 0,
    clientWidth: 1920,
    clientHeight: 1080,
    getContext: () => context,
    remove: () => {
      attached -= 1;
    }
  };
  const documentRef = {
    createElement: () => canvas,
    body: {
      append: () => {
        attached += 1;
      }
    },
    addEventListener: (type: string, listener: (event: unknown) => void) => {
      const bucket = listeners.get(type) ?? [];
      bucket.push(listener);
      listeners.set(type, bucket);
    },
    removeEventListener: (type: string, listener: (event: unknown) => void) => {
      listeners.set(type, (listeners.get(type) ?? []).filter((entry) => entry !== listener));
    },
    get visibilityState() {
      return visibilityState;
    }
  } as unknown as Document;

  let pending: (() => void) | undefined;
  const hidden: string[] = [];
  const display = new PatternDisplay({
    clock,
    profile: options.profile ?? v1,
    acknowledgement: acknowledged,
    documentRef,
    requestFrame: (callback) => {
      pending = callback;
      return 1;
    },
    cancelFrame: () => {
      pending = undefined;
    },
    devicePixelRatio: () => 1,
    onHidden: (reason) => hidden.push(reason)
  });

  return {
    display,
    painted,
    hidden,
    attachedCount: () => attached,
    advance(count = 1, intervalUs = REFRESH_US): void {
      for (let step = 0; step < count; step += 1) {
        nowUs += intervalUs;
        const callback = pending;
        pending = undefined;
        callback?.();
      }
    },
    nowUs: () => nowUs,
    fire(type: string, event: unknown): void {
      for (const listener of listeners.get(type) ?? []) listener(event);
    },
    setVisibility(state: string): void {
      visibilityState = state;
    },
    listenerCount: (type: string) => (listeners.get(type) ?? []).length
  };
}

/** Reads the cell states back out of what was painted. */
function paintedCells(painted: readonly Painted[], profile: PatternProfile): boolean[] {
  const cells = painted.slice(-profile.columns * profile.rows);
  return cells.map((entry) => entry.style === '#ffffff');
}

describe('photosensitivity acknowledgement', () => {
  it('refuses to construct a display without one', () => {
    try {
      new PatternDisplay({
        clock: {nowUs: () => 0},
        profile: v1,
        acknowledgement: {acknowledgedByOperator: false, acknowledgedAtUs: 0} as never
      });
      expect.unreachable('should have refused');
    } catch (error) {
      expect(errorCodeOf(error)).toBe('photosensitivity-unacknowledged');
    }
  });

  it('refuses an acknowledgement with no time on it', () => {
    expect(
      () =>
        new PatternDisplay({
          clock: {nowUs: () => 0},
          profile: v1,
          acknowledgement: {
            acknowledgedByOperator: true,
            acknowledgedAtUs: Number.NaN
          }
        })
    ).toThrowError(/acknowledged/);
  });
});

describe('refresh estimation', () => {
  it('shows nothing decodable until the refresh interval is measured', () => {
    // The extraction source assumed 4 ms until it had samples, so on a 60 Hz
    // display its first frames encoded a time about 12.7 ms early.
    const h = harness();
    h.display.show();
    h.advance(6);
    expect(h.display.stable()).toBe(false);
    expect(h.display.shownCode()).toBeUndefined();
    expect(decodePatternCells(paintedCells(h.painted, v1), v1)).toBeUndefined();
  });

  it('starts encoding once enough intervals agree', () => {
    const h = harness();
    h.display.show();
    h.advance(12);
    expect(h.display.stable()).toBe(true);
    expect(h.display.refreshUs()).toBe(REFRESH_US);
    expect(h.display.shownCode()).toBeDefined();
  });

  it('encodes the instant the frame will actually reach the screen', () => {
    const h = harness();
    h.display.show();
    h.advance(12);
    expect(h.display.shownCode()).toBe(
      patternCodeForTimestamp(h.nowUs() + REFRESH_US, v1)
    );
  });

  it('paints a decodable pattern that reads back as the shown code', () => {
    const h = harness();
    h.display.show();
    h.advance(12);
    expect(decodePatternCells(paintedCells(h.painted, v1), v1)).toBe(h.display.shownCode());
  });

  it('measures a 24 Hz display, which the source discarded every sample from', () => {
    const slow = 41_667;
    const h = harness();
    h.display.show();
    h.advance(12, slow);
    expect(h.display.refreshUs()).toBe(slow);
  });

  it('ignores an interval too long to be a refresh', () => {
    const h = harness();
    h.display.show();
    h.advance(12);
    const before = h.display.refreshUs();
    h.advance(1, 5_000_000);
    expect(h.display.refreshUs()).toBe(before);
  });
});

describe('taking the overlay down', () => {
  it('blanks the panel when the page stops being shown', () => {
    // A hidden page stops receiving animation frames, so one code would stay
    // frozen on screen. A frozen panel still decodes, and the reading would be
    // a stale time carrying full confidence.
    const h = harness();
    h.display.show();
    h.advance(12);
    h.setVisibility('hidden');
    h.fire('visibilitychange', {});
    expect(h.display.visible()).toBe(false);
    expect(h.hidden).toEqual(['page-hidden']);
  });

  it('stays up while the page is merely reported visible again', () => {
    const h = harness();
    h.display.show();
    h.setVisibility('visible');
    h.fire('visibilitychange', {});
    expect(h.display.visible()).toBe(true);
  });

  it('comes down on Escape, which is the only way a person can dismiss it', () => {
    const h = harness();
    h.display.show();
    h.fire('keydown', {key: 'Escape'});
    expect(h.display.visible()).toBe(false);
    expect(h.hidden).toEqual(['escape-key']);
  });

  it('ignores other keys', () => {
    const h = harness();
    h.display.show();
    h.fire('keydown', {key: 'a'});
    expect(h.display.visible()).toBe(true);
  });

  it('removes its listeners and its canvas when hidden', () => {
    const h = harness();
    h.display.show();
    expect(h.attachedCount()).toBe(1);
    expect(h.listenerCount('keydown')).toBe(1);
    h.display.hide();
    expect(h.attachedCount()).toBe(0);
    expect(h.listenerCount('keydown')).toBe(0);
    expect(h.listenerCount('visibilitychange')).toBe(0);
  });

  it('is safe to hide twice and to show twice', () => {
    const h = harness();
    h.display.show();
    h.display.show();
    expect(h.attachedCount()).toBe(1);
    h.display.hide();
    h.display.hide();
    expect(h.hidden).toEqual(['requested']);
  });

  it('forgets its refresh estimate across a hide and show', () => {
    const h = harness();
    h.display.show();
    h.advance(12);
    expect(h.display.stable()).toBe(true);
    h.display.hide();
    h.display.show();
    expect(h.display.stable()).toBe(false);
  });
});

describe('drawing', () => {
  it('never paints a blank panel as a valid code', () => {
    expect(decodePatternCells(blankCells(v1), v1)).toBeUndefined();
  });

  it('never paints a blank panel as a valid code under a differential profile', () => {
    const differential: PatternProfile = {
      id: 'twtss.pattern.v2',
      columns: 6,
      rows: 6,
      dataBits: 12,
      checkBits: 4,
      stepUs: 1000,
      encoding: 'differential',
      sampling: 'quad',
      fiducials: []
    };
    expect(decodePatternCells(blankCells(differential), differential)).toBeUndefined();
  });

  it('keeps the panel well inside the viewport by default', () => {
    const {context, painted} = surface();
    drawPattern(context, 1920, 1080, encodePatternCells(1234, v1), {
      profile: v1,
      panelScale: 0.35,
      palette: {light: '#ffffff', dark: '#000000', surround: '#000000'}
    });
    const cells = painted.slice(1);
    const left = Math.min(...cells.map((entry) => entry.x));
    const right = Math.max(...cells.map((entry) => entry.x + entry.width));
    expect(right - left).toBeLessThan(1080 * 0.36);
    expect(left).toBeGreaterThan(0);
  });

  it('paints every cell, so a cell covers the same area in either state', () => {
    const {context, painted} = surface();
    drawPattern(context, 800, 600, encodePatternCells(0, v1), {
      profile: v1,
      panelScale: 0.35,
      palette: {light: '#ffffff', dark: '#000000', surround: '#202020'}
    });
    expect(painted).toHaveLength(1 + v1.columns * v1.rows);
    expect(painted[0]?.style).toBe('#202020');
  });
});
