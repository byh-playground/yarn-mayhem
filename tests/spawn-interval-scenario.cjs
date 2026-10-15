const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const out = path.resolve('test-results/rift-spawn-interval-0195');
fs.mkdirSync(out, { recursive: true });
const report = { status: 'RUNNING', browser: null, checks: [], errors: [], networkFailures: [] };
const check = (name, ok, evidence) => {
  report.checks.push({ name, status: ok ? 'PASS' : 'FAIL', evidence });
  assert.ok(ok, name);
};
const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(fs.readFileSync(path.join(__dirname, '../index.html')));
});

(async () => {
  let browser;
  const ceiling = setTimeout(() => process.exit(2), 90000);
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    report.browser = browser.version();
    for (const mobile of [false, true]) {
      const tag = mobile ? 'landscape-touch' : 'edge-pc';
      const context = await browser.newContext({
        viewport: mobile ? { width: 844, height: 390 } : { width: 1280, height: 844 },
        isMobile: mobile,
        hasTouch: mobile,
      });
      await context.addInitScript(() => { globalThis.__YARN_MAYHEM_QA = true; });
      const page = await context.newPage();
      page.on('pageerror', e => report.errors.push(tag + ': ' + e.message));
      page.on('requestfailed', r => report.networkFailures.push({
        tag, url: r.url(), error: r.failure()?.errorText,
      }));
      await page.goto('http://127.0.0.1:' + server.address().port);
      await page.waitForFunction(() => !!window.__YARN_MAYHEM);
      const result = await page.evaluate(() => {
        const q = __YARN_MAYHEM;
        const tickMs = 1000 / 30;
        const multipliers = { perHole: 0.9, rift: 0.9 };
        function chooseSites(count) {
          const sites = q.qaSpawnSites().filter(site => site.kind === 'background');
          const players = q.qaPlayers().filter(player => player.hp > 0);
          const ranked = sites.map((site, index) => ({
            site, index,
            gap: players.length ? Math.min(...players.map(player =>
              Math.hypot(site.x - player.x, site.y - player.y))) : Infinity,
          })).filter(item => item.gap >= 120).sort((a, b) => b.gap - a.gap);
          const chosen = [];
          for (const item of ranked) {
            if (chosen.every(other => Math.hypot(item.site.x - other.site.x, item.site.y - other.site.y) >= 180)) {
              chosen.push(item);
              if (chosen.length === count) break;
            }
          }
          if (chosen.length !== count) throw new Error('Not enough separated safe background sites: ' + chosen.length);
          return chosen;
        }
        function measurePerHole(stage, holeCount) {
          if (!q.qaStartStage(stage)) throw new Error('qaStartStage rejected ' + stage);
          q.qaClearRifts();
          q.qaClearEnemies();
          const sites = chooseSites(holeCount);
          const holes = sites.map(item => q.qaSpawnRift('background', null, item.index));
          if (holes.some(hole => !hole)) throw new Error('Could not create forced test rift at stage ' + stage);
          const startTick = q.snapshot().tick;
          const events = new Map(holes.map(hole => [hole.id, []]));
          const counts = new Map(holes.map(hole => [hole.id, 0]));
          for (let step = 0; step < 120; step++) {
            q.qaStep(1);
            const snap = q.snapshot();
            for (const hole of snap.spawnHoles) {
              const known = counts.get(hole.id);
              if (known === undefined || hole.spawns <= known) continue;
              const times = events.get(hole.id);
              for (let i = known; i < hole.spawns; i++) times.push((snap.tick - startTick) * tickMs);
              counts.set(hole.id, hole.spawns);
            }
            for (const enemy of q.qaEnemies()) q.qaSetEnemyGoal(enemy.id, 'none');
            if (step > 90 && snap.spawnHoles.length === 0) break;
          }
          const desired = Math.max(tickMs, 1000 * Math.pow(multipliers.perHole, stage - 1));
          const intervals = [...events.entries()].map(([id, times]) => ({
            id, spawnTimesMs: times,
            intervalsMs: times.slice(1).map((time, index) => +(time - times[index]).toFixed(2)),
          }));
          return {
            stage: q.snapshot().stage,
            requestedStage: stage,
            xpLevel: q.snapshot().level,
            spawnRate: q.snapshot().spawnRate,
            desiredPerHoleMs: +desired.toFixed(2),
            tickMs: +tickMs.toFixed(2),
            config: q.snapshot().spawnConfig,
            intervals,
          };
        }
        function measureAutomaticRifts(stage, ticks) {
          if (!q.qaStartStage(stage)) throw new Error('qaStartStage rejected ' + stage);
          const startTick = q.snapshot().tick;
          const seen = new Set();
          const createdAtMs = [];
          const cumulative = new Map();
          const spawnTimesByHole = new Map();
          let maxActive = 0, maxCreatedPerTick = 0, maxSpawnsPerTick = 0, peakEnemies = 0, totalSpawned = 0;
          for (let step = 0; step < ticks; step++) {
            q.qaStep(1);
            const snap = q.snapshot();
            let spawnsThisTick = 0, createdThisTick = 0;
            const nowMs = (snap.tick - startTick) * tickMs;
            for (const hole of snap.spawnHoles) {
              if (!seen.has(hole.id)) {
                seen.add(hole.id);
                createdAtMs.push(hole.createdAtMs);
                createdThisTick++;
                cumulative.set(hole.id, 0);
                spawnTimesByHole.set(hole.id, []);
              }
              const prior = cumulative.get(hole.id) || 0;
              if (hole.spawns > prior) {
                const delta = hole.spawns - prior;
                spawnsThisTick += delta;
                cumulative.set(hole.id, hole.spawns);
                for (let i = 0; i < delta; i++) spawnTimesByHole.get(hole.id).push(nowMs);
              }
            }
            totalSpawned += spawnsThisTick;
            maxCreatedPerTick = Math.max(maxCreatedPerTick, createdThisTick);
            maxActive = Math.max(maxActive, snap.activeRifts);
            maxSpawnsPerTick = Math.max(maxSpawnsPerTick, spawnsThisTick);
            peakEnemies = Math.max(peakEnemies, snap.remainingEnemies);
            for (const enemy of q.qaEnemies()) q.qaSetEnemyGoal(enemy.id, 'none');
          }
          const intervalsMs = createdAtMs.slice(1).map((time, index) => +(time - createdAtMs[index]).toFixed(2));
          const perHoleIntervals = [...spawnTimesByHole.values()].flatMap(times =>
            times.slice(1).map((time, index) => +(time - times[index]).toFixed(2))
          ).sort((a, b) => a - b);
          const percentile = fraction => perHoleIntervals.length
            ? perHoleIntervals[Math.min(perHoleIntervals.length - 1, Math.floor((perHoleIntervals.length - 1) * fraction))]
            : null;
          const desired = Math.max(tickMs, 2000 * Math.pow(multipliers.rift, stage - 1));
          const desiredPerHole = Math.max(tickMs, 1000 * Math.pow(multipliers.perHole, stage - 1));
          return {
            stage: q.snapshot().stage,
            requestedStage: stage,
            xpLevel: q.snapshot().level,
            spawnRate: q.snapshot().spawnRate,
            config: q.snapshot().spawnConfig,
            desiredPerHoleMs: +desiredPerHole.toFixed(2),
            desiredRiftIntervalMs: +desired.toFixed(2),
            tickMs: +tickMs.toFixed(2),
            durationMs: ticks * tickMs,
            createdCount: createdAtMs.length,
            creationTimesMs: createdAtMs,
            intervalsMs,
            totalSpawned,
            perHoleSpawnIntervalMs: {
              count: perHoleIntervals.length,
              median: percentile(0.5),
              p95: percentile(0.95),
              max: perHoleIntervals.length ? perHoleIntervals[perHoleIntervals.length - 1] : null,
            },
            maxActiveRifts: maxActive,
            maxCreatedPerTick,
            maxEnemySpawnsPerTick: maxSpawnsPerTick,
            peakEnemies,
          };
        }
        return {
          perHole: [
            measurePerHole(1, 1),
            measurePerHole(2, 1),
            measurePerHole(3, 1),
            measurePerHole(15, 1),
            measurePerHole(40, 1),
          ],
          automaticRifts: [1, 2, 3, 15, 40].map(stage => measureAutomaticRifts(stage, 180)),
        };
      });
      report[mobile ? 'landscapeTouch' : 'edgePc'] = result;
      for (const scenario of result.perHole) {
        const expected = Math.max(scenario.desiredPerHoleMs, 1000 / scenario.spawnRate);
        const intervals = scenario.intervals.flatMap(hole => hole.intervalsMs).sort((a, b) => a - b);
        const evidence = {
          stage: scenario.stage, xpLevel: scenario.xpLevel, targetMs: scenario.desiredPerHoleMs,
          expectedMs: +expected.toFixed(2), spawnRateCapPerSecond: scenario.spawnRate,
          samples: intervals.length, minMs: intervals[0], medianMs: intervals[Math.floor(intervals.length / 2)],
          maxMs: intervals[intervals.length - 1], tickMs: scenario.tickMs,
        };
        check(tag + ' stage ' + scenario.stage + ' uses stage, not XP level, and per-rift intervals follow the decaying target',
          scenario.stage === scenario.requestedStage && scenario.xpLevel === 1 &&
          scenario.config.perHoleStageMultiplier === 0.9 &&
          intervals.length >= 2 &&
          intervals.every(actual => Math.abs(actual - expected) <= scenario.tickMs + 0.5), evidence);
      }
      for (const scenario of result.automaticRifts) {
        const riftIntervals = scenario.intervalsMs;
        const evidence = {
          stage: scenario.stage, targetMs: scenario.desiredRiftIntervalMs,
          samples: riftIntervals.length, minMs: Math.min(...riftIntervals), maxMs: Math.max(...riftIntervals),
          totalRifts: scenario.createdCount, maxActiveRifts: scenario.maxActiveRifts,
          maxRiftCreationsPerTick: scenario.maxCreatedPerTick,
          maxEnemySpawnsPerTick: scenario.maxEnemySpawnsPerTick,
          peakEnemies: scenario.peakEnemies, automaticPerHole: scenario.perHoleSpawnIntervalMs,
          spawnRateCapPerSecond: scenario.spawnRate, totalSpawned: scenario.totalSpawned,
        };
        check(tag + ' stage ' + scenario.stage + ' automatic rift cadence, lifetime and bounded per-tick production',
          scenario.stage === scenario.requestedStage && scenario.xpLevel === 1 &&
          scenario.config.riftStageMultiplier === 0.9 &&
          scenario.config.riftLifetimeMs === 3000 &&
          riftIntervals.length >= 2 &&
          riftIntervals.every(actual => Math.abs(actual - scenario.desiredRiftIntervalMs) <= scenario.tickMs + 0.5) &&
          scenario.maxCreatedPerTick <= 1 &&
          scenario.maxActiveRifts <= Math.floor(3000 / scenario.tickMs) &&
          scenario.maxEnemySpawnsPerTick <= 1 &&
          scenario.totalSpawned <= Math.ceil(scenario.spawnRate * scenario.durationMs / 1000) + 1 &&
          scenario.peakEnemies <= scenario.config.maxConcurrent, evidence);
      }
      const overlapped = result.automaticRifts.find(scenario => scenario.requestedStage === 15);
      check(tag + ' stage 15 overlapping rifts stay within the global spawn-rate budget',
        overlapped.maxActiveRifts > 1 && overlapped.maxEnemySpawnsPerTick === 1 &&
        overlapped.totalSpawned <= Math.ceil(overlapped.spawnRate * overlapped.durationMs / 1000) + 1,
        { stage: overlapped.stage, perHoleTargetMs: overlapped.desiredPerHoleMs,
          actualPerHole: overlapped.perHoleSpawnIntervalMs, spawnRateCapPerSecond: overlapped.spawnRate,
          totalSpawned: overlapped.totalSpawned, durationMs: overlapped.durationMs });
      const highStage = result.automaticRifts.find(scenario => scenario.requestedStage === 40);
      check(tag + ' stage 40 automatic throughput stays within global rate, tick and enemy caps',
        highStage.maxActiveRifts === Math.floor(3000 / highStage.tickMs) &&
        highStage.maxCreatedPerTick === 1 && highStage.maxEnemySpawnsPerTick === 1 &&
        highStage.totalSpawned <= Math.ceil(highStage.spawnRate * highStage.durationMs / 1000) + 1 &&
        highStage.peakEnemies <= highStage.config.maxConcurrent &&
        highStage.perHoleSpawnIntervalMs.median > highStage.desiredPerHoleMs + highStage.tickMs,
        { stage: highStage.stage, targetPerHoleMs: highStage.desiredPerHoleMs,
          observedMedianMs: highStage.perHoleSpawnIntervalMs.median, observedP95Ms: highStage.perHoleSpawnIntervalMs.p95,
          activeRifts: highStage.maxActiveRifts, maxRiftCreationsPerTick: highStage.maxCreatedPerTick,
          maxEnemySpawnsPerTick: highStage.maxEnemySpawnsPerTick, spawnRateCapPerSecond: highStage.spawnRate,
          totalSpawned: highStage.totalSpawned, durationMs: highStage.durationMs, peakEnemies: highStage.peakEnemies,
          maxConcurrentEnemies: highStage.config.maxConcurrent });
      await context.close();

    }
    check('both Edge layouts remain free of browser runtime errors', report.errors.length === 0, report.errors);
    report.status = 'PASS';
  } catch (error) {
    report.status = 'FAIL';
    report.failure = error.stack;
    process.exitCode = 1;
  } finally {
    clearTimeout(ceiling);
    if (browser) await browser.close();
    server.close();
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({
      status: report.status,
      browser: report.browser,
      checks: report.checks,
      errors: report.errors,
      failure: report.failure,
      edgePc: report.edgePc && report.edgePc.automaticRifts.map(s => ({
        stage: s.stage, createdCount: s.createdCount, totalSpawned: s.totalSpawned,
        spawnRateCapPerSecond: s.spawnRate, maxActiveRifts: s.maxActiveRifts,
        maxCreatedPerTick: s.maxCreatedPerTick, maxEnemySpawnsPerTick: s.maxEnemySpawnsPerTick,
        peakEnemies: s.peakEnemies, perHole: s.perHoleSpawnIntervalMs, riftIntervalSamples: s.intervalsMs.length, riftIntervalMinMs: Math.min(...s.intervalsMs), riftIntervalMaxMs: Math.max(...s.intervalsMs),
      })),
      landscapeTouch: report.landscapeTouch && report.landscapeTouch.automaticRifts.map(s => ({
        stage: s.stage, createdCount: s.createdCount, totalSpawned: s.totalSpawned,
        spawnRateCapPerSecond: s.spawnRate, maxActiveRifts: s.maxActiveRifts,
        maxCreatedPerTick: s.maxCreatedPerTick, maxEnemySpawnsPerTick: s.maxEnemySpawnsPerTick,
        peakEnemies: s.peakEnemies, perHole: s.perHoleSpawnIntervalMs, riftIntervalSamples: s.intervalsMs.length, riftIntervalMinMs: Math.min(...s.intervalsMs), riftIntervalMaxMs: Math.max(...s.intervalsMs),
      })),
    }, null, 2));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
