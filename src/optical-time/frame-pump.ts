import type {
  CaptureTimeKind,
  CapturedFrame,
  FramePumpPort,
  MonotonicClockPort,
  SharedClockPort
} from '../contracts/index.js';

/**
 * The timing metadata `requestVideoFrameCallback` may carry.
 *
 * `captureTime` is when the camera captured the frame, which browsers report
 * for some sources and not others. `presentationTime` is when the user agent
 * submitted the frame for composition, which sits near the delivery time; a
 * latency computed from it is close to zero whatever the real capture latency
 * was. The extraction source fell back from the first to the second and then to
 * a literal zero, so an ordinary local camera reported no latency at all.
 */
interface FrameTimingMetadata {
  captureTime?: number;
  presentationTime?: number;
}

export interface VideoFramePumpOptions {
  readonly element: HTMLVideoElement;
  readonly width: number;
  readonly height: number;
  readonly clock: SharedClockPort;
  readonly monotonic: MonotonicClockPort;
  readonly documentRef?: Document;
  readonly requestFrame?: (callback: () => void) => number;
  readonly cancelFrame?: (handle: number) => void;
  /** Reports a failure inside the callback instead of letting it escape. */
  readonly onError?: (error: unknown) => void;
}

/**
 * Delivers downscaled camera frames to the decoder.
 *
 * The clocks are read at the top of the callback, before any pixel work. The
 * extraction source read its shared clock after downscaling and converting the
 * whole frame to luminance, so the cost of that work sat inside every latency
 * it went on to compute, unmodelled and invisible.
 */
export class VideoFramePump implements FramePumpPort {
  private readonly element: HTMLVideoElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly luminance: Uint8Array;
  private readonly width: number;
  private readonly height: number;
  private readonly clock: SharedClockPort;
  private readonly monotonic: MonotonicClockPort;
  private readonly requestFrame: (callback: () => void) => number;
  private readonly cancelFrame: (handle: number) => void;
  private readonly onError: ((error: unknown) => void) | undefined;
  private handler: ((frame: CapturedFrame) => void) | undefined;
  private videoFrameHandle: number | undefined;
  private animationHandle: number | undefined;

  public constructor(options: VideoFramePumpOptions) {
    this.element = options.element;
    this.width = options.width;
    this.height = options.height;
    this.clock = options.clock;
    this.monotonic = options.monotonic;
    this.requestFrame =
      options.requestFrame ?? ((callback) => requestAnimationFrame(() => callback()));
    this.cancelFrame = options.cancelFrame ?? ((handle) => cancelAnimationFrame(handle));
    this.onError = options.onError;
    const documentRef = options.documentRef ?? document;
    this.canvas = documentRef.createElement('canvas');
    this.canvas.width = options.width;
    this.canvas.height = options.height;
    const context = this.canvas.getContext('2d', {willReadFrequently: true});
    if (!context) throw new Error('The frame sync decoder needs a 2D canvas.');
    this.context = context;
    this.luminance = new Uint8Array(options.width * options.height);
  }

  public start(handler: (frame: CapturedFrame) => void): void {
    this.stop();
    this.handler = handler;
    this.schedule();
  }

  public stop(): void {
    this.handler = undefined;
    if (this.videoFrameHandle !== undefined) {
      this.element.cancelVideoFrameCallback(this.videoFrameHandle);
      this.videoFrameHandle = undefined;
    }
    if (this.animationHandle !== undefined) {
      this.cancelFrame(this.animationHandle);
      this.animationHandle = undefined;
    }
  }

  private schedule(): void {
    if (!this.handler) return;
    if (typeof this.element.requestVideoFrameCallback === 'function') {
      this.videoFrameHandle = this.element.requestVideoFrameCallback((now, metadata) => {
        this.videoFrameHandle = undefined;
        this.deliver(now, metadata as FrameTimingMetadata);
      });
      return;
    }
    this.animationHandle = this.requestFrame(() => {
      this.animationHandle = undefined;
      this.deliver(undefined, {});
    });
  }

  private deliver(now: number | undefined, metadata: FrameTimingMetadata): void {
    const handler = this.handler;
    if (!handler) return;
    // Read before the pixel work, not after it.
    const deliveredAtUs = this.clock.nowUs();
    const monotonicAtUs = this.monotonic.nowUs();
    try {
      const capture = captureTimeOf(now, metadata, deliveredAtUs);
      this.context.drawImage(this.element, 0, 0, this.width, this.height);
      const pixels = this.context.getImageData(0, 0, this.width, this.height).data;
      for (let index = 0; index < this.luminance.length; index += 1) {
        const offset = index * 4;
        const red = pixels[offset] ?? 0;
        const green = pixels[offset + 1] ?? 0;
        const blue = pixels[offset + 2] ?? 0;
        this.luminance[index] = (red * 299 + green * 587 + blue * 114) / 1000;
      }
      handler({
        luminance: {width: this.width, height: this.height, data: this.luminance},
        deliveredAtUs,
        monotonicAtUs,
        ...(capture.captureTimeUs === undefined ? {} : {captureTimeUs: capture.captureTimeUs}),
        captureTimeKind: capture.kind,
        sourceWidth: this.element.videoWidth || this.width,
        sourceHeight: this.element.videoHeight || this.height
      });
    } catch (error) {
      // An exception here would otherwise escape the frame callback, where
      // nothing is waiting for it: the caller would sit until a watchdog fired,
      // with the reason already lost.
      this.onError?.(error);
    } finally {
      this.schedule();
    }
  }
}

/**
 * Places the capture instant on the shared clock, or says it is unknown.
 *
 * Only a real capture time is converted. A presentation time is reported as
 * what it is, so a consumer can decide what to do with it, and a frame with
 * neither carries no timestamp at all rather than a zero that would read as a
 * measured absence of latency.
 */
export function captureTimeOf(
  now: number | undefined,
  metadata: FrameTimingMetadata,
  deliveredAtUs: number
): {captureTimeUs?: number; kind: CaptureTimeKind} {
  if (now === undefined || !Number.isFinite(now)) return {kind: 'none'};
  const captured = metadata.captureTime;
  if (captured !== undefined && Number.isFinite(captured)) {
    return {
      captureTimeUs: deliveredAtUs - Math.max(0, Math.round((now - captured) * 1000)),
      kind: 'capture'
    };
  }
  const presented = metadata.presentationTime;
  if (presented !== undefined && Number.isFinite(presented)) {
    return {
      captureTimeUs: deliveredAtUs - Math.max(0, Math.round((now - presented) * 1000)),
      kind: 'presentation'
    };
  }
  return {kind: 'none'};
}
