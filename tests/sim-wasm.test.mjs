// WASM simulation core (sim/ → dist/runtime/sim/sim.wasm): same results as the tested JS simulations (car, on foot,
// aeroplane) on synthetic flat ground and a slope; records follow sim state layout v1.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadSim} from '../dist/runtime/sim/wasm.js';
import {decodeHeightFile} from '../dist/runtime/assets/codec.js';
import {OFFSET,MODE} from '../dist/runtime/sim/layout.js';
import {Car} from '../dist/globe/car.js';
import {Pedestrian} from '../dist/kart/pedestrian.js';
import {Plane} from '../dist/kart/plane.js';

const sim=await loadSim(readFileSync(new URL('../dist/runtime/sim/sim.wasm',import.meta.url)));
const DT=1/120;
const near=(a,b,tol,label)=>assert.ok(Math.abs(a-b)<=tol,`${label}: wasm ${a.toFixed(3)} vs js ${b.toFixed(3)}`);
const sampler=(heights,w,d,cell=1,scale=.01)=>(x,z)=>{
  const gx=Math.min(w-1.001,Math.max(0,x/cell+w/2)),gz=Math.min(d-1.001,Math.max(0,z/cell+d/2));
  const i=Math.floor(gx),j=Math.floor(gz),u=gx-i,v=gz-j,h=(a,b)=>heights[b*w+a]*scale;
  return (h(i,j)*(1-u)+h(i+1,j)*u)*(1-v)+(h(i,j+1)*(1-u)+h(i+1,j+1)*u)*v;
};
function terrain(kind){
  const w=400,d=400,h=new Uint16Array(w*d);
  if(kind==='slope')for(let j=0;j<d;j++)for(let i=0;i<w;i++)h[j*w+i]=Math.round((d-j)*15);// 15 % up towards north
  return {h,w,d};
}

