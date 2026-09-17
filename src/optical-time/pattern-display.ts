import {TimeSpaceSyncError, type MonotonicClockPort} from '../contracts/index.js';
import {encodePatternCells, patternCodeForTimestamp} from './pattern.js';
import {PATTERN_CELL_GAP_RATIO} from './pattern-geometry.js';
import {cellCount, requireUsableProfile, type PatternProfile} from './pattern-profile.js';

/**
 * A surface the pattern can be drawn on.
 *
 * Narrowed to the two members the drawing uses, so the renderer can be checked
 * without a browser and so nothing else about a canvas is relied upon.
 */
export interface PatternSurface {
  fillStyle: string;
  fillRect(x: number, y: number, width: number, height: number): void;
}

export interface PatternPalette {
  readonly light: string;
  readonly dark: string;
  readonly surround: string;
}

/**
 * A record that the operator was warned about the flashing and agreed to it.
 *
 * The pattern covers a large area and reverses many cells every refresh, which
 * is exactly the stimulus the photosensitivity guidance is about. The guidance
 * is judged on the flashing area within the viewer's visual field, which
 * depends on how far away they are sitting: nothing in this process knows that,
 * so no setting here can establish compliance. What the extension can do is
 * refuse to start without a deliberate acknowledgement, and the literal `true`
 * makes that hard to supply by accident.
 */
export interface PhotosensitivityAcknowledgement {
  readonly acknowledgedByOperator: true;
  readonly acknowledgedAtUs: number;
}

export interface PatternDisplayOptions {
  /**
   * The display computer's own clock.
   *
   * Encoding against a synchronized clock would make the shown times jump
   * whenever the offset behind it is re-estimated, and an observer would see
   * that as an unexplained discontinuity in the pattern. The display encodes
   * its own time; which clock that is travels with the observation instead.
   */
  readonly clock: MonotonicClockPort;
  readonly profile: PatternProfile;
  readonly acknowledgement: PhotosensitivityAcknowledgement;
  readonly documentRef?: Document;
  /** Panel size as a share of the shorter viewport edge. */
  readonly panelScale?: number;
  readonly palette?: Partial<PatternPalette>;
  readonly requestFrame?: (callback: () => void) => number;
  readonly cancelFrame?: (handle: number) => void;
  readonly devicePixelRatio?: () => number;
  /** Called when the display takes itself down, so an owner can update state. */
  readonly onHidden?: (reason: DisplayHiddenReason) => void;
}

export type DisplayHiddenReason = 'requested' | 'escape-key' | 'page-hidden';

const REFRESH_SAMPLES = 24;
/** Enough samples that one stalled frame cannot dominate the median. */
const REFRESH_SAMPLES_REQUIRED = 8;
const MINIMUM_REFRESH_US = 4_000;
/**
 * A 24 Hz display refreshes every 41.7 ms, and a variable-refresh panel can go
 * slower still. The extraction source capped the accepted interval at 40 ms, so
 * on those displays every sample was discarded and the estimate stayed at its
 * starting value forever.
 */
const MAXIMUM_REFRESH_US = 100_000;
/**
 * Smaller than the extraction source's 0.7.
 *
 * It reduces the share of the visual field that reverses each refresh, which is
 * the quantity the photosensitivity guidance is written in terms of. It is a
 * mitigation and not a guarantee: the real figure depends on viewing distance.
 * The decoder needs the panel to be large enough in the camera image, so this
 * trades against range and wants measuring on real hardware before it is fixed.
 */
const DEFAULT_PANEL_SCALE = 0.35;
const DEFAULT_PALETTE: PatternPalette = {
  light: '#ffffff',
  dark: '#000000',
  /**
   * Left black, as the extraction source had it. A lighter surround would cut
   * the screen's overall luminance swing, but it also floods the room from a
   * projector and drives the camera's auto-exposure away from the panel. That
   * trade has not been measured, so it is not made here.
   */
  surround: '#000000'
};
const OVERLAY_STYLE = [
  'position:fixed',
  'inset:0',
  'width:100vw',
  'height:100vh',
  'margin:0',
  'padding:0',
  'border:0',
  'background:#000',
  'pointer-events:none',
  'z-index:2147483000'
].join(';');

/**
 * Shows the time coded pattern full screen for a camera or projector to relay.
 *
 * What is drawn during one animation frame reaches the screen at the next
 * refresh, so the encoded time is the current reading plus one measured refresh
 * interval. Any remaining display or projector delay is not measured here; it
 * is one of the components an optical measurement cannot separate, and the
 * correspondence result says so rather than assuming it away.
 */
