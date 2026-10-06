// Performance baseline of the kart page in a real browser (Welle P0, ADR 0006). Both maps, desktop retina and an
// emulated phone (DPR 3, CPU 4× slower), driven live by an autopilot over the real keyboard path. Measured per run:
// frame rate and p95, draw calls and triangles, JS allocation rate and GC drops, HUD DOM writes, estimated GPU
// memory, transferred bytes and the time to the first frame. Plane and walk are measured on desktop.
// The values are compared with tests/browser/kart-perf.baseline.json (regression gate: counts fail, timing warns) and
// with the budget targets of ADR 0006 (reported, not failing). KART_BASELINE=update rewrites the baseline from this run.
import path from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {loadPlaywright,startServer,launch,recorder,assert,artifactDir,environment} from './harness.mjs';

const playwright=loadPlaywright();
if(!playwright){console.log('SKIP: playwright-core not found (set PLAYWRIGHT_CORE).');process.exit(0);}
const BASELINE=fileURLToPath(new URL('./kart-perf.baseline.json',import.meta.url));
const UPDATE=process.env.KART_BASELINE==='update';
const MEASURE_MS=6000,MODE_MS=4000;
// KART_ONLY=kronach/desktop measures a single run (A/B comparisons); the gate and the extra checks are skipped then.
const ONLY=process.env.KART_ONLY??null;
// Budget targets (ADR 0006). Reported per run; the hard gate is the baseline below.
export const TARGETS=Object.freeze({
  desktop:{fps:58,p95Ms:20.8,drawCalls:600,gpuMB:256,firstFrameMs:2000,firstFrameMB:3,allocMBs:0.5,hudWritesPerS:20},
  phone:{fps:58,p95Ms:20.8,drawCalls:400,gpuMB:128,firstFrameMs:3000,firstFrameMB:3,allocMBs:0.5,hudWritesPerS:20}
});
// Regression tolerance against the stored baseline: deterministic counts tight, timing loose (headless noise).
// Gated measures must not follow the (uncapped, noisy) headless frame rate or the machine state: allocation per
// deterministic tick (desktop runs), HUD writes per second (rate-limited to 10 Hz since Welle P1).
const TOLERANCE={bytes:1.05,drawCalls:1.10,triangles:1.10,gpuMB:1.05,fps:.85,p95Ms:1.5,firstFrameMs:1.5,allocKBPerTick:1.3,hudWritesPerS:1.5};
const DEVICES={
  desktop:{context:{viewport:{width:1440,height:900},deviceScaleFactor:2},throttle:1},
  phone:{context:{viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true},throttle:4}
};

const {origin,close}=await startServer(),browser=await launch(playwright,['--enable-precise-memory-info']),{results,step}=recorder();
const errors=[],runs={};

