import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';

/**
 * Writes the sample documents a consumer can check its own reader against.
 *
 * They are produced by running the estimator and the solver, not written by
 * hand. A hand-written sample drifts from what the code emits and nobody
 * notices, because the only thing that ever reads it is a consumer in another
 * repository -- which is exactly the reader these are for.
 *
 * Nothing here names a consumer. A sample that mentioned a particular
 * extension's id or opcodes would make this package depend on the package that
 * depends on it, which is the cycle the layering exists to prevent.
 */

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const check = process.argv.includes('--check');

const server = await createServer({
  server: {middlewareMode: true},
  appType: 'custom',
  logLevel: 'error'
});
let documents: Record<string, unknown>;
try {
  const module_ = (await server.ssrLoadModule('/scripts/fixture-sources.ts')) as {
    buildFixtures: () => Record<string, unknown>;
  };
  documents = module_.buildFixtures();
} finally {
  await server.close();
}

/**
 * How far two numbers may differ and still mean the same thing.
 *
 * The placement sample comes out of an iterative refinement, and whether a
 * given step improves the fit is decided by comparing costs that differ in
 * their last bits. Two machines can therefore take a different number of steps
 * and stop a little apart while agreeing about the measurement completely. A
 * byte comparison calls that a stale fixture; it is not, and chasing it would
 * mean pinning the fixtures to whichever machine last wrote them.
 *
 * The tolerance is a micrometre on a metre and a thousandth of a pixel: far
 * below anything these numbers describe, and far above where the arithmetic
 * wobbles. Everything that is not a number still has to match exactly.
 */
const NUMBER_TOLERANCE = 1e-6;

function describeDrift(current: unknown, fresh: unknown, path = ''): string | undefined {
  if (typeof fresh === 'number' && typeof current === 'number') {
    const allowed = NUMBER_TOLERANCE * Math.max(1, Math.abs(fresh), Math.abs(current));
    return Math.abs(fresh - current) <= allowed
      ? undefined
      : `${path}: ${current} became ${fresh}`;
  }
  if (Array.isArray(fresh) && Array.isArray(current)) {
    if (fresh.length !== current.length) {
      return `${path}: ${current.length} entries became ${fresh.length}`;
    }
    for (let index = 0; index < fresh.length; index += 1) {
      const drift = describeDrift(current[index], fresh[index], `${path}[${index}]`);
      if (drift) return drift;
    }
    return undefined;
  }
  if (fresh !== null && current !== null && typeof fresh === 'object' && typeof current === 'object') {
    const freshKeys = Object.keys(fresh as object).sort();
    const currentKeys = Object.keys(current as object).sort();
    if (freshKeys.join() !== currentKeys.join()) {
      return `${path}: members ${currentKeys.join(', ')} became ${freshKeys.join(', ')}`;
    }
    for (const key of freshKeys) {
      const drift = describeDrift(
        (current as Record<string, unknown>)[key],
        (fresh as Record<string, unknown>)[key],
        path ? `${path}.${key}` : key
      );
      if (drift) return drift;
    }
    return undefined;
  }
  return fresh === current ? undefined : `${path}: ${String(current)} became ${String(fresh)}`;
}

let stale = 0;
for (const [name, document] of Object.entries(documents)) {
  const path = `${repositoryRoot}fixtures/${name}.json`;
  if (check) {
    const current = await readFile(path, 'utf8').catch(() => '');
    if (current === '') {
      process.stderr.write(`Contract fixture is missing: fixtures/${name}.json\n`);
      stale += 1;
      continue;
    }
    const drift = describeDrift(JSON.parse(current), document);
    if (drift) {
      process.stderr.write(`Contract fixture no longer describes what the code emits: fixtures/${name}.json\n  ${drift}\n`);
      stale += 1;
    }
    continue;
  }
  await writeFile(path, `${JSON.stringify(document, null, 2)}\n`);
}

if (stale > 0) {
  process.stderr.write('Run `pnpm run fixtures` to regenerate the contract fixtures.\n');
  process.exitCode = 1;
}