export class PatternDisplay {
  private readonly clock: MonotonicClockPort;
  private readonly profile: PatternProfile;
  private readonly documentRef: Document;
  private readonly panelScale: number;
  private readonly palette: PatternPalette;
  private readonly requestFrame: (callback: () => void) => number;
  private readonly cancelFrame: (handle: number) => void;
  private readonly readDevicePixelRatio: () => number;
  private readonly onHidden: ((reason: DisplayHiddenReason) => void) | undefined;
  private readonly intervals: number[] = [];
  private canvas: HTMLCanvasElement | undefined;
  private context: PatternSurface | undefined;
  private animationHandle: number | undefined;
  private lastFrameUs = 0;
  private lastShownCode: number | undefined;
  private keyListener: ((event: KeyboardEvent) => void) | undefined;
  private visibilityListener: (() => void) | undefined;

  public constructor(options: PatternDisplayOptions) {
    requireAcknowledgement(options.acknowledgement);
    this.profile = requireUsableProfile(options.profile);
    this.clock = options.clock;
    this.documentRef = options.documentRef ?? document;
    this.panelScale = clampScale(options.panelScale ?? DEFAULT_PANEL_SCALE);
    this.palette = {...DEFAULT_PALETTE, ...options.palette};
    this.requestFrame =
      options.requestFrame ?? ((callback) => requestAnimationFrame(() => callback()));
    this.cancelFrame = options.cancelFrame ?? ((handle) => cancelAnimationFrame(handle));
    this.readDevicePixelRatio =
      options.devicePixelRatio ?? (() => globalThis.devicePixelRatio || 1);
    this.onHidden = options.onHidden;
  }

  public visible(): boolean {
    return this.canvas !== undefined;
  }

  /**
   * Whether the refresh interval has been measured well enough to encode with.
   *
   * Until it has, the panel is shown blank. The extraction source started from
   * a 4 ms assumption, so on an ordinary 60 Hz display its first frames encoded
   * a time about 12.7 ms early -- a systematic error, present only at the start
   * of a run, and indistinguishable afterwards from a genuine latency.
   */
  public stable(): boolean {
    return this.intervals.length >= REFRESH_SAMPLES_REQUIRED;
  }

  public refreshUs(): number | undefined {
    return this.stable() ? this.medianInterval() : undefined;
  }

  /**
   * How well the refresh interval is known, as a half-width in microseconds.
   *
   * Taken from the spread of the samples themselves rather than assumed. A
   * display that schedules evenly reports a small figure; one being throttled
   * reports a large one, and a consumer sizing a constraint from it widens
   * instead of quietly producing a tighter answer than the measurement
   * supports.
   */
  public refreshUncertaintyUs(): number | undefined {
    if (!this.stable()) return undefined;
    const sorted = [...this.intervals].sort((left, right) => left - right);
    const low = sorted[Math.floor(sorted.length * 0.25)] ?? 0;
    const high = sorted[Math.floor(sorted.length * 0.75)] ?? 0;
    return Math.max(1, Math.round((high - low) / 2));
  }

  /** The code currently on screen, or undefined while the panel is blank. */
  public shownCode(): number | undefined {
    return this.lastShownCode;
  }

  public patternProfile(): PatternProfile {
    return this.profile;
  }

  public show(): void {
    if (this.canvas) return;
    const canvas = this.documentRef.createElement('canvas');
    canvas.style.cssText = OVERLAY_STYLE;
    const context = canvas.getContext('2d') as PatternSurface | null;
    if (!context) {
      throw new TimeSpaceSyncError(
        'display-unavailable',
        'The frame sync pattern needs a 2D canvas.'
      );
    }
    this.documentRef.body.append(canvas);
    this.canvas = canvas;
    this.context = context;
    this.intervals.length = 0;
    this.lastFrameUs = 0;
    this.lastShownCode = undefined;
    this.attachListeners();
    this.scheduleFrame();
  }

  public hide(reason: DisplayHiddenReason = 'requested'): void {
    if (!this.canvas) return;
    if (this.animationHandle !== undefined) {
      this.cancelFrame(this.animationHandle);
      this.animationHandle = undefined;
    }
    this.detachListeners();
    this.canvas.remove();
    this.canvas = undefined;
    this.context = undefined;
    this.intervals.length = 0;
    this.lastFrameUs = 0;
    this.lastShownCode = undefined;
    this.onHidden?.(reason);
  }

  private attachListeners(): void {
    // The overlay covers everything and takes no pointer events, so without a
    // key of its own there is no way for a person at the machine to dismiss it.
    this.keyListener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') this.hide('escape-key');
    };
    this.documentRef.addEventListener('keydown', this.keyListener, true);

