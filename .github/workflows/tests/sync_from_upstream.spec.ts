// @vitest-environment node
import { execFileSync } from 'node:child_process';
import {
  mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, expect, test } from 'vitest';
import { parse } from 'yaml';

type Step = { name: string; run?: string };
const root = fileURLToPath(new URL('../../../', import.meta.url));
const temporaryDirectories: string[] = [];
afterEach(() => temporaryDirectories.splice(0).forEach((directory) => rmSync(directory, { recursive: true, force: true })));

test.each(['sync_from_upstream.yaml', 'sync_from_upstream_test.yaml'])('%s updates tutorial schemas without replacing their content', (file) => {
  const workflow = parse(readFileSync(resolve(root, '.github/workflows', file), 'utf8')) as { jobs: { sync: { steps: Step[] } } };
  const step = workflow.jobs.sync.steps.find(({ name }) => name === 'Reset global.json to template state with upstream schema version')!;
  const directory = mkdtempSync(resolve(tmpdir(), 'revisit-template-sync-'));
  temporaryDirectories.push(directory);
  mkdirSync(resolve(directory, 'public/tutorial/_answers'), { recursive: true });
  const schema = 'https://example.com/v9/src/parser/GlobalConfigSchema.json';
  writeFileSync(resolve(directory, 'public/global.json'), JSON.stringify({ $schema: schema, configsList: ['upstream-demo'], configs: { demo: {} } }));
  const files = ['config.json', 'replication-config.json', '_answers/config.json', '_answers/replication-config.json'];
  files.forEach((name) => writeFileSync(resolve(directory, 'public/tutorial', name), JSON.stringify({ $schema: 'old', studyMetadata: { title: name }, sequence: { components: ['custom'] } })));
  execFileSync('bash', ['-e', '-c', step.run!], { cwd: directory });
  expect(JSON.parse(readFileSync(resolve(directory, 'public/global.json'), 'utf8'))).toEqual({ $schema: schema, configsList: [], configs: {} });
  files.forEach((name) => expect(JSON.parse(readFileSync(resolve(directory, 'public/tutorial', name), 'utf8'))).toEqual({
    $schema: schema.replace('GlobalConfigSchema.json', 'StudyConfigSchema.json'),
    studyMetadata: { title: name },
    sequence: { components: ['custom'] },
  }));
});

test.each(['sync_from_upstream.yaml', 'sync_from_upstream_test.yaml'])('%s keeps only the tutorial and shared folders', (file) => {
  const workflow = parse(readFileSync(resolve(root, '.github/workflows', file), 'utf8')) as { jobs: { sync: { steps: Step[] } } };
  const step = workflow.jobs.sync.steps.find(({ name }) => name === 'Remove study/demo folders not included in template')!;
  const directory = mkdtempSync(resolve(tmpdir(), 'revisit-template-prune-'));
  temporaryDirectories.push(directory);
  const retained = [
    'public/tutorial/config.json', 'public/libraries/vlat/config.json', 'public/revisitAssets/logo.svg',
    'public/revisitUtilities/revisit-communicate.js', 'public/404.html', 'public/vite.svg', 'public/global.json', 'public/README.md',
    'src/public/tutorial/Example.tsx', 'src/public/libraries/drawing/assets/Drawing.tsx',
    'src/public/example-brush-interactions/assets/BrushPlot.tsx',
  ];
  const removed = [
    'public/demo-video/video.mp4', 'public/test-global-store/config.json', 'public/library-drawing/config.json',
    'public/libraries/test/config.json', 'src/public/libraries/test/assets/test.tsx',
    'src/public/demo-dynamic/assets/dynamic.tsx', 'src/public/test-step-logic/func.ts',
    'tests/demo.spec.ts', 'scripts/tests/release.spec.ts',
  ];
  [...retained, ...removed].forEach((path) => {
    mkdirSync(resolve(directory, path, '..'), { recursive: true });
    writeFileSync(resolve(directory, path), 'fixture');
  });
  execFileSync('bash', ['-e', '-c', step.run!], { cwd: directory });
  retained.forEach((path) => expect(readFileSync(resolve(directory, path), 'utf8')).toBe('fixture'));
  removed.forEach((path) => expect(() => readFileSync(resolve(directory, path))).toThrow());
});

