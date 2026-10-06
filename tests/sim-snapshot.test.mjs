// Flat simulation state (Welle P2, ADR 0006): exact round trip, rollback + replay bit-identical for kart/race,
// plane and pedestrian, the allocation-free Track.project equal to the previous implementation, and the input
// action counter. Rollback netcode later builds on exactly these properties.
import assert from 'node:assert/strict';
import {StateLayout,SimSnapshot} from '../dist/runtime/sim/snapshot.js';
import {Track} from '../dist/kart/track.js';
import {Kart,Race,KART_STATE,MAX_LAPS} from '../dist/kart/kart.js';
import {Plane} from '../dist/kart/plane.js';
import {Pedestrian} from '../dist/kart/pedestrian.js';
import {InputRouter} from '../dist/runtime/input.js';

const DT=1/120;
// Deterministic pseudo-random commands (mulberry32), so a replay sees exactly the same inputs.
const rng=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};
const sameBits=(a,b)=>a.length===b.length&&Buffer.compare(Buffer.from(a.buffer,a.byteOffset,a.byteLength),Buffer.from(b.buffer,b.byteOffset,b.byteLength))===0;
const wobbly=(r,n=24)=>Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2,k=r*(1+.18*Math.sin(3*a)+.07*Math.cos(5*a));return [Math.sin(a)*k,-Math.cos(a)*k];});

