// @vitest-environment node
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { afterEach, expect, test } from 'vitest';

const root = fileURLToPath(new URL('../../', import.meta.url));
const directories: string[] = [];
afterEach(() => directories.splice(0).forEach((directory) => rmSync(directory, { recursive: true, force: true })));

test('template documents the current Enterprise setting and optional proxy', () => {
  const env = parseEnv(readFileSync(resolve(root, '.env'), 'utf8'));
  expect(env).toHaveProperty('VITE_RECAPTCHA_ENTERPRISE_SITE_KEY');
  expect(env).toHaveProperty('VITE_OPENAI_API_URL');
});

test.each([false, true])('environment parity check rejects missing upstream variables (missing=%s)', (missing) => {
  const directory = mkdtempSync(resolve(tmpdir(), 'revisit-template-env-'));
  directories.push(directory);
  const template = 'VITE_BASE_PATH="/research/"\nVITE_REPO_URL="https://example.com/source/"\nVITE_RECAPTCHA_ENTERPRISE_SITE_KEY="researcher-key"\nVITE_STORAGE_ENGINE="localStorage"\nVITE_FIREBASE_CONFIG=\'\n{ apiKey: "custom-key" }\n\'\n';
  writeFileSync(resolve(directory, '.env'), template + (missing ? '' : 'VITE_NEW_SETTING=""\n'));
  writeFileSync(resolve(directory, 'upstream.env'), 'VITE_STORAGE_ENGINE="firebase"\nVITE_FIREBASE_CONFIG="upstream"\nVITE_NEW_SETTING="default"\n');
  const result = spawnSync(process.execPath, [resolve(root, 'scripts/check-template-env.mjs'), 'upstream.env'], { cwd: directory, encoding: 'utf8' });
  expect(result.status).toBe(missing ? 1 : 0);
  if (missing) expect(result.stderr).toContain('VITE_NEW_SETTING');
  expect(readFileSync(resolve(directory, '.env'), 'utf8')).toBe(template + (missing ? '' : 'VITE_NEW_SETTING=""\n'));
});
