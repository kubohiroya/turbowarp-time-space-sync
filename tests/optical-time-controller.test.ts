import {describe, expect, it, vi} from 'vitest';
import golden from './fixtures/optical-time/detector-golden.json';
import {LocalMonotonicClock, SessionClock} from '../src/clock/index.js';
import {
  CAMERA_SOURCE_EXTENSION_KEY,
  type CameraFrameSourcePort,
  type CameraLeasePort
} from '../src/camera/camera-source.js';
import {
  OpticalTimeController,
  PATTERN_PROFILE_V1,
  captureTimeOf,
  encodePatternCells,
  type LuminanceFrame
} from '../src/optical-time/index.js';
import {
  parseOpticalTimeObservation,
  type CapturedFrame,
  type FramePumpPort
} from '../src/contracts/index.js';

const v1 = PATTERN_PROFILE_V1;
const {width: WIDTH, height: HEIGHT, background, light, dark, panel: PANEL} = golden.scene;
const REFRESH_US = 16_667;
const FRAME_STEP_US = 33_000;
const CALIBRATION_SECONDS = 8;

function render(code: number | undefined): LuminanceFrame {
  const data = new Uint8Array(WIDTH * HEIGHT).fill(background);
  if (code === undefined) return {width: WIDTH, height: HEIGHT, data};
  const cells = encodePatternCells(code, v1);
  const cellWidth = PANEL.width / v1.columns;
  const cellHeight = PANEL.height / v1.rows;
  for (let row = 0; row < v1.rows; row += 1) {
    for (let column = 0; column < v1.columns; column += 1) {
      const value = cells[row * v1.columns + column] ? light : dark;
      const startX = Math.round(PANEL.x + column * cellWidth);
      const startY = Math.round(PANEL.y + row * cellHeight);
      for (let y = startY; y < startY + cellHeight; y += 1) {
        for (let x = startX; x < startX + cellWidth; x += 1) data[y * WIDTH + x] = value;
      }
    }
  }
  return {width: WIDTH, height: HEIGHT, data};
}

function setup(
  options: {
    cameraSource?: boolean;
    acquire?: () => Promise<CameraLeasePort>;
    analysis?: {width: number; height: number};
  } = {}
) {
  const analysis = options.analysis ?? {width: WIDTH, height: HEIGHT};
  let clockUs = 1_737_000_000_000_000;
  let patternCode = 0;
  let handler: ((frame: CapturedFrame) => void) | undefined;
  const released: string[] = [];
  const pump: FramePumpPort = {
    start: vi.fn((next: (frame: CapturedFrame) => void) => {
      handler = next;
    }),
    stop: vi.fn(() => {
      handler = undefined;
    })
  };
  const frameSource = {
    kind: 'video',
    element: {} as HTMLVideoElement,
    width: 1280,
    height: 720,
    deviceId: 'device-1'
  } as CameraFrameSourcePort;
  const makeLease = (name: string): CameraLeasePort => ({
    getFrameSource: () => frameSource,
    release: async () => {
      released.push(name);
    }
  });
  const runtime = {} as TurboWarpRuntime;
  if (options.cameraSource !== false) {
    runtime[CAMERA_SOURCE_EXTENSION_KEY] = {
      acquireCamera: options.acquire ?? (async () => makeLease('lease'))
    };
  }
  const local = new LocalMonotonicClock({id: 'local:test', now: () => clockUs});
  const controller = new OpticalTimeController({
    runtime,
    clock: new SessionClock(local),
    profile: v1,
    createFramePump: () => pump,
    analysisWidth: analysis.width,
    analysisHeight: analysis.height,
    // The watchdog is the last resort for a camera that stopped delivering;
    // these tests drive frames themselves, so it must not fire under them.
    wait: () => new Promise<void>(() => undefined)
  });

  return {
    controller,
    pump,
    released,
    makeLease,
    advance(microseconds: number): void {
      clockUs += microseconds;
    },
    /**
     * Delivers the next frame of a pattern that advances with real time, which
     * is what a running display actually produces.
     */
    deliverNext(extra: Partial<CapturedFrame> = {}): number {
      patternCode = (patternCode + FRAME_STEP_US / v1.stepUs) % 4096;
      clockUs += FRAME_STEP_US;
      handler?.({
        luminance: render(patternCode),
        deliveredAtUs: clockUs,
        monotonicAtUs: clockUs,
        captureTimeKind: 'none',
        sourceWidth: 1280,
        sourceHeight: 720,
        ...extra
      });
      return patternCode;
    },
    patternCode: () => patternCode,
    nowUs: () => clockUs,
    deliver(code: number | undefined, extra: Partial<CapturedFrame> = {}): void {
      clockUs += FRAME_STEP_US;
      handler?.({
        luminance: render(code),
        deliveredAtUs: clockUs,
        monotonicAtUs: clockUs,
        captureTimeKind: 'none',
        sourceWidth: 1280,
        sourceHeight: 720,
        ...extra
      });
    },
    deliverRaw(frame: CapturedFrame): void {
      handler?.(frame);
    },
    ready: () => handler !== undefined
  };
}