// In-page probes, installed before any app code: autopilot over synthetic key events (the InputRouter reads
// event.code), a measurement window, a HUD write counter and a GPU memory estimate of the scene.
function probes(){
  try{localStorage.setItem('ourark.kart.telemetry','0');}catch{}
  // HUD writes are counted at the textContent/innerHTML setters: Chromium records no mutation for a write that
  // leaves the text unchanged, but the write (style/layout invalidation, main-thread work) still happens.
  window.__hudWrites=0;
  for(const [proto,name] of [[Node.prototype,'textContent'],[Element.prototype,'innerHTML']]){
    const d=Object.getOwnPropertyDescriptor(proto,name);
    Object.defineProperty(proto,name,{get:d.get,set(v){if(this.closest?.('.kart-hud'))window.__hudWrites++;d.set.call(this,v);},configurable:true});
  }
  const keys={};
  const send=(code,down)=>{if(keys[code]===down)return;keys[code]=down;dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{code,bubbles:true}));};
  window.__probe={
    drive(){
      const k=window.__kart;window.__driving=true;send('KeyW',true);
      const f=()=>{
        if(!window.__driving){for(const c of Object.keys(keys))send(c,false);return;}
        const st=k.kart.state,t=k.track.sampleAt(st.s+8);
        let d=Math.atan2(t.x-st.x,-(t.z-st.z))-st.heading;d=Math.atan2(Math.sin(d),Math.cos(d));
        send('ArrowRight',d>.04);send('ArrowLeft',d<-.04);requestAnimationFrame(f);
      };
      requestAnimationFrame(f);
    },
    hold(codes){for(const c of codes)send(c,true);},
    release(){window.__driving=false;for(const c of Object.keys(keys))send(c,false);},
    measure(ms){
      return new Promise(resolve=>{
        const writes0=window.__hudWrites;
        const frames=[],calls=[],tris=[];let last=0,heap=performance.memory?.usedJSHeapSize??0,allocated=0,drops=0;
        const end=performance.now()+ms,start=performance.now();
        const f=now=>{
          if(last)frames.push(now-last);last=now;
          const used=performance.memory?.usedJSHeapSize??0;if(used>=heap)allocated+=used-heap;else drops++;heap=used;
          const ins=window.__kart.insights;calls.push(ins.lastCalls??0);tris.push(ins.lastTris??0);
          if(now<end)requestAnimationFrame(f);
          else{
            const writes=window.__hudWrites-writes0,seconds=(now-start)/1000,sorted=[...frames].sort((a,b)=>a-b),mid=a=>[...a].sort((x,y)=>x-y)[a.length>>1];
            resolve({fps:frames.length/seconds,p95Ms:sorted[Math.floor(sorted.length*.95)],maxMs:sorted.at(-1),drawCalls:Math.max(...calls),drawCallsMedian:mid(calls),
              triangles:Math.max(...tris),allocMBs:allocated/1048576/seconds,allocKBPerFrame:allocated/1024/Math.max(1,frames.length),gcDrops:drops,hudWritesPerS:writes/seconds,hudWritesPerFrame:writes/Math.max(1,frames.length),heapMB:heap/1048576});
          }
        };
        requestAnimationFrame(f);
      });
    },
    // Deterministic allocation per tick (2 simulation steps + 1 rendered frame, synchronous, autopilot): independent
    // of the frame rate and the machine state. 300 warm-up ticks (JIT), then the median of 3 × 300.
    allocPerTick(){
      const k=window.__kart;k.loop.stop();k.setMode('kart');if(k.mode!=='kart')k.setMode('kart');k.start();
      const control=st=>{const t=k.track.sampleAt(st.s+8);let d=Math.atan2(t.x-st.x,-(t.z-st.z))-st.heading;d=Math.atan2(Math.sin(d),Math.cos(d));return {throttle:1,steer:Math.max(-1,Math.min(1,d*3))};};
      k.tick(3.2,control);for(let i=0;i<300;i++)k.tick(1/60,control);
      const reps=[];
      for(let r=0;r<3;r++){let sum=0,heap=performance.memory.usedJSHeapSize;for(let i=0;i<300;i++){k.tick(1/60,control);const u=performance.memory.usedJSHeapSize;if(u>=heap)sum+=u-heap;heap=u;}reps.push(sum/1024/300);}
      return reps.sort((a,b)=>a-b)[1];
    },
    // Estimate: textures as RGBA8 (+⅓ for mipmaps), geometry buffers by byte length, shadow maps as RGBA8,
    // drawing buffer as colour + depth, ×4 for MSAA. Shared resources counted once.
    gpu(){
      const {scene}=window.__kart,textures=new Set(),buffers=new Set();let shadow=0;
      scene.traverse(o=>{
        if(o.geometry)for(const a of Object.values(o.geometry.attributes))buffers.add(a.array);
        if(o.geometry?.index)buffers.add(o.geometry.index.array);
        if(o.isInstancedMesh){buffers.add(o.instanceMatrix.array);if(o.instanceColor)buffers.add(o.instanceColor.array);}
        for(const m of [].concat(o.material??[]))for(const v of Object.values(m))if(v?.isTexture)textures.add(v);
        if(o.castShadow&&o.isLight&&o.shadow)shadow+=o.shadow.mapSize.x*o.shadow.mapSize.y*4;
      });
      let tex=0;for(const t of textures){const i=t.image;const w=i?.width??0,h=i?.height??0;tex+=w*h*4*(t.generateMipmaps===false?1:4/3);}
      let geo=0;for(const b of buffers)geo+=b.byteLength;
      const c=document.getElementById('kart-canvas'),frame=c.width*c.height*8*4;
      const mb=v=>v/1048576;
      return {scale:window.__kart.quality?.scale??window.devicePixelRatio,gpuMB:mb(tex+geo+shadow+frame),textureMB:mb(tex),geometryMB:mb(geo),shadowMB:mb(shadow),framebufferMB:mb(frame),textures:textures.size,canvas:`${c.width}x${c.height}`};
    }
  };
}

