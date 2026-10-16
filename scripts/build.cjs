const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');

const packageJson = require('../package.json');
const gamekit = require('../docs/gamekit-manifest.json');
const vectorPin = require('../docs/vector-assets-manifest.json');
const html = fs.readFileSync('index.html');
const htmlText = html.toString('utf8');
const gamekitBase = 'https://cdn.jsdelivr.net/gh/byh-playground/bloom-gamekit@' + gamekit.distCommit + '/';
if (!htmlText.includes(gamekitBase)) throw new Error('Runtime GameKit pin differs from docs/gamekit-manifest.json');
if (!htmlText.includes("gamekitDist:'" + gamekit.distCommit + "'") || !htmlText.includes("gamekitVersion:'" + gamekit.version + "'")) {
  throw new Error('Runtime GameKit diagnostics differ from docs/gamekit-manifest.json');
}
for (const module of gamekit.modules) {
  if (!htmlText.includes("import(GAMEKIT_DIST + '" + module.file + "')")) throw new Error('Pinned GameKit module is not imported: ' + module.file);
}

for (const [relative, expected] of Object.entries(vectorPin.files)) {
  const actual = crypto.createHash('sha256').update(fs.readFileSync(relative)).digest('hex');
  if (actual !== expected.sha256) throw new Error('Official GameKit compiler source changed: ' + relative);
}
if (vectorPin.gamekitVersion !== gamekit.version || vectorPin.sourceCommit !== gamekit.sourceCommit) {
  throw new Error('Vector compiler provenance differs from the pinned GameKit source');
}

cp.execFileSync(process.execPath, ['scripts/compile-vector-assets.mjs'], { stdio: 'inherit' });
const outputDir = path.join('_site', 'assets', 'active-theme');
for (const name of ['needle.svg', 'rift-hole.svg', 'rift-pulse.svg', 'yarn-body.svg',  'yarn-face.svg', 'yarn-progress.svg']) {
  fs.copyFileSync(path.join('assets', 'active-theme', name), path.join(outputDir, name));
}
const compiledAssets = JSON.parse(fs.readFileSync(path.join(outputDir, 'manifest.json'), 'utf8'));
if (compiledAssets.compilerVersion !== vectorPin.compilerVersion || compiledAssets.sourceCommit !== gamekit.sourceCommit) {
  throw new Error('Generated vector asset report does not match the official compiler pin');
}

const source = htmlText.match(/<script type="module" data-game-module>([\s\S]*?)<\/script>/);
if (!source) throw new Error('Inline game module was not found');
cp.execFileSync(process.execPath, ['--input-type=module', '--check'], { input: source[1] });
fs.mkdirSync('_site', { recursive: true });
fs.copyFileSync('index.html', '_site/index.html');
fs.writeFileSync('_site/.nojekyll', '');
let localCommit = 'local';
if (!process.env.GITHUB_SHA && fs.existsSync('.git')) {
  localCommit = cp.execFileSync('git', ['rev-parse', 'HEAD']).toString().trim();
}
const buildInfo = {
  version: packageJson.version,
  commit: process.env.GITHUB_SHA || localCommit,
  htmlSha256: crypto.createHash('sha256').update(html).digest('hex'),
  gamekit: gamekit.distCommit,
  gamekitVersion: gamekit.version,
  gamekitSource: gamekit.sourceCommit,
  gamekitModules: gamekit.modules,
  vectorAssets: compiledAssets,
};
fs.writeFileSync('_site/build.json', JSON.stringify(buildInfo, null, 2));
console.log('Built game HTML and official GameKit SVG assets with syntax/provenance checks');


