const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createGameServer } = require('./game-server.cjs');

const outputDir = path.resolve(process.env.YARN_TEST_OUTPUT || 'test-results/vector-assets-0204');
fs.mkdirSync(outputDir, { recursive: true });
const baselineHtml = process.env.YARN_TEST_BASELINE_HTML ? path.resolve(process.env.YARN_TEST_BASELINE_HTML) : null;
const servers = [createGameServer()];
let baselineTestHtml = null;
if (baselineHtml && fs.existsSync(baselineHtml)) {
  let html = fs.readFileSync(baselineHtml, 'utf8');
  const stopHook = 'qaStopSimulation:()=>loop?.stop(),';
  if (!html.includes('qaSetTime:') || !html.includes('qaTimeMs:') || !html.includes('qaRender:')) {
    if (!html.includes(stopHook)) throw new Error('Baseline QA stop hook is missing; cannot synchronize its display clock');
    if (!html.includes('qaSetTime:'))
    html = html.replace(stopHook, 'qaSetTime:ms=>{if(!Number.isFinite(ms)||ms<0)return false;state.timeMs=ms;capturePresentation();return true;},'+stopHook);
    if (!html.includes('qaTimeMs:'))
      html = html.replace(stopHook, 'qaTimeMs:()=>state.timeMs,'+stopHook);
    if (!html.includes('qaRender:'))
      html = html.replace(stopHook, 'qaRender:()=>renderFrame(),'+stopHook);
  }
  baselineTestHtml = path.join(outputDir, 'baseline-0.20.4.qa.html');
  fs.writeFileSync(baselineTestHtml, html);
  const baselinePublicRoot = process.env.YARN_TEST_BASELINE_ASSET_ROOT
    ? path.resolve(process.env.YARN_TEST_BASELINE_ASSET_ROOT)
    : null;
  if (!baselinePublicRoot || !fs.existsSync(path.join(baselinePublicRoot, 'assets', 'active-theme', 'compiled-assets.mjs')))
    throw new Error('The legacy baseline needs its matching compiled-assets.mjs via YARN_TEST_BASELINE_ASSET_ROOT');
  servers.push(createGameServer({ htmlPath: baselineTestHtml, publicRoot: baselinePublicRoot }));
}
const report = { status: 'RUNNING', browser: null, comparisons: [], errors: [], consoleErrors: [], requestFailures: [] };
const check = (name, ok, evidence) => {
  report.comparisons.push({ name, status: ok ? 'PASS' : 'FAIL', evidence });
  assert.ok(ok, name);
};

