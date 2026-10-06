// On foot: walking speed and direction, running, turning, following slopes, cliffs, walls with sliding, jumping, falling.
import assert from 'node:assert/strict';
import {Pedestrian,FOOT} from '../dist/kart/pedestrian.js';

const DT=1/120;
const go=(walker,seconds,input={})=>{for(let i=0;i<seconds/DT;i++)walker.step(DT,input);return walker.state;};
const near=(a,b,tol,label)=>assert.ok(Math.abs(a-b)<=tol,`${label}: ${a.toFixed(3)} ≈ ${b}`);

{ // Walking forward at heading 0 goes north (−Z) at walking speed; Shift runs.
  const w=new Pedestrian({ground:()=>0});w.place({x:0,z:0,heading:0});
  const s=go(w,2,{forward:1});
  near(s.z,-2*FOOT.walk,.05,'walk distance');near(s.x,0,1e-9,'no drift');
  w.place({x:0,z:0,heading:Math.PI/2});go(w,2,{forward:1,run:true});
  near(w.state.x,2*FOOT.run,.05,'run east');
}
{ // Diagonal input is not faster than straight; strafing moves sideways; turning changes heading.
  const w=new Pedestrian({ground:()=>0});w.place({x:0,z:0});
  go(w,1,{forward:1,strafe:1});
  near(Math.hypot(w.state.x,w.state.z),FOOT.walk,.03,'diagonal speed');
  w.place({x:0,z:0});go(w,1,{strafe:1});near(w.state.x,FOOT.walk,.03,'strafe right');
  w.place({x:0,z:0});go(w,1,{turn:1});near(w.state.heading,FOOT.turnRate,.02,'turn rate');
}
{ // A walkable slope is followed: feet stay on the ground while climbing.
  const slope=(x,z)=>-z*.25;   // 25 % uphill towards north
  const w=new Pedestrian({ground:slope});w.place({x:0,z:0});
  const s=go(w,3,{forward:1});
  near(s.y,slope(s.x,s.z),1e-9,'on the slope');assert.ok(s.y>1,'climbed');
}
{ // A cliff steeper than walkable blocks; the walker stays at its foot.
  const cliff=(x,z)=>z< -5?(-5-z)*3:0;   // 300 % wall of rock beyond z = −5
  const w=new Pedestrian({ground:cliff});w.place({x:0,z:0});
  const s=go(w,6,{forward:1,run:true});
  assert.ok(s.z>-5.6&&s.y<1,`stopped at the cliff (z ${s.z.toFixed(2)}, y ${s.y.toFixed(2)})`);
}
{ // A wall blocks the direct way; moving diagonally into it slides along it.
  const wall=(a,b)=>a.z>-3&&b.z<=-3;   // wall along z = −3
  const w=new Pedestrian({ground:()=>0,blocked:wall});w.place({x:0,z:0});
  go(w,4,{forward:1});
  assert.ok(w.state.z>-3,'stopped at the wall');near(w.state.x,0,1e-9,'no sideways drift');
  go(w,2,{forward:1,strafe:1});
  assert.ok(w.state.z>-3&&w.state.x>1,`slid along the wall (x ${w.state.x.toFixed(2)})`);
}
{ // Jumping lifts the feet and lands again; walking off a high edge falls down.
  const w=new Pedestrian({ground:()=>0});w.place({x:0,z:0});
  w.step(DT,{jump:true});let peak=0;
  for(let i=0;i<120;i++){w.step(DT);peak=Math.max(peak,w.state.y);}
  near(peak,FOOT.jump**2/(2*FOOT.gravity),.06,'jump height');assert.ok(w.state.onGround&&w.state.y===0,'landed');
  const terrace=(x,z)=>z<-2?-4:0;   // 4 m drop beyond z = −2
  const down=new Pedestrian({ground:terrace});down.place({x:0,z:0});go(down,3,{forward:1});
  assert.ok(down.state.onGround&&down.state.y===-4,'fell down the terrace and stands below');
}
{ // Look clamps the pitch; the eye is above the feet.
  const w=new Pedestrian({ground:()=>10});w.place({x:0,z:0});
  w.look(0,5);near(w.state.pitch,FOOT.maxPitch,1e-9,'pitch clamp');
  near(w.eye().y,10+FOOT.eye,1e-9,'eye height');
}
console.log('pedestrian ok');
