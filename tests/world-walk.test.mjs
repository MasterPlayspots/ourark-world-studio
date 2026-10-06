// World Studio walk mode: colliders from the 3D scene, the island as walkable area, a free start in every world.
import assert from 'node:assert/strict';
import * as THREE from '../dist/worlds/vendor/three.module.js';
import {worlds} from '../dist/worlds/data.js';
import {buildWorld} from '../dist/worlds/scene.js';
import {createDocument} from '../dist/world-studio/model.js';
import {WALKER,convexHull,walkableArea,groundLevel,sceneColliders,prepareWorldWalk} from '../dist/world-studio/walk.js';
import {BOUNDS} from '../dist/runtime/physics/adapter.js';
import {Walker,interactionTarget} from '../dist/runtime/walker.js';

// 1. Player at diorama scale: 1 unit = 5 m.
assert.deepEqual(WALKER,{radius:.06,height:.36,eye:.32,speed:.6,reach:.5});

// 2. Convex hull of scattered points (monotone chain), counter-clockwise, no collinear duplicates.
assert.deepEqual(convexHull([[0,0],[2,0],[1,1],[2,2],[0,2],[1,0]]),[[0,0],[2,0],[2,2],[0,2]]);
assert.equal(convexHull([[0,0],[1,1]]).length,2,'degenerate input stays degenerate');

// Scene "units" like the renderer provides: editable objects (landmarks) plus scenery, both from buildWorld.
function unitsFor(world){
  const built=buildWorld(world),units=[];
  built.targets.forEach((target,i)=>units.push({id:`${world.id}-landmark-${i}`,name:world.stops[i].object,object:target}));
  for(const child of built.root.children)if(!built.targets.includes(child)&&!child.userData.ground)units.push({id:`scenery-${units.length}`,name:'',object:child});
  built.root.updateMatrixWorld(true);return {built,units};
}

for(const world of worlds){
  const {built,units}=unitsFor(world),groundY=groundLevel(built.root);
  // 3. Ground: the top of the island (or the orbital platform), never below the rim.
  assert.ok(groundY>-.6&&groundY<0,`${world.id}: ground ${groundY}`);
  // 4. The walkable area is the island outline (convex polygon) around z = -1.
  const area=walkableArea(world.id);
  assert.ok(area.length>=48&&area.every(([x,z])=>Math.abs(x)<=10.5&&z<=6&&z>=-8),`${world.id}: area`);
  // 5. Colliders: every landmark blocks; things lying flat on the ground (paths, lines) or floating above the head do not.
  const colliders=sceneColliders(units,{groundY,height:WALKER.height});
  for(let i=0;i<4;i++)assert.ok(colliders.some(c=>c.id===`${world.id}-landmark-${i}`),`${world.id}: landmark ${i} blocks`);
  assert.ok(colliders.every(c=>c.vertices.length>=3),'proper polygons');
  // 6. Prepared walk: a free start on the island, facing north, eye at ground + 0.32.
  const doc=createDocument(world),targets=doc.objects.filter(o=>o.page.enabled&&o.visible).map(o=>({id:o.id,name:o.name,page:o.page,vertices:colliders.find(c=>c.id===o.id)?.vertices??[]})).filter(t=>t.vertices.length>=3);
  const walk=prepareWorldWalk({worldId:world.id,groundY,colliders,targets});
  assert.equal(walk.physics.overlaps(walk.start),null,`${world.id}: start is free`);
  assert.equal(walk.start.heading,0);assert.ok(Math.abs(walk.eye-(groundY+WALKER.eye))<1e-9);assert.equal(walk.speed,WALKER.speed);
  // 7. Walking north for 20 s never ends inside a landmark or off the island.
  const walker=new Walker({physics:walk.physics,start:walk.start,speed:walk.speed});
  for(let i=0;i<20*60;i++){walker.step(1/60,{x:0,z:1,turn:i%240<120?.3:-.3});assert.equal(walk.physics.overlaps(walker.pose),null,`${world.id}: step ${i}`);}
  // 8. Going straight at the first landmark stops in front of it; there it can be inspected.
  const lodge=colliders.find(c=>c.id===`${world.id}-landmark-0`),cx=lodge.vertices.reduce((s,[x])=>s+x,0)/lodge.vertices.length,cz=lodge.vertices.reduce((s,[,z])=>s+z,0)/lodge.vertices.length;
  const approach=new Walker({physics:walk.physics,start:{x:cx,z:Math.max(...lodge.vertices.map(([,z])=>z))+1.5,heading:0},speed:walk.speed});
  if(walk.physics.overlaps(approach.pose)===null){
    for(let i=0;i<10*60;i++)approach.step(1/60,{x:0,z:1,turn:0});
    assert.equal(walk.physics.overlaps(approach.pose),null);
    const target=interactionTarget(walk.targets,approach.pose,walk.targetOptions);
    assert.equal(target?.id,`${world.id}-landmark-0`,`${world.id}: landmark in reach after walking up to it`);
  }
}

// 9. The island edge is a wall: walking south from the start ends on the island.
{
  const world=worlds[0],{built,units}=unitsFor(world),groundY=groundLevel(built.root);
  const walk=prepareWorldWalk({worldId:world.id,groundY,colliders:sceneColliders(units,{groundY,height:WALKER.height}),targets:[]});
  const walker=new Walker({physics:walk.physics,start:walk.start,speed:walk.speed});
  for(let i=0;i<30*60;i++)walker.step(1/60,{x:0,z:-1,turn:0});
  assert.equal(walk.physics.overlaps(walker.pose),null);assert.ok(walker.contacts.includes(BOUNDS.id),'stopped by the island edge');
}

console.log('PASS: diorama scale, convex hull, ground and island area for all five worlds, landmark colliders, free start, walking stays on the island and outside landmarks, landmarks can be inspected.');
