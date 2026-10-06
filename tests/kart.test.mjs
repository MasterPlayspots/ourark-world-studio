// Kart mode: track geometry, the arcade kart (drive, steer, barrier, slopes, ramp flight) and lap timing.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeHeightFile,decodeBinaryFile} from '../dist/runtime/assets/codec.js';
import {Track,sampleClosedSpline,smoothClosed,featureHeight} from '../dist/kart/track.js';
import {Kart,Race,KART} from '../dist/kart/kart.js';

const DT=1/60;
const circle=(r,n=16)=>Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2;return [Math.sin(a)*r,-Math.cos(a)*r];});
// Simple autopilot: steer towards a point a few metres ahead on the centre line.
function drive(kart,track,seconds,throttle=1,onStep=()=>{}){
  for(let i=0;i<seconds/DT;i++){
    const st=kart.state,target=track.sampleAt(st.s+8);
    const want=Math.atan2(target.x-st.x,-(target.z-st.z));
    let diff=want-st.heading;diff=Math.atan2(Math.sin(diff),Math.cos(diff));
    kart.step(DT,{throttle,steer:Math.max(-1,Math.min(1,diff*3))});onStep(kart.state);
  }
}

{ // Spline sampling: a circle of radius 50 has circumference ≈ 314 m, samples ~1 m apart.
  const {samples,length}=sampleClosedSpline(circle(50));
  assert.ok(Math.abs(length-2*Math.PI*50)<3,`length ${length}`);
  assert.ok(samples.every(p=>Math.abs(Math.hypot(p.x,p.z)-50)<.6),'samples stay on the circle');
  assert.deepEqual(smoothClosed([0,0,9,0,0],3),[0,3,3,3,0]);
}
{ // Projection: signed lateral offset (positive = right of driving direction) and arc length.
  const track=new Track({points:circle(50),width:10});
  const s0=track.samples[0];
  assert.ok(Math.abs(s0.x)<.5&&Math.abs(s0.z+50)<.5,'start at north');
  assert.ok(s0.tx>.99,'drives east (clockwise) at the start');
  const right=track.project(0,-48);assert.ok(Math.abs(right.d-2)<.1,`inside of a clockwise loop is right: ${right.d}`);
  const left=track.project(0,-53);assert.ok(Math.abs(left.d+3)<.1);
  const quarter=track.project(50,0);assert.ok(Math.abs(quarter.s-track.length/4)<2,'quarter of the way at east');
}
{ // Ramps: a kicker rises to its height at the lip, a hill returns to zero, both wrap past the start line.
  const kicker={type:'kicker',s:10,length:8,height:1.2};
  assert.equal(featureHeight(kicker,9,100),0);assert.ok(Math.abs(featureHeight(kicker,18,100)-1.2)<1e-9);assert.equal(featureHeight(kicker,18.1,100),0);
  const hill={type:'hill',s:95,length:10,height:2};
  assert.ok(Math.abs(featureHeight(hill,0,100)-2)<1e-9,'hill wrapping past s=0 peaks at its middle');
}
{ // Driving: accelerates towards top speed, never leaves the barriers, completes laps in order.
  const track=new Track({points:circle(60),width:10,shoulder:3});
  const kart=new Kart({track}),race=new Race({length:track.length,laps:2});
  let maxD=0,maxV=0;
  drive(kart,track,90,1,st=>{maxD=Math.max(maxD,Math.abs(track.project(st.x,st.z,st.hint).d));maxV=Math.max(maxV,st.speed);race.update(DT,st.s,true);});
  assert.ok(maxV>14&&maxV<=KART.maxSpeed+1e-6,`top speed ${maxV}`);
  assert.ok(maxD<=track.limit,`stays inside the barriers (${maxD})`);
  assert.ok(race.finished,'two laps finished');assert.equal(race.lapTimes.length,2);
  assert.ok(race.lapTimes[1]<race.lapTimes[0],'flying lap is faster than the standing start');
}
{ // Barrier: steering hard into the wall stops at the limit and costs speed.
  const track=new Track({points:circle(60),width:10,shoulder:3});
  const kart=new Kart({track});let hit=false;
  for(let i=0;i<300;i++){kart.step(DT,{throttle:1,steer:-.15});hit||=kart.state.hit;}
  assert.ok(hit,'touched the barrier');
  assert.ok(Math.abs(track.project(kart.state.x,kart.state.z).d)<=track.limit+1e-6);
}
{ // Brake and reverse.
  const track=new Track({points:circle(60),width:10});const kart=new Kart({track});
  drive(kart,track,3,1);const v=kart.state.speed;
  drive(kart,track,.5,-1);assert.ok(kart.state.speed<v-8,'brakes hard');
  drive(kart,track,4,-1);assert.ok(kart.state.speed<0&&kart.state.speed>=-KART.reverse,'reverses slowly');
}
{ // Slopes: uphill costs speed, the road height follows the terrain profile.
  const hillTrack=new Track({points:circle(60),width:10,groundAt:(x,z)=>x*.15,smoothing:5});
  const flat=new Track({points:circle(60),width:10});
  const a=new Kart({track:hillTrack}),b=new Kart({track:flat});
  // From north going east = uphill on the slope.
  for(let i=0;i<120;i++){a.step(DT,{throttle:1});b.step(DT,{throttle:1});}
  assert.ok(a.state.speed<b.state.speed-.5,`uphill slower (${a.state.speed} vs ${b.state.speed})`);
  assert.ok(Math.abs(a.state.y-hillTrack.heightAt(a.state.s))<.05,'sits on the road');
}
{ // Kicker: at speed the kart leaves the ground after the lip and lands again further on.
  const track=new Track({points:circle(80),width:10,features:[{type:'kicker',s:120,length:8,height:1.4}]});
  const kart=new Kart({track});let maxAir=0,peak=-Infinity,landedAfter=false;
  drive(kart,track,20,1,st=>{maxAir=Math.max(maxAir,st.airTime);if(!st.grounded)peak=Math.max(peak,st.y-track.heightAt(st.s));if(maxAir>0&&st.grounded&&st.s>130)landedAfter=true;});
  assert.ok(maxAir>.25,`airborne for ${maxAir.toFixed(2)} s`);
  assert.ok(peak>.3,`clears the road by ${peak.toFixed(2)} m`);
  assert.ok(landedAfter,'lands again');
}
{ // Lap timing ignores skipped sectors (no shortcut across the start).
  const race=new Race({length:100,sectors:4,laps:3});
  race.update(1,10);race.update(1,90);race.update(1,5);
  assert.equal(race.lapTimes.length,0,'jumping from sector 0 to 3 and back is not a lap');
  for(const s of [30,55,80,2])race.update(1,s);
  assert.equal(race.lapTimes.length,1);assert.equal(race.lap,2);
}

console.log("PASS: synthetic kart track, driving, barriers, braking, slopes, ramp flight and lap timing. External-map race regression is excluded; see PUBLIC_SOURCE.json.");
