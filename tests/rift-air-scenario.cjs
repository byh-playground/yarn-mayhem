const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict'),{chromium}=require('playwright');
const out=path.resolve('test-results/rift-air-0192');fs.mkdirSync(out,{recursive:true});
const report={status:'RUNNING',browser:null,checks:[],errors:[],networkFailures:[]};
const check=(name,ok,evidence)=>{report.checks.push({name,status:ok?'PASS':'FAIL',evidence});assert.ok(ok,name)};
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync(path.join(__dirname,'../index.html')))});

(async()=>{
  let browser;const ceiling=setTimeout(()=>process.exit(2),60000);
  try{
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    browser=await chromium.launch({channel:'msedge',headless:true});report.browser=browser.version();
    for(const mobile of [false,true]){
      const tag=mobile?'landscape-touch':'edge-pc';
      const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1280,height:844},isMobile:mobile,hasTouch:mobile});
      await context.addInitScript(()=>globalThis.__YARN_MAYHEM_QA=true);
      const page=await context.newPage();
      page.on('pageerror',e=>report.errors.push(`${tag}: ${e.message}`));
      page.on('requestfailed',r=>report.networkFailures.push({tag,url:r.url(),error:r.failure()?.errorText}));
      await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForFunction(()=>!!window.__YARN_MAYHEM);
      await page.locator('#mainButton').click();await page.locator('#soloStart').click();
      await page.waitForFunction(()=>__YARN_MAYHEM.snapshot().phase==='PLAYING');
      await page.waitForTimeout(850);
      const setup=await page.evaluate(()=>{
        const q=__YARN_MAYHEM;q.qaClearEnemies();q.qaClearRifts();
        const snap=q.snapshot(),sites=q.qaSpawnSites(),background=sites.filter(site=>site.kind==='background');
        const platforms=snap.mapLayout.filter(surface=>surface.kind==='platform');
        const withinBounds=background.every(site=>site.x>20&&site.x<snap.world.width-20&&site.y>20&&site.y<snap.world.groundY-20&&site.normalX===0&&site.normalY===0);
        const clearOfPlatforms=background.every(site=>platforms.every(surface=>{
          const x=Math.max(surface.x1,Math.min(site.x,surface.x2)),y=Math.max(surface.top,Math.min(site.y,surface.top+16));
          return Math.hypot(site.x-x,site.y-y)>=20;
        }));
        const player=q.qaPlayers().filter(p=>p.hp>0),eligible=background.map((site,index)=>({site,index,
          nearestPlayer:player.length?Math.min(...player.map(p=>Math.hypot(site.x-p.x,site.y-p.y))):Infinity}))
          .filter(item=>item.nearestPlayer>=18+18+80).sort((a,b)=>a.nearestPlayer-b.nearestPlayer);
        return {mapSeed:snap.mapSeed,siteKinds:snap.spawnSiteKinds,backgroundCount:background.length,background,withinBounds,clearOfPlatforms,
          siteIdsUnique:new Set(background.map(s=>s.surfaceId)).size===background.length,eligible:eligible[0],bodyCount:q.qaPhysicsBodies()};
      });
      check(`${tag}: seeded air anchors coexist with top and edge sites`,setup.siteKinds.includes('background')&&setup.siteKinds.includes('top')&&setup.siteKinds.includes('wall-left')&&setup.siteKinds.includes('wall-right')&&setup.backgroundCount>=24,setup);
      check(`${tag}: background sites are bounded, off solid platforms and uniquely keyed`,setup.withinBounds&&setup.clearOfPlatforms&&setup.siteIdsUnique,setup);
      check(`${tag}: an air anchor is well clear of the player before release`,setup.eligible.nearestPlayer>=CONFIG_GAP(),setup.eligible);
      const before=setup.background.map(s=>[s.surfaceId,s.x,s.y]);
      await page.evaluate(()=>__YARN_MAYHEM.qaStart());await page.waitForFunction(()=>__YARN_MAYHEM.snapshot().phase==='PLAYING');
      const after=await page.evaluate(()=>__YARN_MAYHEM.qaSpawnSites().filter(s=>s.kind==='background').map(s=>[s.surfaceId,s.x,s.y]));
      check(`${tag}: air anchor position/kind list is deterministic from the map seed`,JSON.stringify(before)===JSON.stringify(after),{mapSeed:setup.mapSeed,count:after.length});

      const visibleRift=await page.evaluate(()=>{
        const q=__YARN_MAYHEM,beforeIds=q.qaEnemies().map(e=>e.id);q.qaClearRifts();const hole=q.qaAutomaticSpawnRift();
        return hole?{hole,beforeIds,rules:q.qaSpawnRules(),diagnostics:q.qaSpawnDiagnostics(hole),screen:q.qaWorldPoint(hole.x,hole.y),viewport:{width:innerWidth,height:innerHeight}}:null;
      });
      check(`${tag}: automatic rift opens in a living player's visible peripheral view, clear of controls and all players`,
        !!visibleRift&&visibleRift.diagnostics.observers.some(view=>view.periphery!==null)&&
        visibleRift.diagnostics.playerGaps.every(player=>player.gap>=visibleRift.rules.playerGap)&&
        visibleRift.screen.x>=0&&visibleRift.screen.x<=visibleRift.viewport.width&&visibleRift.screen.y>=0&&visibleRift.screen.y<=visibleRift.viewport.height,visibleRift);
      if(visibleRift)await page.screenshot({path:path.join(out,`${tag}-automatic-visible-opening.png`)});
      if(visibleRift){
        await page.waitForFunction(id=>__YARN_MAYHEM.snapshot().spawnHoles.find(h=>h.id===id)?.spawns>=1,visibleRift.hole.id,{timeout:5000});
        const visiblePop=await page.evaluate(({id,beforeIds})=>{
          const q=__YARN_MAYHEM,h=q.snapshot().spawnHoles.find(h=>h.id===id),e=q.qaEnemies().find(e=>!beforeIds.includes(e.id));
          return e?{hole:h,enemy:e,screen:q.qaWorldPoint(e.x,e.y),radiusScreen:e.radius*q.snapshot().camera.zoom,viewport:{width:innerWidth,height:innerHeight}}:null;
        },{id:visibleRift.hole.id,beforeIds:visibleRift.beforeIds});
        check(`${tag}: the first upward pop from that automatically placed rift appears inside the real camera`,
          !!visiblePop&&visiblePop.screen.x-visiblePop.radiusScreen>=0&&visiblePop.screen.x+visiblePop.radiusScreen<=visiblePop.viewport.width&&
          visiblePop.screen.y-visiblePop.radiusScreen>=0&&visiblePop.screen.y+visiblePop.radiusScreen<=visiblePop.viewport.height,visiblePop);
        if(visiblePop)await page.screenshot({path:path.join(out,`${tag}-automatic-visible-pop.png`)});
      }
      await page.evaluate(()=>{__YARN_MAYHEM.qaClearRifts();__YARN_MAYHEM.qaClearEnemies();});

      const beforeIds=await page.evaluate(()=>__YARN_MAYHEM.qaEnemies().map(e=>e.id));
      const preEmitBodies=await page.evaluate(()=>__YARN_MAYHEM.qaPhysicsBodies());
      const hole=await page.evaluate(index=>__YARN_MAYHEM.qaSpawnRift('background',null,index),setup.eligible.index);
      check(`${tag}: background rift opens without creating a collision body`,!!hole&&hole.kind==='background'&&
        (await page.evaluate(()=>__YARN_MAYHEM.qaPhysicsBodies()))===preEmitBodies,hole);
      await page.waitForTimeout(100);
      const opening=await page.evaluate(id=>__YARN_MAYHEM.snapshot().spawnHoles.find(h=>h.id===id),hole.id);
      check(`${tag}: actual face-on rift enters opening phase`,opening?.phase==='opening'&&opening.normalX===0&&opening.normalY===0,opening);
      await page.addStyleTag({content:'#stageToast{display:none!important}'});
      await page.screenshot({path:path.join(out,`${tag}-air-opening.png`)});

      await page.waitForFunction(id=>{const h=__YARN_MAYHEM.snapshot().spawnHoles.find(h=>h.id===id);return h?.spawns>=1;},hole.id,{timeout:4000});
      const pop=await page.evaluate(({id,beforeIds})=>{
        const q=__YARN_MAYHEM,h=q.snapshot().spawnHoles.find(h=>h.id===id),e=q.qaEnemies().find(e=>!beforeIds.includes(e.id));
        if(e)q.qaSetEnemyGoal(e.id,'none');
        const player=q.qaPlayers().filter(p=>p.hp>0);
        return {hole:h,enemy:e,nearestPlayer:player.length?Math.min(...player.map(p=>Math.hypot(e.x-p.x,e.y-p.y))):Infinity};
      },{id:hole.id,beforeIds});
      check(`${tag}: air enemy releases from anchor with upward-centered impulse and no player overlap`,
        !!pop.enemy&&Math.hypot(pop.enemy.x-pop.hole.x,pop.enemy.y-pop.hole.y)<60&&pop.enemy.vy<0&&
        Math.abs(pop.enemy.vx)<=Math.abs(pop.enemy.vy)+.001&&pop.nearestPlayer>=36,pop);
      await page.screenshot({path:path.join(out,`${tag}-air-pop.png`)});
      const startY=pop.enemy.y;let peakY=startY,ascending=false,falling=false,expired=false,closingShot=false,trace=[];
      const until=Date.now()+5800;
      while(Date.now()<until){
        await page.waitForTimeout(100);
        const frame=await page.evaluate(({id,enemyId})=>{
          const q=__YARN_MAYHEM,h=q.snapshot().spawnHoles.find(h=>h.id===id),e=q.qaEnemies().find(e=>e.id===enemyId);
          return {hole:h||null,enemy:e||null};
        },{id:hole.id,enemyId:pop.enemy.id});
        if(frame.enemy){
          peakY=Math.min(peakY,frame.enemy.y);
          if(frame.enemy.y<startY-60)ascending=true;
          if(ascending&&frame.enemy.vy>0)falling=true;
          if(trace.length<60)trace.push({ms:Math.round(frame.hole?.remainingMs??0),x:+frame.enemy.x.toFixed(1),y:+frame.enemy.y.toFixed(1),vy:+frame.enemy.vy.toFixed(2)});
        }
        if(frame.hole?.phase==='closing'&&!closingShot){
          closingShot=true;await page.screenshot({path:path.join(out,`${tag}-air-closing.png`)});
        }
        if(!frame.hole)expired=true;
      }
      const final=await page.evaluate(id=>__YARN_MAYHEM.snapshot().spawnHoles.find(h=>h.id===id)||null,hole.id);
      check(`${tag}: background enemy rises then falls under normal gravity`,ascending&&falling,{startY,peakY,falling,trace});
      check(`${tag}: air rift visibly closes and expires at its existing three-second life`,closingShot&&expired&&!final,{closingShot,expired,final});
      await context.close();
    }
    check('browser runtime has no page errors',report.errors.length===0,report.errors);
    report.status='PASS';
  }catch(e){report.status='FAIL';report.failure=e.stack;process.exitCode=1}
  finally{clearTimeout(ceiling);if(browser)await browser.close();server.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
})().catch(e=>{console.error(e);process.exitCode=1});

function CONFIG_GAP(){return 18+18+80;}
