import {parseFixedNumberInput} from '@kubohiroya/turbowarp-extension-data-editor';
import type {FixedInputBinding, FixedInputEditorOptions, FixedBlockSnapshot, JsonValue, LiteralValue} from '@kubohiroya/turbowarp-extension-data-editor';
import {fixedInputBundle} from './fixed-input-schema.js';

const invalid = () => [{message: 'Invalid fixed input.'}];
function number(value: JsonValue | LiteralValue): number {
  if ((typeof value !== 'number' && typeof value !== 'string') ||
      (typeof value === 'string' && value.trim() === '')) throw new TypeError('Unrepresentable numeric literal.');
  const result = Number(value);
  if (!Number.isFinite(result)) throw new TypeError('Nonfinite numeric literal.');
  return result;
}
function snapshotNumber(snapshot: FixedBlockSnapshot, argument: string): number {
  const slot = snapshot.arguments[argument];
  if (slot?.kind !== 'literal') throw new TypeError('A related literal is required.');
  return number(slot.value);
}
function snapshotText(snapshot: FixedBlockSnapshot, argument: string): string {
  const slot = snapshot.arguments[argument];
  if (slot?.kind !== 'literal' || typeof slot.value !== 'string') throw new TypeError('A related literal is required.');
  return slot.value.trim();
}
function numericBinding(opcode: string, argument: string): FixedInputBinding {
  return {argument, schemaBundle: fixedInputBundle(opcode, argument), control: {label: argument, kind: 'number'}, read: number,
    encode(value) {
      const parsed = parseFixedNumberInput(value);
      if (parsed.kind !== 'valid') throw new TypeError('Invalid numeric token.');
      return parsed.token;
    },
    validateCandidate(candidate, _context, finalSnapshot) {
      try { number(candidate); return ownerCheck(opcode, argument, candidate, finalSnapshot) ? [] : invalid(); }
      catch { return invalid(); }
    }};
}
function enumBinding(opcode: string, argument: string, choices: readonly string[], normalization: 'none'|'trim'|'trim-lower'): FixedInputBinding {
  const project = (value: JsonValue|LiteralValue) => {
    if (typeof value !== 'string') return value;
    const normalized = normalization === 'none' ? value : normalization === 'trim' ? value.trim() : value.trim().toLowerCase();
    return choices.includes(normalized) ? normalized : value;
  };
  return {argument, schemaBundle: fixedInputBundle(opcode, argument), control: {label: argument, kind: 'enum', choices: choices.map(value=>({value}))},
    read: project,
    encode(value) { if(typeof value !== 'string' || !choices.includes(value)) throw new TypeError('Choose a known value.'); return value; },
    validateCandidate(candidate, _context, finalSnapshot) {
      try {return typeof candidate === 'string' && choices.includes(candidate) && ownerCheck(opcode, argument, candidate, finalSnapshot) ? [] : invalid();}
      catch {return invalid();}
    }};
}
// Independent static predicates and an always-visible two-field owner constraint, not a UI branch.
function ownerCheck(opcode: string, argument: string, candidate: LiteralValue, snapshot: FixedBlockSnapshot): boolean {
  if (argument === 'REFRESH_US') {const rounded = Math.round(number(candidate)); return Number.isFinite(rounded) && rounded>0;}
  if (opcode === 'patternReferenceJson' && (argument === 'SIGMA_METERS' || argument === 'MEASURED_BY')) {
    const sigma = argument === 'SIGMA_METERS' ? number(candidate) : snapshotNumber(snapshot, 'SIGMA_METERS');
    const measuredBy = argument === 'MEASURED_BY' ? String(candidate).trim() : snapshotText(snapshot, 'MEASURED_BY');
    // Read both final candidates. Related reporters fail closed without being evaluated.
    return sigma >= 0 && ['tape','laser','nominal'].includes(measuredBy) && (measuredBy !== 'nominal' || sigma>0);
  }
  return true;
}

const extensionId = 'kubohiroyatimespacesync';
const validationContext = () => ({consumerId:'turbowarp-time-space-sync', nowMs:0, settings:null});
export const fixedInputEditors: readonly FixedInputEditorOptions[] = [
  {apiVersion: 1, extensionId, editorId: 'startOpticalTimeDecoder-fixed', opcodes: [`${extensionId}_startOpticalTimeDecoder`],
    contractId: 'turbowarp-time-space-sync/startOpticalTimeDecoder', contractRevision: '1', validationContext,
    readOnlyArguments: [],
    bindings: [
    numericBinding('startOpticalTimeDecoder', 'SECONDS'),
    numericBinding('startOpticalTimeDecoder', 'REFRESH_US')
    ]
  },
  {apiVersion: 1, extensionId, editorId: 'calibrateOpticalTimeDecoder-fixed', opcodes: [`${extensionId}_calibrateOpticalTimeDecoder`],
    contractId: 'turbowarp-time-space-sync/calibrateOpticalTimeDecoder', contractRevision: '1', validationContext,
    readOnlyArguments: [],
    bindings: [
    numericBinding('calibrateOpticalTimeDecoder', 'SECONDS')
    ]
  },
  {apiVersion: 1, extensionId, editorId: 'measurePatternCorners-fixed', opcodes: [`${extensionId}_measurePatternCorners`],
    contractId: 'turbowarp-time-space-sync/measurePatternCorners', contractRevision: '1', validationContext,
    readOnlyArguments: [],
    bindings: [
    numericBinding('measurePatternCorners', 'SECONDS')
    ]
  },
  {apiVersion: 1, extensionId, editorId: 'patternReferenceJson-fixed', opcodes: [`${extensionId}_patternReferenceJson`],
    contractId: 'turbowarp-time-space-sync/patternReferenceJson', contractRevision: '1', validationContext,
    readOnlyArguments: [],
    bindings: [
    numericBinding('patternReferenceJson', 'SIGMA_METERS'),
    enumBinding('patternReferenceJson', 'MEASURED_BY', ["tape", "laser", "nominal"], 'trim')
    ]
  }
];

interface RuntimeLifetime {
  on?: (event: string, listener: () => void) => void;
  off?: (event: string, listener: () => void) => void;
}

/** Register metadata only; the GUI startup capability owns editor activation. */
export function registerFixedInputEditors(
  scratch: unknown, definitions: readonly FixedInputEditorOptions[], runtimeOverride?: RuntimeLifetime
): () => void {
  const host = scratch as {gui?: {blockEditors?: {apiVersion?: number;
    registerFixedInputEditor?: (options: FixedInputEditorOptions) => () => void}};
    vm?: {runtime?: RuntimeLifetime}};
  const api = host?.gui?.blockEditors;
  if (!definitions.length || api?.apiVersion !== 1 || typeof api.registerFixedInputEditor !== 'function') return () => {};
  const runtime = runtimeOverride ?? host?.vm?.runtime;
  const removers: (() => void)[] = [];
  let active = true;
  const dispose = () => {
    if (!active) return;
    active = false;
    runtime?.off?.('RUNTIME_DISPOSED', dispose);
    for (const remove of removers.splice(0).reverse()) remove();
  };
  try {
    for (const definition of definitions) {
      const remove = api.registerFixedInputEditor.call(api, definition);
      if (typeof remove !== 'function') throw new TypeError('Invalid fixed input registration disposer.');
      removers.push(remove);
    }
    runtime?.on?.('RUNTIME_DISPOSED', dispose);
  } catch (error) {dispose(); throw error;}
  return dispose;
}