async function open(map,device){
  const d=DEVICES[device],context=await browser.newContext(d.context);
  await context.addInitScript(probes);
  const page=await context.newPage();
  page.on('console',m=>{if(m.type()==='error')errors.push(`${map}/${device}: ${m.text()}`);});page.on('pageerror',e=>errors.push(`${map}/${device}: ${e.message}`));
  const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');
  if(d.throttle>1)await cdp.send('Emulation.setCPUThrottlingRate',{rate:d.throttle});
  const net={bytes:0,requests:0,firstFrameBytes:null};
  cdp.on('Network.loadingFinished',e=>{net.bytes+=e.encodedDataLength;net.requests++;});
  await page.goto(`${origin}/kart/?map=${map}`);
  await page.waitForFunction(()=>window.__kart?.insights?.marks?.some(m=>m.name==='Erstes Bild'),null,{timeout:60000});
  // Bytes for the first frame: resources whose response ended before the 'Erstes Bild' mark (Resource Timing in the
  // page). Reading the CDP counter after waitForFunction would race with the background loads that start right then.
  net.firstFrameBytes=await page.evaluate(()=>{
    const at=window.__kart.insights.marks.find(m=>m.name==='Erstes Bild').ms,nav=performance.getEntriesByType('navigation')[0];
    let sum=nav?.transferSize||nav?.encodedBodySize||0;
    for(const e of performance.getEntriesByType('resource'))if(e.responseEnd<=at)sum+=e.transferSize||e.encodedBodySize||0;
    return sum;
  });
  // Since Welle P3 the full aerial photo, the landscape and the trees stream in after the first frame: measure only
  // once that is done, so decoding and shader compilation do not land in the driving window.
  await page.waitForFunction(()=>window.__kart.insights.marks.some(m=>m.name==='Alles geladen'),null,{timeout:90000});
  const load=await page.evaluate(()=>Object.fromEntries(window.__kart.insights.marks.map(m=>[m.name,m.ms])));
  return {page,context,net,load};
}

const fmt=(v,d=1)=>Number.isFinite(v)?v.toFixed(d):String(v);
const round=o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,typeof v==='number'?Math.round(v*100)/100:v]));
function targetReport(device,m){
  const t=TARGETS[device],miss=[];
  const lower=(k,v)=>{if(t[k]!=null&&v!=null&&v<t[k])miss.push(`${k} ${fmt(v)}<${t[k]}`);};
  const upper=(k,v)=>{if(t[k]!=null&&v!=null&&v>t[k])miss.push(`${k} ${fmt(v)}>${t[k]}`);};
  lower('fps',m.fps);for(const k of ['p95Ms','drawCalls','gpuMB','firstFrameMs','firstFrameMB','allocMBs','hudWritesPerS'])upper(k,m[k]);
  return miss;
}

// One measured run: load, race start, live autopilot, measurement window, GPU estimate; plane and walk on desktop.
async function measureRun(map,device){
  const {page,context,net,load}=await open(map,device);
  if(!runs.environment)runs.environment=await environment(page);
  await page.evaluate(()=>window.__kart.start());
  await page.waitForFunction(()=>window.__kart.phase==='racing',null,{timeout:15000});
  await page.evaluate(()=>window.__probe.drive());await page.waitForTimeout(1500);
  const s0=await page.evaluate(()=>window.__kart.kart.state.s);
  const m=await page.evaluate(ms=>window.__probe.measure(ms),MEASURE_MS);
  const s1=await page.evaluate(()=>window.__kart.kart.state.s);
  const gpu=await page.evaluate(()=>window.__probe.gpu());
  await page.screenshot({path:path.join(artifactDir,`kart-perf-${map}-${device}.png`)});
  await page.evaluate(()=>window.__probe.release());
  const row={...m,...gpu,metres:s1-s0,firstFrameMs:load['Erstes Bild'],allLoadedMs:load['Alles geladen'],firstFrameMB:net.firstFrameBytes/1048576,bytes:net.bytes,requests:net.requests,load};
  // Plane and walk on desktop: the same map from the air and on foot.
  if(device==='desktop'){
    await page.evaluate(()=>window.__kart.setMode('plane'));await page.waitForTimeout(800);
    row.plane=round(await page.evaluate(ms=>window.__probe.measure(ms),MODE_MS));
    await page.evaluate(()=>window.__kart.setMode('walk'));await page.evaluate(()=>window.__probe.hold(['KeyW']));await page.waitForTimeout(800);
    row.walk=round(await page.evaluate(ms=>window.__probe.measure(ms),MODE_MS));
    await page.evaluate(()=>window.__probe.release());
    row.allocKBPerTick=await page.evaluate(()=>window.__probe.allocPerTick());
  }
  await context.close();
  return round(row);
}

