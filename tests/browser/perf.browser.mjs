// Welle-4a gate in a real browser: the walk holds 60 fps on desktop (retina) and on an emulated phone
// (DPR 3, CPU throttled 4×), renders at full device resolution, adapts the resolution under load and recovers,
// and uses fullscreen where the browser allows it.
import path from 'node:path';
import {loadPlaywright,startServer,launch,recorder,assert,artifactDir} from './harness.mjs';

const playwright=loadPlaywright();
if(!playwright){console.log('SKIP: playwright-core not found (set PLAYWRIGHT_CORE).');process.exit(0);}
const {origin,close}=await startServer(),browser=await launch(playwright),{results,step}=recorder();
const errors=[];
const BUDGET=1000/60;
// Frame intervals measured in the page itself, independent of the app's own statistics.
const measure=(page,ms)=>page.evaluate(ms=>new Promise(res=>{const t=[];let last=0;const end=performance.now()+ms;function f(now){if(last)t.push(now-last);last=now;if(now<end)requestAnimationFrame(f);else{t.sort((a,b)=>a-b);res({fps:t.length/(ms/1000),p95:t[Math.floor(t.length*.95)]});}}requestAnimationFrame(f);}),ms);
const scale=async page=>Number((/·\s*([\d,]+)×/.exec(await page.textContent('#runtime-perf'))?.[1]??'0').replace(',','.'));
async function openWalk(options,{throttle=1}={}){
  const context=await browser.newContext(options),page=await context.newPage();
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('pageerror',e=>errors.push(e.message));
  if(throttle>1){const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:throttle});}
  await page.goto(origin+'/map-studio/',{waitUntil:'networkidle'});await page.waitForTimeout(300);
  await page.click('#walk-enter');await page.waitForFunction(()=>document.body.dataset.runtime==='playing');
  await page.waitForFunction(()=>/fps/.test(document.getElementById('runtime-perf').textContent),null,{timeout:8000});
  return {page,context};
}

try{
  await step('P01','Desktop Retina: ≥ 58 fps beim Laufen, volle Geräteauflösung (2×)',async()=>{
    const {page,context}=await openWalk({viewport:{width:1440,height:900},deviceScaleFactor:2});
    await page.keyboard.down('KeyW');await page.keyboard.down('KeyE');const m=await measure(page,4000);await page.keyboard.up('KeyW');await page.keyboard.up('KeyE');
    const s=await scale(page),canvas=await page.evaluate(()=>{const c=document.getElementById('canvas');return {w:c.width,css:c.clientWidth};});
    await page.screenshot({path:path.join(artifactDir,'p01-desktop.png')});await context.close();
    assert(m.fps>=58,`${m.fps.toFixed(1)} fps`);assert(m.p95<=BUDGET*1.25,`p95 ${m.p95.toFixed(1)} ms`);assert(s===2,`Auflösung ${s}×`);assert(canvas.w===canvas.css*2,`Canvas ${canvas.w}px bei ${canvas.css} CSS-px`);
    return `${m.fps.toFixed(0)} fps, p95 ${m.p95.toFixed(1)} ms, ${s}×, Canvas ${canvas.w}px`;
  });
  await step('P02','Handy (390×844, DPR 3, CPU 4× gedrosselt): Start mit 2×, bei Luft 3×, ≥ 58 fps',async()=>{
    const {page,context}=await openWalk({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true},{throttle:4});
    const first=await scale(page);assert(first===2,`Start ${first}×`);
    await page.waitForFunction(()=>/·\s*3×/.test(document.getElementById('runtime-perf').textContent),null,{timeout:20000});
    await page.keyboard.down('KeyW');const m=await measure(page,4000);await page.keyboard.up('KeyW');
    const s=await scale(page);await page.screenshot({path:path.join(artifactDir,'p02-phone.png')});await context.close();
    assert(m.fps>=58,`${m.fps.toFixed(1)} fps`);assert(m.p95<=BUDGET*1.25,`p95 ${m.p95.toFixed(1)} ms`);assert(s===3,`Auflösung ${s}×`);
    return `Start 2×, dann ${s}× bei ${m.fps.toFixed(0)} fps, p95 ${m.p95.toFixed(1)} ms`;
  });
  await step('P03','Unter Last sinkt die Auflösung, danach steigt sie wieder bis zum Maximum',async()=>{
    const {page,context}=await openWalk({viewport:{width:1440,height:900},deviceScaleFactor:2});
    await page.evaluate(()=>{globalThis.__MOTIONSPEC_FRAME_LOAD_MS__=30;});
    await page.waitForFunction(()=>/·\s*(0|1)[,.]?\d*×/.test(document.getElementById('runtime-perf').textContent),null,{timeout:15000});const low=await scale(page);
    await page.evaluate(()=>{globalThis.__MOTIONSPEC_FRAME_LOAD_MS__=0;});
    await page.waitForFunction(()=>/·\s*2×/.test(document.getElementById('runtime-perf').textContent),null,{timeout:40000});
    const m=await measure(page,1500);await context.close();
    assert(low<2,`unter Last ${low}×`);assert(m.fps>=58,`danach ${m.fps.toFixed(1)} fps`);
    return `unter Last ${low}×, danach wieder 2× bei ${m.fps.toFixed(0)} fps`;
  });
  await step('P04','Vollbild beim Betreten (wo erlaubt), Verlassen beendet es, Editor zurück in Editor-Auflösung',async()=>{
    const {page,context}=await openWalk({viewport:{width:1280,height:800},deviceScaleFactor:2});
    const fs=await page.evaluate(()=>document.fullscreenElement?.id??null);
    await page.click('#runtime-exit');await page.waitForFunction(()=>!document.body.dataset.runtime);await page.waitForTimeout(300);
    const after=await page.evaluate(()=>({fs:document.fullscreenElement?.id??null,w:document.getElementById('canvas').width,css:document.getElementById('canvas').clientWidth}));
    await context.close();
    assert(after.fs===null,'Vollbild beendet');assert(after.w===after.css*2,'Editor wieder mit 2×');
    return fs==='stage'?'Vollbild aktiv, nach dem Verlassen beendet':'Vollbild im Headless-Browser nicht gewährt (kein Fehler), Rückkehr sauber';
  });
  await step('P05','Keine Konsolenfehler',async()=>{assert(!errors.length,errors.join(' | '));return 'keine';});
}finally{await browser.close();await close();}
const failed=results.filter(r=>!r.ok).length;console.log(`${results.length-failed}/${results.length} performance browser checks passed.`);process.exitCode=failed?1:0;
