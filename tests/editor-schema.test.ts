import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {compileSchemaBundle,validateSchemaInput} from '@kubohiroya/turbowarp-extension-data-editor/schema';
import {placementSchemaBundles,validatePlacementReferenceInput,validatePlacementObservationInput,parseReferenceDefinition,parsePlacementObservation,decodePlacementSource} from '../src/editor-schema.js';
import {publishedContracts} from '../src/contracts/index.js';
import {toJsonSchema} from '../src/contracts/spec.js';
const context={consumerId:'placement',nowMs:0,settings:null};
it('generated payload schemas match the full canonical pipeline without rewriting any file',()=>{
 for(const [name,contract] of Object.entries(publishedContracts)){
  const serialized=JSON.stringify({$schema:'https://json-schema.org/draft/2020-12/schema',$id:`https://raw.githubusercontent.com/kubohiroya/turbowarp-time-space-sync/main/schemas/${name}.schema.json`,title:contract.title,...toJsonSchema(contract.spec)},null,2)+'\n';
  expect(readFileSync(`schemas/${name}.schema.json`,'utf8')).toBe(serialized);
 }
});
it('both placement contracts preserve raw input and add owner-only semantic constraints',()=>{
 for(const kind of ['reference','observation'] as const){
  const name=kind==='reference'?'placement-reference':'placement-observation';const source=readFileSync(`tests/fixtures/contracts/${name}-valid.json`,'utf8');const data=JSON.parse(source);const structural=compileSchemaBundle(placementSchemaBundles[kind]);if(structural.kind!=='compiled')throw Error();
  const ownerValidate=kind==='reference'?validatePlacementReferenceInput:validatePlacementObservationInput;const parse=kind==='reference'?parseReferenceDefinition:parsePlacementObservation;
  const duplicate=structuredClone(data);const points=kind==='reference'?duplicate.points:duplicate.imagePoints;points[1].id=points[0].id;
  const extra=structuredClone(data);if(kind==='reference'){extra.measuredBy='nominal';extra.points[0].sigmaMeters=0;}else extra.imagePoints[0].u=extra.imageWidth+1;
  for(const candidate of [data,duplicate,extra,{}, {...data,version:2}]){const before=JSON.stringify(candidate);const result=validateSchemaInput(structural.validator,candidate,{context,ownerValidate});expect(result.kind==='valid').toBe(parse(candidate).ok);expect(JSON.stringify(candidate)).toBe(before);}
  expect(structural.validator.validate(duplicate).kind).toBe('valid');expect(decodePlacementSource(source,kind)).toMatchObject({source,data});
 }
});

import {validatePlacementSource} from '../src/editor-schema.js';
it('source boundary returns safe format diagnostics while keeping the original string',()=>{
 const source='{private malformed';const result=validatePlacementSource(source,'reference',context);expect(result.source).toBe(source);expect(result.result.kind).toBe('invalid');expect(JSON.stringify(result.result)).not.toContain('private');
 const valid=readFileSync('tests/fixtures/contracts/placement-reference-valid.json','utf8');expect(validatePlacementSource(valid,'reference',context).result.kind).toBe('valid');
});
