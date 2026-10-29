const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');

const packageJson = require('../package.json');
const gamekit = require('../docs/gamekit-manifest.json');
const sourceManifest = JSON.parse(fs.readFileSync('docs/vector-assets-manifest.json', 'utf8'));
const html = fs.readFileSync('index.html');
const mainText = fs.readFileSync('src/main.js', 'utf8');
const gamekitBase = 'https://cdn.jsdelivr.net/gh/byh-playground/bloom-gamekit@' + gamekit.distCommit + '/';
// docs/gamekit-manifest.json is the lock file: src/main.js must import exactly the pinned dist and modules.
if (!mainText.includes("const GAMEKIT_DIST = '" + gamekitBase + "'")) throw new Error('Runtime GameKit pin differs from docs/gamekit-manifest.json');
if (!/^[0-9a-f]{40}$/.test(gamekit.distCommit) || !/^[0-9a-f]{40}$/.test(gamekit.sourceCommit)) throw new Error('GameKit pin must be full commit SHAs');
for (const module of gamekit.modules) {
  if (!/^[0-9a-f]{64}$/.test(module.sha256)) throw new Error('GameKit module hash is invalid: ' + module.file);
  if (!mainText.includes("import(GAMEKIT_DIST + '" + module.file + "')")) throw new Error('Pinned GameKit module is not imported: ' + module.file);
}
for (const legacy of ['Renderer2D', 'YarnSurfaceRenderer', 'MeshRenderer', 'createVectorAsset(', '.createPlayer(', 'shaderSurfaces']) {
  if (mainText.includes(legacy)) throw new Error('Legacy GameKit rendering API is still referenced: ' + legacy);
}
if (!mainText.includes('createVectorAssetLoader({ maxEntries: 8 })') || !mainText.includes('expectedSha256: item.sha256')
    || !mainText.includes('includeSourcePaths: true') || mainText.includes('compiled-assets.mjs')
    || mainText.includes('compileVectorAssetFile')) throw new Error('Runtime must verify and compile source SVGs through the shared startup loader');
if (!mainText.includes('new VectorContext(device') || !mainText.includes('createVectorActor(context')) {
  throw new Error('Authored SVG actors must be created on the shared GameKit VectorContext');
}
if (sourceManifest.schemaVersion !== 1 || sourceManifest.compileMode !== 'browser-startup'
    || !Array.isArray(sourceManifest.assets) || sourceManifest.assets.length !== 6) {
  throw new Error('The source manifest must list the six original SVGs');
}
for (const item of sourceManifest.assets) {
  const bytes = fs.readFileSync(item.path);
  if (crypto.createHash('sha256').update(bytes).digest('hex') !== item.sha256) throw new Error('Authored SVG hash mismatch: ' + item.path);
  const text = bytes.toString('utf8');
  const metadataText = text.match(/<metadata id="vector-asset">([\s\S]*?)<\/metadata>/)?.[1];
  if (!metadataText || JSON.parse(metadataText).id !== item.id) throw new Error('Authored SVG metadata id mismatch: ' + item.path);
  if (item.key === 'yarnBody') {
    const style = JSON.parse(metadataText).styles?.find(style => style.target === 'yarn-shell' && style.kind === 'yarn');
    if (style?.backend !== 'shader' || style.pattern !== true || style.fiber !== true || style.thickness !== 9.6) {
      throw new Error('Yarn shell style must use the authored GameKit shader with mobile-visible stitch width');
    }
  }
}

fs.rmSync('_site', { recursive: true, force: true });
const outputDir = path.join('_site', 'assets', 'active-theme');
fs.mkdirSync(outputDir, { recursive: true });
for (const item of sourceManifest.assets) {
  const source = item.path.replace(/^assets\/active-theme\//, '');
  fs.copyFileSync(item.path, path.join(outputDir, source));
}
fs.writeFileSync(path.join(outputDir, 'manifest.json'), JSON.stringify(sourceManifest, null, 2) + '\n');

cp.execFileSync(process.execPath, ['--check', 'src/main.js']);
cp.execFileSync(process.execPath, ['--check', 'src/visual/matrix.js']);
fs.mkdirSync('_site', { recursive: true });
fs.copyFileSync('index.html', '_site/index.html');
fs.cpSync('src', path.join('_site', 'src'), { recursive: true });
fs.writeFileSync('_site/.nojekyll', '');
let localCommit = 'local';
if (!process.env.GITHUB_SHA && fs.existsSync('.git')) localCommit = cp.execFileSync('git', ['rev-parse', 'HEAD']).toString().trim();
const buildInfo = {
  version: packageJson.version,
  commit: process.env.GITHUB_SHA || localCommit,
  htmlSha256: crypto.createHash('sha256').update(html).digest('hex'),
  mainSha256: crypto.createHash('sha256').update(mainText).digest('hex'),
  gamekit: gamekit.distCommit,
  gamekitVersion: gamekit.version,
  gamekitSource: gamekit.sourceCommit,
  gamekitManifestSha256: gamekit.officialManifestSha256,
  gamekitModules: gamekit.modules,
  vectorAssets: sourceManifest,
};
fs.writeFileSync('_site/build.json', JSON.stringify(buildInfo, null, 2));
console.log('Built original SVG sources and browser startup manifest with syntax/provenance checks');
