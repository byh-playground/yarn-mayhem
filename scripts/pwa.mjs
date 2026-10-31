// Generates the installable-app files (manifest.webmanifest, sw.js, pwa/*.png, <head> tags in index.html)
// with the pinned GameKit pwa generator. `node scripts/pwa.mjs` writes them; `--check` only verifies the committed output.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const GAMEKIT = JSON.parse(readFileSync('docs/gamekit-manifest.json', 'utf8'));
const TOOL = GAMEKIT.tools.find((tool) => tool.file === 'pwa-build.mjs');
const TOOL_SHA256 = createHash('sha256').update(readFileSync(TOOL.path)).digest('hex');
if (TOOL_SHA256 !== TOOL.sha256) {
    throw new Error(`${TOOL.path} differs from the pinned GameKit ${GAMEKIT.version} pwa-build.mjs (sha256 ${TOOL_SHA256})`);
}
const { buildPwa } = await import(new URL('../' + TOOL.path, import.meta.url));

const RESULT = await buildPwa({
    chromium,
    name: '털실 대소동 / Yarn Mayhem',
    shortName: '털실 대소동',
    description: '바늘로 합체·분열하는 털실 적을 상대하는 횡스크롤 액션 RPG입니다.',
    lang: 'ko',
    icon: 'assets/pwa/icon.svg',
    maskableIcon: 'assets/pwa/icon-maskable.svg',
    share: 'assets/pwa/share.svg',
    themeColor: '#142b31',
    backgroundColor: '#142b31',
    startUrl: './',
    scope: './',
    siteUrl: 'https://byh-playground.github.io/yarn-mayhem/',
    html: 'index.html',
    precache: ['index.html', 'src/**', 'assets/active-theme/**'],
    out: '.',
    check: process.argv.includes('--check'),
});
console.log(RESULT.changed.length ? 'PWA files written: ' + RESULT.changed.join(', ') : 'PWA files are up to date');
