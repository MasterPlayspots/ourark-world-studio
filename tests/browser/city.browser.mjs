// PR-D gate: a city of 2000 footprint buildings stays fast in the Map Studio — import, editing, the 3D view
// and the walk. Draw calls are read from the renderer (test hook ?stats), frame times measured in the page.
import path from 'node:path';
import {loadPlaywright,startServer,launch,recorder,assert,artifactDir} from './harness.mjs';

const playwright=loadPlaywright();
const {origin,close}=await startServer(),browser=await launch(playwright),{results,step}=recorder();
const page=await (await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:2})).newPage(),errors=[];
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('pageerror',e=>errors.push(e.message));
const shot=name=>page.screenshot({path:path.join(artifactDir,name)});
const BUDGET=1000/60;
const measure=ms=>page.evaluate(ms=>new Promise(res=>{const t=[];let last=0;const end=performance.now()+ms;function f(now){if(last)t.push(now-last);last=now;if(now<end)requestAnimationFrame(f);else{t.sort((a,b)=>a-b);res({fps:t.length/(ms/1000),p95:t[Math.floor(t.length*.95)]});}}requestAnimationFrame(f);}),ms);
const stats=()=>page.evaluate(()=>({...globalThis.__MOTIONSPEC_RENDER_STATS__}));

// 2000 buildings on a 45 × 45 grid of blocks (streets between), three footprint shapes, several colours.
const shapes=[[[-8,-8],[8,-8],[8,-2],[-2,-2],[-2,8],[-8,8]],[[-9,-6],[9,-6],[9,6],[-9,6]],[[-8,-8],[8,-8],[8,8],[3,8],[3,0],[-3,0],[-3,8],[-8,8]]];
const colors=['#5eead4','#72a8ef','#f3c969','#d5b5ff','#eaf1fb'];
const points=Array.from({length:2000},(_,i)=>({id:`b${i}`,name:`Block ${i}`,type:'building',x:(i%45)*40-880,z:Math.floor(i/45)*40-880,width:1,depth:1,height:6+(i*7)%40,rotation:(i*15)%90,color:colors[i%5],visible:true,locked:false,footprint:shapes[i%3],data:{Nummer:i}}));
const doc={schema:'motionspec.map.v3',name:'Stadt 2000',map:{width:1900,depth:1900,color:'#101f34',image:null},runtime:{spawn:{x:-900,z:0,heading:90}},points};

try{
  await page.goto(origin+'/map-studio/?stats',{waitUntil:'networkidle'});await page.waitForTimeout(400);

  await step('C01','Import von 2000 Gebäuden in unter 3 s bis zum ersten Bild',async()=>{
    const t0=Date.now();
    await page.setInputFiles('#project-file',{name:'stadt.map.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(doc))});
    await page.waitForFunction(()=>document.getElementById('title').textContent==='Stadt 2000',null,{timeout:30000});
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const ms=Date.now()-t0;await shot('c01-2d.png');assert(ms<3000,`${ms} ms`);return `${ms} ms`;
  });

  await step('C02','Bearbeiten (Höhe ändern) dauert unter 50 ms',async()=>{
    const ms=await page.evaluate(()=>{const input=document.getElementById('point-height');input.value='33';const t=performance.now();input.dispatchEvent(new Event('change'));return performance.now()-t;});
    assert(ms<50,`${ms.toFixed(1)} ms`);return `${ms.toFixed(1)} ms`;
  });

  await step('C03','3D-Ansicht: höchstens 120 Draw-Calls, Drehen ≥ 58 fps',async()=>{
    await page.click('#view-3d');await page.waitForTimeout(500);
    const box=await page.locator('#canvas').boundingBox(),cx=box.x+box.width/2,cy=box.y+box.height/2;
    await page.mouse.move(cx,cy);await page.mouse.down();
    const moving=(async()=>{for(let i=0;i<60;i++){await page.mouse.move(cx+i*4,cy+Math.sin(i/6)*20);await page.waitForTimeout(16);}})();
    const m=await measure(1500);await moving;await page.mouse.up();const s=await stats();await shot('c03-3d.png');
    assert(s.calls<=120,`${s.calls} Draw-Calls`);assert(m.fps>=58,`${m.fps.toFixed(1)} fps, p95 ${m.p95.toFixed(1)} ms`);
    return `${s.calls} Draw-Calls, ${m.fps.toFixed(0)} fps, p95 ${m.p95.toFixed(1)} ms`;
  });

  await step('C04','Begehen: höchstens 120 Draw-Calls, ≥ 58 fps bei 2× Auflösung',async()=>{
    await page.click('#view-2d');await page.click('#walk-enter');await page.waitForFunction(()=>document.body.dataset.runtime==='playing');
    await page.waitForFunction(()=>/fps/.test(document.getElementById('runtime-perf').textContent),null,{timeout:8000});
    await page.keyboard.down('KeyW');await page.keyboard.down('KeyE');const m=await measure(4000);await page.keyboard.up('KeyW');await page.keyboard.up('KeyE');
    const s=await stats(),perf=await page.textContent('#runtime-perf');await shot('c04-walk.png');
    assert(s.calls<=120,`${s.calls} Draw-Calls`);assert(m.fps>=58,`${m.fps.toFixed(1)} fps`);assert(m.p95<=BUDGET*1.25,`p95 ${m.p95.toFixed(1)} ms`);
    assert(/·\s*2×/.test(perf),`Auflösung: ${perf}`);
    await page.click('#runtime-exit');await page.waitForFunction(()=>!document.body.dataset.runtime);
    return `${s.calls} Draw-Calls, ${m.fps.toFixed(0)} fps, p95 ${m.p95.toFixed(1)} ms · ${perf}`;
  });

  await step('C05','Auswahl per Klick und Ziehen funktionieren weiter',async()=>{
    if(await page.evaluate(()=>Boolean(document.body.dataset.runtime))){await page.click('#runtime-exit');await page.waitForFunction(()=>!document.body.dataset.runtime);}
    await page.waitForTimeout(300);await page.click('#overview');await page.waitForTimeout(200);
    await page.click('.point-row >> nth=10');const id=await page.textContent('#point-id');assert(id==='b10',id);
    return `ausgewählt ${id}`;
  });

  await step('C07','Anderes Gebäude auswählen dauert unter 30 ms',async()=>{
    const ms=await page.evaluate(()=>{const rows=document.querySelectorAll('.point-row'),times=[];for(const i of [500,1500,20]){const t=performance.now();rows[i].click();times.push(performance.now()-t);}return Math.max(...times);});
    assert(ms<30,`${ms.toFixed(1)} ms`);return `höchstens ${ms.toFixed(1)} ms`;
  });

  await step('C06','Keine Konsolenfehler',async()=>{assert(!errors.length,errors.join(' | '));return 'none';});
}finally{await browser.close();await close();}
const failed=results.filter(r=>!r.ok).length;console.log(`${results.length-failed}/${results.length} city browser checks passed.`);process.exitCode=failed?1:0;
