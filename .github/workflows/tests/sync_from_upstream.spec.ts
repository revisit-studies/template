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

test.each(['sync_from_upstream.yaml', 'sync_from_upstream_test.yaml'])('%s retains unit fixtures while removing demo media and release-only tests', (file) => {
  const workflow = parse(readFileSync(resolve(root, '.github/workflows', file), 'utf8')) as { jobs: { sync: { steps: Step[] } } };
  const step = workflow.jobs.sync.steps.find(({ name }) => name === 'Remove study/demo folders not included in template')!;
  const directory = mkdtempSync(resolve(tmpdir(), 'revisit-template-prune-'));
  temporaryDirectories.push(directory);
  const retained = [
    'public/test-response-functions/config.json', 'public/test-global-store/config.json',
    'public/test-global-store-operations/config.json', 'public/test-global-store-failures/config.json',
    'public/demo-templating/config.json', 'public/demo-calvi-study/config.json', 'public/library-drawing/config.json',
    'public/test-factors/config.json', 'public/test-markdown-factors/config.json', 'public/demo-stroop-factors/config.json',
    'public/test-max-study2/config.json', 'public/demo-dsf-study/config.json', 'public/demo-ffl-study/config.json',
    'public/incentives-corr/config.json', 'public/demo-training/config.json', 'public/demo-answer-feedback/config.json',
    'src/public/test-response-functions/assets/GameScore.ts', 'src/public/demo-form-elements/assets/CustomResponseCard.tsx',
    'src/public/demo-dynamic/assets/dynamic.tsx', 'src/public/test-global-store/assets/dynamic.tsx',
    'src/public/demo-react-trrack/assets/DemoReactTrrack.tsx', 'src/public/demo-templating/assets/GlobalBudget.tsx',
    'src/public/test-step-logic/func.ts', 'src/public/test-factors/assets/Factors.tsx',
    'src/public/test-max-study2/assets/DataExplorer.tsx', 'src/public/demo-dsf-study/assets/DataSerializationTask.tsx',
    'src/public/demo-ffl-study/assets/FormulaAuthoringTask.tsx',
  ];
  const removed = ['public/demo-video/video.mp4', 'public/incentives-corr/assets/image.jpg', 'src/public/demo-upset/Unused.tsx', 'tests/demo.spec.ts', 'scripts/tests/release.spec.ts', 'src/parser/tests/feedbackExamples.spec.ts'];
  [...retained, ...removed].forEach((path) => {
    mkdirSync(resolve(directory, path, '..'), { recursive: true });
    writeFileSync(resolve(directory, path), 'fixture');
  });
  execFileSync('bash', ['-e', '-c', step.run!], { cwd: directory });
  retained.forEach((path) => expect(readFileSync(resolve(directory, path), 'utf8')).toBe('fixture'));
  removed.forEach((path) => expect(() => readFileSync(resolve(directory, path))).toThrow());
});
