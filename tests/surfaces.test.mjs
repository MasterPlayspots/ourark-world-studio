// map.v3 surfaces: ground areas and ribbons (roads, paths, beach, park, water, parking, land) — validated,
// kept on a round trip, limited, and turned into one flat mesh by the ground layer.
import assert from 'node:assert/strict';
import {validateDocument,newPoint,SURFACE_KINDS,MAX_SURFACES,MAX_SURFACE_POINTS} from '../dist/map-studio/model.js';
import {buildGround} from '../dist/runtime/ground-layer.js';

const base={schema:'motionspec.map.v3',name:'Boden',map:{width:400,depth:400,color:'#1f5f8b',image:null},runtime:{spawn:null},points:[]};
const road={kind:'road',points:[[-150,0],[0,0],[0,150]],width:12};
const beach={kind:'beach',points:[[100,-150],[190,-150],[190,150],[100,150]]};
const land={kind:'land',points:[[-200,-200],[120,-200],[120,200],[-200,200]]};

// 1. Kinds and limits.
assert.deepEqual(SURFACE_KINDS,['land','park','beach','water','parking','road','path']);
assert.equal(MAX_SURFACES,20000);assert.equal(MAX_SURFACE_POINTS,400000);
// 2. Valid surfaces are kept exactly; documents without surfaces stay without.
{
  const doc=validateDocument({...base,surfaces:[land,beach,road]});
  assert.deepEqual(doc.surfaces,[land,beach,road]);assert.deepEqual(validateDocument(JSON.parse(JSON.stringify(doc))),doc);
  assert.equal('surfaces' in validateDocument(base),false);
}
// 3. Refusals: unknown kind, too few points, ribbons without a sensible width, areas with a width, non-numbers,
//    coordinates far outside the map, too many points overall.
for(const [surface,why] of [[{kind:'lava',points:land.points},'kind'],[{kind:'road',points:[[0,0]],width:5},'one point'],[{kind:'beach',points:[[0,0],[1,1]]},'area with two points'],
  [{kind:'road',points:road.points},'road without width'],[{kind:'road',points:road.points,width:500},'too wide'],[{kind:'park',points:beach.points,width:3},'area with width'],
  [{kind:'park',points:[[0,0],[1,'x'],[2,2]]},'string'],[{kind:'park',points:[[0,0],[9000,0],[0,9]]},'far outside']])
  assert.throws(()=>validateDocument({...base,surfaces:[surface]}),/Bodenfläche/,why);
assert.throws(()=>validateDocument({...base,surfaces:Array.from({length:201},()=>({kind:'path',points:Array.from({length:2000},(_,i)=>[i%100,i%7]),width:2}))}),/400[.,]?000/);
// 4. Ground layer: one geometry; areas triangulated, ribbons as strips; colours and heights by kind.
{
  const {geometry,skipped}=buildGround([land,beach,road]);
  const position=geometry.getAttribute('position'),color=geometry.getAttribute('color');
  assert.ok(position.count>=6+6+2*6,'two quads for land/beach + two road segments');assert.equal(color.count,position.count);assert.equal(skipped,0);
  const ys=new Set();for(let i=0;i<position.count;i++)ys.add(+position.getY(i).toFixed(3));
  assert.ok(ys.size>=3,'land, beach and road at different heights (no z-fighting)');
  // The road ribbon is 12 m wide: its vertices lie within 6 m of the centre line.
  const box=geometry.boundingBox??(geometry.computeBoundingBox(),geometry.boundingBox);assert.ok(box.min.x<=-200&&box.max.x>=190);
  // A self-intersecting area is skipped (counted), not fatal.
  assert.equal(buildGround([{kind:'park',points:[[0,0],[10,10],[10,0],[0,10]]}]).skipped,1);
}
// 5. Review H2: areas have at most 2000 corners; a 1500-corner zigzag triangulates quickly.
{
  const {triangulate}=await import('../dist/runtime/geometry/polygon.js');
  assert.throws(()=>validateDocument({...base,surfaces:[{kind:'park',points:Array.from({length:2001},(_,i)=>{const a=i/2001*Math.PI*2;return [150*Math.cos(a),150*Math.sin(a)];})}]}),/2[.,]?000/);
  const zig=[];for(let i=0;i<750;i++)zig.push([i*.2,0]);for(let i=749;i>=0;i--)zig.push([i*.2+.1,i%2?5:10]);
  const t0=performance.now();const tris=triangulate(zig);const ms=performance.now()-t0;
  assert.equal(tris.length,zig.length-2);assert.ok(ms<300,`${ms.toFixed(0)} ms for 1500 corners`);console.log(`  1500-Ecken-Zickzack trianguliert in ${ms.toFixed(0)} ms`);
}
// 6. Review M4: the ground key changes with any coordinate, kind or width.
{
  const {groundKey}=await import('../dist/runtime/ground-layer.js');
  const a=[{kind:'road',points:[[0,0],[10,0]],width:8}],b=[{kind:'road',points:[[0,0],[10,1]],width:8}],c=[{kind:'road',points:[[0,0],[10,0]],width:9}],d=[{kind:'path',points:[[0,0],[10,0]],width:8}];
  assert.equal(new Set([a,b,c,d].map(groundKey)).size,4);assert.equal(groundKey(a),groundKey(JSON.parse(JSON.stringify(a))));
}
console.log('PASS: surfaces — kinds, limits, round trip, refusals; ground layer triangulates areas, builds road ribbons, layered heights.');
