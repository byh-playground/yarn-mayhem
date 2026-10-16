const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const out = path.resolve('test-results/rift-air-rtc-0192');
fs.mkdirSync(out, { recursive: true });
const report = { status: 'RUNNING', browser: null, checks: [], errors: [], relayWarnings: [] };
const { createGameServer } = require('./game-server.cjs');
const server = createGameServer();
const check = (name, ok, evidence) => {
  report.checks.push({ name, status: ok ? 'PASS' : 'FAIL', evidence });
  assert.ok(ok, name);
};
async function safeBackgroundSiteIndex(page, minimumGap) {
  return page.evaluate(minimumGap => {
    const q = __YARN_MAYHEM, players = q.qaPlayers().filter(player => player.hp > 0);
    const sites = q.qaSpawnSites().filter(site => site.kind === 'background');
    return sites.map((site, index) => ({ index, gap: Math.min(...players.map(player =>
      Math.hypot(site.x - player.x, site.y - player.y))) }))
      .filter(item => item.gap >= minimumGap).sort((a, b) => b.gap - a.gap)[0]?.index ?? -1;
  }, minimumGap);
}
async function openSafeBackgroundRift(host, minimumGap = 200) {
  const index = await safeBackgroundSiteIndex(host, minimumGap);
  assert.ok(index >= 0, `safe background site with ${minimumGap}px player gap`);
  const hole = await host.evaluate(index => __YARN_MAYHEM.qaSpawnRift('background', null, index), index);
  assert.ok(hole, 'host creates a safe background rift');
  return hole;
}
async function waitForSameTickRift(host, guest, id, expectedSpawns, expectGuest = true, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  let latest;
  do {
    latest = await Promise.all([
      host.evaluate(id => {
        const frame = __YARN_MAYHEM.qaNetworkFrame();
        return { tick: frame.tick, hole: frame.holes.find(item => item[0] === id) ?? null };
      }, id),
      guest.evaluate(id => {
        const s = __YARN_MAYHEM.snapshot();
        return { tick: s.tick, hole: s.spawnHoles.find(item => item.id === id) ?? null };
      }, id),
    ]);
    const [authoritative, mirrored] = latest;
    if (authoritative.tick === mirrored.tick && authoritative.hole?.[11] === expectedSpawns &&
        (expectGuest ? mirrored.hole?.spawns === expectedSpawns : mirrored.hole === null)) return latest;
    await host.waitForTimeout(20);
  } while (Date.now() < deadline);
  throw new Error(`Rift ${id} did not reach expected same-tick state ${expectedSpawns}/${expectGuest}: ${JSON.stringify(latest)}`);
}

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
      page.on('console', message => {
        if (message.type() !== 'error') return;
        const text = message.text(), entry = `${name} console: ${text}`;
        if (/^WebSocket connection to 'wss:\/\/relay\.(?:primal\.net|damus\.io)\/' failed: Error during WebSocket handshake: Unexpected response code: 503$/.test(text)) {
          report.relayWarnings.push(entry);
        } else report.errors.push(entry);
      });
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
      if (!q.qaStartStage(14)) throw new Error('Could not enter stage 14 for the rift sync regression');
      q.qaClearRifts(); q.qaClearEnemies();
    });
    await guest.waitForFunction(() => __YARN_MAYHEM.snapshot().stage === 14 &&
      __YARN_MAYHEM.snapshot().activeRifts === 0 && __YARN_MAYHEM.snapshot().remainingEnemies === 0,
    null, { timeout: 15000 });
    const stage14Hole = await openSafeBackgroundRift(host);
    await host.waitForFunction(id => __YARN_MAYHEM.snapshot().spawnHoles.find(h => h.id === id)?.spawns >= 9,
      stage14Hole.id, { timeout: 9000 });
    const stage14Pair = await waitForSameTickRift(host, guest, stage14Hole.id, 9, true, 1000);
    check('stage 14 rift remains mirrored after the ninth ordinary emission at the same authority tick',
      stage14Pair[0].tick === stage14Pair[1].tick && stage14Pair[0].hole[11] === 9 && stage14Pair[1].hole.spawns === 9,
      { host: stage14Pair[0], guest: stage14Pair[1] });
    await Promise.all([
      host.waitForFunction(id => !__YARN_MAYHEM.snapshot().spawnHoles.some(h => h.id === id), stage14Hole.id, { timeout: 4000 }),
      guest.waitForFunction(id => !__YARN_MAYHEM.snapshot().spawnHoles.some(h => h.id === id), stage14Hole.id, { timeout: 4000 }),
    ]);
    check('the stage 14 rift expires on host and guest from its authoritative lifetime', true,
      { id: stage14Hole.id, hostActive: await host.evaluate(id => __YARN_MAYHEM.snapshot().spawnHoles.some(h => h.id === id), stage14Hole.id),
        guestActive: await guest.evaluate(id => __YARN_MAYHEM.snapshot().spawnHoles.some(h => h.id === id), stage14Hole.id) });

    const boundaryHole = await openSafeBackgroundRift(host);
    await guest.waitForFunction(id => __YARN_MAYHEM.snapshot().spawnHoles.some(h => h.id === id), boundaryHole.id, { timeout: 10000 });
    const receiverLimit = await host.evaluate(() => {
      const s = __YARN_MAYHEM.snapshot();
      return Math.ceil(s.spawnConfig.riftLifetimeMs / (1000 / s.tps));
    });
    const boundaryResults = [];
    for (const spawns of [8, 9, receiverLimit, receiverLimit + 1, 8]) {
      assert.ok(await host.evaluate(({ id, spawns }) => __YARN_MAYHEM.qaSetRiftSpawns(id, spawns),
        { id: boundaryHole.id, spawns }), `set QA wire value ${spawns}`);
      const accepted = spawns <= receiverLimit;
      const pair = await waitForSameTickRift(host, guest, boundaryHole.id, spawns, accepted, 2500);
      boundaryResults.push({ spawns, accepted, host: pair[0], guest: pair[1] });
    }
    check('RTC accepts emission counts 8, 9 and the lifetime/tick maximum, rejects maximum+1, then resyncs',
      boundaryResults.length === 5 && boundaryResults.filter(result => result.accepted)
        .every(result => result.guest.hole?.spawns === result.spawns) &&
        boundaryResults[3].guest.hole === null && boundaryResults[4].guest.hole?.spawns === 8,
      { receiverLimit, boundaryResults });
    await Promise.all([
      host.waitForFunction(id => !__YARN_MAYHEM.snapshot().spawnHoles.some(h => h.id === id), boundaryHole.id, { timeout: 4000 }),
      guest.waitForFunction(id => !__YARN_MAYHEM.snapshot().spawnHoles.some(h => h.id === id), boundaryHole.id, { timeout: 4000 }),
    ]);

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
    const maxLifecycleEmissions = await host.evaluate(() => {
      const s = __YARN_MAYHEM.snapshot(), tickMs = 1000 / s.tps;
      return Math.ceil((s.spawnConfig.riftLifetimeMs - s.spawnConfig.closeMs) / tickMs) -
        Math.ceil(s.spawnConfig.openMs / tickMs);
    });
    const stage40Hole = await openSafeBackgroundRift(host, 180);
    await host.waitForFunction(({ id, count }) => __YARN_MAYHEM.snapshot().spawnHoles
      .find(h => h.id === id)?.spawns >= count, { id: stage40Hole.id, count: maxLifecycleEmissions }, { timeout: 5000 });
    await guest.waitForFunction(({ id, count }) => __YARN_MAYHEM.snapshot().spawnHoles
      .find(h => h.id === id)?.spawns === count, { id: stage40Hole.id, count: maxLifecycleEmissions }, { timeout: 1200 });
    const stage40Delivery = await Promise.all([
      host.evaluate(id => {
        const frame = __YARN_MAYHEM.qaNetworkFrame(), json = JSON.stringify(frame);
        return { tick: frame.tick, ms: frame.ms, hole: frame.holes.find(item => item[0] === id) ?? null,
          enemies: frame.enemies.length, shots: frame.shots.length, holes: frame.holes.length,
          jsonChars: json.length, utf8Bytes: new TextEncoder().encode(json).length };
      }, stage40Hole.id),
      guest.evaluate(id => {
        const s = __YARN_MAYHEM.snapshot();
        return { tick: s.tick, phase: s.phase, hole: s.spawnHoles.find(item => item.id === id) ?? null,
          enemies: s.remainingEnemies, room: s.room, status: document.querySelector('#roomStatus')?.textContent };
      }, stage40Hole.id),
    ]);
    const stage40TickLag = Math.abs(stage40Delivery[0].tick - stage40Delivery[1].tick);
    check('stage 40 full-lifetime rift emission reaches the guest within four authority ticks',
      stage40Delivery[0].hole?.[11] === maxLifecycleEmissions &&
      stage40Delivery[1].hole?.spawns === maxLifecycleEmissions && stage40TickLag <= 4,
      { expected: maxLifecycleEmissions, tickLag: stage40TickLag, host: stage40Delivery[0], guest: stage40Delivery[1] });
    await Promise.all([
      host.waitForFunction(id => !__YARN_MAYHEM.snapshot().spawnHoles.some(h => h.id === id), stage40Hole.id, { timeout: 4000 }),
      guest.waitForFunction(id => !__YARN_MAYHEM.snapshot().spawnHoles.some(h => h.id === id), stage40Hole.id, { timeout: 4000 }),
    ]);

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

    await host.evaluate(() => { __YARN_MAYHEM.qaClearRifts(); __YARN_MAYHEM.qaClearEnemies(); });
    await guest.waitForFunction(() => __YARN_MAYHEM.snapshot().activeRifts === 0 &&
      __YARN_MAYHEM.snapshot().remainingEnemies === 0, null, { timeout: 5000 });
    const guestRosterBeforeReconnect = await guest.evaluate(() => __YARN_MAYHEM.qaPlayers()
      .map(player => player.id).sort());
    await guest.reload();
    await guest.waitForFunction(() => !!window.__YARN_MAYHEM, null, { timeout: 10000 });
    await guest.locator('#mainButton').click();
    await guest.locator('#multiOpen').click();
    await guest.locator('#roomCode').fill(code);
    const reconnectHole = await openSafeBackgroundRift(host, 180);
    assert.ok(await host.evaluate(id => __YARN_MAYHEM.qaSetRiftSpawns(id, 9), reconnectHole.id),
      'prepare a live, valid high-count rift for the reconnect snapshot');
    await guest.locator('#joinRoom').click();
    let reconnected = false;
    const reconnectDeadline = Date.now() + 45000;
    while (!reconnected && Date.now() < reconnectDeadline) {
      reconnected = await guest.evaluate(() => __YARN_MAYHEM.snapshot().room.remoteReady);
      if (!reconnected) {
        assert.ok(await host.evaluate(id => __YARN_MAYHEM.qaRenewRiftLifetime(id), reconnectHole.id),
          'keep the same QA rift active while the RTC reconnection handshake completes');
        await host.waitForTimeout(250);
      }
    }
    assert.ok(reconnected, 'guest reconnects to the existing RTC room');
    const reconnectedPair = await waitForSameTickRift(host, guest, reconnectHole.id, 9, true, 5000);
    const guestRosterAfterReconnect = await guest.evaluate(() => __YARN_MAYHEM.qaPlayers()
      .map(player => player.id).sort());
    const retainedHostIds = guestRosterBeforeReconnect.filter(id => guestRosterAfterReconnect.includes(id));
    check('reconnecting guest restores the active rift at the same tick and rejoins the host roster',
      reconnectedPair[0].tick === reconnectedPair[1].tick && reconnectedPair[1].hole.spawns === 9 &&
        guestRosterAfterReconnect.length === 2 && retainedHostIds.length === 1,
      { host: reconnectedPair[0], guest: reconnectedPair[1],
        guestRosterBeforeReconnect, guestRosterAfterReconnect, retainedHostIds,
        room: await guest.evaluate(() => __YARN_MAYHEM.snapshot().room) });
    const [hostRoomState, guestRoomState] = await Promise.all([
      host.evaluate(() => __YARN_MAYHEM.snapshot().room),
      guest.evaluate(() => __YARN_MAYHEM.snapshot().room),
    ]);
    check('both RTC clients remain free of uncaught runtime and unexpected console errors',
      report.errors.length === 0, { errors: report.errors, individualRelay503Warnings: report.relayWarnings });
    check('both RTC peers remain connected after any individual relay handshake failure',
      hostRoomState.connected === 1 && guestRoomState.connected === 1 && guestRoomState.remoteReady,
      { host: hostRoomState, guest: guestRoomState, individualRelay503Warnings: report.relayWarnings });
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
