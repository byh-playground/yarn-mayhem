const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createGameServer } = require('./game-server.cjs');

const outputDir = path.resolve(process.env.YARN_TEST_OUTPUT || 'test-results/vector-assets-0200');
fs.mkdirSync(outputDir, { recursive: true });
const baselineHtml = process.env.YARN_TEST_BASELINE_HTML ? path.resolve(process.env.YARN_TEST_BASELINE_HTML) : null;
const servers = [createGameServer()];
if (baselineHtml && fs.existsSync(baselineHtml)) servers.push(createGameServer({ htmlPath: baselineHtml }));
const report = { status: 'RUNNING', browser: null, comparisons: [], errors: [], requestFailures: [] };
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
  page.on('requestfailed', request => report.requestFailures.push({ tag, url: request.url(), error: request.failure()?.errorText }));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() => !!window.__YARN_MAYHEM, null, { timeout: 15000 });
  await page.locator('#mainButton').click();
  await page.locator('#soloStart').click();
  await page.waitForFunction(() => __YARN_MAYHEM.snapshot().phase === 'PLAYING');
  await page.waitForTimeout(450);
  const setup = await page.evaluate(() => {
    const q = __YARN_MAYHEM;
    q.qaQuietArena();
    q.qaClearEnemies();
    q.qaClearRifts();
    const p = q.qaPlayers()[0];
    const targetX = Math.max(130, Math.min(q.snapshot().world.width - 300, p.x - 100));
    q.qaPlayer(targetX, q.snapshot().world.groundY - 38);
    const y = q.snapshot().world.groundY - 130;
    const small = q.qaSpawn(1, targetX + 82, y);
    const large = q.qaSpawn(10, targetX + 315, y);
    q.qaSetEnemyGoal(small.id, 'none');
    q.qaSetEnemyGoal(large.id, 'none');
    q.qaNeedle(0);
    const rift = q.qaAutomaticSpawnRift();
    return { player: q.qaPlayers()[0], enemies: q.qaEnemies(), rift, world: q.snapshot().world };
  });
  await page.waitForTimeout(180);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.screenshot({ path: path.join(outputDir, `${tag}.png`) });
  const measurements = await page.evaluate(() => {
    const q = __YARN_MAYHEM;
    return {
      fps: q.snapshot().fps,
      viewport: { width: innerWidth, height: innerHeight },
      stats: q.qaVectorStats?.() ?? null,
    };
  });
  if (measurements.stats) {
    const previousPulseDraws = measurements.stats.totalDrawsByAsset.riftPulse;
    const pulseHole = await page.evaluate(() => {
      const q = __YARN_MAYHEM;
      q.qaClearEnemies();
      q.qaClearRifts();
      return q.qaAutomaticSpawnRift();
    });
    if (!pulseHole) throw new Error(`${tag}: no automatic rift selected for the pulse fixture`);
    await page.waitForFunction(id => __YARN_MAYHEM.snapshot().spawnHoles.find(hole => hole.id === id)?.spawns > 0,
      pulseHole.id, { timeout: 5000 });
    await page.waitForFunction(previous => __YARN_MAYHEM.qaVectorStats().totalDrawsByAsset.riftPulse > previous,
      previousPulseDraws, { timeout: 5000 });
    await page.screenshot({ path: path.join(outputDir, `${tag}-rift-pulse-0200.png`) });
    measurements.riftPulse = await page.evaluate(() => __YARN_MAYHEM.qaVectorStats());
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
      const current = await runScene(browser, servers[0], `${tag}-svg-0200`, mobile);
      const baseline = servers[1] ? await runScene(browser, servers[1], `${tag}-baseline-0197`, mobile) : null;
      const stats = current.measurements.stats;
      const assets = stats?.assets ?? [];
      const renderer = stats?.renderer ?? {};
      check(`${tag}: visible high-tier enemy is present`,
        current.setup.enemies.some(enemy => enemy.tier === 10),
        { current: current.setup });
      if (baseline) check(`${tag}: baseline and SVG scenes both contain a high-tier enemy`,
        baseline.setup.enemies.some(enemy => enemy.tier === 10), { baseline: baseline.setup });
      check(`${tag}: three retained SVG assets load and are drawn`,
        ['needle', 'riftPulse', 'yarnFace'].every(name => assets.some(asset => asset.name === name && asset.bytes > 0 && asset.parts > 0)) &&
          Number(renderer.instances) > 0 && Number(renderer.draws) > 0,
        { assets, renderer });
      check(`${tag}: yarn face and needle meshes are submitted in the visible play scene`,
        stats.drawsByAsset.yarnFace > 0 && stats.drawsByAsset.needle > 0,
        { drawsByAsset: stats.drawsByAsset });
      check(`${tag}: rift pulse mesh is submitted during the first existing rift pop`,
        current.measurements.riftPulse?.totalDrawsByAsset.riftPulse > stats.totalDrawsByAsset.riftPulse,
        { previous: stats.totalDrawsByAsset.riftPulse, duringPop: current.measurements.riftPulse });
      check(`${tag}: SVG geometry stays below 1 MiB retained`,
        assets.reduce((sum, asset) => sum + asset.bytes, 0) < 1024 * 1024,
        { bytes: assets.reduce((sum, asset) => sum + asset.bytes, 0), assets });
      report.comparisons.push({
        name: baseline ? `${tag}: baseline versus SVG visual/performance capture` : `${tag}: SVG visual/performance capture`,
        status: 'CAPTURED',
        evidence: {
          baselineScreenshot: baseline ? `${tag}-baseline-0197.png` : null,
          svgScreenshot: `${tag}-svg-0200.png`,
          riftPulseScreenshot: `${tag}-svg-0200-rift-pulse-0200.png`,
          baselineFps: baseline?.measurements.fps ?? null, svgFps: current.measurements.fps,
          renderer, assets, drawsByAsset: current.measurements.riftPulse?.totalDrawsByAsset ?? stats.totalDrawsByAsset,
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
