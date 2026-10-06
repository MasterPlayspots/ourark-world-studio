// Aeroplane: cruise, climb/dive trading speed, banked turns, stall, landing, take-off and crash.
import assert from 'node:assert/strict';
import {Plane,PLANE} from '../dist/kart/plane.js';

const DT=1/120,flat=()=>0;
const fly=(plane,seconds,input={})=>{for(let i=0;i<seconds/DT;i++)plane.step(DT,typeof input==='function'?input(plane.state):input);return plane.state;};

{ // Level cruise holds height and speed and flies north at heading 0.
  const plane=new Plane({ground:flat});plane.launch({x:0,z:0,heading:0,height:100});
  const s=fly(plane,10);
  assert.ok(Math.abs(s.y-101.1-0)<15,`height stays (${s.y.toFixed(1)})`);
  assert.ok(s.z< -300&&Math.abs(s.x)<1,'flies north (−Z)');
  assert.ok(Math.abs(s.speed-(PLANE.maxSpeed*.18+PLANE.defaultThrottle*PLANE.maxSpeed*.82))<3,`settles at throttle speed (${s.speed.toFixed(1)})`);
}
{ // Climbing costs speed, diving gains it.
  const a=new Plane({ground:flat});a.launch({x:0,z:0,height:200});const climb=fly(a,3,{pitch:1});
  const b=new Plane({ground:flat});b.launch({x:0,z:0,height:200});const dive=fly(b,3,{pitch:-1});
  assert.ok(climb.y>200&&climb.speed<PLANE.cruise,'climb: higher and slower');
  assert.ok(dive.y<200&&dive.speed>PLANE.cruise,'dive: lower and faster');
}
{ // Banking right turns right (heading increases), banking left turns left.
  const r=new Plane({ground:flat});r.launch({x:0,z:0,height:300});fly(r,4,{roll:1});
  const l=new Plane({ground:flat});l.launch({x:0,z:0,height:300});fly(l,4,{roll:-1});
  assert.ok(r.state.heading>.5&&l.state.heading<-.5,`turns (${r.state.heading.toFixed(2)}, ${l.state.heading.toFixed(2)})`);
  assert.ok(Math.abs(r.state.roll)<=PLANE.maxBank+1e-9);
}
{ // Throttle back and pull up: the plane stalls and the nose drops.
  const plane=new Plane({ground:flat});plane.launch({x:0,z:0,height:600});
  let stalled=false;fly(plane,25,s=>{stalled||=s.stalled;return {throttle:-1,pitch:1};});
  assert.ok(stalled,'stalled at low speed');
  assert.ok(plane.state.pitch<.6,'nose dropped');
}
{ // Gentle descent lands; on the ground it rolls out, then takes off again with power and nose up.
  const plane=new Plane({ground:flat});plane.launch({x:0,z:0,height:30});
  let landed=false;fly(plane,40,s=>{landed||=s.onGround;return {pitch:s.onGround?0:(s.pitch>-.05?-.3:.4),throttle:s.onGround?-1:0};});
  assert.ok(landed&&!plane.state.crashed,'landed without crashing');
  fly(plane,15,{throttle:-1});assert.ok(plane.state.onGround&&plane.state.speed<8,`rolled out (${plane.state.speed.toFixed(1)})`);
  fly(plane,20,s=>({throttle:1,pitch:s.onGround?1:.3}));
  assert.ok(!plane.state.onGround&&plane.height()>10,`took off again (${plane.height().toFixed(1)} m)`);
}
{ // Diving into the ground is a crash; a crashed plane stays put.
  const plane=new Plane({ground:flat});plane.launch({x:0,z:0,height:60});
  fly(plane,10,{pitch:-1});assert.ok(plane.state.crashed,'crashed');assert.equal(plane.crashes,1);
  const at={...plane.state};fly(plane,1);assert.equal(plane.state.x,at.x);
}
{ // Terrain: flying into a hill is a crash.
  const hill=(x,z)=>z< -200?120:0;
  const plane=new Plane({ground:hill});plane.launch({x:0,z:0,height:50});
  fly(plane,15);assert.ok(plane.state.crashed,'hit the hill');
}
{ // Ground contact still rejects abrupt terrain rises while taxiing, but follows a gradual slope.
  const taxi=new Plane({ground:(x,z)=>z<-2?100:0});taxi.launch({x:0,z:0,height:PLANE.wheelHeight});
  taxi.step(DT);assert.ok(taxi.state.onGround,'starts taxiing before reaching the cliff');
  fly(taxi,.1);assert.ok(taxi.state.crashed,'taxiing into a cliff crashes instead of climbing it');
  assert.equal(taxi.crashes,1);const stopped={...taxi.state};fly(taxi,1);
  assert.equal(taxi.state.z,stopped.z);assert.equal(taxi.crashes,1,'crash counted once');
  const slope=new Plane({ground:(x,z)=>-z*.1});slope.launch({x:0,z:0,height:PLANE.wheelHeight});
  fly(slope,1);assert.ok(slope.state.onGround&&!slope.state.crashed&&slope.state.y>PLANE.wheelHeight,'taxi follows gradual rising ground');
}

console.log('PASS: plane cruise, climb/dive energy, banked turns, stall, landing, roll-out, take-off and crashes.');
