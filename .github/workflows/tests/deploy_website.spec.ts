// @vitest-environment node
import { execFileSync } from 'node:child_process';
import {
  chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, expect, test } from 'vitest';
import { loadEnv } from 'vite';
import { parse } from 'yaml';

type Step = { name?: string; run?: string; env?: Record<string, string> };
const root = fileURLToPath(new URL('../../../', import.meta.url));
const workflow = parse(readFileSync(resolve(root, '.github/workflows/deploy_website.yaml'), 'utf8')) as { jobs: Record<string, { steps: Step[] }> };
const temporaryDirectories: string[] = [];
afterEach(() => temporaryDirectories.splice(0).forEach((directory) => rmSync(directory, { recursive: true, force: true })));

test.each(['firebase', 'supabase', ''])('template deployment honors the storage variable: %s', (engine) => {
  const directory = mkdtempSync(resolve(tmpdir(), 'revisit-template-pages-'));
  temporaryDirectories.push(directory);
  const yarn = resolve(directory, 'yarn');
  // Execute the real build step with only the expensive build boundary replaced.
  // eslint-disable-next-line no-template-curly-in-string -- Shell parameter expansion.
  writeFileSync(yarn, '#!/bin/sh\nprintf "%s" "${VITE_STORAGE_ENGINE:-$TEST_DOTENV_STORAGE_ENGINE}" > "$TEST_BUILD_ENGINE"\n');
  chmodSync(yarn, 0o755);
  const stepName = engine ? 'Build with github environment variables' : 'Build with .env file';
  const step = workflow.jobs['deploy-main'].steps.find(({ name }) => name === stepName)!;
  const output = resolve(directory, 'engine');
  const environment = { ...process.env };
  delete environment.VITE_STORAGE_ENGINE;
  execFileSync('bash', ['-e', '-c', step.run!], {
    cwd: root,
    env: {
      ...environment,
      ...Object.fromEntries(Object.keys(step.env ?? {}).map((key) => [key, engine])),
      PATH: `${directory}:${process.env.PATH}`,
      TEST_BUILD_ENGINE: output,
      TEST_DOTENV_STORAGE_ENGINE: loadEnv('production', root).VITE_STORAGE_ENGINE,
    },
  });
  expect(readFileSync(output, 'utf8')).toBe(engine || loadEnv('production', root).VITE_STORAGE_ENGINE);
});
