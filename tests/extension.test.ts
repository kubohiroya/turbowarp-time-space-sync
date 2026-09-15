import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {TimeSpaceSyncExtension} from '../src/extension.js';
import {runtimeCapabilityKey} from '../src/runtime-capability.js';
import {errorCodeOf} from '../src/contracts/index.js';
import definitions from '../src/block-definitions.json';

beforeEach(() => {
  vi.stubGlobal('Scratch', {
    BlockType: {COMMAND: 'command', REPORTER: 'reporter', BOOLEAN: 'Boolean'},
    ArgumentType: {STRING: 'string', NUMBER: 'number'},
    Cast: {
      toString: (value: unknown) => String(value),
      toNumber: (value: unknown) => Number(value),
      toBoolean: (value: unknown) => Boolean(value)
    },
    translate: (message: string | {default: string}) =>
      typeof message === 'string' ? message : message.default
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function runtime(): TurboWarpRuntime {
  return {on: vi.fn()} as unknown as TurboWarpRuntime;
}

describe('block surface', () => {
  it('publishes no blocks while the feature is off', () => {
    // The flag is the whole opt-in. An extension loaded without it must not
    // offer a palette that cannot be used.
    const info = new TimeSpaceSyncExtension({runtime: runtime()}).getInfo() as {
      blocks: unknown[];
    };
    expect(info.blocks).toEqual([]);
  });

  it('publishes the optical time blocks when the feature is on', () => {
    const info = new TimeSpaceSyncExtension({
      runtime: runtime(),
      opticalTimeEnabled: true
    }).getInfo() as {name: string; blocks: Array<{opcode: string; text: string}>};
    expect(info.name).toBe('TurboWarp-Time-Space-Sync');
    // Only the optical time blocks: each feature is opted into on its own.
    expect(info.blocks).toHaveLength(
      definitions.blocks.filter((block) => block.feature === 'opticalTimeSyncV1').length
    );
    expect(info.blocks.map((block) => block.opcode)).toContain('showTimePattern');
  });

  it('documents every block it defines', () => {
    for (const block of definitions.blocks) {
      expect(block.description.length).toBeGreaterThan(0);
      expect(block.text.length).toBeGreaterThan(0);
    }
  });

  it('implements every opcode it publishes', () => {
    const extension = new TimeSpaceSyncExtension({
      runtime: runtime(),
      opticalTimeEnabled: true,
      placementEnabled: true
    }) as unknown as Record<string, unknown>;
    for (const block of definitions.blocks) {
      expect(typeof extension[block.opcode]).toBe('function');
    }
  });

  it('publishes documentation and a self-contained SVG block icon', () => {
    const info = new TimeSpaceSyncExtension({runtime: runtime()}).getInfo() as {
      docsURI: string;
      blockIconURI: string;
    };
    expect(info.docsURI).toBe('https://kubohiroya.github.io/turbowarp-time-space-sync/');
    expect(info.blockIconURI).toMatch(/^data:image\/svg\+xml;base64,/);
  });
});

describe('feature gating', () => {
  it('refuses to act when the feature is off', () => {
    const extension = new TimeSpaceSyncExtension({runtime: runtime()});
    expect(() => extension.showTimePattern()).toThrowError(/disabled/);
    expect(() => extension.acknowledgePatternFlashing()).toThrowError(/disabled/);
  });

  it('reports a quiet idle state rather than throwing from reporters', () => {
    // A reporter that throws stops the script that read it, and an idle
    // decoder is not an error.
    const extension = new TimeSpaceSyncExtension({runtime: runtime()});
    expect(extension.opticalTimeDecoderState()).toBe('idle');
    expect(extension.opticalTimeDecoderError()).toBe('');
    expect(extension.opticalTimeObservationAvailable()).toBe(false);
    expect(extension.latestOpticalTimeObservationJson()).toBe('');
  });
});

describe('photosensitivity gate', () => {
  it('will not show the pattern before the flashing is acknowledged', () => {
    const extension = new TimeSpaceSyncExtension({
      runtime: runtime(),
      opticalTimeEnabled: true
    });
    try {
      extension.showTimePattern();
      expect.unreachable('should have refused');
    } catch (error) {
      expect(errorCodeOf(error)).toBe('photosensitivity-unacknowledged');
    }
  });
});

describe('runtime capability', () => {
  it('publishes itself under a versioned key', () => {
    const host = runtime();
    new TimeSpaceSyncExtension({runtime: host, opticalTimeEnabled: true});
    const capability = host[runtimeCapabilityKey] as {
      version: number;
      requireVersion(version: number): unknown;
      patternProfile(): {id: string};
    };
    expect(capability.version).toBe(1);
    expect(capability.requireVersion(1)).toBe(capability);
    expect(capability.patternProfile().id).toBe('twtss.pattern.v1');
  });

  it('refuses a version it does not implement', () => {
    const host = runtime();
    new TimeSpaceSyncExtension({runtime: host, opticalTimeEnabled: true});
    const capability = host[runtimeCapabilityKey] as {requireVersion(version: number): unknown};
    expect(() => capability.requireVersion(2)).toThrowError(/Unsupported/);
  });

  it('is published even while the feature is off, so a consumer gets a clear refusal', () => {
    const host = runtime();
    new TimeSpaceSyncExtension({runtime: host});
    expect(host[runtimeCapabilityKey]).toBeDefined();
  });
});

describe('project lifetime', () => {
  it('subscribes to the events that must take the camera and overlay down', () => {
    const host = runtime();
    new TimeSpaceSyncExtension({runtime: host, opticalTimeEnabled: true});
    const events = (host.on as unknown as {mock: {calls: unknown[][]}}).mock.calls.map(
      (call) => call[0]
    );
    expect(events).toEqual(['PROJECT_STOP_ALL', 'PROJECT_LOADED', 'RUNTIME_DISPOSED']);
  });
});

describe('estimation through the blocks', () => {
  it('reports no estimate and no error before one is attempted', () => {
    const extension = new TimeSpaceSyncExtension({runtime: runtime()});
    expect(extension.timeCorrespondenceJson()).toBe('');
    expect(extension.timeCorrespondenceError()).toBe('');
    expect(extension.timeCorrespondenceCurrent()).toBe(false);
  });

  it('records why an estimate could not be made', () => {
    const extension = new TimeSpaceSyncExtension({
      runtime: runtime(),
      opticalTimeEnabled: true
    });
    extension.estimateTimeCorrespondence();
    expect(extension.timeCorrespondenceError()).toBe('insufficient-points');
    expect(extension.timeCorrespondenceJson()).toBe('');
    // Not zero because the delay is zero: zero because there is no answer. The
    // error reporter is what tells the two apart.
    expect(extension.displayToTimestampDelayUs()).toBe(0);
  });
});

describe('placement through the blocks', () => {
  function enabled() {
    return new TimeSpaceSyncExtension({
      runtime: runtime(),
      opticalTimeEnabled: true,
      placementEnabled: true
    });
  }

  it('keeps the placement blocks out of the palette while the feature is off', () => {
    const info = new TimeSpaceSyncExtension({
      runtime: runtime(),
      opticalTimeEnabled: true
    }).getInfo() as {blocks: Array<{opcode: string}>};
    const opcodes = info.blocks.map((block) => block.opcode);
    expect(opcodes).toContain('showTimePattern');
    expect(opcodes).not.toContain('solvePlacement');
  });

  it('refuses to act on placement while the feature is off', () => {
    const extension = new TimeSpaceSyncExtension({runtime: runtime()});
    expect(() => extension.solvePlacement({RIG_ID: 'rig'})).toThrowError(/disabled/);
  });

  it('records a reference that does not parse as such', () => {
    const extension = enabled();
    extension.defineReference({REFERENCE_JSON: 'not json'});
    expect(extension.placementError()).toBe('invalid-payload');
  });

  it('says which piece is missing before anything can be solved', () => {
    const extension = enabled();
    extension.solvePlacement({RIG_ID: 'rig'});
    expect(extension.placementError()).toBe('reference-unknown');
    expect(extension.placementResultJson()).toBe('');
  });

  it('forgets everything on request', () => {
    const extension = enabled();
    extension.defineReference({REFERENCE_JSON: 'not json'});
    extension.clearPlacement();
    expect(extension.placementError()).toBe('');
    expect(extension.placementReprojectionRms({CAMERA_ID: 'any'})).toBe(0);
  });
});
