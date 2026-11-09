import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

const template = parseEnv(readFileSync('.env', 'utf8'));
const upstream = parseEnv(readFileSync(process.argv[2], 'utf8'));
const missing = Object.keys(upstream).filter((name) => !Object.hasOwn(template, name));
if (missing.length) {
  throw new Error(`Template .env is missing upstream variables: ${missing.join(', ')}`);
}
