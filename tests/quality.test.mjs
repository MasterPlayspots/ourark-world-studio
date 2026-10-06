// Welle 4a: frame statistics and adaptive render resolution (pure logic, simulated clock).
import assert from 'node:assert/strict';
import {FrameStats,AdaptiveResolution,FRAME_BUDGET_MS,LEVELS,runtimePixelRatio} from '../dist/runtime/quality.js';

const near=(a,b,eps=1e-6)=>Math.abs(a-b)<=eps;
// Drive the controller for `seconds`; `interval(scale)` models how long a frame takes at a given resolution.
function drive(c,{seconds,interval,start=0}){let now=start;const changes=[];while(now<start+seconds*1000){const ms=interval(c.scale);now+=ms;const before=c.scale;c.feed(ms,now);if(c.scale!==before)changes.push([Math.round(now),c.scale]);}return {now,changes};}
const fixed=ms=>()=>ms;
// GPU-bound model: cost grows with the number of pixels (scale²).
const gpu=(msAtOne)=>scale=>Math.max(1000/60,msAtOne*scale*scale);

// 1. Statistics over a rolling window.
{
  const s=new FrameStats(60);for(let i=0;i<60;i++)s.push(1000/60);
  assert.ok(near(s.fps(),60,1e-6));assert.ok(near(s.p95(),1000/60));
  for(let i=0;i<2;i++)s.push(50);assert.ok(s.p95()<20,'two spikes in 60 frames (under 5 %) do not move p95');
  for(let i=0;i<10;i++)s.push(50);assert.ok(s.p95()>=50,'sustained slow frames do');
  assert.equal(new FrameStats(10).fps(),0,'empty window');
}

// 2. Discrete levels; start at 2× at most, even on 3× screens; steady 60 fps climbs to the device maximum.
{
  assert.deepEqual(LEVELS,[3,2.5,2,1.75,1.5,1.25,1,.75,.5]);
  const c=new AdaptiveResolution({max:3});assert.equal(c.scale,2,'start at 2× on a 3× phone');
  drive(c,{seconds:30,interval:fixed(1000/60)});assert.equal(c.scale,3,'headroom → full device resolution');
  const m=new AdaptiveResolution({max:1.5});assert.equal(m.scale,1.5);
}

// 3. GPU-bound: the resolution drops one level at a time until 60 fps hold, then stays there.
{
  const c=new AdaptiveResolution({max:2});
  const r=drive(c,{seconds:20,interval:gpu(12)});// 2× → 48 ms, 1.5× → 27 ms, 1.25× → 18.75 ms, 1× → 12 ms
  assert.ok(LEVELS.includes(c.scale),`on a level: ${c.scale}`);
  assert.ok(c.scale<=1.25&&c.scale>=1,`settles where 60 fps hold: ${c.scale}`);
  assert.ok(r.changes.every(([,s],i,a)=>i===0||LEVELS.indexOf(s)-LEVELS.indexOf(a[i-1][1])<=1),'one level per step');
}

// 4. A drop that does not help (30 Hz display, CPU-bound) is taken back and not retried for a while.
{
  const c=new AdaptiveResolution({max:2});
  const r=drive(c,{seconds:12,interval:fixed(33.4)});
  assert.equal(c.scale,2,'back at the start level');
  assert.ok(r.changes.length<=4,`few changes: ${JSON.stringify(r.changes)}`);
}

// 5. No oscillation at the edge: when raising keeps failing, the wait before the next try grows.
{
  const c=new AdaptiveResolution({max:2});
  const r=drive(c,{seconds:120,interval:scale=>scale>=2?24:15});// 2× too slow, 1.75× fine
  assert.equal(c.scale,1.75);
  assert.ok(r.changes.length<=12,`${r.changes.length} changes in 2 minutes (back-off 3 → 6 → 12 → 24 → 48 s)`);
  const late=r.changes.filter(([t])=>t>60000).length;assert.ok(late<=2,`settled: ${late} changes in the second minute`);
}

// 6. Gaps (background tab, pause) are ignored instead of counting as one giant frame.
{
  const c=new AdaptiveResolution({max:2});drive(c,{seconds:5,interval:fixed(1000/60)});
  const before=c.scale;c.feed(90_000,100_000);for(let i=0;i<40;i++)c.feed(1000/60,100_000+i*17);
  assert.equal(c.scale,before);
}

// 7. Pixel ratio in walk mode: full device resolution up to 3, at least 1.
assert.equal(runtimePixelRatio(2),2);assert.equal(runtimePixelRatio(3.5),3);assert.equal(runtimePixelRatio(undefined),1);assert.equal(runtimePixelRatio(.5),1);

console.log('PASS: frame statistics, discrete levels, 2× start, GPU-bound settling, ineffective drops reverted, no oscillation, gaps ignored, runtime pixel ratio.');
