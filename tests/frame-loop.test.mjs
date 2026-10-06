// FrameLoop (shared by the kart and RuntimeSession), Hud (change-only, rate-limited DOM writes) and the shadow
// tier of the adaptive resolution — no browser required (Welle P1, ADR 0006).
import assert from 'node:assert/strict';
import {FrameLoop} from '../dist/runtime/frame-loop.js';
import {Hud} from '../dist/runtime/hud.js';
import {shadowMapSize} from '../dist/runtime/quality.js';

function fakeClock(){
  let now=0,next=1;const queue=new Map();
  return {now:()=>now,raf:fn=>{const id=next++;queue.set(id,fn);return id;},caf:id=>queue.delete(id),pending:()=>queue.size,
    tick(ms){now+=ms;const due=[...queue];queue.clear();for(const [,fn] of due)fn(now);}};
}
function fakeDocument(){
  const listeners=new Set();
  return {hidden:false,addEventListener:(t,fn)=>listeners.add(fn),removeEventListener:(t,fn)=>listeners.delete(fn),listeners,
    set(hidden){this.hidden=hidden;for(const fn of listeners)fn();}};
}

{ // Fixed step independent of frame slicing; render gets dt, alpha and the timestamp.
  const clock=fakeClock(),doc=fakeDocument(),steps=[],renders=[];
  const loop=new FrameLoop({step:1/120,clock,document:doc,simulate:dt=>steps.push(dt),render:(dt,alpha,now)=>renders.push({dt,alpha,now})});
  loop.start();clock.tick(8);clock.tick(30);clock.tick(12);
  assert.equal(steps.length,6,'50 ms at 1/120 s = 6 steps');assert.ok(steps.every(dt=>dt===1/120));
  assert.equal(renders.length,3);assert.ok(renders.every(r=>r.alpha>=0&&r.alpha<1));assert.equal(renders.at(-1).now,50);
  assert.equal(clock.pending(),1,'exactly one RAF loop');
  // A stall is clamped to maxFrame and capped at maxSteps: no spiral, no 1200-step replay.
  steps.length=0;clock.tick(10000);assert.ok(steps.length<=30,`${steps.length} steps after a 10 s stall`);
  // Hidden tab: the loop stops; coming back starts from a fresh timestamp (no catch-up burst).
  doc.set(true);assert.equal(clock.pending(),0,'no RAF while hidden');
  steps.length=0;clock.tick(5000);doc.set(false);clock.tick(9);assert.equal(steps.length,1,'one step after returning, not 600');
  // Pause and resume.
  loop.pause();assert.equal(clock.pending(),0);steps.length=0;clock.tick(1000);assert.equal(steps.length,0);
  loop.resume();clock.tick(9);assert.equal(steps.length,1,'resume without a jump');
  loop.stop();assert.equal(clock.pending(),0);assert.equal(doc.listeners.size,0,'visibility listener removed');
  loop.resume();assert.equal(clock.pending(),0,'resume after stop does nothing');
}
{ // Errors stop the loop and reach onError; without onError they propagate.
  const clock=fakeClock(),errors=[];
  const loop=new FrameLoop({clock,document:null,simulate:()=>{throw new Error('NaN-Pose');},onError:e=>errors.push(e.message)});
  loop.start();clock.tick(40);assert.deepEqual(errors,['NaN-Pose']);assert.equal(clock.pending(),0);assert.equal(loop.running,false);
  const bare=new FrameLoop({clock,document:null,render:()=>{throw new Error('boom');}});bare.start();
  assert.throws(()=>clock.tick(20),/boom/);
}
{ // Hud: same value → no write; live values at most rateHz; nothing changed is lost; visibility cached.
  let t=0;const el=()=>({textContent:'',hidden:false}),els={speed:el(),lap:el(),banner:el()};
  const hud=new Hud(els,{rateHz:10,clock:()=>t});
  for(let f=0;f<120;f++){t=f*1000/120;hud.text('lap','Runde 1/3');hud.live('speed',`${f} km/h`);}
  assert.equal(els.lap.textContent,'Runde 1/3');
  assert.ok(hud.writes<=1+11,`${hud.writes} writes for 120 frames (1 lap + ≤ 11 speed ticks)`);
  hud.flush();assert.equal(els.speed.textContent,'119 km/h','the last value is never lost');
  const before=hud.writes;hud.show('banner',false);hud.show('banner',false);hud.show('banner',true);
  assert.equal(hud.writes-before,2);assert.equal(els.banner.hidden,false);
  els.lap.textContent='fremd';hud.text('lap','Runde 1/3');assert.equal(els.lap.textContent,'fremd','cached: direct writes must go through hud');
  hud.forget('lap');hud.text('lap','Runde 1/3');assert.equal(els.lap.textContent,'Runde 1/3');
  hud.text('missing','x');// unknown element: ignored
}
{ // Shadow map follows the render scale, never under 512.
  assert.equal(shadowMapSize(2,2048),2048);assert.equal(shadowMapSize(1.75,2048),2048);assert.equal(shadowMapSize(1.5,2048),2048);
  assert.equal(shadowMapSize(1.25,2048),1024);assert.equal(shadowMapSize(1,2048),1024);assert.equal(shadowMapSize(.75,2048),512);
  assert.equal(shadowMapSize(1.5,1024),1024);assert.equal(shadowMapSize(1,1024),512);assert.equal(shadowMapSize(.5,1024),512);
}
console.log('PASS: frame loop (fixed step, clamp, hidden tab, pause, errors), HUD change-only at 10 Hz, shadow tiers.');
