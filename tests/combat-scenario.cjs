const fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('playwright');
const out=path.resolve('test-results/combat');fs.mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],consoleErrors:[],limitations:['Physical mobile hardware','Four-peer and long session coverage']};
function check(name,ok,evidence){report.checks.push({name,status:ok?'PASS':'FAIL',evidence});assert.ok(ok,name)}
const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html; charset=utf-8');r.end(fs.readFileSync(path.join(__dirname,'../index.html')))});
(async()=>{const ceiling=setTimeout(()=>process.exit(2),180000);let browser;try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({channel:'msedge',headless:true});report.browser=browser.version();report.runtimeSha256=require('crypto').createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../index.html'))).digest('hex');
 for(const width of [1280,390]){
  const context=await browser.newContext({viewport:{width,height:844},hasTouch:width===390,isMobile:width===390});
  await context.addInitScript(()=>globalThis.__YARN_MAYHEM_QA=true);const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push({text:m.text(),location:m.location()})});
  await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>!!window.__YARN_MAYHEM);
  await page.locator('#helpOpen').click();const help=await page.locator('#helpContent').textContent();check(width+' primary help matches controls',help.includes('즉시 바늘 발사')&&!help.includes('클릭 3연격'));await page.locator('#menuBack').click();
  await page.locator('#mainButton').click();await page.locator('#soloStart').click();
  const start=await page.evaluate(()=>__YARN_MAYHEM.snapshot().shotsFired);
  if(width===390)await page.locator('#fireButton').tap();else await page.mouse.click(900,400);
  await page.waitForTimeout(100);
  check(width+' primary needle immediate',await page.evaluate(n=>__YARN_MAYHEM.snapshot().shotsFired>n,start));
  await page.evaluate(()=>__YARN_MAYHEM.qaStopSimulation());
  const fixture=await page.evaluate(()=>{const q=__YARN_MAYHEM;q.qaClearEnemies();const p=q.snapshot().mapLayout.find(p=>p.kind==='platform');return p});
  report.platform=fixture;
  const pin=await page.evaluate(p=>{const q=__YARN_MAYHEM,x=(p.x1+p.x2)/2;q.qaPlayer(x+180,p.top+110);q.qaPlayerVelocity(0,0);const e=q.qaSpawn(2,x,p.top+16+26+38);q.qaSetEnemyGoal(e.id,'none');q.qaNeedleHit(e.id,0,-1);for(let i=0;i<6;i++){q.qaStep();const r=q.qaEnemies().find(a=>a.id===e.id);if(r?.control?.mode==='pinned')return r}return q.qaEnemies().find(a=>a.id===e.id)},fixture);
  check(width+' upward underside pin',pin?.control?.mode==='pinned'&&pin.control.normalY<-.48,pin);
  check(width+' pin duration',Math.abs(pin.control.untilMs-pin.control.startedMs-1200)<.01,pin.control);
  await page.evaluate(()=>{__YARN_MAYHEM.qaSetPhase('PAUSED');__YARN_MAYHEM.qaStartSimulation()});await page.waitForTimeout(120);await page.screenshot({path:path.join(out,width+'-underside-pin.png')});
  await page.evaluate(()=>{__YARN_MAYHEM.qaStopSimulation();__YARN_MAYHEM.qaSetPhase('PLAYING');__YARN_MAYHEM.qaStep(37)});
  check(width+' timed release',await page.evaluate(id=>__YARN_MAYHEM.qaEnemies().find(e=>e.id===id)?.control==null,pin.id));
  const wall=await page.evaluate(()=>{const q=__YARN_MAYHEM;q.qaClearEnemies();const e=q.qaSpawn(2,90,1540);q.qaSetEnemyGoal(e.id,'none');q.qaNeedleHit(e.id,-1,0);for(let i=0;i<8;i++){q.qaStep();const r=q.qaEnemies().find(a=>a.id===e.id);if(r?.control?.mode==='pinned')return r}return q.qaEnemies().find(a=>a.id===e.id)});
  check(width+' wall pin preserved',wall?.control?.mode==='pinned'&&wall.control.normalX<-.48,wall);
  for(const condition of ['slow','unneedled']){
   const result=await page.evaluate(({p,condition})=>{const q=__YARN_MAYHEM;q.qaClearEnemies();const x=(p.x1+p.x2)/2,e=q.qaSpawn(2,x,p.top+16+26+3);q.qaSetEnemyGoal(e.id,'none');if(condition==='slow')q.qaNeedleHit(e.id,0,-1);q.qaEnemyVelocity(e.id,0,condition==='slow'?-4:-12);q.qaStep(3);return q.qaEnemies().find(a=>a.id===e.id)}, {p:fixture,condition});
   check(width+' '+condition+' does not pin',result?.control?.mode!=='pinned',result);
  }
  const jump=await page.evaluate(p=>{const q=__YARN_MAYHEM;q.qaClearEnemies();q.qaPlayer((p.x1+p.x2)/2,p.top+54);q.qaPlayerVelocity(0,-12);q.qaStep(5);return q.snapshot().player},fixture);
  check(width+' ordinary upward one-way passage',jump.y<fixture.top-18,jump);
  const ai=await page.evaluate(()=>{const q=__YARN_MAYHEM;q.qaClearEnemies();q.qaPlayer(1100,1632);q.qaPlayerVelocity(0,0);const e=q.qaSpawn(2,890,1624);q.qaSetEnemyGoal(e.id,'attack');let r;for(let i=0;i<45;i++){q.qaStep();r=q.qaEnemies().find(a=>a.id===e.id);if(r?.attack?.phase==='charge')break}return r});
  check(width+' enemy telegraphed charge',ai?.attack?.phase==='charge'&&ai.dash.charges===2,ai);
  await page.evaluate(()=>{__YARN_MAYHEM.qaSetPhase('PAUSED');__YARN_MAYHEM.qaStartSimulation()});await page.waitForTimeout(90);await page.screenshot({path:path.join(out,width+'-enemy-charge.png')});await page.evaluate(()=>{__YARN_MAYHEM.qaStopSimulation();__YARN_MAYHEM.qaSetPhase('PLAYING')});
  const hp=await page.evaluate(()=>__YARN_MAYHEM.snapshot().hp);
  await page.evaluate(id=>{const q=__YARN_MAYHEM,e=q.qaEnemies().find(a=>a.id===id);q.qaPlayer(e.x-40,e.y);q.qaStep(2)},ai.id);
  const tracked=await page.evaluate(id=>__YARN_MAYHEM.qaEnemies().find(a=>a.id===id),ai.id);
  check(width+' charge tracks target without damage',tracked.attack.dx<0&&await page.evaluate(()=>__YARN_MAYHEM.snapshot().hp)===hp,tracked);
  const launched=await page.evaluate(id=>{const q=__YARN_MAYHEM;let e;for(let i=0;i<20;i++){q.qaStep();e=q.qaEnemies().find(a=>a.id===id);if(e?.attack?.phase==='dash')break}return e},ai.id);
  check(width+' shared dash charge consumed',launched?.attack?.phase==='dash'&&launched.dash.charges===1&&launched.vx<0,launched);
  check(width+' dash approach contact harmless',await page.evaluate(()=>__YARN_MAYHEM.snapshot().hp)===hp);
  const locked=await page.evaluate(id=>{const q=__YARN_MAYHEM,e=q.qaEnemies().find(a=>a.id===id);q.qaPlayer(e.x+300,e.y);q.qaStep();return q.qaEnemies().find(a=>a.id===id)},ai.id);
  check(width+' launch direction locked and dodgeable',locked.attack.dx===launched.attack.dx&&locked.vx<0,locked);
  const contact=await page.evaluate(id=>{const q=__YARN_MAYHEM;let e;for(let i=0;i<8;i++){q.qaStep();e=q.qaEnemies().find(a=>a.id===id);if(e?.attack?.phase==='attack')break}q.qaPlayer(e.x-40,e.y);q.qaPlayerVelocity(0,0);q.qaStep();return {enemy:q.qaEnemies().find(a=>a.id===id),hp:q.snapshot().hp}},ai.id);
  check(width+' explicit attack contact damage',contact.enemy.attack?.phase==='attack'&&contact.hp<hp,contact);
  await page.evaluate(()=>{__YARN_MAYHEM.qaStep(5)});
  check(width+' explicit recovery phase',await page.evaluate(id=>__YARN_MAYHEM.qaEnemies().find(a=>a.id===id)?.attack?.phase==='recover',ai.id));
  const ranged=await page.evaluate(()=>{const q=__YARN_MAYHEM;q.qaClearEnemies();q.qaPlayer(1100,1632);q.qaPlayerVelocity(0,0);const e=q.qaSpawn(6,650,1548);q.qaSetEnemyGoal(e.id,'attack');let r;for(let i=0;i<70;i++){q.qaStep();r=q.qaEnemies().find(a=>a.id===e.id);if(r?.attack?.phase==='attack')break}return {enemy:r,shots:q.qaNetworkFrame().shots}});
  check(width+' T6 existing projectile route',ranged.enemy?.attack?.kind==='ranged'&&ranged.shots.some(s=>s[1]===0&&s[9]==='needle'),ranged);
  const frame=await page.evaluate(()=>__YARN_MAYHEM.qaNetworkFrame());
  check(width+' authoritative enemy tell snapshot',frame.enemies.some(e=>e.length===16&&e[15]?.[5]==='ranged'));
  const tree=await page.evaluate(p=>{const q=__YARN_MAYHEM;q.qaClearEnemies();const reward=q.qaSpawn(10,2500,1200);q.qaHit(reward.id,99999);q.qaClearEnemies();const purchased=['needleCarry','needleThread','needleRebound'].map(id=>q.qaBuyTech(id));const x=(p.x1+p.x2)/2;q.qaPlayer(x,p.top+107);q.qaPlayerVelocity(0,0);const e=q.qaSpawn(2,x,p.top+16+26+30);q.qaSetEnemyGoal(e.id,'none');q.qaNeedle(-Math.PI/2);let pinned;for(let i=0;i<12;i++){q.qaStep();const r=q.qaEnemies().find(a=>a.id===e.id);if(r?.control?.mode==='pinned'){pinned=r;break}}if(pinned){q.qaPlayer(x,pinned.y+50);q.qaPlayerVelocity(0,0);q.qaNeedle(-Math.PI/2);q.qaStep()}return {purchased,pinned,after:q.qaEnemies().find(a=>a.id===e.id)}},fixture);
  check(width+' owned needle control tree physical shot pin',tree.purchased.every(Boolean)&&tree.pinned?.control?.mode==='pinned',tree);
  check(width+' underside needle normal axis',Math.abs(tree.pinned.control.anchorX-tree.pinned.x)<3,tree.pinned.control);
  check(width+' primary needle recut releases rebound',tree.after?.control?.mode==='rebound'&&tree.after.control.dy>0,tree.after);
  await page.evaluate(()=>{__YARN_MAYHEM.qaClearEnemies();__YARN_MAYHEM.qaStartSimulation()});
  check(width+' viewport',await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
  await context.close();
 }
 check('runtime errors',report.errors.length===0,report.errors);
 check('console errors',report.consoleErrors.length===0,report.consoleErrors);
 report.status='PASS';
}catch(e){report.status='FAIL';report.failure=e.stack;process.exitCode=1}finally{if(browser)await browser.close();server.close();clearTimeout(ceiling);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report))}})();