async function runScene(browser, server, tag, mobile) {
  const context = await browser.newContext({
    viewport: mobile ? { width: 844, height: 390 } : { width: 1280, height: 844 },
    isMobile: mobile,
    hasTouch: mobile,
  });
  await context.addInitScript(() => { globalThis.__YARN_MAYHEM_QA = true; });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(`${tag}: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push(`${tag}: ${message.text()}`); });
  page.on('requestfailed', request => report.requestFailures.push({ tag, url: request.url(), error: request.failure()?.errorText }));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  try {
    await page.waitForFunction(() => !!window.__YARN_MAYHEM, null, { timeout: 15000 });
  } catch (error) {
    const state = await page.evaluate(() => ({ loading: document.querySelector('#loading')?.hidden,
      error: document.querySelector('#error')?.textContent, body: document.body.innerText.slice(0, 500) }));
    await page.screenshot({ path: path.join(outputDir, `${tag}-load-failure.png`) }).catch(() => {});
    throw new Error(`${error.message}; browser state: ${JSON.stringify(state)}`);
  }
  await page.waitForFunction(() => document.querySelector('#loading')?.hidden === true, null, { timeout: 30000 });
  await page.waitForTimeout(500);
  const bootState = await page.evaluate(() => ({ loadingHidden: document.querySelector('#loading')?.hidden,
    loadingDisplay: getComputedStyle(document.querySelector('#loading')).display,
    error: document.querySelector('#error')?.textContent, ready: !!window.__YARN_MAYHEM,
    phase: window.__YARN_MAYHEM?.snapshot().phase }));
  if (!bootState.loadingHidden || bootState.error) {
    await page.screenshot({ path: path.join(outputDir, `${tag}-boot-failure.png`) }).catch(() => {});
    throw new Error(`${tag}: game boot did not remain ready: ${JSON.stringify(bootState)}`);
  }
  try { await page.locator('#mainButton').click({ timeout: 10000 }); }
  catch (error) {
    const state = await page.evaluate(() => ({ loadingHidden: document.querySelector('#loading')?.hidden,
      loadingDisplay: getComputedStyle(document.querySelector('#loading')).display,
      error: document.querySelector('#error')?.textContent, ready: !!window.__YARN_MAYHEM,
      phase: window.__YARN_MAYHEM?.snapshot().phase }));
    await page.screenshot({ path: path.join(outputDir, `${tag}-menu-click-failure.png`) }).catch(() => {});
    throw new Error(`${error.message}; menu click state: ${JSON.stringify(state)}; console errors: ${JSON.stringify(report.consoleErrors)}`);
  }
  await page.locator('#soloStart').click();
  await page.waitForFunction(() => __YARN_MAYHEM.snapshot().phase === 'PLAYING');
  const setup = await page.evaluate(() => {
    const q = __YARN_MAYHEM;
    q.qaStopSimulation();
    q.qaQuietArena();
    q.qaClearEnemies();
    q.qaClearRifts();
    const p = q.qaPlayers()[0];
    const targetX = Math.max(130, Math.min(q.snapshot().world.width - 300, p.x - 100));
    q.qaPlayer(targetX, q.snapshot().world.groundY - 38);
    const y = q.snapshot().world.groundY - 130;
    const large = q.qaSpawn(10, targetX + 315, y);
    const small = q.qaSpawn(1, targetX + 82, y);
    const emerging = q.qaSpawn(1, targetX + 170, y, { fromHole: true });
    for (const enemy of [small, large, emerging]) q.qaSetEnemyGoal(enemy.id, 'none');
    q.qaNeedle(0);
    const rift = q.qaSpawnRift('background');
    if (!rift) throw new Error('No deterministic background rift site was available');
    q.qaSetTime(120);
    const snap = q.snapshot();
    return { player: q.qaPlayers()[0], enemies: q.qaEnemies(), rift, world: snap.world, mapSeed: snap.mapSeed, timeMs: q.qaTimeMs() };
  });
  await page.waitForTimeout(180);
  await page.evaluate(() => __YARN_MAYHEM.qaRender());
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.screenshot({ path: path.join(outputDir, `${tag}.png`) });
  const measurements = await page.evaluate(() => {
    const q = __YARN_MAYHEM;
    return { fps: q.snapshot().fps, viewport: { width: innerWidth, height: innerHeight }, stats: q.qaVectorStats?.() ?? null };
  });
  if (measurements.stats?.assets?.some(asset => asset.name === 'yarnProgress')) {
    const previousPulseDraws = measurements.stats.totalDrawsByAsset.riftPulse;
    const pulse = await page.evaluate(() => {
      const q = __YARN_MAYHEM;
      q.qaClearEnemies(); q.qaClearRifts();
      const hole = q.qaSpawnRift('background');
      if (!hole) return null;
      q.qaSetTime(880); q.qaForceSpawns(); q.qaSetTime(940);
      return hole;
    });
    if (!pulse) throw new Error(`${tag}: no background rift selected for the pulse fixture`);
    await page.waitForTimeout(180);
    await page.evaluate(() => __YARN_MAYHEM.qaRender());
    await page.waitForFunction(previous => __YARN_MAYHEM.qaVectorStats().totalDrawsByAsset.riftPulse > previous,
      previousPulseDraws, { timeout: 5000 });
    await page.screenshot({ path: path.join(outputDir, `${tag}-rift-pulse-0205.png`) });
    measurements.riftPulse = await page.evaluate(() => __YARN_MAYHEM.qaVectorStats());
    await page.evaluate(() => {
      const q = __YARN_MAYHEM;
      q.qaJoinActor('svg-progress-fixture');
      q.qaDamagePlayer('svg-progress-fixture', 9999);
      q.qaSetTime(1800);
    });
    await page.waitForTimeout(180);
    await page.evaluate(() => __YARN_MAYHEM.qaRender());
    await page.waitForFunction(previous => __YARN_MAYHEM.qaVectorStats().drawsByAsset.yarnProgress > previous,
      measurements.riftPulse.drawsByAsset.yarnProgress, { timeout: 5000 });
    measurements.progress = await page.evaluate(() => __YARN_MAYHEM.qaVectorStats());
    await page.screenshot({ path: path.join(outputDir, `${tag}-revive-progress-0205.png`) });
  }
  await context.close();
  return { setup, measurements };
}

(async () => {
  let browser;
  const timeout = setTimeout(() => process.exit(2), 90000);
  try {
    if (baselineHtml && servers.length !== 2) throw new Error(`Baseline HTML is missing: ${baselineHtml}`);
    for (const server of servers) await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    report.browser = browser.version();
    for (const mobile of [false, true]) {
      const tag = mobile ? 'landscape-touch' : 'edge-desktop';
      const current = await runScene(browser, servers[0], `${tag}-runtime-0205`, mobile);
      const baseline = servers[1] ? await runScene(browser, servers[1], `${tag}-baseline-0200`, mobile) : null;
      const stats = current.measurements.stats;
      const assets = stats?.assets ?? [];
      const renderer = stats?.renderer ?? {};
      const yarnSurface = stats?.yarnSurface ?? {};
      check(`${tag}: GameKit YarnSurfaceRenderer draws the authored yarn contour`, yarnSurface.state === 'ready' && yarnSurface.surfaceCount === 2 && yarnSurface.fiberEnabled === true && yarnSurface.patternEnabled === false && yarnSurface.outlinePoints >= 32 && yarnSurface.fillVertices >= 96 && yarnSurface.draws > 0, yarnSurface);
      check(`${tag}: visible high-tier enemy is present`, current.setup.enemies.some(enemy => enemy.tier === 10), current.setup);
      if (baseline) {
        check(`${tag}: baseline and candidate use the same map seed and display time`,
          current.setup.mapSeed === baseline.setup.mapSeed && current.setup.timeMs === baseline.setup.timeMs && current.setup.timeMs === 120,
          { baseline: { mapSeed: baseline.setup.mapSeed, timeMs: baseline.setup.timeMs }, current: { mapSeed: current.setup.mapSeed, timeMs: current.setup.timeMs } });
      }
      check(`${tag}: all six retained character, prop and UI SVG meshes load`,
        ['yarnBody','yarnFace','needle','riftHole','riftPulse','yarnProgress'].every(name => assets.some(asset => asset.name === name && asset.bytes > 0 && asset.parts > 0)) &&
          Number(renderer.instances) > 0 && Number(renderer.draws) > 0,
        { assets, renderer });
      check(`${tag}: yarn body, face and needle meshes draw in the play scene`,
        stats.drawsByAsset.yarnBody >= 4 && stats.drawsByAsset.yarnFace >= 4 && stats.drawsByAsset.needle > 0,
        { drawsByAsset: stats.drawsByAsset });
      const expectedActors = [
        { id: `player:${current.setup.player.id}`, required: { yarnBody: 1, yarnFace: 1, needle: 1 } },
        ...current.setup.enemies.map(enemy => ({ id: `enemy:${enemy.id}`, required: { yarnBody: 1, yarnFace: 1 } })),
      ];
      const actorDraws = stats.actorDraws ?? {};
      const actorDrawsMatch = expectedActors.every(({ id, required }) =>
        Object.entries(required).every(([asset, count]) => actorDraws[id]?.[asset] === count)) &&
        Object.entries(actorDraws).filter(([id]) => id.startsWith('enemy:')).every(([, draws]) => draws.yarnBody === 1 && draws.yarnFace === 1);
      check(`${tag}: actor telemetry records exactly one body and face draw per visible actor`, actorDrawsMatch,
        { expectedActors, actorDraws });
      const batchingSupported = !renderer.instanced || renderer.draws < renderer.instances;
      check(`${tag}: adjacent identical face poses share an instanced draw`, batchingSupported,
        { renderer, faceDrawCalls: stats.drawsByAsset.yarnFace, actorDraws });
      check(`${tag}: rift pulse clip draws after a controlled spawn`,
        current.measurements.riftPulse?.totalDrawsByAsset.riftPulse > stats.totalDrawsByAsset.riftPulse,
        { previous: stats.totalDrawsByAsset.riftPulse, duringPop: current.measurements.riftPulse });
      check(`${tag}: revive progress is drawn from its SVG asset`,
        current.measurements.progress?.drawsByAsset.yarnProgress > 0,
        { drawsByAsset: current.measurements.progress?.drawsByAsset });
      const retainedBytes = assets.reduce((sum, asset) => sum + asset.bytes, 0) + Number(yarnSurface.retainedBytes ?? 0);
      check(`${tag}: retained vector and yarn surface geometry stays below 4 MiB`,
        retainedBytes < 4 * 1024 * 1024,
        { bytes: retainedBytes, assets, yarnSurface });
      report.comparisons.push({
        name: baseline ? `${tag}: v0.20.4 baseline versus yarn surface capture` : `${tag}: yarn surface visual/performance capture`,
        status: 'CAPTURED',
        evidence: {
          baselineScreenshot: baseline ? `${tag}-baseline-0204.png` : null,
          surfaceScreenshot: `${tag}-runtime-0205.png`,
          pulseScreenshot: `${tag}-runtime-0205-rift-pulse-0205.png`,
          progressScreenshot: `${tag}-runtime-0205-revive-progress-0205.png`,
          mapSeed: current.setup.mapSeed, timeMs: current.setup.timeMs,
          baselineFps: baseline?.measurements.fps ?? null, surfaceFps: current.measurements.fps,
          renderer, yarnSurface, assets, drawsByAsset: current.measurements.progress?.totalDrawsByAsset ?? stats.totalDrawsByAsset,
          actorDraws: current.measurements.progress?.actorDraws ?? stats.actorDraws,
        },
      });
    }
    check('Edge loaded without runtime or asset request failures', report.errors.length === 0 && report.requestFailures.length === 0,
      { errors: report.errors, requestFailures: report.requestFailures });
    report.status = 'PASS';
  } catch (error) {
    report.status = 'FAIL';
    report.failure = error.stack || String(error);
    process.exitCode = 1;
  } finally {
    clearTimeout(timeout);
    if (browser) await browser.close();
    for (const server of servers) if (server.listening) await new Promise(resolve => server.close(resolve));
    fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  }
})();