{ // StateLayout: numbers exact (including -0, tiny and huge values), booleans, nullable → NaN → null.
  const layout=new StateLayout([['a'],['b','bool'],['c','nullable'],['d']]);
  const buf=new Float64Array(layout.size),src={a:0.1+0.2,b:true,c:null,d:-0},out={};
  layout.write(src,buf,0);layout.read(buf,0,out);
  assert.ok(Object.is(out.a,src.a)&&out.b===true&&out.c===null&&Object.is(out.d,-0));
  layout.write({a:1e-300,b:false,c:7.5,d:Number.MAX_VALUE},buf,0);layout.read(buf,0,out);
  assert.deepEqual(out,{a:1e-300,b:false,c:7.5,d:Number.MAX_VALUE});
  assert.throws(()=>new StateLayout([['x','string']]),/Feldart/);
}
{ // Track.project without allocation equals the previous implementation (hypot, object per candidate).
  const reference=(track,x,z,hint=null,window=40)=>{
    const n=track.samples.length;
    const scan=(from,count)=>{let best=null;for(let k=0;k<count;k++){const i=((from+k)%n+n)%n,a=track.samples[i],b=track.samples[(i+1)%n];
      const ex=b.x-a.x,ez=b.z-a.z,len2=ex*ex+ez*ez||1,u=Math.min(1,Math.max(0,((x-a.x)*ex+(z-a.z)*ez)/len2));
      const px=a.x+ex*u,pz=a.z+ez*u,dist=Math.hypot(x-px,z-pz);if(!best||dist<best.dist)best={i,u,px,pz,dist,tx:ex/Math.sqrt(len2),tz:ez/Math.sqrt(len2)};}return best;};
    let best=hint==null?null:scan(hint-window,2*window+1);if(!best||best.dist>track.limit*1.5)best=scan(0,n);
    return {index:best.i,s:(best.i+best.u)*track.spacing,d:(x-best.px)*(-best.tz)+(z-best.pz)*best.tx,px:best.px,pz:best.pz,tx:best.tx,tz:best.tz};
  };
  const track=new Track({points:wobbly(90),width:10,shoulder:3}),r=rng(7),out={};let differing=0;
  for(let k=0;k<5000;k++){
    const x=(r()-.5)*260,z=(r()-.5)*260,hint=k%3?Math.floor(r()*track.samples.length):null;
    const want=reference(track,x,z,hint),got=track.project(x,z,hint,undefined,out);
    if(got.index!==want.index||Math.abs(got.s-want.s)>1e-9||Math.abs(got.d-want.d)>1e-9)differing++;
  }
  assert.equal(differing,0,`${differing} of 5000 projections differ`);
  assert.equal(track.project(0,-90,null,undefined,out),out,'fills the given object');
}
{ // Kart + race: snapshot at tick 200, run to 900, roll back, replay the same commands → bit-identical state.
  const track=new Track({points:wobbly(70),width:10,shoulder:3,features:[{type:'kicker',s:150,length:8,height:1.2}]});
  const kart=new Kart({track,start:6}),race=new Race({length:track.length,laps:2}),sim=new SimSnapshot([kart,race]);
  const r=rng(42),commands=Array.from({length:900},()=>({throttle:r()*1.4-.2,steer:r()*2-1}));
  const tick=i=>{kart.step(DT,commands[i]);race.update(DT,kart.state.s,true);};
  for(let i=0;i<200;i++)tick(i);
  const at200=sim.save(),stateRef=kart.state;
  for(let i=200;i<900;i++)tick(i);
  const first=sim.save();
  sim.restore(at200);assert.equal(kart.state,stateRef,'restore reuses the state object (renderer references stay valid)');
  assert.ok(sameBits(sim.save(),at200),'restore → save is exact');
  for(let i=200;i<900;i++)tick(i);
  assert.ok(sameBits(sim.save(),first),'replay from the snapshot is bit-identical');
  assert.equal(sim.size,1+KART_STATE.size+8+1+MAX_LAPS);
  assert.ok(race.lap>1||race.lapTimes.length>0||race.time>7,'the replay really drove');
}
{ // Plane (with a crash counter and a state that exists only after launch) and pedestrian: same property.
  const ground=(x,z)=>Math.sin(x*.02)*8+Math.cos(z*.015)*6;
  const plane=new Plane({ground}),walker=new Pedestrian({ground,blocked:(a,b)=>b.x>40&&a.x<=40});
  const sim=new SimSnapshot([plane,walker]);
  const empty=sim.save();assert.ok(Number.isNaN(empty[1]),'no plane yet: fields NaN');
  plane.launch({x:0,z:0,heading:.3,height:40});walker.place({x:5,z:5});
  const r=rng(9),cmd=Array.from({length:1200},()=>({pitch:r()*2-1.1,roll:r()*2-1,yaw:r()-.5,throttle:r()*2-1,forward:1,strafe:r()-.5,turn:r()*.4-.2,run:r()>.5,jump:r()>.97}));
  const tick=i=>{plane.step(DT,cmd[i]);if(plane.state.crashed){plane.crashes++;plane.launch({x:0,z:0,heading:.3,height:40});}walker.step(DT,cmd[i]);};
  for(let i=0;i<300;i++)tick(i);
  const at=sim.save();for(let i=300;i<1200;i++)tick(i);const first=sim.save();
  sim.restore(at);for(let i=300;i<1200;i++)tick(i);
  assert.ok(sameBits(sim.save(),first),'plane + pedestrian replay bit-identical');
  sim.restore(empty);assert.equal(plane.state,null,'restoring "not launched" removes the plane state');
}
{ // InputRouter: two keys for the same action (W and ↑) — releasing one keeps the action held.
  const listeners=new Map(),win={addEventListener:(t,f)=>listeners.set(t,f),removeEventListener:t=>listeners.delete(t)};
  const doc={hidden:false,addEventListener(){},removeEventListener(){},querySelector:()=>null};
  const input=new InputRouter({window:win,document:doc});input.activate();
  const ev=code=>({code,key:code,preventDefault(){},target:null});
  listeners.get('keydown')(ev('KeyW'));listeners.get('keydown')(ev('ArrowUp'));listeners.get('keydown')(ev('KeyW'));
  listeners.get('keyup')(ev('KeyW'));assert.ok(input.isDown('forward'),'↑ still held');
  listeners.get('keyup')(ev('ArrowUp'));assert.ok(!input.isDown('forward'));
  listeners.get('keyup')(ev('ArrowUp'));assert.ok(!input.isDown('forward'),'extra keyup does not go negative');
  listeners.get('keydown')(ev('KeyA'));input.clear();assert.ok(!input.isDown('left'));
  listeners.get('keydown')(ev('KeyA'));assert.ok(input.isDown('left'),'works again after clear');
}
console.log('PASS: flat state round trip, rollback + replay bit-identical (kart, race, plane, pedestrian), allocation-free projection equal to the reference, input action counter.');
