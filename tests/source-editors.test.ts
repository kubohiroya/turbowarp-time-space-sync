import {createBlockEditorService} from '@kubohiroya/turbowarp-extension-data-editor/rjsf';
import {expect, it} from 'vitest';
import {createSourceEditorOptions, registerSourceEditors} from '../src/source-editors.js';
import definitions from '../src/block-definitions.json';
const targets: Record<string, readonly string[]> = {"defineReference": ["REFERENCE_JSON"], "addPlacementObservation": ["OBSERVATION_JSON"], "setCameraModel": ["MODEL_JSON"]};
it('covers every planned opcode and input against the actual block definitions', () => {
  const options = createSourceEditorOptions();
  const actual = options.flatMap(option => option.opcodes.flatMap(opcode => option.bindings.map(binding => `${opcode.slice(option.extensionId.length + 1)}.${binding.argument}`))).sort();
  expect(actual).toEqual(Object.entries(targets).flatMap(([opcode, arguments_]) => arguments_.map(argument => `${opcode}.${argument}`)).sort());
  for (const [opcode, arguments_] of Object.entries(targets)) {
    const block = definitions.blocks.find(block => block.opcode === opcode);
    expect(block).toBeDefined();
    for (const argument of arguments_) expect(block!.arguments).toHaveProperty(argument);
  }
});
it('skips old hosts, registers only through the optional source API, and removes once', () => {
  expect(() => registerSourceEditors({} )()).not.toThrow();
  expect(() => registerSourceEditors({gui: {blockEditors: {apiVersion: 1}}})()).not.toThrow();
  const seen: unknown[] = [];
  let removals = 0;
  const remove = registerSourceEditors({gui: {blockEditors: {apiVersion: 1, registerSourceEditor: (options: unknown) => {seen.push(options); return () => {removals++;};}}}});
  expect(seen.length).toBe(createSourceEditorOptions().length);
  remove(); remove(); expect(removals).toBe(seen.length);
});
it('keeps decode failures safe and preserves the exact source at owner validation', () => {
  const source = '{private-input broken';
  for (const definition of createSourceEditorOptions()) for (const binding of definition.bindings) {
    expect(() => binding.decode(source)).toThrow();
    const result = binding.validateSource(source, definition.validationContext());
    expect(result.source).toBe(source); expect(result.result.kind).toBe('invalid');
    expect(JSON.stringify(result.result)).not.toContain('private-input');
    expect(binding.variants.length).toBeGreaterThan(0);
  }
});

import {parseCameraModel, requireSupportedDistortion} from '../src/placement/camera-model.js';
import {validateCameraModelSource} from '../src/editor-schema.js';
it('matches the camera-model reader and supported distortion check without registry effects', () => {
 const intrinsics = {fx: 1, fy: 1, cx: 0, cy: 0, skew: 0}; const context = {consumerId: 'model-test', nowMs: 0, settings: null};
 for (const value of [{intrinsics, distortion: {model: 'none', coefficients: []}, extra: null}, {intrinsics, distortion: {model: 'brown-conrady', coefficients: [0,0,0,0]}}, {intrinsics, distortion: {model: 'brown-conrady', coefficients: [0]}}, {intrinsics, distortion: {model: 'fisheye', coefficients: []}}, {intrinsics: {...intrinsics, fx: 0}, distortion: {model: 'none', coefficients: []}}, {intrinsics, distortion: {model: 'none', coefficients: []}, imageWidth: 1.5}, {intrinsics, distortion: {model: 'none', coefficients: []}, intrinsicProfileId: ''}]) {
  const parsed = parseCameraModel(value); let valid = parsed.ok; if (parsed.ok) try {requireSupportedDistortion(parsed.distortion);} catch {valid = false;}
  const source = JSON.stringify(value); expect(validateCameraModelSource(source, context).result.kind === 'valid').toBe(valid); expect(validateCameraModelSource(source, context).source).toBe(source);
 }
});

it('registers and resolves every fully qualified opcode through the actual common service', () => {
  const service = createBlockEditorService();
  const remove = registerSourceEditors({gui: {blockEditors: service.api}});
  const options = createSourceEditorOptions();
  for (const option of options) for (const opcode of option.opcodes) {
    expect(opcode.startsWith(`${option.extensionId}_`)).toBe(true);
    expect(service.registry.resolve(opcode)).toMatchObject({extensionId: option.extensionId, editorId: option.editorId,
      editableArguments: option.bindings.map(binding => binding.argument)});
  }
  remove(); remove();
  for (const option of options) for (const opcode of option.opcodes) expect(service.registry.resolve(opcode)).toBeUndefined();
});
