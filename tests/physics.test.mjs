// Welle 2 (ADR 0002): colliders from the frozen snapshot, circle-vs-prism collision in X/Z, spawn search.
import assert from 'node:assert/strict';
import * as THREE from '../dist/worlds/vendor/three.module.js';
import {demoDocument,validateDocument,newPoint} from '../dist/map-studio/model.js';
import {makePoint} from '../dist/map-studio/renderer.js';
import {shapeVertices,collidersFromSnapshot,prepareWalk} from '../dist/runtime/map-adapter.js';
import {PLAYER,MAX_STEP_DISTANCE,createWorld,BOUNDS} from '../dist/runtime/physics/adapter.js';

const near=(a,b,eps=1e-9)=>Math.abs(a-b)<=eps;
const point=(over={})=>({...newPoint(1),id:over.id??'p',x:0,z:0,width:10,depth:6,height:5,rotation:0,...over});
const docWith=(points,map={})=>validateDocument({...demoDocument(),map:{...demoDocument().map,...map},runtime:{spawn:null},points});
const inside=(world,p)=>world.overlaps(p)!==null;

// 1. Player parameters are the product values from ADR 0002.
assert.deepEqual({radius:PLAYER.radius,height:PLAYER.height,eye:PLAYER.eye,walkSpeed:PLAYER.walkSpeed},{radius:.3,height:1.8,eye:1.6,walkSpeed:3});
assert.ok(MAX_STEP_DISTANCE>=PLAYER.walkSpeed/60,'documented maximum covers walking');

// 2. Collision = display: collider corners are exactly the footprint of the rendered mesh, for every shape and rotation.
for(const type of ['building','station','marker'])for(const rotation of [0,30,-135,90]){
  const record=point({type,rotation,x:7,z:-4,width:9,depth:4});
  const group=makePoint(record);group.updateMatrixWorld(true);
  const body=group.children[0],position=body.geometry.attributes.position,footprint=[];
  for(let i=0;i<position.count;i++){const v=new THREE.Vector3().fromBufferAttribute(position,i).applyMatrix4(body.matrixWorld);if(near(v.y,0,1e-6)&&!(near(v.x,record.x,1e-6)&&near(v.z,record.z,1e-6)))footprint.push([v.x,v.z]);}
  const corners=shapeVertices(record);
  assert.equal(corners.length,{building:4,station:6,marker:24}[type],type);
  for(const [x,z] of corners)assert.ok(footprint.some(([fx,fz])=>near(fx,x,1e-6)&&near(fz,z,1e-6)),`${type} ${rotation}° corner ${x.toFixed(3)},${z.toFixed(3)} is on the mesh`);
}

// 3. Only solid points collide; walk flags, not visibility or lock, decide.
{
  const doc=docWith([point({id:'a',type:'building'}),point({id:'b',type:'marker',x:30}),point({id:'c',type:'station',x:-30,solid:false}),point({id:'d',type:'building',z:20,visible:false,locked:true})]);
  assert.deepEqual(collidersFromSnapshot(doc).map(c=>c.id),['a','d']);
}

// 4. Overlap is exact against rotated boxes, not a centre-distance check.
{
  const world=createWorld({bounds:{width:100,depth:100},colliders:collidersFromSnapshot(docWith([point({id:'box',width:10,depth:2,rotation:45})]))});
  assert.equal(world.overlaps({x:0,z:0}).id,'box');
  assert.equal(world.overlaps({x:3,z:-3}).id,'box','along the rotated long axis');
  assert.equal(world.overlaps({x:3,z:3}),null,'across the rotated short axis');
  assert.equal(world.overlaps({x:49.9,z:0}),BOUNDS,'the map edge is a hard limit');
  assert.equal(world.overlaps({x:49.6,z:0}),null);
}