{ // Layout v1 in linear memory: id/flags/pos/heading where contracts/sim-state-v1.md says.
  sim.setTerrain(new Uint16Array(4).fill(0),2,2);
  sim.spawn(3,{id:77,mode:'car',x:1.5,z:-2,heading:.75});
  const bytes=sim.entityBytes(4),v=new DataView(bytes.buffer,bytes.byteOffset+3*64,64);
  assert.equal(v.getUint32(OFFSET.id,true),77);assert.equal(v.getUint32(OFFSET.flags,true)&0xf,MODE.car);
  near(v.getFloat32(OFFSET.pos,true),1.5,1e-6,'pos.x');near(v.getFloat32(OFFSET.pos+8,true),-2,1e-6,'pos.z');
  near(v.getFloat32(OFFSET.heading,true),.75,1e-6,'heading');
  assert.equal(bytes.buffer,sim.memory.buffer,'a view on WASM memory, not a copy');
}
{ // A rejected update preserves both terrain bytes and sampling metadata, including truncated input.
  sim.setTerrain(new Uint16Array(4).fill(100),2,2);
  const values=()=>Array.from(new Uint16Array(sim.memory.buffer,sim.heightPtr,4));
  const invalid=[
    [new Uint16Array(4).fill(200),1,4],
    [new Uint16Array(4).fill(200),2.5,2],
    [new Uint16Array(4).fill(200),NaN,2],
    [new Uint16Array(4).fill(200),1001,1000],
    [new Uint16Array(3).fill(200),2,2],
    [new Uint16Array(5).fill(200),2,2],
    [[200,200,200,200],2,2]
  ];
  for(const cell of [0,-1,NaN,Infinity,1e40,1e-50])invalid.push([new Uint16Array(4).fill(200),2,2,cell]);
  for(const scale of [-1,NaN,Infinity,1e40])invalid.push([new Uint16Array(4).fill(200),2,2,1,scale]);
  for(const args of invalid){
    assert.throws(()=>sim.setTerrain(...args));
    assert.deepEqual(values(),[100,100,100,100],'rejection preserves the active grid');
    near(sim.ground(-1,-1),1,1e-6,'rejection preserves terrain sampling');
  }
  sim.setTerrain(new Uint16Array(4).fill(200),2,2,2,.02);
  near(sim.ground(-2,-2),4,1e-6,'valid replacement updates samples and scale');
}
for(const kind of ['flat','slope']){
  const {h,w,d}=terrain(kind);sim.setTerrain(h,w,d);const ground=sampler(h,w,d);
  // Car: full throttle with a right bend, then brake.
  const js=new Car({ground});js.place({x:0,z:0,heading:.3});sim.spawn(0,{mode:'car',x:0,z:0,heading:.3});
  const carIn=t=>t<4?{throttle:1,steer:.25}:{throttle:-1,steer:0};
  for(let i=0;i<6/DT;i++){const input=carIn(i*DT);js.step(DT,input);sim.setInput(0,input);sim.step(DT,1,1);}
  const c=sim.read(0);
  near(c.x,js.state.x,.25,`${kind} car x`);near(c.z,js.state.z,.25,`${kind} car z`);near(c.y,js.state.y,.15,`${kind} car y`);near(c.speed,js.state.speed,.1,`${kind} car speed`);
  // On foot: run forward while turning.
  const pj=new Pedestrian({ground});pj.place({x:5,z:5,heading:1});sim.spawn(1,{mode:'walk',x:5,z:5,heading:1});
  for(let i=0;i<5/DT;i++){const input={forward:1,turn:.2,run:true};pj.step(DT,input);sim.setInput(1,input);sim.step(DT,1,2);}
  const p=sim.read(1);near(p.x,pj.state.x,.05,`${kind} walk x`);near(p.z,pj.state.z,.05,`${kind} walk z`);near(p.y,pj.state.y,.05,`${kind} walk y`);
  // Aeroplane: banked climbing turn.
  const aj=new Plane({ground});aj.launch({x:0,z:0,heading:0,height:120});sim.spawn(2,{mode:'plane',x:0,z:0,heading:0,height:120});
  for(let i=0;i<8/DT;i++){const input={pitch:.3,roll:.5,yaw:0,throttle:1};aj.step(DT,input);sim.setInput(2,input);sim.step(DT,1,3);}
  const a=sim.read(2);near(a.x,aj.state.x,.6,`${kind} plane x`);near(a.y,aj.state.y,.4,`${kind} plane y`);near(a.z,aj.state.z,.6,`${kind} plane z`);
  assert.equal(a.crashed,!!aj.state.crashed,`${kind} plane crash state`);
}
{ // Ground in WASM equals the JS sampler on a synthetic slope; velocity is written back per step.
  const {h,w,d}=terrain('slope');sim.setTerrain(h,w,d);const ground=sampler(h,w,d);
  for(const [x,z] of [[0,0],[123.4,-321.9],[-480,470],[2000,0]])near(sim.ground(x,z),ground(x,z),.01,`ground ${x},${z}`);
  sim.spawn(0,{mode:'car',x:0,z:0,heading:0});sim.setInput(0,{throttle:1});sim.step(DT,240,1);
  const e=sim.read(0);assert.ok(Math.hypot(e.vel[0],e.vel[2])>8,'velocity in the record');assert.ok(e.tick>0);
}
{ // Throughput: 256 entities × 120 steps in one call (no allocation in the loop).
  const {h,w,d}=terrain('slope');sim.setTerrain(h,w,d);
  for(let s=0;s<256;s++){sim.spawn(s,{mode:['car','walk','plane'][s%3],x:(s%16)*20-160,z:Math.floor(s/16)*20-160,heading:s});sim.setInput(s,{throttle:1,forward:1,pitch:.1});}
  const t0=performance.now();sim.step(DT,120,256);const ms=performance.now()-t0;
  console.log(`  256 Entities × 1 s Simulation (120 Takte): ${ms.toFixed(1)} ms`);
  assert.ok(ms<500);
}
{ // Review fix: grid sizes whose product overflows 32-bit usize are refused by the core itself (checked_mul).
  const raw=sim.exports.sim_set_terrain;
  assert.equal(raw(65536,65536,1,.01),0,'65536² wraps to 0 in u32 — must still be refused');
  assert.equal(raw(1,5,1,.01),0);assert.equal(raw(1000,1000,1,.01),1);
}
{ // Rust independently rejects invalid physical terrain scales without changing the active sampler.
  sim.setTerrain(new Uint16Array(4).fill(100),2,2);
  for(const [cell,scale] of [[0,.01],[-1,.01],[NaN,.01],[Infinity,.01],[1,-1],[1,NaN],[1,Infinity]]){
    assert.equal(sim.exports.sim_set_terrain(2,2,cell,scale),0);
    near(sim.ground(-1,-1),1,1e-6,'raw rejection preserves terrain');
  }
}
{ // The f32 car uses the travel direction for both descending and approaching a cliff in reverse.
  const w=200,d=200;
  const down=Uint16Array.from({length:w*d},(_,i)=>(200-Math.floor(i/w))*100);
  sim.setTerrain(down,w,d);sim.spawn(0,{mode:'car',x:0,z:0,heading:0});sim.setInput(0,{throttle:-1});sim.step(DT,120,1);
  const desc=sim.read(0);assert.ok(desc.z>.3&&desc.speed<-.1,'WASM reverse descends steep ground');
  const up=Uint16Array.from({length:w*d},(_,i)=>Math.max(0,Math.floor(i/w)-d/2-20)*200);
  sim.setTerrain(up,w,d);sim.spawn(0,{mode:'car',x:0,z:0,heading:0});sim.setInput(0,{throttle:-1});
  let furthest=0;for(let i=0;i<1200;i++){sim.step(DT,1,1);furthest=Math.max(furthest,sim.read(0).z);}
  assert.ok(furthest<20&&sim.read(0).y===0,`WASM reverse stops before the cliff (z ${furthest})`);
}
{ // Grounded plane contact cannot bypass crash checks at an abrupt terrain rise.
  const w=200,d=200,h=Uint16Array.from({length:w*d},(_,i)=>Math.floor(i/w)-d/2<-2?10000:0);
  sim.setTerrain(h,w,d);sim.spawn(0,{mode:'plane',x:0,z:0,height:1.1});
  sim.step(DT,1,1);assert.ok(sim.read(0).onGround,'WASM plane is taxiing before the cliff');
  sim.step(DT,29,1);assert.ok(sim.read(0).crashed,'WASM taxi crashes into the terrain rise');
  const at=sim.read(0);sim.step(DT,120,1);assert.equal(sim.read(0).z,at.z,'crashed WASM plane stays put');
}
console.log('PASS: WASM sim core — layout v1 in linear memory, parity with JS car/walk/plane on synthetic flat and slope, ground, velocity, throughput.');
