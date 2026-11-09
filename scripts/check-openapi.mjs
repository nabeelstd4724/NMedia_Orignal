import { readFileSync } from 'node:fs';
const spec = JSON.parse(readFileSync(new URL('../openapi.json', import.meta.url), 'utf8'));
if (spec.openapi !== '3.0.3' || !spec.info?.title || !spec.paths || Object.keys(spec.paths).length < 20) throw new Error('openapi.json is missing required contract metadata or paths');
for (const [path, operations] of Object.entries(spec.paths)) {
  if (!path.startsWith('/')) throw new Error(`Invalid OpenAPI path: ${path}`);
  if (!operations || typeof operations !== 'object') throw new Error(`Invalid operations for ${path}`);
}
console.log(`OpenAPI contract valid (${Object.keys(spec.paths).length} paths)`);
