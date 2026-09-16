import {describe, expect, it} from 'vitest';
import {
  cameraSourceRuntimeKey,
  requireCameraSource,
  readCaptureConditions,
  type CameraFrameSource,
  type CameraLease
} from '../src/camera/camera-source.js';
import {errorCodeOf} from '../src/contracts/index.js';

/**
 * The declarations come from Camera Source itself, so these assertions are
 * about the seam rather than about the shapes: that the key is the published
 * one, that a missing extension is a refusal with a reason, and that the
 * capture settings are read from the track rather than from a capability which
 * is only published when another extension's flag happens to be on.
 */
describe('the Camera Source seam', () => {
  it('uses the key Camera Source publishes itself', () => {
    expect(cameraSourceRuntimeKey).toBe('ext_kubohiroyacamerasource');
  });

  it('refuses with a reason when the extension is not loaded', () => {
    try {
      requireCameraSource({} as TurboWarpRuntime);
      expect.unreachable('should have refused');
    } catch (error) {
      expect(errorCodeOf(error)).toBe('camera-unavailable');
      expect((error as Error).message).toMatch(/not loaded/);
    }
  });

  it('refuses a runtime whose camera source cannot lease', () => {
    const runtime = {[cameraSourceRuntimeKey]: {}} as unknown as TurboWarpRuntime;
    expect(() => requireCameraSource(runtime)).toThrowError(/not loaded/);
  });

  it('accepts a runtime that can lease', () => {
    const lease: CameraLease = {
      getFrameSource: () =>
        ({
          kind: 'video',
          element: {} as HTMLVideoElement,
          width: 640,
          height: 480,
          previewFlip: 'none',
          deviceId: 'device-1'
        }) satisfies CameraFrameSource,
      release: async () => undefined
    };
    const runtime = {
      [cameraSourceRuntimeKey]: {acquireCamera: async () => lease}
    } as unknown as TurboWarpRuntime;
    expect(() => requireCameraSource(runtime)).not.toThrow();
  });
});

describe('reading what the track reports', () => {
  function element(settings: Record<string, unknown> | Error | undefined): HTMLVideoElement {
    if (settings === undefined) return {srcObject: null} as unknown as HTMLVideoElement;
    const track = {
      getSettings: () => {
        if (settings instanceof Error) throw settings;
        return settings;
      }
    };
    return {
      srcObject: {getVideoTracks: () => [track]}
    } as unknown as HTMLVideoElement;
  }

  it('reports nothing for a camera that is not running', () => {
    expect(readCaptureConditions(element(undefined))).toEqual({});
  });

  it('converts the exposure into microseconds', () => {
    // MediaTrackSettings reports it in hundred-microsecond units, and the
    // decoder compares it against a display refresh.
    expect(readCaptureConditions(element({exposureTime: 80})).exposureTimeUs).toBe(8000);
  });

  it('leaves a setting the device does not report absent', () => {
    // Absent, not zero: a camera that reports no exposure has not reported a
    // zero-length one.
    const conditions = readCaptureConditions(element({frameRate: 30}));
    expect(conditions.frameRate).toBe(30);
    expect('exposureTimeUs' in conditions).toBe(false);
  });

  it('drops a setting that cannot be a measurement', () => {
    expect(readCaptureConditions(element({frameRate: 0, width: -4}))).toEqual({});
  });

  it('survives a track that refuses to describe itself', () => {
    expect(readCaptureConditions(element(new Error('not allowed')))).toEqual({});
  });
});
