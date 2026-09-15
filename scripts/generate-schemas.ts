import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import type {Spec} from '../src/contracts/spec.js';

/**
 * Writes the published JSON Schema files from the contract descriptors.
 *
 * The descriptors are loaded through Vite rather than imported directly: the
 * source uses the project's `.js` specifier convention, which Node's type
 * stripping does not resolve back to `.ts`. Vite already owns module resolution
 * for this repository, so borrowing it keeps one resolution story instead of
 * introducing a second set of import conventions for scripts only.
 */

interface PublishedContract {
  title: string;
  spec: Spec;
}

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const baseId =
  'https://raw.githubusercontent.com/kubohiroya/turbowarp-time-space-sync/main/schemas';
const check = process.argv.includes('--check');

const server = await createServer({
  server: {middlewareMode: true},
  appType: 'custom',
  logLevel: 'error'
});
let contracts: Record<string, PublishedContract>;
let toJsonSchema: (spec: Spec) => Record<string, unknown>;
try {
  const module_ = (await server.ssrLoadModule('/src/contracts/index.ts')) as {
    publishedContracts: Record<string, PublishedContract>;
    toJsonSchema: (spec: Spec) => Record<string, unknown>;
  };
  contracts = module_.publishedContracts;
  toJsonSchema = module_.toJsonSchema;
} finally {
  await server.close();
}

let stale = 0;
for (const [name, contract] of Object.entries(contracts)) {
  const document = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: `${baseId}/${name}.schema.json`,
    title: contract.title,
    ...toJsonSchema(contract.spec)
  };
  const serialized = `${JSON.stringify(document, null, 2)}\n`;
  const path = `${repositoryRoot}schemas/${name}.schema.json`;
  if (check) {
    const current = await readFile(path, 'utf8').catch(() => '');
    if (current !== serialized) {
      process.stderr.write(`Generated schema is out of date: schemas/${name}.schema.json\n`);
      stale += 1;
    }
    continue;
  }
  await writeFile(path, serialized);
}

if (stale > 0) {
  process.stderr.write('Run `pnpm run schemas` to regenerate the JSON Schema files.\n');
  process.exitCode = 1;
}
