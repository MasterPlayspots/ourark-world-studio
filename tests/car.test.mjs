// Globe car: acceleration, top speed, braking to a stop, reverse, steering circle, slopes, steep rock, crest airtime.
import assert from 'node:assert/strict';
import {Car,CAR} from '../dist/globe/car.js';

const DT=1/120;
const drive=(car,seconds,input={})=>{for(let i=0;i<seconds/DT;i++)car.step(DT,typeof input==='function'?input(car.state):input);return car.state;};

{ // Full throttle on flat ground: north (−Z), near top speed after a while, never above it.
  const car=new Car({ground:()=>0});car.place({x:0,z:0,heading:0});
  drive(car,3,{throttle:1});assert.ok(car.state.speed>15&&car.state.speed<25,`3 s: ${car.state.speed.toFixed(1)} m/s`);
  drive(car,40,{throttle:1});assert.ok(car.state.speed<=CAR.maxSpeed&&car.state.speed>40,`top speed ${car.state.speed.toFixed(1)}`);
  assert.ok(car.state.z< -1000&&Math.abs(car.state.x)<1e-6,'drove north');
}
{ // Braking stops the car without rolling backwards; holding brake then reverses slowly.
  const car=new Car({ground:()=>0});car.place({x:0,z:0});drive(car,5,{throttle:1});
  drive(car,2.3,{throttle:-1});assert.equal(car.state.speed,0,'stopped, not rolling back');
  const z=car.state.z;drive(car,0.2,{});assert.equal(car.state.z,z,'stays put without input');
  drive(car,3,{throttle:-1});assert.ok(car.state.speed<0&&car.state.speed>=-CAR.maxReverse,'reverses');
}
{ // Steering at low speed drives a circle and comes back near the start.
  const car=new Car({ground:()=>0});car.place({x:0,z:0});
  drive(car,2,{throttle:.4});const v=car.state.speed;
  let turned=0,last=car.state.heading;const start={x:car.state.x,z:car.state.z};
  for(let i=0;i<60/DT&&turned<Math.PI*2;i++){car.step(DT,{throttle:v<car.state.speed?0:.2,steer:1});let d=car.state.heading-last;if(d<-Math.PI)d+=2*Math.PI;turned+=d;last=car.state.heading;}
  assert.ok(turned>=Math.PI*2,'full circle');
  assert.ok(Math.hypot(car.state.x-start.x,car.state.z-start.z)<6,'back near the start');
}
{ // Uphill the car slows and pitches nose up, follows the ground exactly.
  const hill=(x,z)=>-z*.15;   // 15 % up towards north
  const car=new Car({ground:hill});car.place({x:0,z:0});
  drive(car,6,{throttle:1});
  assert.ok(car.state.pitch>.13&&car.state.pitch<.16,`pitch ${car.state.pitch.toFixed(3)}`);
  assert.equal(car.state.y,hill(car.state.x,car.state.z));
  const flat=new Car({ground:()=>0});flat.place({x:0,z:0});drive(flat,6,{throttle:1});
  assert.ok(car.state.speed<flat.state.speed,'slower uphill');
}
{ // A rock face steeper than 35° stops the car at its foot.
  const rock=(x,z)=>z< -50?(-50-z)*2:0;
  const car=new Car({ground:rock});car.place({x:0,z:0});
  drive(car,8,{throttle:1});
  assert.ok(car.state.z>-52&&car.state.y<4,`stopped at the rock (z ${car.state.z.toFixed(1)})`);
}
{ // Fast over a sharp crest (ramp up, then a drop): airborne for a moment, lands again on the ground.
  const crest=(x,z)=>{const d=-z;return d<100?d*.2:Math.max(0,20-(d-100)*1.5);};
  const car=new Car({ground:crest});car.place({x:0,z:0});
  let air=0;
  drive(car,12,s=>{if(!s.onGround)air++;return {throttle:1};});
  assert.ok(air>0,'took off at the crest');assert.ok(car.state.onGround,'landed');
}
console.log('PASS: car acceleration, top speed, braking, reverse, steering circle, slopes, steep rock, crest airtime.');
