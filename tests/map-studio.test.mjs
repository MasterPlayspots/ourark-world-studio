import assert from 'node:assert/strict';
import {demoDocument,validateDocument,copy,History,mapToWorld,worldToMap,movePoint} from '../dist/map-studio/model.js';
import {makePoint,release,createCameras,MapRenderer} from '../dist/map-studio/renderer.js';
import * as THREE from '../dist/worlds/vendor/three.module.js';
import {CityLayer} from '../dist/runtime/city-layer.js';
import {TransformControls} from '../dist/worlds/vendor/TransformControls.js';

const doc=demoDocument();
assert.deepEqual(validateDocument(JSON.parse(JSON.stringify(doc))),doc);
for(const uv of [[0,0],[1,1],[.5,.5],[.2,.8]]){const [x,,z]=mapToWorld(...uv,doc.map);assert.deepEqual(worldToMap(x,z,doc.map).map(n=>+n.toFixed(8)),uv);}
assert.deepEqual(mapToWorld(0,0,doc.map),[-60,0,-40]);
const moved=movePoint(doc.points[0],1000,-1000,doc.map,true);assert.equal(moved.x,60);assert.equal(moved.z,-40);
const exact=movePoint(doc.points[0],5.35,7.18,doc.map,false);assert.equal(exact.x,5.35);assert.equal(exact.z,7.18);
for(const mutate of [d=>d.points.push(copy(d.points[0])),d=>d.points[0].x=NaN,d=>d.points[0].height=-1,d=>d.points[0].color='url(x)',d=>d.map.width=0,d=>d.map.image={name:'x',dataUrl:'https://example.com/x.png'},d=>d.points[0].data=[]]){const invalid=copy(doc);mutate(invalid);assert.throws(()=>validateDocument(invalid));}
const embedded=copy(doc);embedded.map.image={name:'pixel.png',dataUrl:'data:image/png;base64,iVBORw0KGgo='};embedded.points[0].data={nested:{status:'ready'},values:[1,2],note:'<script>data only</script>'};assert.deepEqual(validateDocument(JSON.parse(JSON.stringify(embedded))),embedded);
const history=new History(),before=copy(doc),after=copy(doc);after.points[0].height=25;after.points[0].data={Status:'bereit'};after.points[0].locked=true;assert.ok(history.record(before,after));assert.deepEqual(history.undo(after),before);assert.deepEqual(history.redo(before),after);

for(const point of doc.points){const mesh=makePoint(point);const bounds=new THREE.Box3().setFromObject(mesh);assert.ok(Math.abs(bounds.min.y)<1e-6);assert.ok(Math.abs(bounds.max.y-point.height)<1e-6);assert.ok(bounds.containsPoint(new THREE.Vector3(point.x,point.height/2,point.z)));mesh.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite)));release(mesh);}
const first=makePoint(doc.points[0]),second=makePoint({...doc.points[0],color:'#ffffff'});second.children[0].material.color.set('#ff0000');assert.notEqual(first.children[0].material,second.children[0].material);assert.equal(first.children[0].material.color.getHexString(),'4ade80');release(first);release(second);

// Exercise real OrbitControls and actual view switching without a WebGL context.
const handlers=new Map(),root={addEventListener(){},removeEventListener(){}};
const canvas={style:{},clientWidth:900,clientHeight:600,addEventListener(t,fn){handlers.set(fn,t);},removeEventListener(t,fn){handlers.delete(fn);},getRootNode(){return root;},parentElement:{getBoundingClientRect(){return {width:900,height:600};}}};
const renderer=Object.create(MapRenderer.prototype),cameras=createCameras(),controls=new TransformControls(cameras.top);
Object.assign(renderer,{canvas,cameras,camera:cameras.top,mode:'2d',doc,selected:null,city:new CityLayer(new THREE.Scene()),selectionBox:new THREE.Box3Helper(new THREE.Box3()),transform:controls,renderer:{setSize(){}},request(){},drag:null});
renderer.connectOrbit();renderer.overview();const snapshot=JSON.stringify(doc),listeners=handlers.size;
for(let i=0;i<4;i++){
  renderer.setMode('3d');assert.equal(renderer.camera,cameras.spatial);assert.equal(renderer.orbit.object,cameras.spatial);assert.equal(controls.camera,cameras.spatial);assert.equal(renderer.orbit.enableRotate,true);assert.ok(renderer.camera.position.y>0);
  renderer.setMode('2d');assert.equal(renderer.camera,cameras.top);assert.equal(renderer.orbit.enableRotate,false);assert.equal(handlers.size,listeners,'Switching must not leak camera listeners');
  const forward=new THREE.Vector3();renderer.camera.getWorldDirection(forward);assert.ok(forward.distanceTo(new THREE.Vector3(0,-1,0))<1e-6,'2D remains an exact top view');
  const north=new THREE.Vector3(0,0,-20).project(renderer.camera);assert.ok(north.y>0,'North stays at the top of the map');
}
assert.equal(JSON.stringify(doc),snapshot,'View switching must preserve the document');renderer.orbit.dispose();release(controls.getHelper());
console.log('PASS: map schema, coordinates, embedded-image round-trip, data preservation, undo/redo, real Three.js geometry, camera switches and OrbitControls listener cleanup.');
