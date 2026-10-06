// RuntimeSession lifecycle, fixed-step timing and InputRouter focus rules — no browser required.
import assert from 'node:assert/strict';
import {RuntimeSession} from '../dist/runtime/session.js';
import {InputRouter} from '../dist/runtime/input.js';

// --- Test doubles -----------------------------------------------------------------------------
function fakeClock(){
  let now=0,next=1;const queue=new Map();
  return {
    now:()=>now,
    raf:fn=>{const id=next++;queue.set(id,fn);return id;},
    caf:id=>queue.delete(id),
    pending:()=>queue.size,
    // Advance time and run the callbacks that were queued before this tick (one RAF "frame").
    tick(ms){now+=ms;const due=[...queue];queue.clear();for(const [,fn] of due)fn(now);}
  };
}
function fakeHost({fail=null}={}){
  const calls=[];
  return {calls,
    async prepare(snapshot){calls.push('prepare');if(fail==='prepare')throw new Error('Physik konnte nicht starten.');return {start:{x:0,z:0},snapshot};},
    activate(){calls.push('activate');if(fail==='activate')throw new Error('activate failed');},
    render(){calls.push('render');},
    teardown(){calls.push('teardown');}};
}
function fakeEvents(){
  const listeners=new Map();
  return {listeners,
    addEventListener(type,fn,opts){const set=listeners.get(type)??new Set();set.add(fn);listeners.set(type,set);},
    removeEventListener(type,fn){listeners.get(type)?.delete(fn);if(!listeners.get(type)?.size)listeners.delete(type);},
    emit(type,event={}){for(const fn of [...(listeners.get(type)??[])])fn({type,preventDefault(){this.defaultPrevented=true;},...event});},
    count(){let n=0;for(const set of listeners.values())n+=set.size;return n;}};
}
const doc={schema:'motionspec.map.v2',name:'Test',map:{width:40,depth:40,color:'#101f34',image:null},runtime:{spawn:null},points:[{id:'a',x:1,z:2,data:{nested:{v:1}}}]};

// --- Lifecycle ----------------------------------------------------------------------------------
{
  const clock=fakeClock(),host=fakeHost(),states=[],steps=[];
  const session=new RuntimeSession({host,clock,simulate:dt=>steps.push(dt),onState:s=>states.push(s)});
  assert.equal(session.state,'editing');
  const original=JSON.stringify(doc);
  const entering=session.enter(doc);assert.equal(session.state,'loading','loading is observable while resources are prepared');
  assert.equal(await entering,true);assert.equal(session.state,'playing');
  assert.deepEqual(host.calls,['prepare','activate'],'input is handed over only after successful preparation');
  // The runtime gets a frozen deep copy: it cannot write back into the editor document.
  assert.ok(Object.isFrozen(session.snapshot)&&Object.isFrozen(session.snapshot.points[0].data.nested));
  assert.notEqual(session.snapshot,doc);assert.throws(()=>{'use strict';session.snapshot.points[0].x=99;});
  assert.equal(JSON.stringify(doc),original);

  // Fixed step: 100 ms of wall time at 1/60 s yields 6 steps regardless of how frames are sliced.
  clock.tick(16);clock.tick(50);clock.tick(35);
  const total=steps.reduce((a,b)=>a+b,0);assert.equal(steps.length,6);assert.ok(Math.abs(total-.1)<1/60,`simulated ${total}s`);
  assert.ok(steps.every(dt=>dt===1/60));

  // Long frames are clamped: a 10 s stall must not replay 600 steps.
  steps.length=0;clock.tick(10000);assert.ok(steps.length<=5,`${steps.length} catch-up steps after a stall`);

  // Pause stops simulation and the loop; resume does not catch up paused time.
  session.pause('Tab verlassen');assert.equal(session.state,'paused');assert.equal(session.pauseReason,'Tab verlassen');
  steps.length=0;clock.tick(5000);assert.equal(steps.length,0);assert.equal(clock.pending(),0,'no RAF loop while paused');
  session.resume();assert.equal(session.state,'playing');clock.tick(1);clock.tick(17);assert.equal(steps.length,1,'resume starts from a fresh timestamp');
  assert.equal(clock.pending(),1,'exactly one RAF loop while playing');

  session.exit();assert.equal(session.state,'editing');assert.equal(clock.pending(),0);assert.equal(host.calls.at(-1),'teardown');
  assert.equal(session.snapshot,null);
  assert.deepEqual(states,['loading','playing','paused','playing','editing']);
  // Illegal transitions are no-ops.
  session.pause();session.resume();session.exit();assert.equal(session.state,'editing');
}

// --- Failure during preparation or activation ---------------------------------------------------
for(const fail of ['prepare','activate']){
  const clock=fakeClock(),host=fakeHost({fail}),errors=[];
  const session=new RuntimeSession({host,clock,onError:e=>errors.push(e.message)});
  assert.equal(await session.enter(doc),false);
  assert.equal(session.state,'editing');assert.equal(host.calls.at(-1),'teardown','partial start is cleaned up');
  assert.equal(errors.length,1);assert.equal(clock.pending(),0);assert.equal(session.snapshot,null);
}

// --- Exit while still loading: a late preparation result is discarded ---------------------------
{
  let release;const clock=fakeClock(),calls=[];
  const host={prepare:()=>new Promise(r=>{release=r;}),activate:()=>calls.push('activate'),render(){},teardown:()=>calls.push('teardown')};
  const session=new RuntimeSession({host,clock});
  const entering=session.enter(doc);session.exit();release({});
  assert.equal(await entering,false);assert.equal(session.state,'editing');assert.ok(!calls.includes('activate'));assert.equal(clock.pending(),0);
}

