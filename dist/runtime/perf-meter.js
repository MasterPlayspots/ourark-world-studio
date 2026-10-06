// Live performance meter: an overlay on every page that measures and records what the browser actually does.
// Everything is measured, nothing estimated: frame intervals from requestAnimationFrame, draw calls and triangles
// from counting the real WebGL calls, long tasks and network from PerformanceObserver, heap from performance.memory
// (Chromium only; elsewhere it shows "n/a"). One sample per second is kept (max. 1 h) and can be downloaded as JSON.
// Toggle: the "Perf" pill, Alt+P, or ?perf=0 / ?perf=1 in the URL. The pure helpers are exported for tests.

import {readPerfProbes} from './perf-probes.js';

export const PERF_FORMAT='ourark.perf-log.v1';
export const BUDGET_MS=1000/60,JANK_MS=20,HISTORY=240,LOG_MAX=3600;

export const percentile=(sorted,q)=>sorted.length?sorted[Math.min(sorted.length-1,Math.floor(sorted.length*q))]:0;
const round=(v,d=1)=>v==null||!Number.isFinite(v)?null:Math.round(v*10**d)/10**d;

// frames: frame intervals (ms) of one window → summary.
export function frameSummary(frames){
  if(!frames.length)return {frames:0,fps:0,p50:0,p95:0,p99:0,max:0,jank:0};
  const sorted=[...frames].sort((a,b)=>a-b),sum=frames.reduce((a,b)=>a+b,0);
  return {frames:frames.length,fps:round(1000*frames.length/sum),p50:round(percentile(sorted,.5),2),p95:round(percentile(sorted,.95),2),
    p99:round(percentile(sorted,.99),2),max:round(sorted.at(-1),2),jank:round(frames.filter(ms=>ms>JANK_MS).length/frames.length,4)};
}

// Triangles drawn by one WebGL call (mode constants per WebGL spec).
export function primitives(mode,count,instances=1){
  if(mode===4)return Math.floor(count/3)*instances;// TRIANGLES
  if(mode===5||mode===6)return Math.max(0,count-2)*instances;// TRIANGLE_STRIP / TRIANGLE_FAN
  return 0;
}

export function logCsv(log){
  const cols=['t','fps','p50','p95','p99','max','jank','renderedFrames','calls','triangles','lastCalls','lastTriangles','longTasks','longTaskMs','heapMB','netKB','canvas','scale','runtime'];
  return [cols.join(','),...log.map(r=>cols.map(c=>r[c]??'').join(','))].join('\n');
}

// ---- Browser part --------------------------------------------------------------------------------------------
const gpuCounter={calls:0,triangles:0};
function countDraws(){
  for(const proto of [globalThis.WebGL2RenderingContext?.prototype,globalThis.WebGLRenderingContext?.prototype]){
    if(!proto||proto.__ourarkPerf)continue;proto.__ourarkPerf=true;
    const wrap=(name,fn)=>{const orig=proto[name];if(typeof orig!=='function')return;proto[name]=function(...a){gpuCounter.calls++;gpuCounter.triangles+=fn(a);return orig.apply(this,a);};};
    wrap('drawArrays',a=>primitives(a[0],a[2]));wrap('drawElements',a=>primitives(a[0],a[1]));
    wrap('drawArraysInstanced',a=>primitives(a[0],a[2],a[3]));wrap('drawElementsInstanced',a=>primitives(a[0],a[1],a[4]));
    wrap('drawRangeElements',a=>primitives(a[0],a[3]));
  }
}

