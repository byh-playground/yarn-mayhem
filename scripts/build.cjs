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
const expectedGamekitModules = [
  { file: 'rendering.js', sha256: '021b11f83b49be3e94cfe0a67769dcd248b9463325b6dcc55ea4943a0ea6c18b' },
  { file: 'vector-assets.js', sha256: '288eadf3830df2836f0b103dc513a906b5b9dbd58660885c18b2a0941d0e877a' },
  { file: 'vector-assets-loader.js', sha256: '56042179b1b669d69d4791c5a1ad7bbd1927d8686fa4e9192504fb248c2170e2' },
  { file: 'input.js', sha256: 'a969755a39702723b35b6a1503e9b2e53a431ea91845017474c979752fdfb51f' },
  { file: 'simloop.js', sha256: 'c25a8f7f4999e4fe8beb6b08167fa4d0934c34098db2bf912335e81db53c4ef8' },
  { file: 'audio.js', sha256: 'f792c0b56b4829d20dfecb03f087bc435e377d9e772a7c5caa3611afef281d20' },
  { file: 'transport.js', sha256: 'cb509226a9644e86857f12e137943bf0cc04c5f4bace4dbdf4137efa6240fc3a' },
  { file: 'interpolation.js', sha256: '061960f311ad57894914186baa01f6b257269637353056ac93f86d34265a4ef8' },
];
if (gamekit.version !== '0.14.3' || gamekit.sourceCommit !== 'dd59a57fcf66409cef16632ffb433c0b760324fa'
    || gamekit.distCommit !== '418e17c455db56d6ed073d82d115191d9dd8bf04'
    || gamekit.officialManifestSha256 !== '20244c2beeee33719f407a9baa92c55a4bd55a0e4eb9f094590bb0eed652296e'
    || JSON.stringify(gamekit.modules) !== JSON.stringify(expectedGamekitModules)) {
  throw new Error('Official GameKit 0.14.3 runtime module pin changed');
}
if (!htmlText.includes('createVectorAssetLoader({ maxEntries: 8 })') || !htmlText.includes('expectedSha256: item.sha256')
    || !htmlText.includes('includeSourcePaths: true') || htmlText.includes('compiled-assets.mjs')
    || htmlText.includes('compileVectorAssetFile')) throw new Error('Runtime must verify and compile source SVGs through the shared startup loader');
if (!htmlText.includes('new YarnSurfaceRenderer(device, { maxSurfaces: 2, maxSurfaceBytes: 1024 * 1024 })')
    || !htmlText.includes('{surfaceRenderer:yarnSurfaceRenderer}') || !htmlText.includes('yarnSurfaceRenderer.dispose()')) {
  throw new Error('Authored shader SVG surfaces must use the shared GameKit surface renderer lifecycle');
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
  gamekitManifestSha256: gamekit.officialManifestSha256,
  gamekitModules: gamekit.modules,
  vectorAssets: sourceManifest,
};
fs.writeFileSync('_site/build.json', JSON.stringify(buildInfo, null, 2));
console.log('Built original SVG sources and browser startup manifest with syntax/provenance checks');
