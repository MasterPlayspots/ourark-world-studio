// Scan worlds (ADR 0003) in a real browser: the fixture bundle (tests/fixtures/scans) appears in the library,
// loads with every file checked, replays the source camera, is walkable in first person and blocks at furniture;
// no CSP violation and no console error (A3). With SCAN_PERF=1 it also measures GPU time on the source path
// at 1920×1080 (W2 gate: p95 ≤ 16.7 ms) — only meaningful on a real GPU (local M4), not in CI.
import {loadPlaywright,startServer,launch,recorder,assert,environment,drawnRatio} from './harness.mjs';
import path from 'node:path';
import {artifactDir} from './harness.mjs';
import {readFile} from 'node:fs/promises';

const playwright=loadPlaywright();
const {origin,close}=await startServer(),browser=await launch(playwright),{results,step}=recorder();
const perf=process.env.SCAN_PERF==='1',viewport=perf?{width:1920,height:1080}:{width:1440,height:900};
const page=await (await browser.newContext({viewport,deviceScaleFactor:1})).newPage(),errors=[];
page.on('console',m=>{if(m.type()==='error'||/Content Security Policy/i.test(m.text()))errors.push(m.text());});page.on('pageerror',e=>errors.push(e.message));
const shot=name=>page.screenshot({path:path.join(artifactDir,name)});
const waitState=s=>page.waitForFunction(s=>(document.body.dataset.runtime??'editing')===s,s,{timeout:8000});
const pose=async()=>{const text=await page.textContent('#runtime-position'),[,x,z,h]=/X (-?[\d.]+) · Z (-?[\d.]+) · (\d+)°/.exec(text),y=/Y (-?[\d.]+)/.exec(text);return {x:Number(x),z:Number(z),heading:Number(h),y:y?Number(y[1]):null,mode:text.split(' · ').at(-1)};};
const stats=()=>page.evaluate(()=>globalThis.__MOTIONSPEC_RENDER_STATS__);
// The office48 room (colliders.json area) with a little tolerance.
const inRoom=p=>p.x>-.5&&p.x<4.2&&p.z>-.8&&p.z<5.4;
const hold=async(code,ms)=>{await page.keyboard.down(code);await page.waitForTimeout(ms);await page.keyboard.up(code);await page.waitForTimeout(150);};

