import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileVectorAssetFile, compiledAssetModuleSource } from './vector-assets/compiler.js';
import { VECTOR_ASSET_COMPILER_VERSION, VECTOR_ASSET_SCHEMA_VERSION } from './vector-assets/schema.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = join(root, 'assets', 'active-theme');
const outputDir = join(root, '_site', 'assets', 'active-theme');
const expectedFiles = ['needle.svg', 'rift-pulse.svg', 'yarn-face.svg'];
const files = (await readdir(sourceDir)).filter(name => name.endsWith('.svg')).sort();
if (files.join('\n') !== expectedFiles.join('\n')) throw new Error('Active theme SVG inventory differs from the verified set');

const exports = [];
const records = [];
const ids = new Set();
for (const name of files) {
  const relative = 'assets/active-theme/' + name;
  const absolute = join(root, relative);
  const asset = await compileVectorAssetFile(absolute, relative);
  const id = asset.metadata.id;
  if (!/^[a-z][a-z0-9_-]*$/.test(id) || ids.has(id)) throw new Error('Invalid or duplicate vector asset id: ' + id);
  ids.add(id);
  const exportName = id.replace(/[^A-Za-z0-9_$]/g, '_');
  const key = id.replace(/-([a-z0-9])/g, (_, letter) => letter.toUpperCase());
  const sourceSha256 = createHash('sha256').update(await readFile(absolute)).digest('hex');
  exports.push('// Source: ' + relative + '; SHA-256: ' + sourceSha256);
  exports.push(await compiledAssetModuleSource(asset, exportName));
  records.push({
    id, key, exportName, file: name, sourceSha256,
    partCount: asset.geometry.partCount,
    vertexCount: asset.geometry.vertices.length / asset.geometry.strideFloats,
    geometryBytes: asset.geometry.vertices.byteLength,
  });
}
exports.push('export const ACTIVE_THEME_ASSETS = Object.freeze({ ' + records.map(record => record.key + ': ' + record.exportName).join(', ') + ' });');
await mkdir(outputDir, { recursive: true });
await writeFile(join(outputDir, 'compiled-assets.mjs'), exports.join('\n'), 'utf8');
const report = {
  schemaVersion: VECTOR_ASSET_SCHEMA_VERSION,
  compilerVersion: VECTOR_ASSET_COMPILER_VERSION,
  sourceCommit: '2cb587b70d32bdb40379e15ba7f2f4744e2c8594',
  assets: records.map(({ key, exportName, ...record }) => record),
};
await writeFile(join(outputDir, 'manifest.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log('Compiled ' + records.length + ' active-theme SVGs with GameKit compiler ' + VECTOR_ASSET_COMPILER_VERSION);