/** Lets the pending microtasks of an async start settle before frames arrive. */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

const startOptions = {
  cameraId: 'camera-left',
  referenceId: 'wall-projection',
  calibrationSeconds: CALIBRATION_SECONDS,
  displayRefreshUs: REFRESH_US,
  refreshUncertaintyUs: 120
};

/** Drives a full two-phase calibration with a pattern that runs through its bits. */
async function calibrate(harness: ReturnType<typeof setup>): Promise<void> {
  const started = harness.controller.start(startOptions);
  await flush();
  // 300 frames at 33 ms is just under ten seconds, covering both calibration
  // phases. The step is an odd number of pattern steps so that every data bit
  // toggles; advancing by a multiple of four would freeze the two lowest cells
  // and the panel would calibrate as having no contrast there.
  for (let frame = 0; frame < 300; frame += 1) harness.deliverNext();
  await started;
  // Frames delivered after the controller became ready are real observations;
  // drop them so each test starts from an empty queue.
  harness.controller.drainObservations();
}

describe('optical time controller', () => {
  it('reaches ready and publishes contract-valid observations', async () => {
    const harness = setup();
    await calibrate(harness);
    expect(harness.controller.state()).toBe('ready');
    const code = harness.deliverNext();
    const observation = harness.controller.takeObservation();
    expect(observation).toBeDefined();
    const parsed = parseOpticalTimeObservation(observation);
    expect(parsed.ok).toBe(true);
    expect(observation?.patternCodeTimestampUs).toBe(code * v1.stepUs);
    expect(observation?.cameraId).toBe('camera-left');
    expect(observation?.observerDomain.id).toBe('local:test');
  });

  it('bounds the capture instant by the delivery time', async () => {
    const harness = setup();
    await calibrate(harness);
    harness.deliverNext();
    const observation = harness.controller.takeObservation();
    expect(observation?.constraintHiUs).toBe(observation?.deliveredAtUs);
    // No capture time was reported, so the lower bound is as wide as the wrap
    // can resolve rather than an invented latency.
    expect(observation?.constraintLoUs).toBe(
      (observation?.deliveredAtUs ?? 0) - observation!.wrapUs / 2
    );
  });

  it('uses a reported capture time as the lower bound', async () => {
    const harness = setup();
    await calibrate(harness);
    harness.deliverNext({captureTimeKind: 'capture', captureTimeUs: harness.nowUs() + 50_000});
    const observation = harness.controller.takeObservation();
    expect(observation?.captureTimeKind).toBe('capture');
    expect(observation?.constraintLoUs).toBeGreaterThan(
      (observation?.deliveredAtUs ?? 0) - observation!.wrapUs / 2
    );
  });

  it('refuses to start without a camera ID', async () => {
    const harness = setup();
    await expect(harness.controller.start({...startOptions, cameraId: ' '})).rejects.toThrow();
    expect(harness.controller.errorCode()).toBe('camera-unavailable');
  });

  it('refuses to start without a reference', async () => {
    const harness = setup();
    await expect(harness.controller.start({...startOptions, referenceId: ''})).rejects.toThrow();
    expect(harness.controller.errorCode()).toBe('reference-unknown');
  });

  it('refuses a calibration window too short for every cell to change', async () => {
    const harness = setup();
    await expect(
      harness.controller.start({...startOptions, calibrationSeconds: 1})
    ).rejects.toThrow(/at least once/);
    expect(harness.controller.errorCode()).toBe('invalid-duration');
  });

  it('refuses a display refresh it was not told', async () => {
    const harness = setup();
    await expect(
      harness.controller.start({...startOptions, displayRefreshUs: 0})
    ).rejects.toThrow(/refresh interval/);
  });

  it('reports a missing camera source', async () => {
    const harness = setup({cameraSource: false});
    await expect(harness.controller.start(startOptions)).rejects.toThrow(/Camera Source/);
    expect(harness.controller.errorCode()).toBe('camera-unavailable');
  });

  it('refuses when a second flickering panel is in view', async () => {
    const wide = 160;
    const tall = 80;
    const places = [
      {x: 8, y: 16, width: 48, height: 48},
      {x: 104, y: 16, width: 48, height: 48}
    ];
    const harness = setup({analysis: {width: wide, height: tall}});
    const started = harness.controller.start(startOptions);
    await flush();
    for (let frame = 0; frame < 300; frame += 1) {
      const code = (frame * (FRAME_STEP_US / v1.stepUs)) % 4096;
      const data = new Uint8Array(wide * tall).fill(background);
      places.forEach((place, placeIndex) => {
        // The second panel shows a different code, so both regions change and
        // neither can be dismissed as static background.
        const shown = placeIndex === 0 ? code : (code + 777) % 4096;
        const cells = encodePatternCells(shown, v1);
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
      harness.advance(FRAME_STEP_US);
      harness.deliverRaw({
        luminance: {width: wide, height: tall, data},
        deliveredAtUs: harness.nowUs(),
        monotonicAtUs: harness.nowUs(),
        captureTimeKind: 'none',
        sourceWidth: 1280,
        sourceHeight: 720
      });
    }
    await expect(started).rejects.toThrow(/more than one|More than one/i);
    expect(harness.controller.errorCode()).toBe('ambiguous-panel');
  });
});

describe('cancellation and leases', () => {
  it('releases a camera that arrives after the run was stopped', async () => {
    // Acquiring is asynchronous. Without a generation token the late answer
    // overwrites the stop, and the device stays open for the session.
    const harness = setup();
    let resolveAcquire: ((lease: CameraLeasePort) => void) | undefined;
    const controller = new OpticalTimeController({
      runtime: {
        [CAMERA_SOURCE_EXTENSION_KEY]: {
          acquireCamera: () =>
            new Promise<CameraLeasePort>((resolve) => {
              resolveAcquire = resolve;
            })
        }
      } as unknown as TurboWarpRuntime,
      clock: new SessionClock(new LocalMonotonicClock({id: 'local:test'})),
      profile: v1,
      createFramePump: () => harness.pump,
      wait: () => new Promise<void>(() => undefined)
    });
    const started = controller.start(startOptions);
    await flush();
    await controller.stop();
    resolveAcquire?.(harness.makeLease('late'));
    await started;
    expect(harness.released).toEqual(['late']);
    expect(harness.pump.start).not.toHaveBeenCalled();
  });

  it('treats a stop during calibration as a stop, not a fault', async () => {
    const harness = setup();
    const started = harness.controller.start(startOptions);
    await flush();
    harness.deliver(0);
    await harness.controller.stop();
    await started;
    expect(harness.controller.state()).toBe('idle');
    expect(harness.controller.errorCode()).toBe('');
    expect(harness.released).toEqual(['lease']);
  });

  it('releases the lease when the camera cannot be acquired', async () => {
    const harness = setup({
      acquire: async () => {
        throw new Error('Camera in use.');
      }
    });
    await expect(harness.controller.start(startOptions)).rejects.toThrow(/Camera in use/);
    expect(harness.controller.errorCode()).toBe('camera-unavailable');
  });

  it('is safe to stop twice', async () => {
    const harness = setup();
    await calibrate(harness);
    await harness.controller.stop();
    await harness.controller.stop();
    expect(harness.released).toEqual(['lease']);
  });
});

describe('failures inside the frame callback', () => {
  it('settles calibration instead of escaping into the callback', async () => {
    const harness = setup();
    const started = harness.controller.start(startOptions);
    await flush();
    // A frame of the wrong size: the accumulator refuses it.
    harness.deliverRaw({
      luminance: {width: 8, height: 8, data: new Uint8Array(64)},
      deliveredAtUs: harness.nowUs(),
      monotonicAtUs: harness.nowUs(),
      captureTimeKind: 'none',
      sourceWidth: 8,
      sourceHeight: 8
    });
    await expect(started).rejects.toThrow(/frame but the decoder is analysing/);
    expect(harness.controller.errorCode()).toBe('frame-size-mismatch');
    expect(harness.controller.state()).toBe('error');
  });
});

describe('observation retention', () => {
  it('drops observations by age rather than by count', async () => {
    const harness = setup();
    await calibrate(harness);
    harness.deliverNext();
    expect(harness.controller.pendingObservations()).toBe(1);
    harness.advance(31_000_000);
    expect(harness.controller.pendingObservations()).toBe(0);
    expect(harness.controller.droppedCount()).toBeGreaterThan(0);
  });
});

describe('continuity', () => {
  it('rejects a decode that could not have followed the previous one', async () => {
    const harness = setup();
    await calibrate(harness);
    const code = harness.deliverNext();
    expect(harness.controller.pendingObservations()).toBe(1);
    const rejectedBefore = harness.controller.rejectedCount();
    // 33 ms later the pattern cannot have advanced by two seconds.
    harness.deliver((code + 2000) % 4096);
    expect(harness.controller.rejectedCount()).toBeGreaterThan(rejectedBefore);
  });

  it('accepts a decode consistent with the elapsed time', async () => {
    const harness = setup();
    await calibrate(harness);
    harness.deliverNext();
    const rejectedBefore = harness.controller.rejectedCount();
    harness.deliverNext();
    expect(harness.controller.rejectedCount()).toBe(rejectedBefore);
    expect(harness.controller.pendingObservations()).toBe(2);
  });

  it('rejects a frozen panel, which decodes perfectly', async () => {
    // A hidden page stops producing animation frames and the last code stays on
    // screen. The reading is valid and the time is stale.
    const harness = setup();
    await calibrate(harness);
    const frozen = harness.deliverNext();
    const before = harness.controller.pendingObservations();
    for (let repeat = 0; repeat < 20; repeat += 1) harness.deliver(frozen);
    expect(harness.controller.pendingObservations()).toBe(before);
    expect(harness.controller.rejectedCount()).toBe(20);
  });
});

describe('capture time classification', () => {
  it('keeps a real capture time', () => {
    expect(captureTimeOf(1000, {captureTime: 980}, 5_000_000)).toEqual({
      captureTimeUs: 5_000_000 - 20_000,
      kind: 'capture'
    });
  });

  it('marks a presentation time as what it is', () => {
    // Not a capture time. Reporting it as one is how an ordinary local camera
    // came to report no latency at all.
    expect(captureTimeOf(1000, {presentationTime: 999}, 5_000_000)).toMatchObject({
      kind: 'presentation'
    });
  });

  it('reports no timestamp rather than a zero', () => {
    expect(captureTimeOf(1000, {}, 5_000_000)).toEqual({kind: 'none'});
    expect(captureTimeOf(undefined, {captureTime: 1}, 5_000_000)).toEqual({kind: 'none'});
  });
});
