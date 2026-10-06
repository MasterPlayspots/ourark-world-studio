// Water blocks the player: thin walls along the coast (on the sea side of land) and inside the edges of water
// areas (ponds, canals). Map edges need no wall. Walking into the sea or a pond stops at the shore.
import assert from 'node:assert/strict';
import {validateDocument} from '../dist/map-studio/model.js';
import {prepareWalk,waterColliders,WATER} from '../dist/runtime/map-adapter.js';
import {Walker} from '../dist/runtime/walker.js';
import {containsPoint} from '../dist/runtime/geometry/polygon.js';

// Map 200 × 100; land = west part up to x = 20 (the coast), a pond at (-50, 0) 20 × 20.
const land=[[-100,-50],[20,-50],[20,50],[-100,50]],pond=[[-60,-10],[-40,-10],[-40,10],[-60,10]];
const doc=validateDocument({schema:'motionspec.map.v3',name:'Küste',map:{width:200,depth:100,color:'#1f5f8b',image:null},runtime:{spawn:{x:0,z:0,heading:90}},points:[],
  surfaces:[{kind:'land',points:land},{kind:'water',points:pond},{kind:'road',points:[[-90,20],[10,20]],width:8}]});

// 1. Walls: only along the real shore (x = 20 between z −50 … 50) and around the pond; never along the map edge.
{
  const walls=waterColliders(doc);
  assert.ok(walls.every(w=>w.id===WATER.id&&w.name===WATER.name));
  const coast=walls.filter(w=>w.vertices.every(([x])=>x>=20-1e-9)),around=walls.filter(w=>w.vertices.every(([x])=>x<=-40+1e-9&&x>=-60-1e-9));
  assert.equal(coast.length,1,'one wall along the coast edge');assert.equal(around.length,4,'four walls inside the pond edges');
  assert.equal(walls.length,5,'no walls along the map border');
  // The coast wall lies in the sea (east of x = 20), the pond walls inside the pond.
  for(const [x,z] of coast[0].vertices)assert.ok(x>=20&&x<=21.0001,`coast wall ${x}`);
  for(const w of around){const cx=w.vertices.reduce((s,[x])=>s+x,0)/4,cz=w.vertices.reduce((s,[,z])=>s+z,0)/4;assert.ok(containsPoint(pond,{x:cx,z:cz}),`pond wall centre inside the pond: ${cx},${cz}`);}
}
// 2. Walking east into the sea stops at the shore; walking west into the pond stops at its edge.
{
  const walk=prepareWalk(doc),walker=new Walker({physics:walk.world,start:walk.start});
  for(let i=0;i<20*60;i++)walker.step(1/60,{x:0,z:1,turn:0});// heading 90 = east
  assert.ok(walker.pose.x<20&&walker.pose.x>19,`stops at the coast: ${walker.pose.x.toFixed(2)}`);
  const west=new Walker({physics:walk.world,start:{x:-20,z:0,heading:270}});
  for(let i=0;i<20*60;i++)west.step(1/60,{x:0,z:1,turn:0});
  assert.ok(west.pose.x>-40&&west.pose.x<-39,`stops at the pond: ${west.pose.x.toFixed(2)}`);
}
// 3. Without surfaces nothing changes.
assert.deepEqual(waterColliders(validateDocument({...doc,surfaces:undefined})),[]);
console.log('PASS: water blocks — coast walls on the sea side, pond walls inside, none along the map edge; walking stops at the shore.');
