import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import packageMetadata from '../package.json';
import {
  readTimeSpaceSyncCapability,
  runtimeCapabilityKey,
  runtimeCapabilityVersion,
  timeSpaceSyncExtensionId,
  toLegacyFrameSyncErrorCode
} from '../src/runtime.js';
import {extensionConfig} from '../src/config.js';

const ENTRY = new URL('../src/runtime.ts', import.meta.url);

/**
 * The surface another extension imports instead of declaring its own copy.
 *
 * A copy is checked against nothing: this package could change the shape, the
 * consumer would still typecheck, and the mismatch would surface in a browser.
 * That has already happened in this family, between Camera Source and
 * turbowarp-ar, so the entry is guarded rather than trusted.
 */
describe('the published runtime sub-entry', () => {
  it('is exposed under ./runtime and nowhere else', () => {
    // No "." entry: dist/time-space-sync.js is loaded by URL from TurboWarp
    // rather than imported, and exposing it would let a stray bare import pull
    // the whole extension into a consumer's bundle.
    expect(packageMetadata.exports['./runtime']).toEqual({
      types: './lib/runtime.d.ts',
      default: './lib/runtime.js'
    });
    expect(Object.keys(packageMetadata.exports)).toEqual(['./runtime', './package.json']);
  });

  it('does not claim the package is free of side effects', () => {
    // src/index.ts calls Scratch.extensions.register.
    expect(packageMetadata.sideEffects).toEqual(['src/index.ts', 'dist/*']);
  });

  it('reaches for nothing a browser has to provide', () => {
    // Anything imported here is paid for by every consumer, and none of them
    // want the decoder.
    const source = readFileSync(ENTRY, 'utf8');
    for (const global of ['document', 'window', 'navigator', 'Scratch', 'requestAnimationFrame']) {
      expect(source).not.toMatch(new RegExp(`\\\\b${global}\\\\b`, 'u'));
    }
  });

  it('agrees with the extension about its own identity', () => {
    expect(timeSpaceSyncExtensionId).toBe(extensionConfig.id);
  });

  it('carries the legacy error mapping a compatibility adapter needs', () => {
    // The adapter in the extraction source has to turn today's codes into the
    // six the old opcodes published, and it should not be writing that table
    // itself.
    expect(toLegacyFrameSyncErrorCode('ambiguous-panel')).toBe('panel-not-found');
    expect(toLegacyFrameSyncErrorCode('low-contrast')).toBe('low-contrast');
  });

  it('narrows a runtime that carries the capability', () => {
    const capability = {requireVersion: () => capability, version: runtimeCapabilityVersion};
    expect(readTimeSpaceSyncCapability({[runtimeCapabilityKey]: capability})).toBe(capability);
  });

  it('reads an absent extension as absent rather than throwing', () => {
    expect(readTimeSpaceSyncCapability({})).toBeUndefined();
    expect(readTimeSpaceSyncCapability(undefined)).toBeUndefined();
    expect(readTimeSpaceSyncCapability({[runtimeCapabilityKey]: {}})).toBeUndefined();
  });
});