// --- Exit, re-enter, then the first (stale) preparation resolves: the newer session keeps running ---
{
  const clock=fakeClock(),calls=[],pending=[];
  const host={prepare:()=>new Promise(r=>pending.push(r)),activate:()=>calls.push('activate'),render(){},teardown:()=>calls.push('teardown')};
  const session=new RuntimeSession({host,clock});
  const first=session.enter(doc);session.exit();const second=session.enter(doc);
  pending[1]({});assert.equal(await second,true);calls.length=0;
  pending[0]({});assert.equal(await first,false);
  assert.equal(session.state,'playing');assert.ok(!calls.includes('teardown'),'stale result must not tear down the active session');
  session.exit();
}

// --- A throwing simulation step ends the session visibly instead of freezing it ---
{
  const clock=fakeClock(),errors=[];
  const session=new RuntimeSession({host:fakeHost(),clock,simulate:()=>{throw new Error('NaN-Pose');},onError:e=>errors.push(e.message)});
  await session.enter(doc);clock.tick(40);
  assert.equal(session.state,'editing');assert.deepEqual(errors,['NaN-Pose']);assert.equal(clock.pending(),0);
}

// --- 20 enter/exit cycles leave nothing behind --------------------------------------------------
{
  const clock=fakeClock(),host=fakeHost();const session=new RuntimeSession({host,clock});
  for(let i=0;i<20;i++){await session.enter(doc);clock.tick(20);if(i%3===0)session.pause();session.exit();}
  assert.equal(clock.pending(),0);assert.equal(host.calls.filter(c=>c==='prepare').length,20);assert.equal(host.calls.filter(c=>c==='teardown').length,20);
}

// --- InputRouter --------------------------------------------------------------------------------
{
  const win=fakeEvents(),doc=Object.assign(fakeEvents(),{hidden:false,querySelector:()=>null});const events=[];
  const input=new InputRouter({window:win,document:doc,onCommand:c=>events.push(c),onFocusLoss:r=>events.push(`loss:${r}`)});
  assert.equal(win.count(),0,'inactive router listens to nothing');
  input.activate();const active=win.count()+doc.count();assert.ok(active>=4);
  input.activate();assert.equal(win.count()+doc.count(),active,'activating twice does not double listeners');

  const field={closest:sel=>sel.includes('input')?{}:null},canvas={closest:()=>null};
  win.emit('keydown',{code:'KeyW',key:'w',target:canvas});assert.ok(input.isDown('forward'));
  win.emit('keydown',{code:'ArrowLeft',key:'ArrowLeft',target:canvas});assert.ok(input.isDown('left'));
  assert.deepEqual(input.axes(),{x:-1,z:1});
  win.emit('keyup',{code:'KeyW',key:'w',target:canvas});assert.ok(!input.isDown('forward'));
  // Typing in a field or with modifiers never produces movement; browser shortcuts stay untouched.
  win.emit('keydown',{code:'KeyD',key:'d',target:field});assert.ok(!input.isDown('right'));
  let prevented=false;win.emit('keydown',{code:'KeyD',key:'d',metaKey:true,target:canvas,preventDefault(){prevented=true;}});assert.ok(!input.isDown('right'));assert.equal(prevented,false);
  // An open dialog owns the keyboard.
  doc.querySelector=sel=>sel==='dialog[open]'?{}:null;win.emit('keydown',{code:'KeyS',key:'s',target:canvas});assert.ok(!input.isDown('back'));doc.querySelector=()=>null;
  // Escape and repeats: commands fire once per press.
  win.emit('keydown',{code:'Escape',key:'Escape',target:canvas});win.emit('keydown',{code:'Escape',key:'Escape',target:canvas,repeat:true});
  assert.deepEqual(events,['pause']);
  // Focus loss clears held actions.
  win.emit('keydown',{code:'KeyD',key:'d',target:canvas});assert.ok(input.isDown('right'));
  win.emit('blur');assert.ok(!input.isDown('right')&&!input.isDown('left'));assert.equal(events.at(-1),'loss:blur');
  win.emit('keydown',{code:'KeyD',key:'d',target:canvas});doc.hidden=true;doc.emit('visibilitychange');assert.ok(!input.isDown('right'));assert.equal(events.at(-1),'loss:hidden');
  // macOS: no keyup for W while ⌘ is held — any ⌘ press or release clears held movement.
  doc.hidden=false;win.emit('keydown',{code:'KeyW',key:'w',target:canvas});win.emit('keydown',{code:'MetaLeft',key:'Meta',metaKey:true,target:canvas});
  assert.ok(!input.isDown('forward'),'⌘ press clears held keys');
  win.emit('keydown',{code:'KeyA',key:'a',target:canvas});win.emit('keyup',{code:'MetaLeft',key:'Meta',target:canvas});assert.ok(!input.isDown('left'),'⌘ release clears held keys');
  input.deactivate();assert.equal(win.count()+doc.count(),0,'deactivate removes every listener');
  win.emit('keydown',{code:'KeyW',key:'w',target:canvas});assert.ok(!input.isDown('forward'));
}

console.log('PASS: runtime lifecycle, frozen snapshot, fixed step with clamping, pause/resume, failure cleanup, 20 cycles and input focus rules.');
