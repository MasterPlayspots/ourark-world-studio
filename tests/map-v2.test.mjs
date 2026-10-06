// motionspec.map.v2: walkability settings and the v1 migration path.
import assert from 'node:assert/strict';
import {SCHEMA,LEGACY_SCHEMA,demoDocument,validateDocument,newPoint,copy,walkDefaults,withType} from '../dist/map-studio/model.js';

assert.equal(SCHEMA,'motionspec.map.v3');assert.equal(LEGACY_SCHEMA,'motionspec.map.v1');

// The handoff's example v1 file, plus an embedded image, migrates without losing anything it had.
const v1={schema:'motionspec.map.v1',name:'Begehbarer Campus',map:{width:120,depth:80,color:'#101f34',image:{name:'karte.png',dataUrl:'data:image/png;base64,iVBORw0KGgo='}},points:[
  {id:'building-01',name:'Atelier',type:'building',x:0,z:-10,width:12,depth:8,height:6,rotation:0,color:'#5eead4',visible:true,locked:false,data:{Bereich:'Design',Status:'offen'}},
  {id:'station-01',name:'Energie',type:'station',x:-20,z:10,width:6,depth:6,height:4,rotation:15,color:'#f3c969',visible:false,locked:true,data:{}},
  {id:'marker-01',name:'Information',type:'marker',x:8,z:6,width:2,depth:2,height:1,rotation:0,color:'#99f6e4',visible:true,locked:false,data:{Text:'Hier soll im Begehen eine Information geöffnet werden.'}}
]};
const migrated=validateDocument(copy(v1));
assert.equal(migrated.schema,'motionspec.map.v3');
assert.deepEqual(migrated.map,v1.map,'map, image and color are preserved');
assert.deepEqual(migrated.runtime,{spawn:null},'no spawn is invented during migration');
for(const [i,point] of v1.points.entries()){
  const {solid,interactive,...rest}=migrated.points[i];
  assert.deepEqual(rest,point,`v1 fields of ${point.id} are unchanged`);
  assert.deepEqual({solid,interactive},walkDefaults(point.type));
}
// Documented defaults: buildings and stations block, markers do not; every point can be inspected.
assert.deepEqual(walkDefaults('building'),{solid:true,interactive:true});
assert.deepEqual(walkDefaults('station'),{solid:true,interactive:true});
assert.deepEqual(walkDefaults('marker'),{solid:false,interactive:true});
// Visibility and edit lock stay independent from collision.
assert.equal(migrated.points[1].visible,false);assert.equal(migrated.points[1].locked,true);assert.equal(migrated.points[1].solid,true);

// v2 round-trips exactly, including explicit overrides and a spawn.
const v2=copy(migrated);v2.points[0].solid=false;v2.points[2].interactive=false;v2.runtime.spawn={x:-4,z:30,heading:180};
assert.deepEqual(validateDocument(JSON.parse(JSON.stringify(v2))),v2);
// Migration is idempotent.
assert.deepEqual(validateDocument(validateDocument(copy(v1))),migrated);

// The demo document and new points are v2 and carry type defaults once validated.
const demo=demoDocument();assert.equal(demo.schema,SCHEMA);assert.deepEqual(validateDocument(copy(demo)),demo);
assert.ok(demo.points.every(p=>typeof p.solid==='boolean'&&typeof p.interactive==='boolean'));
const imported=validateDocument({...demo,points:[...demo.points,{...newPoint(9),type:'marker',solid:undefined,interactive:undefined}]});
assert.deepEqual(({solid:imported.points.at(-1).solid,interactive:imported.points.at(-1).interactive}),walkDefaults('marker'));

// Changing the category re-derives walk flags (a building turned data point no longer blocks).
const retyped=withType(migrated.points[0],'marker');
assert.equal(retyped.type,'marker');assert.deepEqual({solid:retyped.solid,interactive:retyped.interactive},walkDefaults('marker'));
assert.equal(retyped.id,migrated.points[0].id);assert.deepEqual(retyped.data,migrated.points[0].data);
assert.equal(withType(migrated.points[2],'station').solid,true);

// Rejections: unknown/newer schema, malformed walk flags or spawn.
for(const mutate of [d=>d.schema='motionspec.map.v4',d=>d.schema=undefined,d=>d.points[0].solid='yes',d=>d.points[0].interactive=1,d=>d.runtime={spawn:{x:NaN,z:0,heading:0}},d=>d.runtime={spawn:{x:0,z:5000,heading:0}},d=>d.runtime={spawn:{x:0,z:0}},d=>d.runtime='x']){
  const invalid=copy(migrated);mutate(invalid);assert.throws(()=>validateDocument(invalid),undefined,String(mutate));
}
// Unknown extra fields are still not carried over (validator rebuilds objects).
assert.equal('velocity' in validateDocument({...copy(migrated),points:migrated.points.map(p=>({...p,velocity:[1,2,3]}))}).points[0],false);
assert.match((()=>{try{validateDocument({...copy(migrated),schema:'motionspec.map.v4'});}catch(e){return e.message;}})(),/neuer|unbekannt/i,'newer formats get an understandable message');

console.log('PASS: map v2 schema, lossless v1 migration, walk defaults, spawn validation and newer-format rejection.');
