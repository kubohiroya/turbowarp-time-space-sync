import {createHash} from 'node:crypto';
import {describe, expect, it} from 'vitest';
import golden from './fixtures/optical-time/pattern-golden.json';
import {
  decodePatternCells,
  encodePatternCells,
  litCellCount,
  patternCheckBits,
  patternCodeForTimestamp,
  patternTimestampUs
} from '../src/optical-time/pattern.js';
import {
  cellCount,
  codeCount,
  minimumObservationUs,
  PATTERN_PROFILE_V1,
  requireUsableProfile,
  wrapUs,
  type PatternProfile
} from '../src/optical-time/pattern-profile.js';

const v1 = PATTERN_PROFILE_V1;

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function cellsText(cells: readonly (boolean | undefined)[]): string {
  return cells.map((cell) => (cell === undefined ? '?' : cell ? '1' : '0')).join('');
}

function parseCells(text: string): (boolean | undefined)[] {
  return [...text].map((character) =>
    character === '?' ? undefined : character === '1'
  );
}

describe('pattern v1 against the extraction source', () => {
  it('keeps the published profile constants', () => {
    expect({
      id: v1.id,
      columns: v1.columns,
      rows: v1.rows,
      cellCount: cellCount(v1),
      dataBits: v1.dataBits,
      checkBits: v1.checkBits,
      stepUs: v1.stepUs,
      codeCount: codeCount(v1),
      wrapUs: wrapUs(v1)
    }).toEqual(golden.profile);
  });

  it('reproduces the check bits of every code', () => {
    const line: number[] = [];
    for (let code = 0; code < codeCount(v1); code += 1) line.push(patternCheckBits(code, v1));
    expect(sha256(line.join(','))).toBe(golden.checkBitsSha256);
  });

  it('reproduces the cell layout of every code', () => {
    const line: string[] = [];
    for (let code = 0; code < codeCount(v1); code += 1) {
      line.push(cellsText(encodePatternCells(code, v1)));
    }
    expect(sha256(line.join(','))).toBe(golden.cellsSha256);
  });

  it('reproduces the sampled codes', () => {
    for (const sample of golden.samples) {
      expect(patternCheckBits(sample.code, v1)).toBe(sample.check);
      expect(cellsText(encodePatternCells(sample.code, v1))).toBe(sample.cells);
    }
  });

  it('reproduces the wrap boundaries, including negative timestamps', () => {
    for (const entry of golden.timestamps) {
      expect(patternCodeForTimestamp(entry.timestampUs, v1)).toBe(entry.code);
    }
  });

  it('reproduces the decode verdicts', () => {
    for (const entry of golden.decode) {
      expect(decodePatternCells(parseCells(entry.cells), v1) ?? null).toBe(entry.code);
    }
  });
});

describe('pattern v1 properties', () => {
  it('round trips every code', () => {
    for (let code = 0; code < codeCount(v1); code += 1) {
      expect(decodePatternCells(encodePatternCells(code, v1), v1)).toBe(code);
    }
  });

  it('maps a decoded code back to a time inside the wrap window', () => {
    expect(patternTimestampUs(0, v1)).toBe(0);
    expect(patternTimestampUs(codeCount(v1) - 1, v1)).toBe(wrapUs(v1) - v1.stepUs);
  });

  it('rejects every single-cell error', () => {
    for (const code of [0, 1, 42, 2047, 4095]) {
      const cells = encodePatternCells(code, v1);
      for (let index = 0; index < cells.length; index += 1) {
        const flipped = [...cells];
        flipped[index] = !flipped[index];
        expect(decodePatternCells(flipped, v1)).not.toBe(code);
      }
    }
  });

  it('lets exactly 255 multi-cell error patterns through, as the source did', () => {
    // The check is a fold of the counter onto itself, so it is linear over
    // GF(2): any data error whose folded value is zero leaves the check bits
    // untouched. Flipping bit 0 together with bit 4 is the smallest example.
    // This is a property of the encoding, not a defect to be fixed here, and it
    // is why a decoder needs a continuity gate on top of the check.
    let undetected = 0;
    for (let error = 1; error < codeCount(v1); error += 1) {
      if (patternCheckBits(error, v1) === patternCheckBits(0, v1)) undetected += 1;
    }
    expect(undetected).toBe(golden.undetectedDataErrorPatterns);
    expect(undetected).toBe(255);
  });

  it('rejects a reading with an unreadable cell', () => {
    const cells = encodePatternCells(1234, v1);
    const doubtful: (boolean | undefined)[] = [...cells];
    doubtful[5] = undefined;
    expect(decodePatternCells(doubtful, v1)).toBeUndefined();
  });

  it('rejects a reading of the wrong size', () => {
    expect(decodePatternCells(encodePatternCells(7, v1).slice(0, 15), v1)).toBeUndefined();
  });

  it('needs half a wrap period for every cell to change', () => {
    expect(minimumObservationUs(v1)).toBe(wrapUs(v1) / 2);
  });
});

describe('pattern profiles', () => {
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

  it('keeps the lit cell count constant for a differential profile', () => {
    // A constant lit count means the panel's total output does not change from
    // one code to the next, which is what removes the whole-panel flicker.
    const counts = new Set<number>();
    for (let code = 0; code < codeCount(differential); code += 1) {
      counts.add(litCellCount(code, differential));
    }
    expect([...counts]).toEqual([differential.dataBits + differential.checkBits]);
  });

  it('does not keep it constant for the absolute v1 profile', () => {
    const counts = new Set<number>();
    for (let code = 0; code < codeCount(v1); code += 1) counts.add(litCellCount(code, v1));
    expect(counts.size).toBeGreaterThan(1);
  });

  it('round trips every code under a differential profile', () => {
    for (let code = 0; code < codeCount(differential); code += 1) {
      expect(decodePatternCells(encodePatternCells(code, differential), differential)).toBe(code);
    }
  });

  it('rejects a differential pair that reads the same way in both cells', () => {
    const cells: (boolean | undefined)[] = [...encodePatternCells(77, differential)];
    cells[1] = cells[0];
    expect(decodePatternCells(cells, differential)).toBeUndefined();
  });

  it('refuses a grid too small for the encoding', () => {
    expect(() => requireUsableProfile({...differential, columns: 4, rows: 4})).toThrowError(
      /needs 32/
    );
  });

  it('refuses a profile with no check bits', () => {
    expect(() => requireUsableProfile({...v1, checkBits: 0})).toThrowError(/check bits/);
  });
});