test.each(['sync_from_upstream.yaml', 'sync_from_upstream_test.yaml'])('%s removes framework development files but keeps template tests', (file) => {
  const workflow = parse(readFileSync(resolve(root, '.github/workflows', file), 'utf8')) as { jobs: { sync: { steps: Step[] } } };
  const step = workflow.jobs.sync.steps.find(({ name }) => name === 'Remove framework development files')!;
  const directory = mkdtempSync(resolve(tmpdir(), 'revisit-template-framework-'));
  temporaryDirectories.push(directory);
  const retained = [
    'src/parser/parser.ts', 'src/public/libraries/drawing/assets/Drawing.tsx', 'supabase/migrations/init.sql',
    '.github/workflows/tests/sync_from_upstream.spec.ts', 'scripts/tests/check-template-env.spec.ts',
    'scripts/check-lockfile-drift.mjs', '.github/workflows/lint_build.yaml',
  ];
  const removed = [
    'src/parser/tests/parser.spec.ts', 'src/tests/utils.ts', 'src/public/libraries/drawing/assets/tests/fixtures.ts',
    'public/revisitUtilities/tests/revisit-communicate.spec.ts', 'supabase/tests/admission-fence.spec.sh',
    'typedocDocuments/tests/Revisit.postAnswers.spec.ts', '.agents/skills/babysit/SKILL.md', 'AGENTS.md',
    '.github/ISSUE_TEMPLATE/bug_report.md', 'LibraryDocGenerator.spec.ts', 'LibraryExampleStudyGenerator.spec.ts',
    'libraryDocGenerator.cjs', 'libraryExampleStudyGenerator.cjs', 'typedoc.json', 'tsconfig.typedoc.json',
    'typedocReadMe.md', 'scripts/clear-out-firebase.sh', 'scripts/find-revisit-users.sh',
    '.github/workflows/vitest.yml', '.github/workflows/dependency-lock-drift.yml',
  ];
  [...retained, ...removed].forEach((path) => {
    mkdirSync(resolve(directory, path, '..'), { recursive: true });
    writeFileSync(resolve(directory, path), 'fixture');
  });
  execFileSync('bash', ['-e', '-c', step.run!], { cwd: directory });
  retained.forEach((path) => expect(readFileSync(resolve(directory, path), 'utf8')).toBe('fixture'));
  removed.forEach((path) => expect(() => readFileSync(resolve(directory, path))).toThrow());
});

test.each(['sync_from_upstream.yaml', 'sync_from_upstream_test.yaml'])('%s preserves template routing, environment checks, and workflow tests after an upstream reset', (file) => {
  const workflow = parse(readFileSync(resolve(root, '.github/workflows', file), 'utf8')) as { jobs: { sync: { steps: Step[] } } };
  const step = workflow.jobs.sync.steps.find(({ name }) => name === 'Restore template-specific files')!;
  const directory = mkdtempSync(resolve(tmpdir(), 'revisit-template-restore-'));
  temporaryDirectories.push(directory);
  const files = [
    '.env', 'README.md', '.github/workflows/deploy_website.yaml', 'public/README.md',
    'public/tutorial/config.json', 'src/public/tutorial/Example.tsx',
    '.github/workflows/sync_from_upstream.yaml', '.github/workflows/sync_from_upstream_test.yaml',
    '.github/workflows/tests/deploy_website.spec.ts', '.github/workflows/tests/sync_from_upstream.spec.ts',
    '.github/workflows/tests/404.spec.ts', 'public/404.html',
    'scripts/check-template-env.mjs', 'scripts/tests/check-template-env.spec.ts',
  ];
  const git = (...args: string[]) => execFileSync('git', args, { cwd: directory, encoding: 'utf8', stdio: 'pipe' });
  git('init', '--initial-branch=main');
  git('config', 'user.name', 'Test');
  git('config', 'user.email', 'test@example.com');
  git('config', 'core.hooksPath', '/dev/null');
  files.forEach((path) => {
    mkdirSync(resolve(directory, path, '..'), { recursive: true });
    writeFileSync(resolve(directory, path), `template:${path}`);
  });
  git('add', '.');
  git('commit', '-m', 'Template customizations');
  const templateHead = git('rev-parse', 'HEAD').trim();
  files.forEach((path) => writeFileSync(resolve(directory, path), `upstream:${path}`));
  rmSync(resolve(directory, '.github/workflows/tests/sync_from_upstream.spec.ts'));
  git('add', '-A');
  git('commit', '-m', 'Upstream reset');
  execFileSync('bash', ['-e', '-c', step.run!], { cwd: directory, env: { ...process.env, TEMPLATE_HEAD: templateHead } });
  files.forEach((path) => expect(readFileSync(resolve(directory, path), 'utf8')).toBe(`template:${path}`));
});