function start(){
  if(globalThis.__OURARK_PERF__)return;
  countDraws();
  const params=new URLSearchParams(location.search);
  let visible=true;try{visible=localStorage.getItem('ourark.perf')!=='0';}catch{}
  if(params.get('perf')==='0')visible=false;if(params.get('perf')==='1')visible=true;

  const state={frames:[],history:[],log:[],startedAt:new Date().toISOString(),longTasks:0,longTaskMs:0,netBytes:0,netRequests:0,
    last:0,secondStart:performance.now(),perFrameCalls:[],perFrameTris:[],lastCalls:0,lastTris:0,lastDrawn:null,recording:true};
  globalThis.__OURARK_PERF__=state;

  try{new PerformanceObserver(list=>{for(const e of list.getEntries()){state.longTasks++;state.longTaskMs+=e.duration;}}).observe({type:'longtask',buffered:true});}catch{}
  try{new PerformanceObserver(list=>{for(const e of list.getEntries()){state.netRequests++;state.netBytes+=e.transferSize||0;}}).observe({type:'resource',buffered:true});}catch{}

  // DOM
  const root=document.createElement('aside');root.className='perf-meter';root.setAttribute('aria-label','Leistungsmesser');
  root.innerHTML=`<div class="perf-head"><strong>Leistung</strong><span class="perf-rec" title="Zeichnet 1 Messpunkt pro Sekunde auf">● REC</span>
<button type="button" data-act="csv" title="Aufzeichnung als CSV">CSV</button><button type="button" data-act="json" title="Aufzeichnung als JSON">JSON</button>
<button type="button" data-act="reset" title="Aufzeichnung neu starten">↺</button><button type="button" data-act="hide" aria-label="Ausblenden">×</button></div>
<canvas class="perf-graph" width="480" height="120" aria-hidden="true"></canvas>
<div class="perf-legend"><span><i class="l-ft"></i>Frame-Zeit</span><span><i class="l-bud"></i>16,7 ms (60 fps)</span><span><i class="l-jank"></i>&gt; 20 ms</span></div>
<dl class="perf-grid"></dl><div class="perf-foot"></div>`;
  const pill=document.createElement('button');pill.type='button';pill.className='perf-pill';pill.textContent='Perf';pill.title='Leistungsmesser einblenden (Alt+P)';
  const grid=root.querySelector('.perf-grid'),foot=root.querySelector('.perf-foot'),graph=root.querySelector('canvas'),g=graph.getContext('2d');

  // Hidden = off: no animation loop at all, so a hidden meter cannot influence what it measures.
  let loop=0;
  const setVisible=v=>{visible=v;root.hidden=!v;pill.hidden=v;try{localStorage.setItem('ourark.perf',v?'1':'0');}catch{}
    if(v&&!loop){state.last=0;state.frames.length=0;state.secondStart=performance.now();state.lastCalls=gpuCounter.calls;state.lastTris=gpuCounter.triangles;loop=requestAnimationFrame(frame);}
    if(!v&&loop){cancelAnimationFrame(loop);loop=0;}};
  const download=(name,text,type)=>{const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  const stamp=()=>new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
  root.addEventListener('click',e=>{const act=e.target.closest('button')?.dataset.act;if(!act)return;
    if(act==='hide')setVisible(false);
    if(act==='reset'){state.log.length=0;state.startedAt=new Date().toISOString();state.longTasks=0;state.longTaskMs=0;}
    if(act==='json')download(`ourark-perf-${stamp()}.json`,JSON.stringify(report(),null,1),'application/json');
    if(act==='csv')download(`ourark-perf-${stamp()}.csv`,logCsv(state.log),'text/csv');});
  pill.addEventListener('click',()=>setVisible(true));
  addEventListener('keydown',e=>{if(e.altKey&&e.code==='KeyP'){e.preventDefault();setVisible(!visible);}},true);
  document.body.append(root,pill);setVisible(visible);
  // Fullscreen shows only the fullscreen element (walk mode): the meter moves in with it and back out afterwards.
  document.addEventListener('fullscreenchange',()=>{const host=document.fullscreenElement??document.body;if(root.parentNode!==host)host.append(root,pill);});

  const env=(()=>{const gl=document.createElement('canvas').getContext('webgl2'),d=gl?.getExtension('WEBGL_debug_renderer_info');
    return {gpu:d?String(gl.getParameter(d.UNMASKED_RENDERER_WEBGL)):null,cores:navigator.hardwareConcurrency??null,memoryGB:navigator.deviceMemory??null,
      dpr:devicePixelRatio,screen:`${screen.width}x${screen.height}`,userAgent:navigator.userAgent};})();
  const nav=()=>{const n=performance.getEntriesByType('navigation')[0];return n?{ttfb:round(n.responseStart-n.requestStart),dcl:round(n.domContentLoadedEventEnd),load:round(n.loadEventEnd)}:{};};
  const mainCanvas=()=>{let best=null;for(const c of document.querySelectorAll('canvas')){if(c===graph)continue;if(!best||c.width*c.height>best.width*best.height)best=c;}return best;};
  const report=()=>({format:PERF_FORMAT,page:location.pathname+location.hash,query:location.search,startedAt:state.startedAt,exportedAt:new Date().toISOString(),
    environment:env,navigation:nav(),samples:state.log,summary:frameSummary(state.log.flatMap(r=>r._frames??[]))});

  const row=(k,v,cls='')=>`<dt>${k}</dt><dd class="${cls}">${v}</dd>`;
  const grade=(v,good,warn,lower=true)=>v==null?'':(lower?(v<=good?'ok':v<=warn?'warn':'bad'):(v>=good?'ok':v>=warn?'warn':'bad'));

  function sample(now){
    const frames=state.frames.splice(0),s=frameSummary(frames),c=mainCanvas(),heap=performance.memory?round(performance.memory.usedJSHeapSize/1048576):null;
    // Editors render on demand: renderedFrames counts frames that really drew; calls/triangles are the peak of this
    // second, lastCalls/lastTriangles the last frame that drew (so an idle editor still shows its scene cost).
    const renderedFrames=state.perFrameCalls.length,calls=renderedFrames?Math.max(...state.perFrameCalls):0,tris=renderedFrames?Math.max(...state.perFrameTris):0;
    state.perFrameCalls.length=0;state.perFrameTris.length=0;
    const r={t:round(now/1000,1),at:new Date().toISOString(),...s,calls,triangles:tris,longTasks:state.longTasks,longTaskMs:round(state.longTaskMs),
      heapMB:heap,netKB:round(state.netBytes/1024),netRequests:state.netRequests,canvas:c?`${c.width}x${c.height}`:null,
      scale:c&&c.clientWidth?round(c.width/c.clientWidth,2):null,renderedFrames,lastCalls:state.lastDrawn?.calls??0,lastTriangles:state.lastDrawn?.triangles??0,runtime:document.body.dataset.runtime??'editing',hidden:document.hidden,probes:readPerfProbes()};
    Object.defineProperty(r,'_frames',{value:frames,enumerable:false});
    if(state.recording){state.log.push(r);if(state.log.length>LOG_MAX)state.log.shift();}
    if(visible)paint(r);
  }
  function paint(r){
    const recent=frameSummary(state.log.slice(-10).flatMap(x=>x._frames??[])),n=nav();
    grid.innerHTML=
      row('FPS',r.fps??'–',grade(r.fps,57,45,false))+row('Frame p50',`${r.p50} ms`,grade(r.p50,BUDGET_MS+.5,JANK_MS))+
      row('Frame p95',`${r.p95} ms`,grade(r.p95,JANK_MS,33))+row('Frame p99 / max',`${r.p99} / ${r.max} ms`,grade(r.p99,JANK_MS,50))+
      row('Ruckler > 20 ms',`${round((r.jank??0)*100)} %`,grade(r.jank,.02,.1))+row('10 s: FPS · p95',`${recent.fps} · ${recent.p95} ms`,grade(recent.p95,JANK_MS,33))+
      row('Gerenderte Frames / s',r.renderedFrames)+row('Draw Calls / Frame',r.lastCalls)+row('Dreiecke / Frame',r.lastTriangles.toLocaleString('de-DE'))+
      row('Long Tasks',`${r.longTasks} · ${r.longTaskMs} ms`,grade(r.longTasks,0,5))+row('JS-Heap',r.heapMB==null?'n/a':`${r.heapMB} MB`)+
      row('Canvas · Skala',`${r.canvas??'–'} · ${r.scale??'–'}×`)+row('Netz',`${r.netRequests} Req · ${r.netKB} KB`)+
      row('Laden',n.ttfb!=null?`TTFB ${n.ttfb} · DCL ${n.dcl} · Load ${n.load} ms`:'–')+row('Modus',r.runtime);
    foot.textContent=`${env.gpu??'GPU unbekannt'} · DPR ${env.dpr} · ${state.log.length} s aufgezeichnet`;
    drawGraph();
  }
  function drawGraph(){
    const w=graph.width,h=graph.height,max=50,y=ms=>h-Math.min(ms,max)/max*h;
    g.clearRect(0,0,w,h);g.fillStyle='rgba(255,255,255,.04)';g.fillRect(0,0,w,h);
    g.strokeStyle='rgba(255,255,255,.35)';g.setLineDash([4,4]);g.beginPath();g.moveTo(0,y(BUDGET_MS));g.lineTo(w,y(BUDGET_MS));g.stroke();
    g.strokeStyle='rgba(255,159,10,.5)';g.beginPath();g.moveTo(0,y(JANK_MS));g.lineTo(w,y(JANK_MS));g.stroke();g.setLineDash([]);
    const hist=state.history,bw=w/HISTORY;
    for(let i=0;i<hist.length;i++){const ms=hist[i];g.fillStyle=ms>JANK_MS?'#ff9f0a':'#4ade80';g.fillRect(i*bw,y(ms),Math.max(1,bw-.5),h-y(ms));}
    g.fillStyle='rgba(255,255,255,.55)';g.font='10px system-ui';g.fillText('50 ms',4,11);g.fillText('16,7',4,y(BUDGET_MS)-3);
  }

  function frame(now){
    if(state.last&&!document.hidden){const ms=now-state.last;if(ms<1000){state.frames.push(ms);state.history.push(ms);if(state.history.length>HISTORY)state.history.shift();}}
    state.last=now;
    const dc=gpuCounter.calls-state.lastCalls,dt=gpuCounter.triangles-state.lastTris;state.lastCalls=gpuCounter.calls;state.lastTris=gpuCounter.triangles;
    if(dc>0){state.perFrameCalls.push(dc);state.perFrameTris.push(dt);state.lastDrawn={calls:dc,triangles:dt};}
    if(now-state.secondStart>=1000){state.secondStart=now;sample(now);}
    loop=requestAnimationFrame(frame);
  }
}

if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();}
