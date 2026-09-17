import type {DisposableRegionReader} from './corner-measurement.js';
import type {SourceRegion} from './corner-refinement.js';
import {luminanceFromRgba} from './frame-pump.js';
import type {LuminanceFrame} from './sampling.js';

export interface VideoRegionReaderOptions {
  readonly element: HTMLVideoElement;
  readonly documentRef?: Document;
}

/**
 * Reads small windows of the video at its own resolution.
 *
 * Each window is drawn with a source rectangle into a canvas no larger than the
 * window, so only those pixels are ever read back. The frame pump draws the
 * whole frame, but downscaled; reading the full frame at full size to cut four
 * corners out of it would cost more than the decoder does.
 */
export class VideoRegionReader implements DisposableRegionReader {
  private readonly element: HTMLVideoElement;
  private canvas: HTMLCanvasElement | undefined;
  private context: CanvasRenderingContext2D | undefined;

  public constructor(options: VideoRegionReaderOptions) {
    this.element = options.element;
    const documentRef = options.documentRef ?? document;
    const canvas = documentRef.createElement('canvas');
    const context = canvas.getContext('2d', {willReadFrequently: true});
    if (!context) throw new Error('Measuring the pattern corners needs a 2D canvas.');
    this.canvas = canvas;
    this.context = context;
  }

  public read(region: SourceRegion): LuminanceFrame | undefined {
    const canvas = this.canvas;
    const context = this.context;
    if (!canvas || !context) return undefined;
    const {x, y, width, height} = region;
    if (width < 1 || height < 1) return undefined;
    // Grown, never shrunk: resizing clears and reallocates the canvas, and the
    // four windows of one frame are about the same size.
    if (canvas.width < width) canvas.width = width;
    if (canvas.height < height) canvas.height = height;
    context.drawImage(this.element, x, y, width, height, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;
    const data = new Uint8Array(width * height);
    luminanceFromRgba(pixels, data);
    return {width, height, data};
  }

  /** Releases the canvas's backing store, which otherwise lives as long as the object. */
  public dispose(): void {
    if (this.canvas) {
      this.canvas.width = 0;
      this.canvas.height = 0;
    }
    this.canvas = undefined;
    this.context = undefined;
  }
}