try{
  let id;
  await step('SC01','/api/scenes lists the fixture and the library shows a scan card',async()=>{
    const index=await (await fetch(origin+'/api/scenes')).json(),office=index.scenes.find(s=>s.name==='Office 48');id=office?.id;assert(/^[0-9a-f]{64}$/.test(id??''),'Office 48 not listed');
    await page.goto(origin+'/world-studio/?stats#alpine',{waitUntil:'networkidle'});
    await page.waitForSelector(`[data-world="scan:${id}"]`,{timeout:8000});return `${index.scenes.length} scenes · ${office.name} ${id.slice(0,12)}…`;
  });

  await step('SC02','Opening the card loads and verifies the scene (23 draw calls, 68 155 triangles, something drawn)',async()=>{
    await page.click(`[data-world="scan:${id}"]`);
    await page.waitForFunction(()=>/draw calls/.test(document.getElementById('scan-meta').textContent),null,{timeout:15000});
    const meta=await page.textContent('#scan-meta');assert(/68155 triangles · 23 draw calls/.test(meta),meta);
    assert((await page.evaluate(()=>location.hash)).startsWith('#scan:'),'address');
    await page.waitForTimeout(400);const drawn=await drawnRatio(page);assert(drawn>.5,`drawn ${drawn}`);
    await shot('sc02-scan.png');return `${meta} · drawn ${(drawn*100).toFixed(0)} %`;
  });

  await step('SC03','Source camera replays the video path and stops on canvas input',async()=>{
    assert(!(await page.$eval('#camera-view option[value="source"]',o=>o.hidden)),'source option hidden');
    await page.selectOption('#camera-view','source');await page.waitForTimeout(800);await shot('sc03-source.png');
    const box=await page.locator('#canvas').boundingBox();await page.mouse.click(box.x+box.width/2,box.y+box.height/2);await page.waitForTimeout(150);
    const value=await page.inputValue('#camera-view');assert(value==='perspective',`view ${value}`);return 'played, handed back to orbit';
  });

  // A1 (W5): tier „Hoch“ = the full device resolution. Canvas 1920×1080 CSS px at device scale 2 → 3840×2160 px,
  // baked light, source camera path. GPU time of the render call only (?stats), p95 ≤ 16.7 ms.
  if(perf)await step('SC-A1','A1: tier „Hoch“ at 3840×2160 (1920×1080 at 2×), GPU p95 ≤ 16.7 ms',async()=>{
    const hi=await (await browser.newContext({viewport:{width:2400,height:1400},deviceScaleFactor:2})).newPage();
    await hi.goto(`${origin}/world-studio/?stats#scan:${id}`,{waitUntil:'networkidle'});
    await hi.waitForFunction(()=>/draw calls/.test(document.getElementById('scan-meta').textContent),null,{timeout:15000});
    await hi.selectOption('#scan-quality','high');
    let size={width:2400,height:1400};
    for(let i=0;i<4;i++){const box=await hi.locator('#canvas').boundingBox();if(Math.round(box.width)===1920&&Math.round(box.height)===1080)break;size={width:Math.round(size.width+1920-box.width),height:Math.round(size.height+1080-box.height)};await hi.setViewportSize(size);await hi.waitForTimeout(300);}
    await hi.selectOption('#camera-view','source');await hi.waitForTimeout(800);
    await hi.evaluate(()=>{globalThis.__MOTIONSPEC_GPU_MS__=[];});await hi.waitForTimeout(6000);
    const r=await hi.evaluate(()=>{const s=(globalThis.__MOTIONSPEC_GPU_MS__??[]).slice(20).sort((a,b)=>a-b),st=globalThis.__MOTIONSPEC_RENDER_STATS__;return s.length?{n:s.length,median:s[s.length>>1],p95:s[Math.floor(s.length*.95)],size:`${st.width}x${st.height}`,calls:st.calls}:null;});
    await hi.close();
    assert(r,'EXT_disjoint_timer_query_webgl2 not available');assert(r.size==='3840x2160',`canvas ${r.size}`);
    assert(r.p95<=16.7,`p95 ${r.p95.toFixed(2)} ms at ${r.size}`);return `${r.size} · ${r.calls} draw calls · median ${r.median.toFixed(2)} ms · p95 ${r.p95.toFixed(2)} ms (n ${r.n})`;
  });

  if(perf)await step('SC-PERF','GPU time of the render call on the source path, canvas 1920×1080, tier „Mittel“ (W2 gate p95 ≤ 16.7 ms)',async()=>{
    // Grow the window until the canvas itself is 1920×1080 CSS px (device scale 1, editor pixel ratio 1).
    const env=await environment(page);await page.goto(`${origin}/world-studio/?stats#scan:${id}`,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>/draw calls/.test(document.getElementById('scan-meta').textContent),null,{timeout:15000});
    const canvas=await page.locator('#canvas').boundingBox();
    await page.setViewportSize({width:Math.round(viewport.width+1920-canvas.width),height:Math.round(viewport.height+1080-canvas.height)});await page.waitForTimeout(400);
    await page.selectOption('#camera-view','source');await page.waitForTimeout(500);
    await page.evaluate(()=>{globalThis.__MOTIONSPEC_GPU_MS__=[];});await page.waitForTimeout(5000);
    const result=await page.evaluate(()=>{const s=(globalThis.__MOTIONSPEC_GPU_MS__??[]).slice(20).sort((a,b)=>a-b),st=globalThis.__MOTIONSPEC_RENDER_STATS__;return s.length?{n:s.length,median:s[s.length>>1],p95:s[Math.floor(s.length*.95)],size:`${st.width}x${st.height}`,calls:st.calls}:null;});
    assert(result,'EXT_disjoint_timer_query_webgl2 not available');assert(result.size==='1920x1080',`canvas ${result.size}`);
    await page.setViewportSize(viewport);await page.selectOption('#camera-view','perspective');
    assert(result.p95<=16.7,`p95 ${result.p95.toFixed(2)} ms`);return `${env.gpu} · ${result.size} · ${result.calls} draw calls/frame · median ${result.median.toFixed(2)} ms · p95 ${result.p95.toFixed(2)} ms (n ${result.n})`;
  });

  // W5 image check: the browser frame (baked light, clay albedo, frame 1 of the source camera, 1280×720) against
  // the Cycles render of the same frame (worldscan src/blender_reference.py). Compared on 16×16 px blocks of
  // luminance, so sub-pixel edges and anti-aliasing do not dominate.
  await step('SC-IMG','Baked light matches the Cycles reference frame (block luminance)',async()=>{
    const ref=(await readFile(new URL('../fixtures/scan-reference/office48-frame1-clay.png',import.meta.url))).toString('base64');
    const probe=await (await browser.newContext({viewport:{width:1600,height:1000},deviceScaleFactor:1})).newPage();
    probe.on('console',m=>{if(m.type()==='error')errors.push(m.text());});probe.on('pageerror',e=>errors.push(e.message));
    await probe.goto(`${origin}/world-studio/?stats&albedo=clay&frame=0#scan:${id}`,{waitUntil:'networkidle'});
    await probe.waitForFunction(()=>/draw calls/.test(document.getElementById('scan-meta').textContent),null,{timeout:15000});
    // The canvas follows the layout; adjust the window until the canvas itself is exactly 1280×720.
    let size={width:1600,height:1000};
    for(let i=0;i<4;i++){const box=await probe.locator('#canvas').boundingBox();if(Math.round(box.width)===1280&&Math.round(box.height)===720)break;size={width:Math.round(size.width+1280-box.width),height:Math.round(size.height+720-box.height)};await probe.setViewportSize(size);await probe.waitForTimeout(300);}
    const canvasSize=await probe.evaluate(()=>{const c=document.getElementById('canvas');return `${c.width}x${c.height}`;});if(canvasSize!=='1280x720')throw new Error(`canvas ${canvasSize}`);
    await probe.selectOption('#camera-view','source');
    // Only the 3D frame: hide the editor overlays that sit on top of the canvas.
    await probe.addStyleTag({content:'.stage-top,.canvas-help,.camera-tools,#pins,#attribution{visibility:hidden!important}'});await probe.waitForTimeout(600);
    const png=(await probe.locator('#canvas').screenshot()).toString('base64');await probe.screenshot({path:path.join(artifactDir,'sc-img-page.png')});
    const r=await probe.evaluate(async({png,ref})=>{
      const load=async src=>{const i=new Image();i.src=src;await i.decode();const c=new OffscreenCanvas(1280,720),x=c.getContext('2d');x.drawImage(i,0,0,1280,720);return x.getImageData(0,0,1280,720).data;};
      const a=await load(`data:image/png;base64,${png}`),b=await load(`data:image/png;base64,${ref}`),B=16,diffs=[];let sa=0,sb=0;
      const lum=(d,i)=>.2126*d[i]+.7152*d[i+1]+.0722*d[i+2];
      for(let by=0;by<720;by+=B)for(let bx=0;bx<1280;bx+=B){let la=0,lb=0;for(let y=by;y<by+B;y++)for(let x=bx;x<bx+B;x++){const i=(y*1280+x)*4;la+=lum(a,i);lb+=lum(b,i);}la/=B*B;lb/=B*B;sa+=la;sb+=lb;diffs.push(Math.abs(la-lb));}
      diffs.sort((p,q)=>p-q);const n=diffs.length;
      // Heat map of the block differences for the artifact folder.
      const h=new OffscreenCanvas(80,45),hx=h.getContext('2d');let k=0;const map=[];
      return {mae:diffs.reduce((s,d)=>s+d,0)/n,p90:diffs[Math.floor(n*.9)],p99:diffs[Math.floor(n*.99)],meanBrowser:sa/n,meanCycles:sb/n,over20:diffs.filter(d=>d>20).length/n};
    },{png,ref});
    await probe.locator('#canvas').screenshot({path:path.join(artifactDir,'sc-img-browser.png')});await probe.close();
    // Gate (W5): measured 6.75 / 27.7 / 2.7 % on office48; each defect found on the way (open roof 141, grain,
    // black thin parts, flipped chair backs 89) exceeded the p99 bound by far.
    assert(r.mae<=8&&r.p99<=40&&r.over20<=.05,`block MAE ${r.mae.toFixed(2)} (≤ 8), p99 ${r.p99.toFixed(1)} (≤ 40), blocks > 20: ${(r.over20*100).toFixed(1)} % (≤ 5 %)`);
    return `block MAE ${r.mae.toFixed(2)} · p90 ${r.p90.toFixed(1)} · p99 ${r.p99.toFixed(1)} · blocks >20: ${(r.over20*100).toFixed(1)} % · mean ${r.meanBrowser.toFixed(1)} vs ${r.meanCycles.toFixed(1)}`;
  });

  await step('SC04','Enter world: first person at eye level (1.6 m above the floor), start where the source camera begins',async()=>{
    await page.click('#walk-enter');await waitState('playing');
    await page.waitForFunction(()=>/fps/.test(document.getElementById('runtime-perf').textContent),null,{timeout:8000});
    const p=await pose();await shot('sc04-walk.png');return `${await page.textContent('#runtime-perf')} · X ${p.x} Z ${p.z} ${p.heading}°`;
  });

  await step('SC05','Walking forward moves at 3 m/s until blocked, and the player never leaves the room',async()=>{
    const a=await pose();await hold('KeyW',1000);const b=await pose();const walked=Math.hypot(b.x-a.x,b.z-a.z);
    assert(walked>.5,`walked only ${walked.toFixed(2)} m in 1 s`);
    await hold('KeyW',8000);const c=await pose();await hold('KeyW',1000);const d=await pose();
    assert(Math.hypot(d.x-c.x,d.z-c.z)<.6,`still moving freely after 9 s: ${JSON.stringify(c)} → ${JSON.stringify(d)}`);
    assert(d.x>-.5&&d.x<4.2&&d.z>-.8&&d.z<5.4,`outside the room: ${JSON.stringify(d)}`);await shot('sc05-blocked.png');
    return `${walked.toFixed(2)} m in 1 s, stopped at X ${d.x} Z ${d.z}`;
  });

  await step('SC09','Key 2: third person — figure at the player, camera behind it (≤ 2.2 m, in the room), walking still collides',async()=>{
    assert(!(await page.isHidden('#runtime-modes')),'mode buttons hidden');
    await page.keyboard.press('Digit2');await page.waitForTimeout(300);
    const p=await pose(),st=await stats();assert(p.mode==='Third person',p.mode);assert(st.avatar,'figure not visible');
    assert(Math.hypot(st.avatar[0]-p.x,st.avatar[2]-p.z)<.15,`figure at ${st.avatar} vs ${p.x},${p.z}`);
    const d=Math.hypot(st.camera[0]-st.avatar[0],st.camera[2]-st.avatar[2]);assert(d<=2.25&&d>0,`camera ${d.toFixed(2)} m from the figure`);
    assert(inRoom({x:st.camera[0],z:st.camera[2]}),`camera outside the room ${st.camera}`);
    // The figure is actually visible, not a black silhouette (baked scans have no real-time lights): it sits
    // centred, in the lower part of the view (camera aims 0.3 m above the head).
    const shotPng=(await page.locator('#canvas').screenshot()).toString('base64');
    const figure=await page.evaluate(async png=>{const i=new Image();i.src=`data:image/png;base64,${png}`;await i.decode();const c=new OffscreenCanvas(i.width,i.height),x=c.getContext('2d');x.drawImage(i,0,0);
      const d=x.getImageData(Math.round(i.width*.5)-8,Math.round(i.height*.75)-8,16,16).data;let r=0,g=0,b=0;for(let k=0;k<d.length;k+=4){r+=d[k];g+=d[k+1];b+=d[k+2];}const n=d.length/4;return [r/n,g/n,b/n];},shotPng);
    assert(figure[1]>90&&figure[1]>figure[0]+20,`figure colour ${figure.map(Math.round)} (expected teal, not black)`);
    await hold('KeyW',3000);const q=await pose();assert(inRoom(q),`walked out ${JSON.stringify(q)}`);
    assert(await page.$eval('[data-view="third"]',b=>b.getAttribute('aria-pressed'))==='true','button state');
    await shot('sc09-third.png');return `camera ${d.toFixed(2)} m behind, X ${q.x} Z ${q.z}`;
  });

  await step('SC10','Key 3: fly — E climbs, flight passes furniture, stays inside the room box',async()=>{
    await page.keyboard.press('Digit3');await page.waitForTimeout(200);const a=await pose();assert(a.mode==='Fly'&&a.y!==null,JSON.stringify(a));
    assert(!(await stats()).avatar,'figure shown while flying');
    await hold('KeyE',1000);const b=await pose();assert(b.y>a.y+.5&&b.y<=2.5,`climbed ${a.y} → ${b.y} (limit 2.45 m, HUD rounds to 0.1)`);
    await hold('KeyW',6000);const c=await pose();assert(inRoom(c)&&c.y<2.6,`left the room ${JSON.stringify(c)}`);
    const drawn=await drawnRatio(page);assert(drawn>.5,`flight view is empty (${(drawn*100).toFixed(0)} % drawn)`);
    await shot('sc10-fly.png');return `Y ${a.y} → ${b.y}, after 6 s at X ${c.x} Z ${c.z} Y ${c.y}`;
  });

  await step('SC11','Key 4: source camera — the view follows the video path',async()=>{
    await page.keyboard.press('Digit4');await page.waitForTimeout(300);const a=(await stats()).camera;await page.waitForTimeout(700);const b=(await stats()).camera;
    const moved=Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2]);assert(moved>.01,`camera moved ${moved}`);assert((await pose()).mode==='Source camera','mode');
    await shot('sc11-source.png');return `camera moved ${moved.toFixed(2)} m in 0.7 s`;
  });

  await step('SC12','Key 1: back to first person — lands on a free place, figure hidden, walking works',async()=>{
    await page.keyboard.press('Digit1');await page.waitForTimeout(200);const a=await pose();assert(a.mode==='First person'&&a.y===null,JSON.stringify(a));
    assert(!(await stats()).avatar,'figure still visible');assert(inRoom(a),'landed outside');
    await hold('KeyS',800);const b=await pose();return `landed at X ${a.x} Z ${a.z}, walked to X ${b.x} Z ${b.z}`;
  });

  await step('SC13','Touch: the thumb stick on the left walks, a finger on the right looks around',async()=>{
    const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    const box=await page.locator('#canvas').boundingBox(),touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
    await page.keyboard.press('KeyR');await page.waitForTimeout(200);const a=await pose();
    const sx=box.x+box.width*.15,sy=box.y+box.height*.7;
    await touch('touchStart',[{x:sx,y:sy,id:1}]);for(let i=1;i<=5;i++){await touch('touchMove',[{x:sx,y:sy-i*12,id:1}]);}
    const shown=!(await page.isHidden('#runtime-stick'));await page.waitForTimeout(900);await touch('touchEnd',[]);await page.waitForTimeout(150);
    const b=await pose();const walked=Math.hypot(b.x-a.x,b.z-a.z);assert(shown,'stick not shown');assert(walked>.8,`walked ${walked.toFixed(2)} m`);
    assert(await page.isHidden('#runtime-stick'),'stick still shown');
    const lx=box.x+box.width*.7,ly=box.y+box.height*.5;await touch('touchStart',[{x:lx,y:ly,id:2}]);for(let i=1;i<=5;i++)await touch('touchMove',[{x:lx+i*16,y:ly,id:2}]);await touch('touchEnd',[]);await page.waitForTimeout(150);
    const c=await pose(),turned=((c.heading-b.heading)+360)%360;assert(turned>10&&turned<40,`turned ${turned}°`);
    await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});return `stick walked ${walked.toFixed(2)} m, swipe turned ${turned}°`;
  });

  await step('SC14','Mode buttons work like the keys',async()=>{
    await page.click('[data-view="third"]');await page.waitForTimeout(200);assert((await pose()).mode==='Third person','button 2');
    await page.click('[data-view="first"]');await page.waitForTimeout(200);assert((await pose()).mode==='First person','button 1');return 'third ↔ first';
  });

  await step('SC06','Back to the editor, then to a diorama and back to the scan',async()=>{
    await page.click('#runtime-exit');await waitState('editing');
    await page.click('[data-world="alpine"]');await page.waitForTimeout(400);
    assert(!(await page.isDisabled('#walk-enter')),'walk button still disabled on a diorama');
    assert(await page.$eval('#camera-view option[value="source"]',o=>o.hidden),'source option still visible');
    // Dioramas keep first person only: no mode buttons, the number keys change nothing.
    await page.click('#walk-enter');await waitState('playing');assert(await page.isHidden('#runtime-modes'),'mode buttons on a diorama');
    await page.keyboard.press('Digit3');await page.waitForTimeout(200);assert(!/Fly|Y /.test(await page.textContent('#runtime-position')),'diorama switched to flight');
    await page.click('#runtime-exit');await waitState('editing');
    await page.click(`[data-world="scan:${id}"]`);await page.waitForFunction(()=>/draw calls/.test(document.getElementById('scan-meta').textContent),null,{timeout:15000});
    return 'editor ↔ scan ↔ diorama';
  });

  await step('SC15','Device check (W8): walks the source path, measures, shows the verdict, posts the report',async()=>{
    await page.goto(`${origin}/world-studio/?checkSeconds=3#scan:${id}`,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>/draw calls/.test(document.getElementById('scan-meta').textContent),null,{timeout:15000});
    const posted=page.waitForRequest(r=>r.url().endsWith('/api/device-check')&&r.method()==='POST',{timeout:20000});
    await page.click('#scan-device-check');
    const request=await posted,report=JSON.parse(request.postData());
    await page.waitForFunction(()=>document.getElementById('device-check-dialog').open&&!/Storing/.test(document.getElementById('device-check-stored').textContent),null,{timeout:10000});
    const text=await page.textContent('#device-check-result'),stored=await page.textContent('#device-check-stored');
    assert(report.format==='motionspec.device-check.v1'&&report.scene===id&&report.result.frames>30,`report ${JSON.stringify(report.result)}`);
    assert(report.device.gpu&&report.device.canvas,'device info');assert(/A2 \(≥ 57 fps/.test(text),text);assert(/does not store/.test(stored),stored);
    assert(await page.evaluate(()=>document.body.dataset.runtime??'editing')==='editing','back in the editor');
    await page.click('#device-check-dialog [data-close]');await shot('sc15-device-check.png');
    return `${report.result.fpsMean} fps · p95 ${report.result.frameP95} ms · scale ${report.result.scaleStart}→${report.result.scaleEnd} · A2 ${report.result.a2?'PASS':'FAIL'}`;
  });

  // City tiles (ADR 0004): the synthetic test city baked with the worldscan city profile.
  await step('SC16','City tile: pastel facades, baked sun, sky, neutral tone mapping, credits shown, walkable',async()=>{
    const index=await (await fetch(origin+'/api/scenes')).json(),city=index.scenes.find(s=>/Test-Stadt/.test(s.name));assert(city,'city fixture not listed');
    await page.goto(`${origin}/world-studio/?stats#scan:${city.id}`,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>/draw calls/.test(document.getElementById('scan-meta').textContent),null,{timeout:15000});
    const meta=await page.textContent('#scan-meta'),credit=await page.textContent('#attribution'),creditShown=!(await page.isHidden('#attribution'));
    assert(/3 draw calls/.test(meta),meta);assert(creditShown&&/Synthetische Testdaten/.test(credit),`credit ${credit}`);
    await page.waitForTimeout(400);const drawn=await drawnRatio(page);assert(drawn>.9,`drawn ${drawn}`);
    // Not grey: the city must keep colour (pastel facades, blue sky) — mean saturation of the frame.
    const png=(await page.locator('#canvas').screenshot()).toString('base64');
    const saturation=await page.evaluate(async png=>{const i=new Image();i.src=`data:image/png;base64,${png}`;await i.decode();const c=new OffscreenCanvas(i.width,i.height),x=c.getContext('2d');x.drawImage(i,0,0);const d=x.getImageData(0,0,i.width,i.height).data;let s=0,n=0;for(let k=0;k<d.length;k+=64){const mx=Math.max(d[k],d[k+1],d[k+2]),mn=Math.min(d[k],d[k+1],d[k+2]);if(mx>0){s+=(mx-mn)/mx;n++;}}return s/n;},png);
    assert(saturation>.15,`saturation ${saturation.toFixed(2)}`);await shot('sc16-city.png');
    await page.click('#walk-enter');await waitState('playing');await hold('KeyW',1200);const p=await pose();
    await page.click('#runtime-exit');await waitState('editing');
    return `${meta} · saturation ${saturation.toFixed(2)} · walked to X ${p.x} Z ${p.z}`;
  });

  await step('SC07','A tampered address is rejected with a message, the studio falls back to a diorama',async()=>{
    await page.goto(origin+'/world-studio/#scan:'+'0'.repeat(64),{waitUntil:'networkidle'});await page.waitForTimeout(600);
    const hash=await page.evaluate(()=>location.hash),notice=await page.textContent('#notice');
    assert(hash==='#alpine'&&/could not be opened/.test(notice),`${hash} · ${notice}`);
    // The failed fetch (404) is logged by the browser itself; it is expected here, not an application error.
    for(let i=errors.length-1;i>=0;i--)if(/404/.test(errors[i]))errors.splice(i,1);return notice;
  });

  await step('SC08','No CSP violation and no console errors (A3)',async()=>{assert(!errors.length,errors.join(' | '));return 'none';});
}finally{await browser.close();await close();}
const failed=results.filter(r=>!r.ok).length;console.log(`${results.length-failed}/${results.length} scan world browser checks passed.`);process.exitCode=failed?1:0;
