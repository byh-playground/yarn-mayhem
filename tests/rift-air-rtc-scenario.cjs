const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const out = path.resolve('test-results/rift-air-rtc-0192');
fs.mkdirSync(out, { recursive: true });
const report = { status: 'RUNNING', browser: null, checks: [], errors: [] };
const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(fs.readFileSync(path.join(__dirname, '../index.html')));
});
const check = (name, ok, evidence) => {
  report.checks.push({ name, status: ok ? 'PASS' : 'FAIL', evidence });
  assert.ok(ok, name);
};

(async () => {
  let browser;
  const timeout = setTimeout(() => process.exit(2), 120000);
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    report.browser = browser.version();
    const hostContext = await browser.newContext({ viewport: { width: 1280, height: 844 } });
    const guestContext = await browser.newContext({
      viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true,
    });
    for (const context of [hostContext, guestContext]) {
      await context.addInitScript(() => { globalThis.__YARN_MAYHEM_QA = true; });
    }
    const host = await hostContext.newPage();
    const guest = await guestContext.newPage();
    for (const [page, name] of [[host, 'host'], [guest, 'guest']]) {
      page.on('pageerror', error => report.errors.push(`${name}: ${error.message}`));
      await page.goto(`http://127.0.0.1:${server.address().port}`);
      await page.waitForFunction(() => !!window.__YARN_MAYHEM);
      await page.locator('#mainButton').click();
      await page.locator('#multiOpen').click();
    }
    await host.locator('#hostRoom').click();
    await host.waitForFunction(() => __YARN_MAYHEM.snapshot().room.role === 'host');
    const code = await host.evaluate(() => __YARN_MAYHEM.snapshot().room.code);
    await guest.locator('#roomCode').fill(code);
    await guest.locator('#joinRoom').click();
    await guest.waitForFunction(() => __YARN_MAYHEM.snapshot().room.remoteReady, null, { timeout: 45000 });
    await host.waitForFunction(() => {
      const room = __YARN_MAYHEM.snapshot().room;
      return room.players === 2 && room.connected === 1;
    }, null, { timeout: 20000 });
    check('actual Microsoft Edge host and landscape-touch guest connect over RTC', true, {
      code,
      host: await host.evaluate(() => __YARN_MAYHEM.snapshot().room),
      guest: await guest.evaluate(() => __YARN_MAYHEM.snapshot().room),
    });

    await host.locator('#mainButton').click();
    await Promise.all([
      host.waitForFunction(() => __YARN_MAYHEM.snapshot().phase === 'PLAYING', null, { timeout: 15000 }),
      guest.waitForFunction(() => __YARN_MAYHEM.snapshot().phase === 'PLAYING', null, { timeout: 15000 }),
    ]);
    await host.evaluate(() => { __YARN_MAYHEM.qaClearRifts(); __YARN_MAYHEM.qaClearEnemies(); });
    await Promise.all([
      host.waitForFunction(() => __YARN_MAYHEM.snapshot().activeRifts === 0 && __YARN_MAYHEM.snapshot().remainingEnemies === 0),
      guest.waitForFunction(() => __YARN_MAYHEM.snapshot().activeRifts === 0 && __YARN_MAYHEM.snapshot().remainingEnemies === 0),
    ]);

    await host.waitForFunction(() => __YARN_MAYHEM.qaSpawnObserverViews().length === 2, null, { timeout: 5000 });
    const autoRift = await host.evaluate(() => {
      const q = __YARN_MAYHEM, views = q.qaSpawnObserverViews();
      q.qaClearRifts();
      const hole = q.qaAutomaticSpawnRift();
      return { hole, views, rules: q.qaSpawnRules(), diagnostics: hole ? q.qaSpawnDiagnostics(hole) : null };
    });
    check('guest camera dimensions arrive in the existing input packet and are stored by the host',
      autoRift.views.some(item => item.view.hw < 450 && item.view.hh < 220),
      autoRift.views.map(item => ({ id: item.id, hw: item.view.hw, hh: item.view.hh })));
    check('authoritative automatic rift is visible to at least one current camera and stays clear of every player',
      !!autoRift.hole && autoRift.diagnostics.observers.some(view => view.periphery !== null) &&
      autoRift.diagnostics.playerGaps.every(player => player.gap >= autoRift.rules.playerGap), autoRift);
    if (autoRift.hole) {
      await guest.waitForFunction(id => __YARN_MAYHEM.snapshot().spawnHoles.some(h => h.id === id), autoRift.hole.id, { timeout: 10000 });
      const mirrored = await guest.evaluate(id => __YARN_MAYHEM.snapshot().spawnHoles.find(h => h.id === id), autoRift.hole.id);
      check('the one host-selected visible location is replicated unchanged to the landscape-touch guest',
        !!mirrored && mirrored.surfaceKind === autoRift.hole.kind && Math.abs(mirrored.x-autoRift.hole.x)<.11 &&
        Math.abs(mirrored.y-autoRift.hole.y)<.11, { host: autoRift.hole, guest: mirrored });
    }
    await host.evaluate(() => __YARN_MAYHEM.qaClearRifts());
    await guest.waitForFunction(() => __YARN_MAYHEM.snapshot().activeRifts === 0, null, { timeout: 10000 });

    const sites = await Promise.all([
      host.evaluate(() => ({ seed: __YARN_MAYHEM.snapshot().mapSeed, sites: __YARN_MAYHEM.qaSpawnSites().filter(s => s.kind === 'background') })),
      guest.evaluate(() => ({ seed: __YARN_MAYHEM.snapshot().mapSeed, sites: __YARN_MAYHEM.qaSpawnSites().filter(s => s.kind === 'background') })),
    ]);
    const matchingSites = sites[0].sites.length === 32 && sites[0].sites.length === sites[1].sites.length &&
      sites[0].sites.every((site, i) => site.surfaceId === sites[1].sites[i].surfaceId &&
        site.x === sites[1].sites[i].x && site.y === sites[1].sites[i].y && site.kind === sites[1].sites[i].kind);
    check('host and guest derive the same seeded background anchor positions and kinds',
      sites[0].seed === sites[1].seed && matchingSites, {
        hostSeed: sites[0].seed, guestSeed: sites[1].seed, hostCount: sites[0].sites.length,
        guestCount: sites[1].sites.length, matchingSites,
      });

    const eligibleIndex = await host.evaluate(() => {
      const q = __YARN_MAYHEM;
      const players = q.qaPlayers().filter(player => player.hp > 0);
      const sites = q.qaSpawnSites().filter(site => site.kind === 'background');
      const radius = 18;
      return sites.map((site, index) => ({ index, site,
        gap: Math.min(...players.map(player => Math.hypot(site.x - player.x, site.y - player.y))) }))
        .filter(item => item.gap >= 18 + radius + 80)
        .sort((a, b) => b.gap - a.gap)[0]?.index ?? -1;
    });
    check('a deterministic background site is clear of both living players', eligibleIndex >= 0, { eligibleIndex });
    const selectedSite = sites[0].sites[eligibleIndex];
    const opened = await host.evaluate(index => __YARN_MAYHEM.qaSpawnRift('background', null, index), eligibleIndex);
    check('host opens a background rift without changing its kind or anchor', !!opened && opened.kind === 'background', opened);
    await guest.waitForFunction(id => __YARN_MAYHEM.snapshot().spawnHoles.some(h => h.id === id), opened.id, { timeout: 15000 });
    const replicated = await Promise.all([
      host.evaluate(id => __YARN_MAYHEM.snapshot().spawnHoles.find(h => h.id === id), opened.id),
      guest.evaluate(id => __YARN_MAYHEM.snapshot().spawnHoles.find(h => h.id === id), opened.id),
    ]);
    const synced = replicated.every(h => h && h.surfaceKind === 'background' && h.normalX === 0 && h.normalY === 0 &&
      h.surfaceId === selectedSite.surfaceId && Math.abs(h.x - opened.x) < 0.11 && Math.abs(h.y - opened.y) < 0.11 &&
      Math.abs(h.expiresAtMs - replicated[0].expiresAtMs) < 0.2);
    check('background hole position, kind, zero normal and expiry replicate to the guest', synced, {
      selectedSite, opened, host: replicated[0], guest: replicated[1],
    });

    await host.waitForFunction(id => __YARN_MAYHEM.snapshot().spawnHoles.find(h => h.id === id)?.spawns >= 1,
      opened.id, { timeout: 6000 });
    await guest.waitForFunction(id => __YARN_MAYHEM.snapshot().spawnHoles.find(h => h.id === id)?.spawns >= 1,
      opened.id, { timeout: 15000 });
    const emitted = await Promise.all([
      host.evaluate(id => ({ tick: __YARN_MAYHEM.snapshot().tick, hole: __YARN_MAYHEM.snapshot().spawnHoles.find(h => h.id === id), enemies: __YARN_MAYHEM.qaEnemies() }), opened.id),
      guest.evaluate(id => ({ tick: __YARN_MAYHEM.snapshot().tick, hole: __YARN_MAYHEM.snapshot().spawnHoles.find(h => h.id === id), enemies: __YARN_MAYHEM.qaEnemies() }), opened.id),
    ]);
    const tickLag = Math.abs(emitted[0].tick - emitted[1].tick);
    const positionTolerance = tickLag === 0 ? 0.6 : tickLag * 34 + 0.6;
    const replicatedEnemy = emitted[0].enemies.some(enemy => emitted[1].enemies.some(remote =>
      remote.id === enemy.id && remote.tier === enemy.tier && remote.hp === enemy.hp &&
      Math.abs(remote.x - enemy.x) <= positionTolerance && Math.abs(remote.y - enemy.y) <= positionTolerance));
    check('host emission and authoritative enemy state appear on the guest within four authority ticks',
      tickLag <= 4 && emitted.every(item => item.hole?.spawns >= 1) && replicatedEnemy, {
        hostTick: emitted[0].tick, guestTick: emitted[1].tick, tickLag, positionTolerance,
        hostSpawns: emitted[0].hole?.spawns, guestSpawns: emitted[1].hole?.spawns,
        hostEnemies: emitted[0].enemies.map(({ id, tier, hp, x, y }) => ({ id, tier, hp, x, y })),
        guestEnemies: emitted[1].enemies.map(({ id, tier, hp, x, y }) => ({ id, tier, hp, x, y })),
      });

    await host.evaluate(() => {
      const q = __YARN_MAYHEM;
      if (!q.qaStartStage(40)) throw new Error('Could not enter stage 40 for RTC rift-cap coverage');
      q.qaClearRifts();
      q.qaClearEnemies();
    });
    await guest.waitForFunction(() => {
      const s = __YARN_MAYHEM.snapshot();
      return s.stage === 40 && s.activeRifts === 0 && s.remainingEnemies === 0;
    }, null, { timeout: 15000 });
    const siteIndexes = await host.evaluate(() => {
      const q = __YARN_MAYHEM, sites = q.qaSpawnSites().filter(site => site.kind === 'background');
      const players = q.qaPlayers().filter(player => player.hp > 0);
      const ranked = sites.map((site, index) => ({ site, index, gap: Math.min(...players.map(player =>
        Math.hypot(site.x - player.x, site.y - player.y))) })).filter(item => item.gap >= 180)
        .sort((a, b) => b.gap - a.gap);
      const chosen = [];
      for (const item of ranked) {
        if (chosen.every(other => Math.hypot(item.site.x - other.site.x, item.site.y - other.site.y) >= 160)) {
          chosen.push(item);
          if (chosen.length === 6) break;
        }
      }
      return chosen.map(item => item.index);
    });
    assert.equal(siteIndexes.length, 6, 'six safe background sites for high-stage RTC coverage');
    const fixtureIds = [];
    for (const index of siteIndexes) {
      const hole = await host.evaluate(index => __YARN_MAYHEM.qaSpawnRift('background', null, index), index);
      assert.ok(hole, 'host creates each safe high-stage rift');
      fixtureIds.push(hole.id);
    }
    await guest.waitForFunction(count => __YARN_MAYHEM.snapshot().activeRifts === count, fixtureIds.length,
      { timeout: 15000 });
    const manyRifts = await Promise.all([
      host.evaluate(() => ({ tick: __YARN_MAYHEM.snapshot().tick, holes: __YARN_MAYHEM.qaNetworkFrame().holes })),
      guest.evaluate(() => ({ tick: __YARN_MAYHEM.snapshot().tick, holes: __YARN_MAYHEM.snapshot().spawnHoles })),
    ]);
    check('stage 40 host and guest retain every active rift above the former four-rift limit',
      manyRifts[0].holes.length === 6 && manyRifts[1].holes.length === 6 &&
      manyRifts[1].holes.every(hole => fixtureIds.includes(hole.id)), {
        hostTick: manyRifts[0].tick, guestTick: manyRifts[1].tick,
        hostRifts: manyRifts[0].holes.map(hole => hole[0]),
        guestRifts: manyRifts[1].holes.map(hole => hole.id), expected: fixtureIds,
      });
    check('both RTC clients remain free of browser runtime errors', report.errors.length === 0, report.errors);
    report.status = 'PASS';
  } catch (error) {
    report.status = 'FAIL';
    report.failure = error.stack;
    process.exitCode = 1;
  } finally {
    clearTimeout(timeout);
    if (browser) await browser.close();
    server.close();
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ status: report.status, browser: report.browser, checks: report.checks,
      errors: report.errors, failure: report.failure }, null, 2));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