    // A hidden page stops receiving animation frames, which would leave one
    // code frozen on screen. A frozen panel still decodes, so an observer would
    // read a stale time with full confidence. Blanking it makes the pattern
    // undecodable instead.
    this.visibilityListener = () => {
      if (this.documentRef.visibilityState === 'hidden') this.hide('page-hidden');
    };
    this.documentRef.addEventListener('visibilitychange', this.visibilityListener);
  }

  private detachListeners(): void {
    if (this.keyListener) {
      this.documentRef.removeEventListener('keydown', this.keyListener, true);
      this.keyListener = undefined;
    }
    if (this.visibilityListener) {
      this.documentRef.removeEventListener('visibilitychange', this.visibilityListener);
      this.visibilityListener = undefined;
    }
  }

  private scheduleFrame(): void {
    if (!this.canvas) return;
    this.animationHandle = this.requestFrame(() => {
      this.animationHandle = undefined;
      this.renderFrame();
      this.scheduleFrame();
    });
  }

  private renderFrame(): void {
    const canvas = this.canvas;
    const context = this.context;
    if (!canvas || !context) return;
    const nowUs = this.clock.nowUs();
    this.recordInterval(nowUs);
    this.resize(canvas);
    const refreshUs = this.refreshUs();
    if (refreshUs === undefined) {
      // Blank is not a valid codeword under either encoding, so an observer
      // reads nothing at all rather than reading a time drawn with a guessed
      // refresh interval.
      this.lastShownCode = undefined;
      drawPattern(context, canvas.width, canvas.height, blankCells(this.profile), {
        profile: this.profile,
        panelScale: this.panelScale,
        palette: this.palette
      });
      return;
    }
    const code = patternCodeForTimestamp(nowUs + refreshUs, this.profile);
    this.lastShownCode = code;
    drawPattern(context, canvas.width, canvas.height, encodePatternCells(code, this.profile), {
      profile: this.profile,
      panelScale: this.panelScale,
      palette: this.palette
    });
  }

  private recordInterval(nowUs: number): void {
    if (this.lastFrameUs > 0) {
      const interval = nowUs - this.lastFrameUs;
      if (interval >= MINIMUM_REFRESH_US && interval <= MAXIMUM_REFRESH_US) {
        this.intervals.push(interval);
        while (this.intervals.length > REFRESH_SAMPLES) this.intervals.shift();
      }
    }
    this.lastFrameUs = nowUs;
  }

  private medianInterval(): number {
    const sorted = [...this.intervals].sort((left, right) => left - right);
    return sorted[Math.floor(sorted.length / 2)] ?? MINIMUM_REFRESH_US;
  }

  private resize(canvas: HTMLCanvasElement): void {
    const ratio = Math.min(3, Math.max(1, this.readDevicePixelRatio()));
    const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
  }
}

export function blankCells(profile: PatternProfile): boolean[] {
  return new Array<boolean>(cellCount(profile)).fill(false);
}

export function drawPattern(
  context: PatternSurface,
  width: number,
  height: number,
  cells: readonly boolean[],
  options: {profile: PatternProfile; panelScale: number; palette: PatternPalette}
): void {
  const {profile, panelScale, palette} = options;
  context.fillStyle = palette.surround;
  context.fillRect(0, 0, width, height);
  const panel = Math.min(width, height) * panelScale;
  const originX = (width - panel) / 2;
  const originY = (height - panel) / 2;
  const cellWidth = panel / profile.columns;
  const cellHeight = panel / profile.rows;
  const gapX = cellWidth * PATTERN_CELL_GAP_RATIO;
  const gapY = cellHeight * PATTERN_CELL_GAP_RATIO;
  for (let row = 0; row < profile.rows; row += 1) {
    for (let column = 0; column < profile.columns; column += 1) {
      const lit = cells[row * profile.columns + column] === true;
      // Dark cells are painted rather than left as surround, so the panel keeps
      // its outline when the surround is not black and so each cell's area is
      // the same whichever state it is in.
      context.fillStyle = lit ? palette.light : palette.dark;
      context.fillRect(
        originX + column * cellWidth + gapX / 2,
        originY + row * cellHeight + gapY / 2,
        cellWidth - gapX,
        cellHeight - gapY
      );
    }
  }
}

function requireAcknowledgement(value: PhotosensitivityAcknowledgement): void {
  if (
    typeof value !== 'object' ||
    value === null ||
    value.acknowledgedByOperator !== true ||
    !Number.isFinite(value.acknowledgedAtUs)
  ) {
    throw new TimeSpaceSyncError(
      'photosensitivity-unacknowledged',
      'The full screen pattern flashes and must be acknowledged by the operator before it is shown.'
    );
  }
}

function clampScale(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PANEL_SCALE;
  return Math.min(0.95, Math.max(0.05, value));
}
