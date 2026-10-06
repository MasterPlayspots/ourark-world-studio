// Map edit cost (M04 optimisation): validated points are frozen and keep their identity through an edit, so validation,
// size check, history and renderer skip unchanged points — without weakening any check or changing any result.
import assert from 'node:assert/strict';
import {SCHEMA,validateDocument,editableShell,newPoint,History,demoDocument} from '../dist/map-studio/model.js';
import {projectBytes,serializeProject} from '../dist/map-studio/project.js';
import {isValidated,deepFreeze} from '../dist/runtime/frozen.js';
import {CityLayer} from '../dist/runtime/city-layer.js';
import * as THREE from '../dist/worlds/vendor/three.module.js';

const base={schema:SCHEMA,name:'Kosten',map:{width:1000,depth:1000,color:'#1c1c1c',image:null},runtime:{spawn:null}};
const points=Array.from({length:500},(_,i)=>({...newPoint(i),id:`p${i}`,x:(i%25)*30-375,z:Math.floor(i/25)*30-300,data:{Nr:i,Text:'Größe 🚗'}}));
const doc=validateDocument({...base,points});

// 1. Validated points are frozen (also their data) and an edit through the shell keeps every unchanged point.
assert.ok(doc.points.every(p=>isValidated(p)&&Object.isFrozen(p.data)));
assert.ok(isValidated(doc)&&Object.isFrozen(doc.points)&&Object.isFrozen(doc.map),'the document itself is frozen too');
for(const change of [()=>{doc.points[0].x=1;},()=>{doc.points[0]=doc.points[1];},()=>{doc.name='x';},()=>{doc.map.width=5;}])assert.throws(change,TypeError,'frozen');
assert.equal(isValidated(editableShell(doc)),false,'an editable shell is not validated');
const draft=editableShell(doc);draft.points[7]={...draft.points[7],height:20};
const next=validateDocument(draft);
assert.equal(next.points.filter((p,i)=>p===doc.points[i]).length,499,'499 unchanged points reused by identity');
assert.notEqual(next.points[7],doc.points[7]);assert.equal(next.points[7].height,20);assert.equal(doc.points[7].height,6,'before untouched');
// 2. The cache weakens nothing: a changed point is fully validated, duplicate ids among reused points are found.
{const d=editableShell(doc);d.points[3]={...d.points[3],x:99999};assert.throws(()=>validateDocument(d),/Position X/);}
{const d=editableShell(doc);d.points.push(doc.points[0]);assert.throws(()=>validateDocument(d),/doppelte/);}
{const d=editableShell(doc);d.map.width=9000;assert.throws(()=>validateDocument(d),/Kartenbreite/);}
// 3. Byte size stays exact for frozen, replaced and unfrozen (e.g. undo-restored) points, with surfaces and image.
{
  const surfaces=[{kind:'road',points:[[-100,0],[100,0]],width:6},{kind:'park',points:[[0,0],[50,0],[50,50]]}];
  const meta={worldId:'w',revision:3,geoReference:{note:'Höhe'}};
  const withAll=validateDocument({...base,map:{...base.map,image:{name:'k.png',dataUrl:'data:image/png;base64,QUJD'}},points,surfaces});
  const replaced=editableShell(withAll);replaced.points[1]={...replaced.points[1],name:'Süd ✓'};
  const unfrozen=JSON.parse(JSON.stringify(withAll));
  for(const d of [doc,next,withAll,validateDocument(replaced),unfrozen,{...withAll,points:[]}])
    assert.equal(projectBytes(d,meta),Buffer.byteLength(serializeProject(d,meta),'utf8'));
  // 4. Surfaces are reused while the map size is the same and re-validated when it shrinks below them.
  const again=validateDocument(editableShell(withAll));assert.equal(again.surfaces,withAll.surfaces,'surfaces reused');
  const shrunk=editableShell(withAll);shrunk.map.width=50;assert.throws(()=>validateDocument(shrunk),/Bodenfläche/);
}
// 5. History: the remembered pack is reused, and undo/redo stay correct when images are swapped and released.
{
  const h=new History(),a=validateDocument({...demoDocument(),map:{...demoDocument().map,image:{name:'a.png',dataUrl:'data:image/png;base64,QQ=='}}});
  const shell=d=>editableShell(d);
  const b0=shell(a);b0.map.image={name:'b.png',dataUrl:'data:image/png;base64,Qg=='};const b=validateDocument(b0);
  const c0=shell(b);c0.map.image=null;const c=validateDocument(c0);
  const d0=shell(c);d0.points[0]={...d0.points[0],height:40};const d=validateDocument(d0);
  assert.ok(h.record(a,b));assert.ok(h.record(b,c));assert.ok(h.record(c,d));assert.equal(h.record(d,d),false,'no change');
  let cur=d;cur=h.undo(cur);assert.equal(cur.points[0].height,12);assert.equal(cur.map.image,null);
  cur=h.undo(cur);assert.equal(cur.map.image.name,'b.png');cur=h.undo(cur);assert.equal(cur.map.image.dataUrl,'data:image/png;base64,QQ==');
  cur=h.redo(cur);cur=h.redo(cur);cur=h.redo(cur);assert.equal(cur.points[0].height,40);
}
// 5b. History entries in parts: exact round trip (with surfaces and image), change detection, also for unvalidated
// documents changed in place (drag state, undo results).
{
  const h=new History(),withAll=validateDocument({...base,map:{...base.map,image:{name:'k.png',dataUrl:'data:image/png;base64,QUJD'}},points,surfaces:[{kind:'road',points:[[-100,0],[100,0]],width:6}],attribution:'© OSM'});
  const restored=h.unpack(h.pack(withAll));assert.equal(JSON.stringify(restored),JSON.stringify(withAll),'byte-identical round trip, key order kept');
  assert.ok(History.same(h.pack(withAll),h.pack(withAll)));
  const shell=editableShell(doc),first=h.pack(shell);
  shell.points[0]={...shell.points[0],x:123};assert.equal(History.same(first,h.pack(shell)),false,'changed unvalidated doc detected');
  shell.name='anders';assert.equal(History.same(h.pack(editableShell(doc)),h.pack(shell)),false,'head change detected');
}
// 5d. Review round 2: Undo/Redo hand back the same validated point objects (identity caches keep working, entries
// keep sharing texts), and remembered objects are pruned.
{
  const h=new History();let cur=doc;
  for(let i=0;i<3;i++){const d=editableShell(cur);d.points[i]={...d.points[i],height:20+i};const next=validateDocument(d);h.record(cur,next);cur=next;}
  const back=h.undo(cur);assert.ok(isValidated(back),'undo returns a validated document');
  assert.equal(back.points.filter((p,i)=>p===cur.points[i]).length,499,'all unchanged points are the very same objects');
  assert.equal(back.points[2],doc.points[2],'the restored point is the original object');
  const fwd=h.redo(back);assert.equal(fwd.points[2],cur.points[2],'redo too');
  const many=new History();let state=doc;
  for(let i=0;i<120;i++){const d=editableShell(state);d.points[i%500]={...d.points[i%500],height:6+(i%9)/10};const next=validateDocument(d);many.record(state,next);state=next;}
  assert.ok(many.objects.size<=Math.max(many.pruneAt,20000),`remembered objects bounded (${many.objects.size})`);
}
// 5c. Exact bytes also for a map without an `image` key; city layer survives sync after dispose; deepFreeze reaches
// below shallowly frozen objects.
{
  const noKey={...doc,map:{width:1000,depth:1000,color:'#1c1c1c'}},meta={worldId:'w',revision:0};
  assert.equal(projectBytes(noKey,meta),Buffer.byteLength(serializeProject(noKey,meta),'utf8'));
  const layer=new CityLayer(new THREE.Scene());layer.sync(doc,null);layer.dispose();assert.doesNotThrow(()=>layer.sync(doc,'p3'));
  const inner={v:1},outer=Object.freeze({inner});deepFreeze(outer);assert.ok(Object.isFrozen(inner),'child of a shallow-frozen object');
}
// 6. Speed: an edit of one point among 5000 validates and measures far less than the whole document.
{
  const big=validateDocument({...base,map:{...base.map,width:5000,depth:5000},points:Array.from({length:5000},(_,i)=>({...newPoint(i),id:`b${i}`,x:(i%100)*45-2250,z:Math.floor(i/100)*45-2250,data:{Nr:i}}))});
  const meta={worldId:'w',revision:0};projectBytes(big,meta);
  const t0=performance.now();for(let i=0;i<20;i++){const e=editableShell(big);e.points[i]={...e.points[i],height:7+i%3};projectBytes(validateDocument(e),meta);}
  const perEdit=(performance.now()-t0)/20;
  const t1=performance.now();for(let i=0;i<5;i++)validateDocument(JSON.parse(JSON.stringify(big)));const full=(performance.now()-t1)/5;
  // Informational only (wall-clock ratios are flaky on loaded machines); identity reuse is asserted in 1.
  console.log(`  5000 Punkte: Edit (Hülle + Validierung + Bytes) ${perEdit.toFixed(2)} ms, volle Validierung ${full.toFixed(2)} ms`);
}
console.log('PASS: map edit cost — frozen validated points keep their identity, checks unchanged, exact bytes, history with image swaps, surfaces re-checked on resize.');