// 5. Moving into a wall stops at contact; moving diagonally along it slides; the result never overlaps.
{
  const world=createWorld({bounds:{width:100,depth:100},colliders:collidersFromSnapshot(docWith([point({id:'wall',width:2,depth:40})]))});
  let body={x:-5,z:0};
  for(let i=0;i<120;i++)body=world.move(body,{x:.05,z:0});
  assert.ok(near(body.x,-1-PLAYER.radius,1e-3),`stops at the wall: ${body.x}`);assert.ok(!inside(world,body));
  const start={...body};
  for(let i=0;i<60;i++)body=world.move(body,{x:.05,z:.05});
  assert.ok(near(body.x,start.x,1e-3),'no progress into the wall');assert.ok(body.z>start.z+2.9,'slides along it');assert.ok(!inside(world,body));
  assert.ok(body.contacts.includes('wall'));
}

// 6. No tunnelling: a step is capped and split into sub-steps, so a 0.5 m wall that cannot be walked around
//    is never crossed; around a round pillar the player may slide, but no position ever overlaps it.
{
  const wall=createWorld({bounds:{width:100,depth:100},colliders:collidersFromSnapshot(docWith([point({id:'thin',width:.5,depth:60})]))});
  const first=wall.move({x:-3,z:0},{x:MAX_STEP_DISTANCE*10,z:0});
  assert.ok(near(first.x+3,MAX_STEP_DISTANCE,1e-9),'a step is capped at MAX_STEP_DISTANCE');
  let body=first;for(let i=0;i<20;i++)body=wall.move(body,{x:MAX_STEP_DISTANCE*10,z:.3});
  assert.ok(near(body.x,-.25-PLAYER.radius,1e-3),`stays in front of the 0.5 m wall: ${body.x}`);assert.ok(!inside(wall,body));
  const pillar=createWorld({bounds:{width:100,depth:100},colliders:collidersFromSnapshot(docWith([point({id:'pillar',type:'marker',width:.5,depth:.5,solid:true})]))});
  body={x:-3,z:0};for(let i=0;i<40;i++){body=pillar.move(body,{x:MAX_STEP_DISTANCE,z:0});assert.ok(!inside(pillar,body),`step ${i}`);}
}

// 7. The map edge holds; NaN and infinities reset to the start.
{
  const world=createWorld({bounds:{width:20,depth:20},colliders:[],start:{x:1,z:2}});
  let body={x:9,z:0};for(let i=0;i<50;i++)body=world.move(body,{x:.5,z:0});
  assert.ok(near(body.x,10-PLAYER.radius,1e-9));
  for(const bad of [{x:NaN,z:0},{x:0,z:Infinity}]){const reset=world.move({x:0,z:0},bad);assert.deepEqual([reset.x,reset.z,reset.reset],[1,2,true]);}
  assert.equal(world.move({x:NaN,z:0},{x:0,z:0}).reset,true);
}

// 8. Spawn: stored spawn is used if free; the automatic spawn avoids obstacles; blocked cases are refused with a clear message.
{
  const free=docWith([point({id:'hall',name:'Halle',width:20,depth:10,z:0})],{width:60,depth:60});
  const auto=prepareWalk(free);
  assert.ok(!inside(auto.world,auto.start));assert.equal(auto.start.heading,0);assert.equal(auto.source,'auto');
  const stored=prepareWalk({...free,runtime:{spawn:{x:20,z:20,heading:90}}});
  assert.deepEqual([stored.start.x,stored.start.z,stored.start.heading,stored.source],[20,20,90,'stored']);
  assert.throws(()=>prepareWalk({...free,runtime:{spawn:{x:0,z:0,heading:0}}}),/Startpunkt liegt in „Halle“/);
  assert.throws(()=>prepareWalk({...free,runtime:{spawn:{x:29.9,z:0,heading:0}}}),/Startpunkt liegt zu nah am Kartenrand/);
  // The default spot (south edge) is blocked: the search finds the nearest free place instead.
  const southBlocked=docWith([point({id:'wall',width:60,depth:8,z:26})],{width:60,depth:60});
  const moved=prepareWalk(southBlocked);assert.ok(!inside(moved.world,moved.start));assert.ok(moved.start.z<22,'north of the wall');
  // Everything is covered: entering is refused.
  const blocked=docWith([point({id:'all',width:60,depth:60})],{width:60,depth:60});
  assert.throws(()=>prepareWalk(blocked),/keinen freien Platz/);
}

