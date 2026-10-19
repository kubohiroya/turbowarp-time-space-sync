import document from '../schemas/block-editor-fixed-inputs.schema.json' with {type:'json'};
import type {SchemaBundle, SchemaDocument} from '@kubohiroya/turbowarp-extension-data-editor/schema';

/** Canonical fixed field fragments; URI is identity only, never fetched. */
export function fixedInputBundle(opcode: string, argument: string): SchemaBundle {
  const source = {repository:'turbowarp-time-space-sync', path:'schemas/block-editor-fixed-inputs.schema.json', symbol:`#/$defs/${opcode}/properties/${argument}`};
  const definitions = document.$defs as Record<string, {properties: Record<string, SchemaDocument>}>;
  return {identity:{ownerId:'turbowarp-time-space-sync', contractId:'fixed-inputs', revision:'1', variantId:opcode+'.'+argument}, dialect:'2020-12',
    root:{retrievalUri:document.$id, document:definitions[opcode]!.properties[argument]!, artifact:{role:'canonical-schema', source}}, resources:[],
    provenance:{canonicalSources:[source, ...[{"repository": "turbowarp-time-space-sync", "path": "src/contracts/placement.ts", "symbol": "placementReferenceDefinition / referenceDefinitionIssues"}, {"repository": "turbowarp-time-space-sync", "path": "src/placement/pattern-reference.ts", "symbol": "buildPatternReference"}, {"repository": "turbowarp-time-space-sync", "path": "src/optical-time/controller.ts", "symbol": "start displayRefreshUs predicate"}]],
      generatedFiles:[{repository:'turbowarp-time-space-sync', path:'docs/schemas/block-editor-fixed-inputs.schema.json'}],
      generationSources:[{repository:'turbowarp-time-space-sync', path:'scripts/generate-fixed-input-docs.mjs'}], referenceSchemas:[]}};
}
