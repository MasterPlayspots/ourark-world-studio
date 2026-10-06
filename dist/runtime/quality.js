// Frame budget and adaptive render resolution for the walk mode (Welle 4a). Pure logic, no DOM, no Three.js.
// The goal is at least 60 fps: when frames are dropped for a while, the render resolution goes down in steps;
// after a few seconds without drops it goes back up, never above the device's full resolution.

export const TARGET_FPS=60;
export const FRAME_BUDGET_MS=1000/TARGET_FPS;
// Walk mode renders at the full device resolution (retina/4K), capped at 3 device pixels per CSS pixel.
export const runtimePixelRatio=dpr=>Math.min(3,Math.max(1,Number.isFinite(dpr)?dpr:1));

export class FrameStats{
  constructor(size=120){this.size=size;this.values=[];}
  push(ms){this.values.push(ms);if(this.values.length>this.size)this.values.shift();}
  clear(){this.values.length=0;}
  fps(){if(!this.values.length)return 0;return 1000/(this.values.reduce((a,b)=>a+b,0)/this.values.length);}
  // AdaptiveResolution asks for p90 on every frame: sorted in a reused Float64Array (native numeric sort, no
  // comparator, no temporary array); unused slots hold +Infinity and stay behind the n real values.
  percentile(q){
    const n=this.values.length;if(!n)return 0;
    if(!this.sorted||this.sorted.length<n)this.sorted=new Float64Array(Math.max(n,this.size));
    const sorted=this.sorted;sorted.fill(Infinity);for(let i=0;i<n;i++)sorted[i]=this.values[i];sorted.sort();
    return sorted[Math.min(n-1,Math.floor(n*q))];
  }
  p95(){return this.percentile(.95);}
}

// Discrete render scales (device pixels per CSS pixel): no odd canvas sizes, one step at a time.
export const LEVELS=[3,2.5,2,1.75,1.5,1.25,1,.75,.5];
const GAP_MS=250,HOLD_AFTER_INEFFECTIVE_MS=20_000,UNDONE_RAISE_MS=5_000;

export class AdaptiveResolution{
  // Starts at min(max, 2): a 3× phone first proves it can hold 60 fps before going to full resolution.
  constructor({max,min=.5,budgetMs=FRAME_BUDGET_MS,window=30,cooldownMs=1000,raiseAfterMs=3000,maxRaiseAfterMs=60_000}={}){
    Object.assign(this,{budgetMs,window,cooldownMs,baseRaiseAfterMs:raiseAfterMs,maxRaiseAfterMs});
    this.levels=[max,...LEVELS.filter(level=>level<max-1e-9&&level>=min-1e-9)];
    this.index=Math.max(0,this.levels.findIndex(level=>level<=Math.min(max,2)+1e-9));
    this.scale=this.levels[this.index];this.stats=new FrameStats(window);
    this.raiseAfterMs=raiseAfterMs;this.lastChange=-Infinity;this.lastSlow=-Infinity;this.lastRaise=-Infinity;this.holdDownUntil=-Infinity;this.pending=null;
  }
  setIndex(index,now){this.index=index;this.scale=this.levels[index];this.lastChange=now;this.stats.clear();}
  // One frame interval (ms) at time `now` (ms) → the render scale to use.
  feed(ms,now){
    if(ms>GAP_MS){this.stats.clear();return this.scale;}// background tab, pause, debugger: not a frame
    this.stats.push(ms);if(ms>this.budgetMs*1.5)this.lastSlow=now;
    if(this.stats.values.length<this.window)return this.scale;
    const p90=this.stats.percentile(.9);
    // A drop must pay off (GPU-bound). If frames are not faster (30 Hz display, CPU-bound), take it back and hold.
    if(this.pending){const {p90Before,fromIndex}=this.pending;this.pending=null;if(p90>p90Before*.9){this.setIndex(fromIndex,now);this.holdDownUntil=now+HOLD_AFTER_INEFFECTIVE_MS;return this.scale;}}
    const slow=p90>this.budgetMs*1.25;
    if(slow&&now-this.lastChange>=this.cooldownMs&&now>=this.holdDownUntil&&this.index<this.levels.length-1){
      // A raise that fails right away means we sit at the edge: wait twice as long before the next try.
      if(now-this.lastRaise<UNDONE_RAISE_MS)this.raiseAfterMs=Math.min(this.maxRaiseAfterMs,this.raiseAfterMs*2);
      this.pending={p90Before:p90,fromIndex:this.index};this.setIndex(this.index+1,now);return this.scale;
    }
    if(!slow&&this.index>0&&p90<=this.budgetMs*1.1&&now-this.lastSlow>=this.raiseAfterMs&&now-this.lastChange>=this.raiseAfterMs){this.setIndex(this.index-1,now);this.lastRaise=now;}
    if(now-this.lastSlow>this.maxRaiseAfterMs&&now-this.lastRaise>this.maxRaiseAfterMs)this.raiseAfterMs=this.baseRaiseAfterMs;
    return this.scale;
  }
  reset(){this.stats.clear();this.pending=null;}
}

// Shadow map size for a render scale (Welle P1): full size while the resolution is high, half from 1.5× down,
// a quarter below 1×; never under 512. Lowering the resolution alone does not shrink the shadow pass.
export function shadowMapSize(scale,maxSize=2048){
  const size=scale>=1.5-1e-9?maxSize:scale>=1-1e-9?maxSize/2:maxSize/4;
  return Math.max(512,Math.min(maxSize,size));
}