// 9. Size and rotation edits appear in the colliders on the next entry; the snapshot is never modified.
{
  const doc=docWith([point({id:'h',width:4,depth:4})]);
  const before=prepareWalk(doc);assert.equal(before.world.overlaps({x:3,z:0}),null);
  const edited={...doc,points:[{...doc.points[0],width:8,rotation:90}]};
  assert.equal(prepareWalk(edited).world.overlaps({x:0,z:3.5})?.id,'h','rotated by 90°, the width now runs along Z');
  const frozen=Object.freeze(structuredClone(doc));prepareWalk(frozen);
}

// 11. Spawn search on large maps: the nearest free spot is found precisely, and a narrow corridor far away counts.
{
  const big=docWith([point({id:'block',width:4,depth:4,z:998-2})],{width:2000,depth:2000});
  const near=prepareWalk(big);assert.ok(!inside(near.world,near.start));
  assert.ok(Math.hypot(near.start.x,near.start.z-998)<2+PLAYER.radius+.5,`next to the obstacle, not metres away: ${JSON.stringify(near.start)}`);
  // Two halves cover the map except a 1 m corridor along X = 700 (valid centre band 0.4 m wide).
  // (Built directly: single obstacles wider than the editor's 300 m limit keep the test small.)
  const corridor={map:{width:2000,depth:2000},runtime:{spawn:null},points:[point({id:'west',width:1699.5,depth:2000,x:-150.25,solid:true}),point({id:'east',width:299.5,depth:2000,x:850.25,solid:true})]};
  const found=prepareWalk(corridor);assert.ok(!inside(found.world,found.start));assert.ok(Math.abs(found.start.x-700)<.21,`in the corridor: ${found.start.x}`);
}

// 12. The map edge is reported as a contact; degenerate colliders are rejected when the world is built.
{
  const world=createWorld({bounds:{width:20,depth:20},colliders:[]});
  assert.ok(world.move({x:9.6,z:0},{x:.5,z:0}).contacts.includes(BOUNDS.id));
  assert.throws(()=>createWorld({bounds:{width:20,depth:20},colliders:[{id:'bad',name:'Bad',vertices:[[0,0],[0,0],[1,1]]}]}),/Collider „Bad“ ist ungültig/);
}

// 10. dispose() releases the world; further use fails loudly instead of silently.
{
  const world=createWorld({bounds:{width:10,depth:10},colliders:[]});world.dispose();
  assert.throws(()=>world.move({x:0,z:0},{x:1,z:0}),/disposed/);
}

// 13. A convex walkable area (e.g. an elliptical island) instead of a rectangle; the player radius can be scaled.
{
  const ellipse=Array.from({length:64},(_,i)=>{const a=i/64*Math.PI*2;return [Math.cos(a)*10,Math.sin(a)*6-1];});
  const world=createWorld({area:ellipse,colliders:[],radius:.06});
  assert.equal(world.overlaps({x:0,z:-1}),null,'centre is free');
  assert.equal(world.overlaps({x:9.99,z:-1}),BOUNDS,'too close to the rim');
  assert.equal(world.overlaps({x:0,z:5.1}),BOUNDS,'beyond the short axis');
  let body={x:0,z:-1};for(let i=0;i<400;i++)body=world.move(body,{x:.05,z:0});
  assert.ok(body.x>9.8&&body.x<10,`stops at the rim: ${body.x}`);assert.equal(world.overlaps(body),null);assert.ok(body.contacts.includes(BOUNDS.id));
  for(let i=0;i<400;i++)body=world.move(body,{x:.05,z:.05});
  assert.equal(world.overlaps(body),null,'slides along the rim and never leaves the area');
  const spawn=world.findSpawn({x:0,z:20});assert.ok(spawn&&world.overlaps(spawn)===null,'a spawn outside the island is pulled inside');
  assert.throws(()=>createWorld({area:[[0,0],[1,1]],colliders:[]}),/Begehbare Fläche/);
}

console.log('PASS: collision matches the rendered footprint, only solid points collide, exact overlap, sliding, no tunnelling, hard map edge, NaN reset, spawn search and refusal.');
