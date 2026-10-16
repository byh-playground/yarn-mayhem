const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');

const packageJson = require('../package.json');
const gamekit = require('../docs/gamekit-manifest.json');
const sourceManifest = JSON.parse(fs.readFileSync('docs/vector-assets-manifest.json', 'utf8'));
const html = fs.readFileSync('index.html');
const htmlText = html.toString('utf8');
const gamekitBase = 'https://cdn.jsdelivr.net/gh/byh-playground/bloom-gamekit@' + gamekit.distCommit + '/';
if (!htmlText.includes(gamekitBase) || !htmlText.includes("gamekitDist:'" + gamekit.distCommit + "'")
    || !htmlText.includes("gamekitVersion:'" + gamekit.version + "'")) throw new Error('Runtime GameKit pin differs from docs/gamekit-manifest.json');
for (const module of gamekit.modules) {
  if (!htmlText.includes("import(GAMEKIT_DIST + '" + module.file + "')")) throw new Error('Pinned GameKit module is not imported: ' + module.file);
}
if (gamekit.version !== '0.10.4' || gamekit.sourceCommit !== '0abe586967704e193a5e85b6b0c598e58bbf193b'
    || gamekit.distCommit !== '95d8676e3eaaa9f80aeed2e3361e258381511c77'
    || gamekit.officialManifestSha256 !== '64699fdd06eef0f94e874703cbb9f7e87c5f1ef067c68241b7dc17d9b172f625') {
  throw new Error('Official GameKit 0.10.4 startup SVG loader pin changed');
}
const loaderModule = gamekit.modules.find(module => module.file === 'vector-assets-loader.js');
if (!loaderModule || loaderModule.sha256 !== 'bdc951f4f6b912a9beea98c2d6056c437064a4e08f4602ede92a2ecbd47e47cf') {
  throw new Error('Official browser SVG loader module pin changed');
}
if (!htmlText.includes('createVectorAssetLoader({ maxEntries: 8 })') || !htmlText.includes('expectedSha256: item.sha256')
    || !htmlText.includes('includeSourcePaths: true') || htmlText.includes('compiled-assets.mjs')
    || htmlText.includes('compileVectorAssetFile')) throw new Error('Runtime must verify and compile source SVGs through the shared startup loader');
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

const source = htmlText.match(/<script type="module" data-game-module>([\s\S]*?)<\/script>/);
if (!source) throw new Error('Inline game module was not found');
cp.execFileSync(process.execPath, ['--input-type=module', '--check'], { input: source[1] });
fs.mkdirSync('_site', { recursive: true });
fs.copyFileSync('index.html', '_site/index.html');
fs.writeFileSync('_site/.nojekyll', '');
let localCommit = 'local';
if (!process.env.GITHUB_SHA && fs.existsSync('.git')) localCommit = cp.execFileSync('git', ['rev-parse', 'HEAD']).toString().trim();
const buildInfo = {
  version: packageJson.version,
  commit: process.env.GITHUB_SHA || localCommit,
  htmlSha256: crypto.createHash('sha256').update(html).digest('hex'),
  gamekit: gamekit.distCommit,
  gamekitVersion: gamekit.version,
  gamekitSource: gamekit.sourceCommit,
  gamekitModules: gamekit.modules,
  vectorAssets: sourceManifest,
};
fs.writeFileSync('_site/build.json', JSON.stringify(buildInfo, null, 2));
console.log('Built original SVG sources and browser startup manifest with syntax/provenance checks');
