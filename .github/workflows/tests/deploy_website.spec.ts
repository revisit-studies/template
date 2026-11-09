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

const variableExpression = (name: string) => `\${{ vars.${name} }}`;

function build({
  repository = 'researcher/my-study', engine = '', enterpriseKey = '', dotenvEnterpriseKey = '',
} = {}) {
  const directory = mkdtempSync(resolve(tmpdir(), 'revisit-template-pages-'));
  temporaryDirectories.push(directory);
  const yarn = resolve(directory, 'yarn');
  // Execute the real build shell, replacing only the expensive build boundary.
  writeFileSync(yarn, `#!${process.execPath}
const { writeFileSync } = require('node:fs');
writeFileSync(process.env.TEST_BUILD_OUTPUT, JSON.stringify({
  engine: process.env.VITE_STORAGE_ENGINE ?? process.env.TEST_DOTENV_STORAGE_ENGINE,
  enterpriseKey: process.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY ?? process.env.TEST_DOTENV_ENTERPRISE_KEY,
}));
`);
  chmodSync(yarn, 0o755);
  const step = workflow.jobs['deploy-main'].steps.find(({ name }) => name === 'Build template deployment')!;
  const output = resolve(directory, 'build.json');
  const environment = { ...process.env };
  delete environment.VITE_STORAGE_ENGINE;
  delete environment.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY;
  execFileSync('bash', ['-e', '-c', step.run!], {
    cwd: root,
    env: {
      ...environment,
      ...Object.fromEntries(Object.entries(step.env ?? {}).map(([key, value]) => [key, value
        .replace(variableExpression('VITE_STORAGE_ENGINE'), engine)
        .replace(variableExpression('VITE_RECAPTCHA_ENTERPRISE_SITE_KEY'), enterpriseKey)])),
      GITHUB_REPOSITORY: repository,
      PATH: `${directory}:${process.env.PATH}`,
      TEST_BUILD_OUTPUT: output,
      TEST_DOTENV_STORAGE_ENGINE: loadEnv('production', root).VITE_STORAGE_ENGINE,
      TEST_DOTENV_ENTERPRISE_KEY: dotenvEnterpriseKey,
    },
  });
  return JSON.parse(readFileSync(output, 'utf8'));
}

test.each(['firebase', 'supabase', ''])('template deployment honors the storage variable: %s', (engine) => {
  expect(build({ engine }).engine).toBe(engine || loadEnv('production', root).VITE_STORAGE_ENGINE);
});

test('official template deployments use the new Enterprise key', () => {
  expect(build({ repository: 'revisit-studies/template', engine: 'firebase' }).enterpriseKey).toBe('6LeksfUtAAAAADwbkOg-HyN8ZkMD04uIbJvrSWeX');
});

test.each(['revisit-studies/template', 'researcher/my-study'])('%s can override the Enterprise key using a repository variable', (repository) => {
  expect(build({ repository, enterpriseKey: 'custom-enterprise-key' }).enterpriseKey).toBe('custom-enterprise-key');
});

test('forks keep their own .env key and can retain the legacy provider fallback', () => {
  expect(build({ dotenvEnterpriseKey: 'fork-dotenv-key' }).enterpriseKey).toBe('fork-dotenv-key');
  expect(build().enterpriseKey).toBe('');
});
