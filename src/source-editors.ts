import type {SourceBinding, SourceEditorOptions, SourceValidation} from '@kubohiroya/turbowarp-extension-data-editor/schema';
import {extensionConfig} from './config.js';

function checkedSource(value: {source: string; result: {kind: 'valid' | 'invalid' | 'execution-error' | 'schema-error'; diagnostics: readonly {code: string; dataPath?: string}[]}}): SourceValidation {
  return value.result.kind === 'valid'
    ? {source: value.source, result: {kind: 'valid', diagnostics: []}}
    : {source: value.source, result: {kind: value.result.kind, diagnostics: value.result.diagnostics}};
}
import {placementSchemaBundles, decodePlacementSource, validatePlacementSource, cameraModelSchemaBundle, decodeCameraModelSource, validateCameraModelSource} from './editor-schema.js';
export function createSourceEditorOptions(nowMs: () => number = Date.now): readonly SourceEditorOptions[] {
  const context = () => ({consumerId: extensionConfig.id, nowMs: nowMs(), settings: null});
  return [
    {apiVersion: 1, extensionId: extensionConfig.id, editorId: 'reference-source', opcodes: ["defineReference"].map(opcode => `${extensionConfig.id}_${opcode}`), bindings: [{argument: 'REFERENCE_JSON', variants: [{variantId: 'v1-json', format: 'json', schemaBundle: placementSchemaBundles.reference}], decode: source => {const decoded = decodePlacementSource(source, 'reference'); return {...decoded, data: decoded.data as ReturnType<SourceBinding['decode']>['data']};}, validateSource: (source, context) => checkedSource(validatePlacementSource(source, 'reference', context))}], validationContext: context},
    {apiVersion: 1, extensionId: extensionConfig.id, editorId: 'observation-source', opcodes: ["addPlacementObservation"].map(opcode => `${extensionConfig.id}_${opcode}`), bindings: [{argument: 'OBSERVATION_JSON', variants: [{variantId: 'v1-json', format: 'json', schemaBundle: placementSchemaBundles.observation}], decode: source => {const decoded = decodePlacementSource(source, 'observation'); return {...decoded, data: decoded.data as ReturnType<SourceBinding['decode']>['data']};}, validateSource: (source, context) => checkedSource(validatePlacementSource(source, 'observation', context))}], validationContext: context},
    {apiVersion: 1, extensionId: extensionConfig.id, editorId: 'camera-model-source', opcodes: ["setCameraModel"].map(opcode => `${extensionConfig.id}_${opcode}`), bindings: [{argument: 'MODEL_JSON', variants: [{variantId: 'json', format: 'json', schemaBundle: cameraModelSchemaBundle}], decode: decodeCameraModelSource, validateSource: (source, context) => checkedSource(validateCameraModelSource(source, context))}], validationContext: context}
  ];
}

/** Optional capability: old GUIs continue executing blocks without editor registration. */
export function registerSourceEditors(scratch: unknown, nowMs: () => number = Date.now): () => void {
  const api = (scratch as {gui?: {blockEditors?: {apiVersion?: number; registerSourceEditor?: (options: SourceEditorOptions) => () => void}}})?.gui?.blockEditors;
  if (api?.apiVersion !== 1 || typeof api.registerSourceEditor !== 'function') return () => {};
  const removers: (() => void)[] = [];
  try {
    for (const options of createSourceEditorOptions(nowMs)) removers.push(api.registerSourceEditor(options));
  } catch {
    for (const remove of removers.reverse()) remove();
    return () => {};
  }
  let active = true;
  return () => {if (active) {active = false; for (const remove of removers.reverse()) remove();}};
}