// Gate check of one run against its baseline: {count: [...], timing: [...]} violations.
function compareRun(id,b,r){
  const out={count:[],timing:[]};
  for(const [k,f] of Object.entries(TOLERANCE)){
    if(b[k]==null||r[k]==null)continue;
    const device=id.split('/')[1],target=TARGETS[device][k];
    // Headless rAF is not tied to a display: frame rate and p95 jump between a 60 Hz and a 120 Hz rhythm from
    // run to run. Timing values only fail when they leave the baseline band and miss the budget target as well.
    const timing=['fps','p95Ms','firstFrameMs'].includes(k)&&target!=null;
    const lower=f<1,limit=lower?(timing?Math.min(b[k]*f,target):b[k]*f):(timing?Math.max(b[k]*f,target):b[k]*f+(k==='allocKBPerTick'?2:0)+(k==='hudWritesPerS'?2:0));
    if(lower?r[k]<limit:r[k]>limit)(timing?out.timing:out.count).push(`${id} ${k} ${fmt(r[k],2)} statt ${fmt(b[k],2)}`);
  }
  return out;
}

try{
  // Warm-up (not measured): starts the GPU process and compiles the shaders once, so the first measured run
  // does not carry the browser's cold start.
  {const {context}=await open('rosenberg','desktop');await context.close();}
  for(const map of ['rosenberg','kronach'])for(const device of ['desktop','phone']){
    const id=`${map}/${device}`;if(ONLY&&id!==ONLY)continue;
    await step(`KP-${map}-${device}`,`${id}: Kart fährt live per Autopilot, Messwerte erfasst`,async()=>{
      const row=await measureRun(map,device);runs[id]=row;
      assert(row.metres>20,`Kart bewegte sich nur ${fmt(row.metres)} m`);
      const miss=targetReport(device,row);
      return `${fmt(row.fps,0)} fps, p95 ${fmt(row.p95Ms)} ms, ${row.drawCalls} Calls, ${fmt(row.allocMBs,2)} MB/s alloc, ${fmt(row.hudWritesPerS,0)} HUD/s, `+
        `GPU≈${fmt(row.gpuMB,0)} MB, erstes Bild ${row.firstFrameMs} ms / ${fmt(row.firstFrameMB)} MB${miss.length?` · Ziel verfehlt: ${miss.join(', ')}`:' · alle Ziele erreicht'}`;
    });
  }

  if(!ONLY){
  await step('KP-adapt','Unter Last sinken Auflösung und Schattenkarte, danach steigen beide wieder (Desktop, Kronach)',async()=>{
    const {page,context}=await open('kronach','desktop');
    const q0=await page.evaluate(()=>window.__kart.quality);
    // 60 ms extra per frame at 2× (scaled with the pixel count): the budget only holds again at about 1×.
    await page.evaluate(()=>{globalThis.__MOTIONSPEC_FRAME_LOAD_MS__=60;});
    await page.waitForFunction(()=>window.__kart.quality.scale<1.5,null,{timeout:30000});
    await page.waitForFunction(()=>window.__kart.quality.shadow<2048,null,{timeout:10000});
    const low=await page.evaluate(()=>window.__kart.quality);
    await page.evaluate(()=>{globalThis.__MOTIONSPEC_FRAME_LOAD_MS__=0;});
    // The controller backs off up to 60 s after raises that fail at once (runtime/quality.js), hence 120 s.
    await page.waitForFunction(q=>window.__kart.quality.scale===q.scale&&window.__kart.quality.shadow===q.shadow,q0,{timeout:120000});
    await context.close();
    assert(q0.scale===2&&q0.shadow===2048,`Start ${q0.scale}×/${q0.shadow}`);
    return `Start ${q0.scale}× / Schatten ${q0.shadow} → unter Last ${low.scale}× / ${low.shadow} → zurück auf ${q0.scale}× / ${q0.shadow}`;
  });
  await step('KP-context','Grafik-Kontextverlust: Pause, Wiederherstellung, Bild läuft weiter, kein Fehler',async()=>{
    const {page,context}=await open('rosenberg','desktop');
    const result=await page.evaluate(async()=>{
      const k=window.__kart,ext=k.renderer.getContext().getExtension('WEBGL_lose_context');if(!ext)return {skip:true};
      const wait=ms=>new Promise(r=>setTimeout(r,ms)),frames=()=>k.loop.steps;
      ext.loseContext();await wait(300);
      const paused=k.loop.paused,status=document.getElementById('kart-status').textContent,during=frames();await wait(300);const still=frames()===during;
      ext.restoreContext();await wait(800);
      const after=frames();await wait(500);
      return {paused,status,still,resumed:!k.loop.paused&&frames()>after,lost:k.renderer.getContext().isContextLost(),marks:k.insights.marks.map(m=>m.name)};
    });
    const shot=path.join(artifactDir,'kart-perf-context-restored.png');await page.screenshot({path:shot});
    await context.close();
    if(result.skip)return 'WEBGL_lose_context nicht verfügbar (übersprungen)';
    assert(result.paused&&result.still,'pausiert während des Verlusts');assert(/Grafik/.test(result.status),'Hinweis sichtbar');
    assert(result.resumed&&!result.lost,'läuft nach der Wiederherstellung weiter');
    assert(result.marks.includes('Grafik verloren')&&result.marks.includes('Grafik zurück'),'in den Insights vermerkt');
    return 'pausiert, Hinweis angezeigt, nach Wiederherstellung weiter (Bild in kart-perf-context-restored.png)';
  });
  await step('KP-gate','Kein Rückschritt gegenüber der gespeicherten Basislinie',async()=>{
    if(UPDATE){await writeFile(BASELINE,JSON.stringify({recorded:new Date().toISOString(),environment:runs.environment,runs:Object.fromEntries(Object.entries(runs).filter(([k])=>k!=='environment'))},null,2)+'\n');return 'Basislinie neu geschrieben';}
    let base;try{base=JSON.parse(await readFile(BASELINE,'utf8'));}catch{throw new Error('Keine Basislinie (KART_BASELINE=update ausführen)');}
    // Count values fail at once. Timing values are re-measured once after a short rest and then only warn: on a
    // laptop the machine state moves them (A/B on 2026-10-01: wave 0 and wave 1 equally slow after 25 min of GPU
    // load, all load times ×2). Frame-rate claims need an A/B in the same state or real devices (ADR 0006).
    const worse=[],retried=[],warnings=[];
    for(const [id,b] of Object.entries(base.runs)){
      if(!runs[id]){worse.push(`${id} fehlt`);continue;}
      let v=compareRun(id,b,runs[id]);
      if(!v.count.length&&v.timing.length){
        retried.push(id);await new Promise(r=>setTimeout(r,5000));
        const [map,device]=id.split('/');runs[id]=await measureRun(map,device);v=compareRun(id,b,runs[id]);
      }
      worse.push(...v.count);warnings.push(...v.timing);
    }
    assert(!worse.length,worse.join(' | '));
    return `${Object.keys(base.runs).length} Läufe im Rahmen${retried.length?` (Zeitwerte wiederholt: ${retried.join(', ')})`:''}${warnings.length?` · Warnung Zeitwerte: ${warnings.join(' | ')}`:''}`;
  });
  }
  await step('KP-errors','Keine Konsolenfehler',async()=>{assert(!errors.length,errors.join(' | '));return 'keine';});
}finally{
  await writeFile(path.join(artifactDir,'kart-perf.json'),JSON.stringify(runs,null,2)+'\n');
  await browser.close();await close();
}
const failed=results.filter(r=>!r.ok).length;console.log(`${results.length-failed}/${results.length} kart performance browser checks passed.`);process.exitCode=failed?1:0;
