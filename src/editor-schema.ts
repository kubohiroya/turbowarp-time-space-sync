import {
  compileSchemaBundle,
  validateSchemaInput,
} from '@kubohiroya/turbowarp-extension-data-editor/schema';
import type {
  SchemaValidationContext,
  SchemaJsonValue,
  InputDiagnostic,
} from '@kubohiroya/turbowarp-extension-data-editor/schema';
import reference from '../schemas/placement-reference-v1.schema.json' with { type: 'json' };
import observation from '../schemas/placement-observation-v1.schema.json' with { type: 'json' };
import type {
  SchemaBundle,
  SchemaDocument,
  SyncOwnerValidator,
} from '@kubohiroya/turbowarp-extension-data-editor/schema';
import { parseReferenceDefinition, parsePlacementObservation } from './contracts/placement.js';
export { parseReferenceDefinition, parsePlacementObservation } from './contracts/placement.js';
function bundle(
  document: typeof reference | typeof observation,
  name: string,
  symbol: string,
): SchemaBundle {
  const canonical = {
    repository: 'turbowarp-time-space-sync',
    path: 'src/contracts/placement.ts',
    symbol,
  };
  const generated = {
    repository: 'turbowarp-time-space-sync',
    path: `schemas/${name}-v1.schema.json`,
  };
  return {
    identity: {
      ownerId: 'turbowarp-time-space-sync',
      contractId: name,
      revision: 'spec-v0.2.0',
      variantId: 'v1-json',
    },
    dialect: '2020-12',
    root: {
      retrievalUri: document.$id,
      document: document as SchemaDocument,
      artifact: { role: 'generated-schema', source: generated, generatedFrom: [canonical] },
    },
    resources: [],
    provenance: {
      canonicalSources: [canonical],
      generatedFiles: [generated],
      referenceSchemas: [],
      generationSources: [
        {
          repository: 'turbowarp-time-space-sync',
          path: 'src/contracts/spec.ts',
          symbol: 'toJsonSchema',
        },
        {
          repository: 'turbowarp-time-space-sync',
          path: 'src/contracts/index.ts',
          symbol: 'publishedContracts',
        },
        { repository: 'turbowarp-time-space-sync', path: 'scripts/generate-schemas.ts' },
      ],
    },
  };
}
export const placementSchemaBundles = {
  reference: bundle(reference, 'placement-reference', 'referenceDefinitionSpec'),
  observation: bundle(observation, 'placement-observation', 'placementObservationSpec'),
} as const;
export const validatePlacementReferenceInput: SyncOwnerValidator = (data) =>
  parseReferenceDefinition(data).ok
    ? { kind: 'valid', issues: [] }
    : { kind: 'invalid', issues: [{ dataPath: '', ruleId: 'reference-definition-input' }] };
export const validatePlacementObservationInput: SyncOwnerValidator = (data) =>
  parsePlacementObservation(data).ok
    ? { kind: 'valid', issues: [] }
    : { kind: 'invalid', issues: [{ dataPath: '', ruleId: 'placement-observation-input' }] };
export function decodePlacementSource(source: string, contract: 'reference' | 'observation') {
  return {
    source,
    format: 'json' as const,
    variantId: 'v1-json' as const,
    contract,
    data: JSON.parse(source) as unknown,
  };
}

const sourceCompilations = Object.fromEntries(
  Object.entries(placementSchemaBundles).map(([key, bundle]) => [key, compileSchemaBundle(bundle)]),
);
/** Safe source boundary: preserve raw input separately from diagnostics and normalized values. */
export function validatePlacementSource(
  source: string,
  contract: 'reference' | 'observation',
  context: SchemaValidationContext,
) {
  let consumerId: string | undefined;
  try {
    const descriptor = Object.getOwnPropertyDescriptor(context, 'consumerId');
    if (descriptor && 'value' in descriptor && typeof descriptor.value === 'string')
      consumerId = descriptor.value;
  } catch {
    /* Leave the consumer unspecified when context cannot be inspected safely. */
  }
  let decoded: ReturnType<typeof decodePlacementSource>;
  try {
    decoded = decodePlacementSource(source, contract);
  } catch (error) {
    const code =
      error instanceof TypeError && error.message === 'Unrecognized camera profile variant.'
        ? ('variant-unrecognized' as const)
        : ('input-format-invalid' as const);
    const diagnostics: readonly [InputDiagnostic & { phase: 'decode' }] = [
      {
        scope: {
          identity: placementSchemaBundles[contract].identity,
          ...(consumerId === undefined ? {} : { consumerId }),
        },
        phase: 'decode',
        code,
        dataPath: '',
      },
    ];
    return { source, result: { kind: 'invalid' as const, diagnostics } };
  }
  const compilation = sourceCompilations[contract]!;
  if (compilation.kind !== 'compiled') return { ...decoded, result: compilation };
  return {
    ...decoded,
    result: validateSchemaInput(compilation.validator, decoded.data as SchemaJsonValue, {
      context,
      ownerValidate:
        contract === 'reference'
          ? validatePlacementReferenceInput
          : validatePlacementObservationInput,
    }),
  };
}
