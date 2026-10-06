// Welle 3: walking, turning, looking, reset and choosing what to inspect, on top of the Welle-2 physics.
import assert from 'node:assert/strict';
import {newPoint} from '../dist/map-studio/model.js';
import {prepareWalk} from '../dist/runtime/map-adapter.js';
import {PLAYER} from '../dist/runtime/physics/adapter.js';
import {Walker,interactionTarget,TURN_SPEED,LOOK_DEGREES_PER_PIXEL,PITCH_LIMIT,INTERACT_DISTANCE} from '../dist/runtime/walker.js';

const near=(a,b,eps=1e-6)=>Math.abs(a-b)<=eps;
const point=(over={})=>({...newPoint(1),id:'p',x:0,z:0,width:10,depth:6,height:5,rotation:0,solid:true,interactive:true,visible:true,...over});
const snapshot=(points=[],spawn={x:0,z:0,heading:0})=>({map:{width:100,depth:100},runtime:{spawn},points});
const walkerFor=snap=>{const walk=prepareWalk(snap);return new Walker({physics:walk.world,start:walk.start});};
const run=(walker,seconds,intent)=>{for(let i=0;i<Math.round(seconds*60);i++)walker.step(1/60,{x:0,z:0,turn:0,...intent});};

// 1. Forward is north (−Z) at heading 0 and east (+X) at 90°; strafing right at 0° is +X; speed is 3 m/s.
{
  let w=walkerFor(snapshot());run(w,1,{z:1});assert.ok(near(w.pose.x,0)&&near(w.pose.z,-PLAYER.walkSpeed),JSON.stringify(w.pose));
  w=walkerFor(snapshot([],{x:0,z:0,heading:90}));run(w,1,{z:1});assert.ok(near(w.pose.x,3)&&near(w.pose.z,0),JSON.stringify(w.pose));
  w=walkerFor(snapshot());run(w,1,{x:1});assert.ok(near(w.pose.x,3)&&near(w.pose.z,0),'strafe right');
  w=walkerFor(snapshot());run(w,1,{x:1,z:1});assert.ok(near(Math.hypot(w.pose.x,w.pose.z),3),'diagonals are not faster');
}

// 2. Turning with Q/E and looking with the pointer; heading wraps, pitch is limited.
{
  const w=walkerFor(snapshot());run(w,1,{turn:1});assert.ok(near(w.pose.heading,TURN_SPEED));
  run(w,2,{turn:1});assert.ok(w.pose.heading>-180&&w.pose.heading<=180,`wrapped: ${w.pose.heading}`);
  const before=w.pose.heading;w.look(40,0);assert.ok(near(w.pose.heading,((before+40*LOOK_DEGREES_PER_PIXEL+540)%360)-180));
  w.look(0,-10000);assert.equal(w.pose.pitch,PITCH_LIMIT);w.look(0,10000);assert.equal(w.pose.pitch,-PITCH_LIMIT);
}

// 3. Walls stop the walker and it slides along them; it never stands inside an obstacle.
{
  const walk=prepareWalk(snapshot([point({id:'hall',width:10,depth:40,x:5})],{x:-5,z:0,heading:90}));
  const w=new Walker({physics:walk.world,start:walk.start});
  run(w,3,{z:1});assert.ok(near(w.pose.x,-PLAYER.radius,1e-3),`stopped at the wall: ${w.pose.x}`);assert.ok(w.contacts.includes('hall'));
  run(w,1,{z:1,x:1});assert.ok(w.pose.z>1,'slides south along the wall');assert.equal(walk.world.overlaps(w.pose),null);
}

// 4. Reset returns to the checked start; interpolation between steps is smooth, also across ±180°.
{
  const w=walkerFor(snapshot([],{x:2,z:3,heading:45}));run(w,1,{z:1,turn:1});w.look(0,-50);
  w.reset();assert.deepEqual(w.pose,{x:2,z:3,heading:45,pitch:0});
  w.previous={...w.pose,x:0,heading:170};w.pose={...w.pose,x:1,heading:-170};
  const mid=w.interpolated(.5);assert.ok(near(mid.x,.5));assert.ok(near(Math.abs(mid.heading),180),`shortest way: ${mid.heading}`);
}

// 5. A physics reset (NaN guard) also resets the view.
{
  const w=walkerFor(snapshot([],{x:1,z:1,heading:30}));w.pose={...w.pose,x:NaN};w.step(1/60,{x:0,z:1,turn:0});
  assert.deepEqual(w.pose,{x:1,z:1,heading:30,pitch:0});
}

// 6. Interaction: the nearest interactive, visible point within reach and in front of the player.
{
  const points=[point({id:'front',name:'Vorne',x:0,z:-3,width:2,depth:2}),point({id:'back',name:'Hinten',x:0,z:3,width:2,depth:2}),point({id:'far',name:'Weit',x:8,z:-20,width:2,depth:2}),point({id:'mute',name:'Stumm',x:-3,z:-3,width:1,depth:1,interactive:false}),point({id:'hidden',name:'Versteckt',x:2,z:-2.5,width:1,depth:1,visible:false})];
  const pose={x:0,z:0,heading:0,pitch:0};
  assert.equal(interactionTarget(points,pose)?.id,'front','2 m to its face is within reach (distance to the footprint, not the centre)');
  assert.equal(interactionTarget(points,{...pose,heading:180})?.id,'back');
  assert.equal(interactionTarget(points,{...pose,heading:90}),null,'nothing east within reach');
  assert.equal(interactionTarget([points[2]],{...pose,heading:0}),null,`beyond ${INTERACT_DISTANCE} m`);
  assert.equal(interactionTarget([points[3],points[4]],pose),null,'not interactive or hidden');
}

// 7. Standing inside a walkable (non-solid) area: it is the target whichever way the player looks; a degenerate
//    footprint (NaN distance) never becomes a target.
{
  const zone=point({id:'zone',name:'Zone',type:'marker',solid:false,width:10,depth:10});
  for(const heading of [0,90,180,-90])assert.equal(interactionTarget([zone],{x:3,z:0,heading,pitch:0})?.id,'zone',`heading ${heading}`);
  assert.equal(interactionTarget([point({id:'flat',width:0,depth:0,x:0,z:-1})],{x:0,z:0,heading:0,pitch:0}),null);
}

// 8. Scaled worlds (1 unit = 5 m): speed and reach are options; any item with a footprint can be a target.
{
  const walk=prepareWalk({map:{width:100,depth:100},runtime:{spawn:{x:0,z:0,heading:0}},points:[]});
  const w=new Walker({physics:walk.world,start:walk.start,speed:.6});run(w,1,{z:1});assert.ok(near(w.pose.z,-.6),`0.6 units/s: ${w.pose.z}`);
  const items=[{id:'lodge',name:'Lodge',vertices:[[-1,-2],[1,-2],[1,-1],[-1,-1]]},{id:'far',name:'Far',vertices:[[-1,-9],[1,-9],[1,-8],[-1,-8]]}];
  const opts={distance:.5,footprint:item=>item.vertices,eligible:()=>true};
  assert.equal(interactionTarget(items,{x:0,z:-.6,heading:0,pitch:0},opts)?.id,'lodge','0.4 units away, within 0.5');
  assert.equal(interactionTarget(items,{x:0,z:0,heading:0,pitch:0},opts),null,'1 unit away is beyond the scaled reach');
}

console.log('PASS: walking direction and speed, normalised diagonals, turning and look limits, collision and sliding, reset, interpolation, NaN reset and interaction targets.');
