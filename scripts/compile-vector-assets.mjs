import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileVectorAssetFile, compiledAssetModuleSource } from './vector-assets/compiler.js';
import { VECTOR_ASSET_COMPILER_VERSION, VECTOR_ASSET_SCHEMA_VERSION } from './vector-assets/schema.js';

// This fan is only the authored SVG shell fill; the GameKit shader draws all live fibers.
function createYarnShellFan(asset) {
  const style = asset.metadata.styles?.find(item => item.kind === 'yarn' && item.target);
  const path = style && asset.sourcePaths.find(item => item.id === style.target);
  if (!path || path.subpaths?.length !== 1 || path.subpaths[0].closed !== true) {
    throw new Error('Yarn surface needs one closed SVG-authored contour');
  }
  const points = path.subpaths[0].points.map(point => [Number(point[0]), Number(point[1])]);
  if (points.length > 3 && Math.hypot(points[0][0] - points.at(-1)[0], points[0][1] - points.at(-1)[1]) < 1e-6) points.pop();
  if (points.length < 16 || points.some(point => !point.every(Number.isFinite))) throw new Error('Yarn SVG contour is incomplete');
  let area2 = 0, cx = 0, cy = 0, turn = 0;
  for (let index = 0; index < points.length; index++) {
    const a = points[index], b = points[(index + 1) % points.length], c = points[(index + 2) % points.length];
    const cross = a[0] * b[1] - b[0] * a[1];
    area2 += cross; cx += (a[0] + b[0]) * cross; cy += (a[1] + b[1]) * cross;
    const bend = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (Math.abs(bend) > 1e-7) {
      if (turn && Math.sign(bend) !== turn) throw new Error('Yarn surface fan requires the authored contour to be convex');
      turn = Math.sign(bend);
    }
  }
  if (Math.abs(area2) < 1e-6) throw new Error('Yarn SVG contour has zero area');
  const centerX = cx / (3 * area2), centerY = cy / (3 * area2);
  const fill = [], white = [1, 1, 1, 1];
  for (let index = 0; index < points.length; index++) {
    const a = points[index], b = points[(index + 1) % points.length];
    fill.push(centerX, centerY, ...white, a[0], a[1], ...white, b[0], b[1], ...white);
  }
  return Object.freeze({ fillVertices: Float32Array.from(fill), outline: Float32Array.from(points.flat()) });
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = join(root, 'assets', 'active-theme');
const outputDir = join(root, '_site', 'assets', 'active-theme');
const expectedFiles = ['needle.svg', 'rift-hole.svg', 'rift-pulse.svg', 'yarn-body.svg',  'yarn-face.svg', 'yarn-progress.svg'];
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
  if (id === 'yarn-body') asset.yarnSurface = createYarnShellFan(asset);

  const exportName = id.replace(/[^A-Za-z0-9_$]/g, '_');
  const key = id.replace(/-([a-z0-9])/g, (_, letter) => letter.toUpperCase());
  const sourceSha256 = createHash('sha256').update(await readFile(absolute)).digest('hex');
  exports.push('// Source: ' + relative + '; SHA-256: ' + sourceSha256);
  exports.push(await compiledAssetModuleSource(asset, exportName));
  records.push({
    id, key, exportName, file: name, sourceSha256,
    partCount: asset.geometry.partCount,
    vertexCount: asset.geometry.vertices.length / asset.geometry.strideFloats,
    geometryBytes: asset.geometry.vertices.byteLength + (asset.geometry.indices?.byteLength ?? 0),
    surfaceVertexCount: asset.yarnSurface ? asset.yarnSurface.fillVertices.length / 6 : 0,
    surfaceBytes: asset.yarnSurface ? asset.yarnSurface.fillVertices.byteLength + asset.yarnSurface.outline.byteLength : 0,
  });
}
exports.push('export const ACTIVE_THEME_ASSETS = Object.freeze({ ' + records.map(record => record.key + ': ' + record.exportName).join(', ') + ' });');
await mkdir(outputDir, { recursive: true });
await writeFile(join(outputDir, 'compiled-assets.mjs'), exports.join('\n'), 'utf8');
const report = {
  schemaVersion: VECTOR_ASSET_SCHEMA_VERSION,
  compilerVersion: VECTOR_ASSET_COMPILER_VERSION,
  sourceCommit: '4150109c7732a734e155b6d1e2cd83c13c1f1d0c',
  assets: records.map(({ key, exportName, ...record }) => record),
};
await writeFile(join(outputDir, 'manifest.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log('Compiled ' + records.length + ' active-theme SVGs with GameKit compiler ' + VECTOR_ASSET_COMPILER_VERSION);

