interface TurboWarpExtension {
  getInfo(): Record<string, unknown>;
}

/**
 * The VM runtime object extensions publish themselves on.
 *
 * Extensions find each other through named properties on it, so it is indexed
 * rather than closed: the properties that matter here belong to other packages
 * and are feature-detected before use.
 */
interface TurboWarpRuntime {
  on?(event: string, listener: (...args: unknown[]) => void): void;
  off?(event: string, listener: (...args: unknown[]) => void): void;
  [key: string]: unknown;
}

interface ScratchTranslate {
  (text: string): string;
  (message: {default: string; description?: string}, placeholders?: Record<string, string | number>): string;
}

interface ScratchApi {
  extensions: {
    unsandboxed: boolean;
    register(extension: TurboWarpExtension): void;
  };
  BlockType: Record<'COMMAND' | 'REPORTER' | 'BOOLEAN' | 'HAT', string>;
  ArgumentType: Record<'STRING' | 'NUMBER' | 'BOOLEAN', string>;
  Cast: {
    toString(value: unknown): string;
    toNumber(value: unknown): number;
    toBoolean(value: unknown): boolean;
  };
  vm?: {runtime?: TurboWarpRuntime};
  translate: ScratchTranslate;
}

declare const Scratch: ScratchApi;
