import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {LocalMonotonicClock, SessionClock} from '../src/clock/index.js';
import {
  cameraSourceCalibrationKey,
  cameraSourceRuntimeKey,
  type CameraLease
} from '../src/camera/camera-source.js';
import {
  invertRigidTransform,
  parsePlacementObservation,
  parsePlacementResult,
  parseReferenceDefinition,
  rotationOf,
  translationOf,
  type CapturedFrame,
  type FramePumpPort,
  type ReferenceDefinition
} from '../src/contracts/index.js';
import {angleBetweenDeg} from '../src/placement/index.js';
import {
  PATTERN_PROFILE_V1,
  PATTERN_PROFILE_V2,
  applyHomography,
  decodePatternCells,
  patternCodeForTimestamp,
  type OpticalTimeController,
  type Point,
  type RegionReader
} from '../src/optical-time/index.js';
import {TimeSpaceSyncExtension} from '../src/extension.js';
import {
  createScene,
  displayThroughCamera,
  lookAt,
  quadToQuad,
  type SyntheticScene
} from './support/synthetic-camera.js';

beforeEach(() => {
  vi.stubGlobal('Scratch', {
    BlockType: {COMMAND: 'command', REPORTER: 'reporter', BOOLEAN: 'Boolean'},
    ArgumentType: {STRING: 'string', NUMBER: 'number'},
    Cast: {
      toString: (value: unknown) => String(value),
      toNumber: (value: unknown) => Number(value),
      toBoolean: (value: unknown) => Boolean(value)
    },
    translate: (message: string) => message
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const FRAME_US = 33_333;
const INTRINSICS = {fx: 1000, fy: 1000, cx: 640, cy: 360, skew: 0};
/** A 3.2 m projection thrown slightly keystoned onto the wall: x right, y down, z into it. */
const WALL_OUTLINE = [
  {x: 0, y: 0},
  {x: 3.2, y: 0.04},
  {x: 3.17, y: 1.83},
  {x: 0.02, y: 1.8}
] as const;
const DISPLAY_TO_WALL = quadToQuad(
  [
    {x: 0, y: 0},
    {x: 1920, y: 0},
    {x: 1920, y: 1080},
    {x: 0, y: 1080}
  ],
  [...WALL_OUTLINE] as unknown as Parameters<typeof quadToQuad>[1]
);
const PANEL_CENTRE: [number, number, number] = [1.6, 0.92, 0];
const LEFT_TRUTH = lookAt([0.1, 1.3, -2.1], PANEL_CENTRE);
const RIGHT_TRUTH = lookAt([3.1, 0.5, -2.3], PANEL_CENTRE, 20);

interface CameraApp {
  readonly extension: TimeSpaceSyncExtension;
  readonly runtime: TurboWarpRuntime;
  readonly scene: SyntheticScene;
  readonly disposed: ReturnType<typeof vi.fn>;
  readonly readers: () => number;
  readonly profiles: Map<string, unknown>;
  deliver(count: number): void;
  advance(microseconds: number): void;
  flush(): Promise<void>;
  fire(event: string): void;
  /** Replaces the corner windows' reader for measurements started afterwards. */
  setReader(reader: RegionReader | undefined): void;
}

const scenes = new Map<string, SyntheticScene>();
function sceneFor(name: string, cameraFromWall: number[]): SyntheticScene {
  let scene = scenes.get(name);
  if (!scene) {
    scene = createScene({
      displayToSource: displayThroughCamera(INTRINSICS, cameraFromWall, DISPLAY_TO_WALL),
      blurSigmaPx: 1.2,
      noiseSigma: 3,
      seed: name.length
    });
    scenes.set(name, scene);
  }
  return scene;
}

function cameraApp(
  options: {
    cameraId?: string;
    truth?: number[];
    calibration?: boolean;
    controller?: OpticalTimeController;
  } = {}
): CameraApp {
  const cameraId = options.cameraId ?? 'camera-left';
  const scene = sceneFor(cameraId, options.truth ?? LEFT_TRUTH);
  let clockUs = 1_737_000_000_000_000;
  let handler: ((frame: CapturedFrame) => void) | undefined;
  const handlers = new Map<string, () => void>();
  const disposed = vi.fn();
  let readerCount = 0;
  let replacement: RegionReader | undefined;
  const profiles = new Map<string, unknown>();
  profiles.set(cameraId, {
    profileId: `cal-${cameraId}`,
    cameraId,
    distortion: {model: 'none', coefficients: []},
    image: {width: 1280, height: 720, undistorted: false}
  });
  const lease: CameraLease = {
    getFrameSource: () => ({
      kind: 'video',
      element: {} as HTMLVideoElement,
      width: 1280,
      height: 720,
      previewFlip: 'none',
      deviceId: 'device-1'
    }),
    release: async () => undefined
  };
  const runtime = {
    on: vi.fn((event: string, listener: () => void) => handlers.set(event, listener)),
    [cameraSourceRuntimeKey]: {acquireCamera: async () => lease}
  } as unknown as TurboWarpRuntime;
  if (options.calibration !== false) {
    // The shape Camera Source 0.7.0 publishes when its calibration flag is on.
    const capability = {
      version: 1,
      requireVersion: () => capability,
      profileFor: (id: string) => profiles.get(id),
      intrinsicsFor: (id: string) =>
        profiles.has(id)
          ? {...INTRINSICS, width: 1280, height: 720, scale: 1, adaptation: 'exact'}
          : undefined
    };
    (runtime as unknown as Record<string, unknown>)[cameraSourceCalibrationKey] = capability;
  }
  const local = new LocalMonotonicClock({id: `local:${cameraId}`, now: () => clockUs});
  const pump: FramePumpPort = {
    start: (next) => {
      handler = next;
    },
    stop: () => {
      handler = undefined;
    }
  };
  const extension = new TimeSpaceSyncExtension({
    runtime,
    opticalTimeEnabled: true,
    placementEnabled: true,
    clock: new SessionClock(local),
    ...(options.controller ? {controller: options.controller} : {}),
    createFramePump: () => pump,
    createRegionReader: () => {
      readerCount += 1;
      const inner = replacement ?? scene.reader();
      return {read: (region) => inner.read(region), dispose: disposed};
    },
    schedule: () => () => undefined
  });
  return {
    extension,
    runtime,
    scene,
    disposed,
    readers: () => readerCount,
    profiles,
    setReader: (next) => {
      replacement = next;
    },
    advance(microseconds) {
      clockUs += microseconds;
    },
    deliver(count) {
      for (let index = 0; index < count; index += 1) {
        clockUs += FRAME_US;
        // The display runs on its own clock; which one does not matter here,
        // only that the code advances with real time.
        const code = patternCodeForTimestamp(clockUs, PATTERN_PROFILE_V2);
        handler?.({
          luminance: scene.analysisFrame(code),
          deliveredAtUs: clockUs,
          monotonicAtUs: clockUs,
          captureTimeKind: 'none',
          sourceWidth: 1280,
          sourceHeight: 720
        });
      }
    },
    flush: () => new Promise((resolve) => setTimeout(resolve, 0)),
    fire(event) {
      handlers.get(event)?.();
    }
  };
}

async function startDecoder(app: CameraApp, cameraId = 'camera-left'): Promise<void> {
  app.extension.setTimePatternProfile({PROFILE_ID: 'twtss.pattern.v2'});
  const started = app.extension.startOpticalTimeDecoder({
    CAMERA_ID: cameraId,
    REFERENCE_ID: 'wall-projection',
    SECONDS: 7,
    REFRESH_US: 16_667
  });
  await app.flush();
  app.deliver(Math.ceil(7_000_000 / FRAME_US) + 2);
  await started;
}

async function measure(app: CameraApp, seconds = 1): Promise<void> {
  const measuring = app.extension.measurePatternCorners({SECONDS: seconds});
  app.deliver(Math.ceil((seconds * 1_000_000) / FRAME_US) + 1);
  await measuring;
}

describe('choosing the pattern profile', () => {
  it('starts on v1 and switches to v2 before anything exists', () => {
    const {extension} = cameraApp();
    expect(extension.timePatternProfileId()).toBe('twtss.pattern.v1');
    extension.setTimePatternProfile({PROFILE_ID: 'twtss.pattern.v2'});
    expect(extension.timePatternProfileId()).toBe('twtss.pattern.v2');
    expect(extension.timePatternProfileError()).toBe('');
  });

  it('refuses an id it does not know and changes nothing', () => {
    const {extension} = cameraApp();
    extension.setTimePatternProfile({PROFILE_ID: 'twtss.pattern.v9'});
    expect(extension.timePatternProfileError()).toBe('unknown-pattern-profile');
    expect(extension.timePatternProfileId()).toBe('twtss.pattern.v1');
  });

  it('decodes v2 through the quad path once chosen, and then refuses to change', async () => {
    const app = cameraApp();
    await startDecoder(app);
    expect(app.extension.opticalTimeDecoderState()).toBe('ready');
    expect(app.extension.opticalTimeDecodeRate()).toBeGreaterThan(0.9);
    app.extension.takeOpticalTimeObservation();
    const observation = JSON.parse(app.extension.latestOpticalTimeObservationJson()) as {
      patternProfileId: string;
    };
    expect(observation.patternProfileId).toBe('twtss.pattern.v2');

    app.extension.setTimePatternProfile({PROFILE_ID: 'twtss.pattern.v1'});
    expect(app.extension.timePatternProfileError()).toBe('pattern-profile-in-use');
    expect(app.extension.timePatternProfileId()).toBe('twtss.pattern.v2');
    // Choosing what is already in use is not a change, and is not refused.
    app.extension.setTimePatternProfile({PROFILE_ID: 'twtss.pattern.v2'});
    expect(app.extension.timePatternProfileError()).toBe('');
  });

  it('draws the v2 pattern, fiducials lit, once chosen, and then refuses to change', () => {
    const painted: Array<{style: string}> = [];
    const context = {
      fillStyle: '',
      fillRect() {
        painted.push({style: context.fillStyle});
      }
    };
    let frame: (() => void) | undefined;
    vi.stubGlobal('document', {
      createElement: () => ({
        style: {cssText: ''},
        width: 0,
        height: 0,
        clientWidth: 1920,
        clientHeight: 1080,
        getContext: () => context,
        remove: () => undefined
      }),
      body: {append: () => undefined},
      addEventListener: () => undefined,
      removeEventListener: () => undefined
    });
    vi.stubGlobal('requestAnimationFrame', (callback: () => void) => {
      frame = callback;
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
    const app = cameraApp();
    app.extension.setTimePatternProfile({PROFILE_ID: 'twtss.pattern.v2'});
    app.extension.acknowledgePatternFlashing();
    app.extension.showTimePattern();
    for (let index = 0; index < 12; index += 1) {
      const next = frame;
      frame = undefined;
      app.advance(16_667);
      next?.();
    }
    expect(app.extension.timePatternStable()).toBe(true);
    const cells = painted.slice(-37).slice(1).map((entry) => entry.style === '#ffffff');
    expect(cells).toHaveLength(36);
    for (const index of PATTERN_PROFILE_V2.fiducials) expect(cells[index]).toBe(true);
    expect(decodePatternCells(cells, PATTERN_PROFILE_V2)).toBeDefined();

    app.extension.setTimePatternProfile({PROFILE_ID: 'twtss.pattern.v1'});
    expect(app.extension.timePatternProfileError()).toBe('pattern-profile-in-use');
    app.extension.hideTimePattern();
  });

  it('lets the next run choose again once the project stops', async () => {
    const app = cameraApp();
    await startDecoder(app);
    app.fire('PROJECT_STOP_ALL');
    expect(app.extension.timePatternProfileId()).toBe('twtss.pattern.v1');
    app.extension.setTimePatternProfile({PROFILE_ID: 'twtss.pattern.v2'});
    expect(app.extension.timePatternProfileError()).toBe('');
  });
});

describe('measuring the pattern corners through the blocks', () => {
  it('publishes a placement observation of the four corners', async () => {
    const app = cameraApp();
    await startDecoder(app);
    await measure(app);
    expect(app.extension.patternCornerError()).toBe('');
    const json = app.extension.patternCornerObservationJson();
    const parsed = parsePlacementObservation(JSON.parse(json));
    if (!parsed.ok) throw new Error('observation does not parse');
    const observation = parsed.value;
    expect(observation.cameraId).toBe('camera-left');
    expect(observation.referenceId).toBe('wall-projection');
    expect(observation.intrinsicProfileId).toBe('cal-camera-left');
    expect(observation.imageWidth).toBe(1280);
    expect(observation.imageHeight).toBe(720);
    expect(observation.imagePoints.map((point) => point.id)).toEqual(['tl', 'tr', 'br', 'bl']);
    observation.imagePoints.forEach((point, index) => {
      const truth = app.scene.trueCorners[index] as Point;
      expect(Math.hypot(point.u - truth.x, point.v - truth.y)).toBeLessThan(0.2);
    });
    expect(app.extension.patternCornerSpreadPx()).toBeGreaterThan(0);
    expect(app.extension.patternCornerSpreadPx()).toBeLessThan(0.5);
    expect(app.disposed).toHaveBeenCalledTimes(app.readers());
  });

  it('refuses before the decoder is running', async () => {
    const app = cameraApp();
    await app.extension.measurePatternCorners({SECONDS: 1});
    expect(app.extension.patternCornerError()).toBe('decoder-not-running');
    expect(app.extension.patternCornerObservationJson()).toBe('');
  });

  it('refuses a running decoder whose profile has no fiducials', async () => {
    const controller = {
      state: () => 'ready',
      patternProfile: () => PATTERN_PROFILE_V1,
      stop: async () => undefined
    } as unknown as OpticalTimeController;
    const app = cameraApp({controller});
    await app.extension.measurePatternCorners({SECONDS: 1});
    expect(app.extension.patternCornerError()).toBe('profile-without-fiducials');
  });

  it('refuses a camera with no calibration profile', async () => {
    const app = cameraApp({calibration: false});
    await startDecoder(app);
    await measure(app);
    expect(app.extension.patternCornerError()).toBe('intrinsic-profile-missing');
    expect(app.readers()).toBe(0);
  });

  it('refuses when the profile is replaced during the window', async () => {
    const app = cameraApp();
    await startDecoder(app);
    const measuring = app.extension.measurePatternCorners({SECONDS: 1});
    app.deliver(10);
    app.profiles.set('camera-left', {
      profileId: 'cal-camera-left-2',
      distortion: {model: 'none', coefficients: []}
    });
    app.deliver(30);
    await measuring;
    expect(app.extension.patternCornerError()).toBe('intrinsic-profile-mismatch');
    expect(app.extension.patternCornerObservationJson()).toBe('');
  });

  it('clears the previous observation when a measurement fails', async () => {
    const app = cameraApp();
    await startDecoder(app);
    await measure(app);
    expect(app.extension.patternCornerObservationJson()).not.toBe('');
    app.setReader({read: () => undefined});
    await measure(app);
    expect(app.extension.patternCornerError()).toBe('too-few-corner-frames');
    expect(app.extension.patternCornerObservationJson()).toBe('');
  });

  it('settles with an error when the decoder is stopped mid-measurement', async () => {
    const app = cameraApp();
    await startDecoder(app);
    const measuring = app.extension.measurePatternCorners({SECONDS: 3});
    app.deliver(5);
    await app.extension.stopOpticalTimeDecoder();
    await measuring;
    expect(app.extension.patternCornerError()).toBe('decoder-not-running');
    expect(app.extension.patternCornerObservationJson()).toBe('');
    expect(app.readers()).toBe(1);
    expect(app.disposed).toHaveBeenCalledTimes(1);
  });

  it('settles with an error when the decoder recalibrates mid-measurement', async () => {
    const app = cameraApp();
    await startDecoder(app);
    const measuring = app.extension.measurePatternCorners({SECONDS: 3});
    app.deliver(5);
    const recalibrating = app.extension.calibrateOpticalTimeDecoder({SECONDS: 7});
    await measuring;
    expect(app.extension.patternCornerError()).toBe('decoder-not-running');
    expect(app.disposed).toHaveBeenCalledTimes(1);
    app.deliver(Math.ceil(7_000_000 / FRAME_US) + 2);
    await recalibrating;
  });

  it('settles with an error when the project stops mid-measurement', async () => {
    const app = cameraApp();
    await startDecoder(app);
    const measuring = app.extension.measurePatternCorners({SECONDS: 3});
    app.deliver(5);
    app.fire('PROJECT_STOP_ALL');
    await measuring;
    expect(app.extension.patternCornerError()).toBe('decoder-not-running');
    expect(app.disposed).toHaveBeenCalledTimes(1);
    // Nothing is left following the camera: further frames change nothing.
    app.deliver(100);
    expect(app.readers()).toBe(1);
  });
});

describe('the pattern reference block', () => {
  function reference(corners: string, sigma: unknown = 0.002, by = 'tape'): string {
    const {extension} = cameraApp();
    return extension.patternReferenceJson({
      REFERENCE_ID: 'wall-projection',
      CORNERS: corners,
      SIGMA_METERS: sigma,
      MEASURED_BY: by
    });
  }

  it('builds a projection reference with the corner names the observation uses', () => {
    const parsed = parseReferenceDefinition(JSON.parse(reference('0,0;0.7,0.004;0.698,0.702;-0.002,0.7')));
    if (!parsed.ok) throw new Error('reference does not parse');
    expect(parsed.value.kind).toBe('projection');
    expect(parsed.value.points.map((point) => point.id)).toEqual(['tl', 'tr', 'br', 'bl']);
    expect(parsed.value.points.every((point) => point.z === 0)).toBe(true);
    expect(parsed.value.planarityResidualMeters).toBe(0);
  });

  it('reports zero rectangularity for a rotated rectangle and the offset for a trapezoid', () => {
    const angle = 0.3;
    const rotate = (x: number, y: number) =>
      `${x * Math.cos(angle) - y * Math.sin(angle)},${x * Math.sin(angle) + y * Math.cos(angle)}`;
    const rectangle = JSON.parse(
      reference([rotate(0, 0), rotate(1.2, 0), rotate(1.2, 0.7), rotate(0, 0.7)].join(';'))
    ) as ReferenceDefinition;
    expect(rectangle.rectangularityResidualMeters).toBeLessThan(1e-6);
    // A projector tilted up throws an isosceles trapezoid, whose diagonals are
    // equal; the best-fit rectangle still sees it.
    const trapezoid = JSON.parse(reference('0,0;1,0;1.1,1;-0.1,1')) as ReferenceDefinition;
    expect(trapezoid.rectangularityResidualMeters).toBeCloseTo(Math.hypot(0.05, 0), 6);
    // Axes with y up describe the same corners the other way round.
    const yUp = JSON.parse(reference('0,1;1,1;1.1,0;-0.1,0')) as ReferenceDefinition;
    expect(yUp.rectangularityResidualMeters).toBeCloseTo(0.05, 6);
  });

  it('returns nothing for malformed or impossible input', () => {
    expect(reference('0,0;1,0;1,1')).toBe('');
    expect(reference('0,0;1,0;1,1;0,x')).toBe('');
    expect(reference('0,0;1,0;1,1;0,')).toBe('');
    expect(reference('0,0;1,0;1,1;0,Infinity')).toBe('');
    // Two corners swapped: the outline crosses itself.
    expect(reference('0,0;1,1;1,0;0,1')).toBe('');
    expect(reference('0,0;1,0;1,1;0,1', 'wide')).toBe('');
    expect(reference('0,0;1,0;1,1;0,1', '')).toBe('');
    expect(reference('0,0;1,0;1,1;0,1', -1)).toBe('');
    expect(reference('0,0;1,0;1,1;0,1', 0.002, 'guess')).toBe('');
    expect(reference('0,0;1,0;1,1;0,1', 0, 'nominal')).toBe('');
  });
});

describe('camera models', () => {
  it("refuses Camera Source's intrinsics JSON, which states no distortion", () => {
    const app = cameraApp();
    app.extension.setCameraModel({
      CAMERA_ID: 'camera-left',
      MODEL_JSON: JSON.stringify({...INTRINSICS, width: 1280, height: 720, scale: 1, adaptation: 'exact'})
    });
    expect(app.extension.placementError()).toBe('unsupported-distortion-model');
  });

  it('accepts the model built from the registered profile', () => {
    const app = cameraApp();
    const json = app.extension.cameraModelJson({CAMERA_ID: 'camera-left'});
    expect(JSON.parse(json)).toEqual({
      intrinsics: INTRINSICS,
      distortion: {model: 'none', coefficients: []},
      intrinsicProfileId: 'cal-camera-left',
      imageWidth: 1280,
      imageHeight: 720
    });
    app.extension.setCameraModel({CAMERA_ID: 'camera-left', MODEL_JSON: json});
    expect(app.extension.placementError()).toBe('');
  });

  it('reports no model for a camera without a profile or without the capability', () => {
    expect(cameraApp().extension.cameraModelJson({CAMERA_ID: 'other'})).toBe('');
    expect(cameraApp({calibration: false}).extension.cameraModelJson({CAMERA_ID: 'camera-left'})).toBe('');
  });

  it('refuses a distortion model the solve cannot undo when it is set', () => {
    const app = cameraApp();
    app.extension.setCameraModel({
      CAMERA_ID: 'camera-left',
      MODEL_JSON: JSON.stringify({
        intrinsics: INTRINSICS,
        distortion: {model: 'kannala-brandt', coefficients: [0, 0, 0, 0]}
      })
    });
    expect(app.extension.placementError()).toBe('unsupported-distortion-model');
  });
});

describe('one projected pattern places a rig', () => {
  it('recovers both camera poses from measured corners and a taped reference', async () => {
    const left = cameraApp({cameraId: 'camera-left', truth: LEFT_TRUTH});
    const right = cameraApp({cameraId: 'camera-right', truth: RIGHT_TRUTH});
    const messages: Array<{cameraId: string; model: string; observation: string}> = [];
    for (const [app, cameraId] of [
      [left, 'camera-left'],
      [right, 'camera-right']
    ] as const) {
      await startDecoder(app, cameraId);
      await measure(app, 2);
      expect(app.extension.patternCornerError()).toBe('');
      // What each camera computer sends to the fusion computer.
      messages.push({
        cameraId,
        model: app.extension.cameraModelJson({CAMERA_ID: cameraId}),
        observation: app.extension.patternCornerObservationJson()
      });
    }

    // The operator tapes the outer corners of the lit corner cells on the wall.
    const wallCorners = left.scene.displayCorners.map(
      (corner) => applyHomography(DISPLAY_TO_WALL, corner.x, corner.y) as Point
    );
    const fusion = cameraApp({cameraId: 'fusion', calibration: false}).extension;
    const referenceJson = fusion.patternReferenceJson({
      REFERENCE_ID: 'wall-projection',
      CORNERS: wallCorners.map((corner) => `${corner.x.toFixed(4)},${corner.y.toFixed(4)}`).join(';'),
      SIGMA_METERS: 0.002,
      MEASURED_BY: 'tape'
    });
    fusion.defineReference({REFERENCE_JSON: referenceJson});
    expect(fusion.placementError()).toBe('');
    for (const message of messages) {
      fusion.setCameraModel({CAMERA_ID: message.cameraId, MODEL_JSON: message.model});
      expect(fusion.placementError()).toBe('');
      fusion.addPlacementObservation({OBSERVATION_JSON: message.observation});
      expect(fusion.placementError()).toBe('');
    }
    fusion.solvePlacement({RIG_ID: 'studio'});
    expect(fusion.placementError()).toBe('');
    const result = parsePlacementResult(JSON.parse(fusion.placementResultJson()));
    if (!result.ok) throw new Error('placement result does not parse');

    for (const [cameraId, truth] of [
      ['camera-left', LEFT_TRUTH],
      ['camera-right', RIGHT_TRUTH]
    ] as const) {
      const camera = result.value.cameras.find((entry) => entry.cameraId === cameraId);
      if (!camera) throw new Error(`${cameraId} was not placed`);
      const solvedCentre = translationOf(invertRigidTransform(camera.cameraFromReference));
      const trueCentre = translationOf(invertRigidTransform(truth));
      const centreError = Math.hypot(
        ...solvedCentre.map((value, index) => value - (trueCentre[index] as number))
      );
      expect(centreError).toBeLessThan(0.01);
      expect(angleBetweenDeg(rotationOf(camera.cameraFromReference), rotationOf(truth))).toBeLessThan(0.2);
      expect(camera.reprojectionRmsPx).toBeLessThan(0.3);
    }
  });
});
