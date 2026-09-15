import {describe, expect, it} from 'vitest';
import golden from './fixtures/optical-time/detector-golden.json';
import {
  CellLevels,
  PanelRangeAccumulator,
  PATTERN_PROFILE_V1,
  encodePatternCells,
  patternCellRects,
  sampleCells,
  type LuminanceFrame,
  type PanelRect
} from '../src/optical-time/index.js';

const v1 = PATTERN_PROFILE_V1;
const {width: WIDTH, height: HEIGHT, background, light, dark, panel: PANEL, codes} = golden.scene;

function render(code: number | undefined, options: {panel?: PanelRect; gain?: number} = {}): LuminanceFrame {
  const area = options.panel ?? PANEL;
  const gain = options.gain ?? 1;
  const data = new Uint8Array(WIDTH * HEIGHT).fill(background);
  if (code === undefined) return {width: WIDTH, height: HEIGHT, data};
  const cells = encodePatternCells(code, v1);
  const cellWidth = area.width / v1.columns;
  const cellHeight = area.height / v1.rows;
  for (let row = 0; row < v1.rows; row += 1) {
    for (let column = 0; column < v1.columns; column += 1) {
      const value = Math.round((cells[row * v1.columns + column] ? light : dark) * gain);
      const startX = Math.round(area.x + column * cellWidth);
      const startY = Math.round(area.y + row * cellHeight);
      for (let y = startY; y < startY + cellHeight; y += 1) {
        for (let x = startX; x < startX + cellWidth; x += 1) {
          data[y * WIDTH + x] = Math.max(0, Math.min(255, value));
        }
      }
    }
  }
  return {width: WIDTH, height: HEIGHT, data};
}

function accumulate(frames: readonly LuminanceFrame[]): PanelRangeAccumulator {
  const accumulator = new PanelRangeAccumulator(WIDTH, HEIGHT);
  for (const frame of frames) accumulator.add(frame);
  return accumulator;
}

describe('panel detection against the extraction source', () => {
  it('finds the same panel rectangle', () => {
    const detection = accumulate(codes.map((code) => render(code))).detect(v1);
    expect(detection.ok).toBe(true);
    if (detection.ok) expect(detection.panel).toEqual(golden.detectedPanel);
  });

  it('lays out the same cell rectangles', () => {
    expect(patternCellRects(golden.detectedPanel, v1)).toEqual(golden.cellRects);
  });

  it('samples the same cell values', () => {
    const values = sampleCells(render(golden.sample.code), golden.cellRects);
    expect(values.map((value) => Number(value.toFixed(6)))).toEqual(golden.sample.values);
  });

  it('decodes the sampled frame to the same code', () => {
    const levels = new CellLevels(v1);
    for (const code of codes) levels.add(sampleCells(render(code), golden.cellRects));
    expect(levels.decode(sampleCells(render(golden.sample.code), golden.cellRects))).toBe(
      golden.decodedSample
    );
  });
});

describe('panel detection refusals', () => {
  it('needs more than one frame', () => {
    const accumulator = new PanelRangeAccumulator(WIDTH, HEIGHT);
    accumulator.add(render(0));
    expect(accumulator.detect(v1)).toEqual({ok: false, reason: 'too-few-frames'});
  });

  it('reports a still scene as having no changing region', () => {
    const detection = accumulate([render(undefined), render(undefined)]).detect(v1);
    expect(detection).toEqual({ok: false, reason: 'no-changing-region'});
  });

  it('refuses a scene with a second panel of comparable size', () => {
    // A second display, a reflection or a window. The extraction source took
    // the larger region and said nothing, so the reading came from whichever
    // happened to win, with nothing in the result to say which.
    const wide = 160;
    const tall = 80;
    const places: PanelRect[] = [
      {x: 8, y: 16, width: 48, height: 48},
      {x: 104, y: 16, width: 48, height: 48}
    ];
    const accumulator = new PanelRangeAccumulator(wide, tall);
    codes.forEach((code, index) => {
      const data = new Uint8Array(wide * tall).fill(background);
      places.forEach((place, placeIndex) => {
        const shown = placeIndex === 0 ? code : codes[(index + 5) % codes.length];
        const cells = encodePatternCells(shown ?? 0, v1);
        const cellWidth = place.width / v1.columns;
        const cellHeight = place.height / v1.rows;
        for (let row = 0; row < v1.rows; row += 1) {
          for (let column = 0; column < v1.columns; column += 1) {
            const value = cells[row * v1.columns + column] ? light : dark;
            const startX = Math.round(place.x + column * cellWidth);
            const startY = Math.round(place.y + row * cellHeight);
            for (let y = startY; y < startY + cellHeight; y += 1) {
              for (let x = startX; x < startX + cellWidth; x += 1) data[y * wide + x] = value;
            }
          }
        }
      });
      accumulator.add({width: wide, height: tall, data});
    });
    expect(accumulator.detect(v1)).toEqual({ok: false, reason: 'ambiguous'});
  });

  it('accepts a second region that is clearly smaller', () => {
    const frames = codes.map((code) => {
      const frame = render(code);
      const data = new Uint8Array(frame.data);
      // A small blinking indicator in the corner, far below the panel's size.
      const on = code % 2 === 0;
      for (let y = 2; y < 6; y += 1) {
        for (let x = 2; x < 6; x += 1) data[y * WIDTH + x] = on ? 240 : 10;
      }
      return {width: WIDTH, height: HEIGHT, data};
    });
    const detection = accumulate(frames).detect(v1);
    expect(detection.ok).toBe(true);
  });

  it('refuses a panel too small to carry the profile', () => {
    const tiny: PanelRect = {x: 40, y: 30, width: 8, height: 8};
    const detection = accumulate(codes.map((code) => render(code, {panel: tiny}))).detect(v1, {
      minimumCellPixels: 4
    });
    expect(detection).toEqual({ok: false, reason: 'too-small'});
  });

  it('refuses a region whose shape cannot be the panel', () => {
    const wide: PanelRect = {x: 4, y: 30, width: 88, height: 12};
    const detection = accumulate(codes.map((code) => render(code, {panel: wide}))).detect(v1);
    expect(detection.ok).toBe(false);
    if (!detection.ok) expect(detection.reason).toBe('wrong-shape');
  });

  it('rejects a frame of the wrong size', () => {
    const accumulator = new PanelRangeAccumulator(WIDTH, HEIGHT);
    expect(() => accumulator.add({width: 8, height: 8, data: new Uint8Array(64)})).toThrowError(
      /frame but the decoder is analysing/
    );
  });
});

