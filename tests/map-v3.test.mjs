// motionspec.map.v3: building footprints (polygons), bigger maps and more points; v1/v2 files still open.
import assert from 'node:assert/strict';
import {SCHEMA,MAX_POINTS,MAX_MAP_METRES,MAX_FOOTPRINT_VERTICES,MAX_TOTAL_FOOTPRINT_VERTICES,validateDocument,resizePoint,newPoint} from '../dist/map-studio/model.js';
import {shapeVertices,collidersFromSnapshot,prepareWalk} from '../dist/runtime/map-adapter.js';
import {Walker,interactionTarget} from '../dist/runtime/walker.js';
import {isConvex} from '../dist/runtime/geometry/polygon.js';

assert.equal(SCHEMA,'motionspec.map.v3');assert.equal(MAX_POINTS,5000);assert.equal(MAX_MAP_METRES,5000);assert.equal(MAX_FOOTPRINT_VERTICES,64);
const L=[[-5,-5],[5,-5],[5,-1],[-1,-1],[-1,5],[-5,5]];// local metres around the point, an L (notch at +x/+z)
const base={schema:SCHEMA,name:'Stadt',map:{width:200,depth:200,color:'#101f34',image:null},runtime:{spawn:null}};
const building=(extra={})=>({...newPoint(1),id:'haus',name:'Haus L',x:10,z:0,footprint:L,height:12,...extra});

// 1. A footprint is kept; width and depth follow its bounding box (for lists, labels, focus).
{
  const doc=validateDocument({...base,points:[building({width:99,depth:1})]}),p=doc.points[0];
  assert.deepEqual(p.footprint,L);assert.equal(p.width,10);assert.equal(p.depth,10);assert.equal(doc.schema,SCHEMA);
  const again=validateDocument(JSON.parse(JSON.stringify(doc)));assert.deepEqual(again,doc,'round trip');
  assert.equal(validateDocument({...base,points:[{...newPoint(1),id:'box'}]}).points[0].footprint,undefined,'boxes stay boxes');
}
// 2. Invalid footprints are refused with a message.
for(const [footprint,why] of [[[[0,0],[1,1]],'two vertices'],[[[0,0],[4,4],[4,0],[0,4]],'self-intersecting'],[Array.from({length:65},(_,i)=>[Math.cos(i/65*6.283)*9,Math.sin(i/65*6.283)*9]),'too many vertices'],[[[0,0],[400,0],[0,4]],'too large'],[[[0,0],[1,0],['1',1]],'not numbers'],['L','not a list']])
  assert.throws(()=>validateDocument({...base,points:[building({footprint})]}),/Grundriss/,why);
// 3. Bigger worlds: 5000 points on a 5000 m map; positions up to ±2500 m.
{
  const points=Array.from({length:5000},(_,i)=>({...newPoint(i),id:`p${i}`,x:(i%100)*50-2475,z:Math.floor(i/100)*50-2475,width:8,depth:8}));
  const doc=validateDocument({...base,map:{...base.map,width:5000,depth:5000},points});assert.equal(doc.points.length,5000);
  assert.throws(()=>validateDocument({...base,points:[...points,{...newPoint(1),id:'x'}]}),/5\.?000/);
  assert.throws(()=>validateDocument({...base,map:{...base.map,width:5001},points:[]}),/Kartenbreite/);
}
// 4. v1 and v2 files open and become v3.
assert.equal(validateDocument({...base,schema:'motionspec.map.v2',points:[]}).schema,SCHEMA);
assert.throws(()=>validateDocument({...base,schema:'motionspec.map.v4',points:[]}),/neueren/);
// 5. Resizing a footprint building scales its outline.
{
  const p=validateDocument({...base,points:[building()]}).points[0],wide=resizePoint(p,'width',20);
  assert.equal(wide.width,20);assert.deepEqual(wide.footprint[1],[10,-5]);assert.equal(resizePoint(p,'depth',5).footprint[4][1],2.5);
  const box=validateDocument({...base,points:[{...newPoint(1),id:'b'}]}).points[0];assert.deepEqual(resizePoint(box,'width',3),{...box,width:3});
}
// 6. Physics: the footprint collides exactly (rotated like the drawing), split into convex parts.
{
  const doc=validateDocument({...base,points:[building({rotation:90})]}),p=doc.points[0];
  const outline=shapeVertices(p);assert.equal(outline.length,6);
  // rotation 90° (clockwise seen from above, like the renderer): local (5,-5) → world (x-5, z-5)
  assert.ok(Math.hypot(outline[1][0]-(10-5),outline[1][1]-(0-5))<1e-9,JSON.stringify(outline[1]));
  const colliders=collidersFromSnapshot(doc);assert.ok(colliders.length===2&&colliders.every(c=>c.id==='haus'&&c.name==='Haus L'&&isConvex(c.vertices)));
  // Walking diagonally into the notch of the unrotated L stops in its inner corner (world 9, -1).
  const plain=validateDocument({...base,runtime:{spawn:{x:13,z:3,heading:315}},points:[building()]}),walk=prepareWalk(plain);
  const walker=new Walker({physics:walk.world,start:walk.start});
  for(let i=0;i<5*60;i++)walker.step(1/60,{x:0,z:1,turn:0});
  const {x,z}=walker.pose;assert.equal(walk.world.overlaps(walker.pose),null);
  assert.ok(x>9.25&&x<9.5&&z>-.75&&z<-.5,`stopped in the inner corner of the notch: ${x.toFixed(2)}, ${z.toFixed(2)}`);
  // There the building is in reach and in front: the interaction target (concave footprint, not its hull).
  assert.equal(interactionTarget(plain.points,{x,z,heading:315})?.id,'haus');
  assert.equal(interactionTarget(plain.points,{x:13,z:3,heading:135}),null,'looking out of the notch');
}
// 7. Security review M1: the total number of footprint corners is capped (drawing cost), with a clear message.
{
  assert.equal(MAX_TOTAL_FOOTPRINT_VERTICES,100000);
  const star=Array.from({length:64},(_,i)=>{const a=i/64*Math.PI*2,r=i%2?4:8;return [+(r*Math.cos(a)).toFixed(3),+(r*Math.sin(a)).toFixed(3)];});
  const many=n=>Array.from({length:n},(_,i)=>({...newPoint(i),id:`s${i}`,x:(i%70)*30-1000,z:Math.floor(i/70)*30-1000,footprint:star}));
  assert.equal(validateDocument({...base,map:{...base.map,width:5000,depth:5000},points:many(1562)}).points.length,1562,'99 968 corners are fine');
  assert.throws(()=>validateDocument({...base,map:{...base.map,width:5000,depth:5000},points:many(1563)}),/100[.,]?000 Ecken/);
}
console.log('PASS: map.v3 footprints (bbox size, round trip, refusals), 5000 points / 5000 m, v2→v3, resize scales outline, exact concave collision and interaction.');
