// Live performance meter in a real browser: visible with ?perf=1, real values (fps, draw calls, triangles),
// JSON/CSV export of the per-second log, and no animation loop once hidden.
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {loadPlaywright,startServer,launch,recorder,assert,artifactDir} from './harness.mjs';

const playwright=loadPlaywright();
if(!playwright){console.log('SKIP: playwright-core not found (set PLAYWRIGHT_CORE).');process.exit(0);}
const {origin,close}=await startServer(),browser=await launch(playwright),{results,step}=recorder();
const context=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true});
await context.addInitScript(()=>{window.__raf=0;const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=fn=>{window.__raf++;return raf(fn);};});
const page=await context.newPage(),errors=[];
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('pageerror',e=>errors.push(e.message));
const value=label=>page.evaluate(label=>{for(const dt of document.querySelectorAll('.perf-grid dt'))if(dt.textContent===label)return dt.nextElementSibling.textContent;return null;},label);
const download=async act=>{const [d]=await Promise.all([page.waitForEvent('download'),page.click(`.perf-head [data-act="${act}"]`)]);const f=path.join(artifactDir,`perf-${Date.now()}.${act}`);await d.saveAs(f);return readFile(f,'utf8');};

try{
  await step('PM01','Meter visible on all four pages with ?perf=1',async()=>{
    for(const route of ['/','/studio/','/map-studio/','/world-studio/']){await page.goto(`${origin}${route}?perf=1`,{waitUntil:'networkidle'});assert(await page.isVisible('.perf-meter'),`${route}: meter hidden`);}
    return '4 pages';
  });
  await step('PM02','Real measured values in the World Studio',async()=>{
    await page.goto(`${origin}/world-studio/?perf=1#alpine`,{waitUntil:'networkidle'});await page.click('#walk-enter');
    await page.waitForFunction(()=>document.body.dataset.runtime==='playing');await page.waitForTimeout(2500);
    const fps=Number(await value('FPS')),rendered=Number(await value('Gerenderte Frames / s')),calls=Number(await value('Draw Calls / Frame')),tris=await value('Dreiecke / Frame');
    assert(rendered>10,`rendered frames ${rendered}`);
    const onTop=await page.evaluate(()=>{const m=document.querySelector('.perf-meter'),r=m.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return m.contains(hit);});assert(onTop,'meter covered in walk mode');
    assert(fps>0,`fps ${fps}`);assert(calls>0,`draw calls ${calls}`);assert(tris&&tris!=='0',`triangles ${tris}`);
    await page.screenshot({path:path.join(artifactDir,'pm02-perf-meter.png')});
    await page.click('#runtime-exit');
    return `${fps} fps, ${rendered} rendered/s, ${calls} draw calls, ${tris} triangles`;
  });
  await step('PM03','Per-second log exports as JSON and CSV',async()=>{
    const json=JSON.parse(await download('json')),csv=(await download('csv')).trim().split('\n');
    assert(json.format==='ourark.perf-log.v1'&&json.samples.length>=2,`samples ${json.samples.length}`);assert(csv.length===json.samples.length+1||csv.length>=3,`csv rows ${csv.length}`);
    return `${json.samples.length} samples, GPU ${json.environment.gpu?.slice(0,40)}`;
  });
  await step('PM04','Hidden meter runs no loop; Alt+P shows it again',async()=>{
    await page.goto(`${origin}/map-studio/?perf=1`,{waitUntil:'networkidle'});await page.click('.perf-head [data-act="hide"]');
    await page.waitForTimeout(300);const a=await page.evaluate(()=>window.__raf);await page.waitForTimeout(1000);const b=await page.evaluate(()=>window.__raf);
    assert(b-a<5,`${b-a} RAF while hidden`);assert(await page.isVisible('.perf-pill'),'pill missing');
    await page.keyboard.press('Alt+KeyP');assert(await page.isVisible('.perf-meter'),'Alt+P did not show it');
    return `${b-a} RAF in 1 s while hidden`;
  });
  await step('PM05','No console errors',async()=>{assert(!errors.length,errors.join(' | '));return 'none';});
}finally{await browser.close();await close();}
const failed=results.filter(r=>!r.ok).length;console.log(`${results.length-failed}/${results.length} perf meter browser checks passed.`);process.exitCode=failed?1:0;