describe('cell levels', () => {
  function learned(options?: {gain?: number}): {levels: CellLevels; rects: typeof golden.cellRects} {
    const levels = new CellLevels(v1);
    for (const code of codes) {
      levels.add(sampleCells(render(code, options), golden.cellRects));
    }
    return {levels, rects: golden.cellRects};
  }

  it('learns a usable contrast from clean frames', () => {
    expect(learned().levels.contrast()).toBeCloseTo(golden.contrast, 6);
  });

  it('survives a single blown frame that the extremes would have absorbed', () => {
    // One frame of glare used to set a cell's high level for the whole session,
    // widening the band until it stopped rejecting mixed exposures.
    const levels = new CellLevels(v1);
    for (const code of codes) levels.add(sampleCells(render(code), golden.cellRects));
    for (let repeat = 0; repeat < 30; repeat += 1) {
      for (const code of codes) levels.add(sampleCells(render(code), golden.cellRects));
    }
    const clean = levels.contrast();
    levels.add(new Array(16).fill(255));
    levels.add(new Array(16).fill(0));
    expect(levels.contrast()).toBeCloseTo(clean, 6);
  });

  it('publishes how much room the weakest cell had to spare', () => {
    const {levels} = learned();
    const good = levels.decodeMargin(sampleCells(render(golden.sample.code), golden.cellRects));
    expect(good).toBeGreaterThan(0);
    const midpoint = levels.snapshot().map((level) => (level.low + level.high) / 2);
    expect(levels.decodeMargin(midpoint)).toBeLessThan(0);
  });

  it('rejects a reading that sits in the band between the levels', () => {
    const {levels} = learned();
    const midpoint = levels.snapshot().map((level) => (level.low + level.high) / 2);
    expect(levels.decode(midpoint)).toBeUndefined();
  });

  it('follows a slow change in brightness', () => {
    const {levels} = learned();
    let decoded = 0;
    for (let step = 0; step < 200; step += 1) {
      const gain = 1 - step * 0.001;
      for (const code of codes) {
        const values = sampleCells(render(code, {gain}), golden.cellRects);
        if (levels.decode(values) === code) decoded += 1;
        levels.track(values);
      }
    }
    expect(decoded).toBe(200 * codes.length);
  });

  it('will not let a run of unreadable frames walk the levels across the band', () => {
    const {levels} = learned();
    const before = levels.snapshot();
    const midpoint = before.map((level) => (level.low + level.high) / 2);
    for (let repeat = 0; repeat < 500; repeat += 1) levels.track(midpoint);
    // Nothing decoded, so nothing moved.
    expect(levels.snapshot()).toEqual(before);
  });

  it('keeps every band the right way round while tracking', () => {
    const {levels} = learned();
    for (let repeat = 0; repeat < 100; repeat += 1) {
      for (const code of codes) {
        levels.track(sampleCells(render(code, {gain: 0.4}), golden.cellRects));
      }
    }
    for (const level of levels.snapshot()) expect(level.high).toBeGreaterThan(level.low);
  });
});

describe('solidity', () => {
  it('refuses a long thin band that fills its own corners but not its box', () => {
    // A strip light or a reflection running diagonally. Its corner
    // quadrilateral is filled completely, so the quadrilateral bound alone
    // accepts it; the bounding box it occupies is almost empty.
    const size = 120;
    const accumulator = new PanelRangeAccumulator(size, size);
    for (let step = 0; step < 8; step += 1) {
      const data = new Uint8Array(size * size).fill(background);
      const on = step % 2 === 0;
      for (let index = 10; index < 110; index += 1) {
        for (let thickness = 0; thickness < 6; thickness += 1) {
          data[index * size + index + thickness] = on ? 240 : 10;
        }
      }
      accumulator.add({width: size, height: size, data});
    }
    const detection = accumulator.detect(v1);
    expect(detection.ok).toBe(false);
    if (!detection.ok) expect(detection.reason).toBe('not-solid');
  });

  it('still accepts a panel the camera sees rotated', () => {
    const size = 120;
    const accumulator = new PanelRangeAccumulator(size, size);
    for (let step = 0; step < 8; step += 1) {
      const data = new Uint8Array(size * size).fill(background);
      const on = step % 2 === 0;
      // A square turned 45 degrees fills half its bounding box.
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          if (Math.abs(x - 60) + Math.abs(y - 60) <= 40) {
            data[y * size + x] = on ? 240 : 10;
          }
        }
      }
      accumulator.add({width: size, height: size, data});
    }
    const detection = accumulator.detect(v1);
    expect(detection.ok ? 'ok' : detection.reason).toBe('ok');
  });
});
