// Renderer side of the runtime boundary: walk mode swaps cameras and helpers and restores the editor exactly.
import assert from 'node:assert/strict';
import * as THREE from '../dist/worlds/vendor/three.module.js';
import {CityLayer} from '../dist/runtime/city-layer.js';
import {TransformControls} from '../dist/worlds/vendor/TransformControls.js';
import {demoDocument} from '../dist/map-studio/model.js';
import {createCameras,makePoint,release,MapRenderer} from '../dist/map-studio/renderer.js';

const handlers=new Map(),root={addEventListener(){},removeEventListener(){}};
const canvas={style:{},clientWidth:900,clientHeight:600,addEventListener(t,fn){handlers.set(fn,t);},removeEventListener(t,fn){handlers.delete(fn);},getRootNode(){return root;},parentElement:{getBoundingClientRect(){return {width:900,height:600};}}};
const doc=demoDocument(),snapshot=JSON.stringify(doc);
const renderer=Object.create(MapRenderer.prototype),cameras=createCameras(),controls=new TransformControls(cameras.top);
let draws=0;
Object.assign(renderer,{canvas,cameras,camera:cameras.top,mode:'2d',doc,selected:null,city:new CityLayer(new THREE.Scene()),selectionBox:new THREE.Box3Helper(new THREE.Box3()),transform:controls,renderer:{setSize(){}},request(){draws++;},drag:null,callbacks:{}});
for(const p of doc.points)renderer.items.set(p.id,makePoint(p));

// Canvas listeners are named and fully removable (Welle-0 observation O2).
const before=handlers.size;renderer.bindCanvas();assert.equal(handlers.size-before,6);
renderer.unbindCanvas();assert.equal(handlers.size,before);renderer.bindCanvas();

renderer.connectOrbit();renderer.overview();
for(const mode of ['2d','3d']){
  renderer.setMode(mode);renderer.select('demo-2');
  const editorCamera=renderer.camera,position=editorCamera.position.clone(),quaternion=editorCamera.quaternion.clone(),target=renderer.orbit.target.clone(),zoom=editorCamera.zoom;
  if(mode==='3d')assert.equal(controls.object,renderer.items.get('demo-2'),'3D selection has a gizmo before entering');

  renderer.enterRuntime({x:5,z:30,heading:90});
  assert.equal(renderer.runtime,true);assert.equal(renderer.camera,cameras.player);
  assert.equal(controls.object,undefined,'gizmo detached');assert.equal(controls.enabled,false);assert.equal(renderer.orbit.enabled,false);assert.equal(renderer.selectionBox.visible,false);
  assert.deepEqual(cameras.player.position.toArray(),[5,1.6,30]);
  const look=new THREE.Vector3();cameras.player.getWorldDirection(look);assert.ok(look.distanceTo(new THREE.Vector3(1,0,0))<1e-9,'heading 90° looks east (+X)');
  cameras.player.getWorldDirection(look);renderer.placePlayer({x:0,z:0,heading:0});cameras.player.getWorldDirection(look);assert.ok(look.distanceTo(new THREE.Vector3(0,0,-1))<1e-9,'heading 0° looks north (−Z)');
  // Editor pointer input and selection are inert while walking.
  let selected=0;renderer.callbacks.select=()=>selected++;
  renderer.down({button:0,clientX:10,clientY:10});renderer.up({clientX:10,clientY:10});renderer.move({});assert.equal(selected,0);assert.equal(renderer.drag,null);
  renderer.select('demo-3');assert.equal(controls.object,undefined,'no gizmo re-attached during walk');
  renderer.enterRuntime({x:0,z:0});// idempotent

  renderer.exitRuntime();renderer.selected='demo-2';renderer.select('demo-2');
  assert.equal(renderer.runtime,false);assert.equal(renderer.camera,editorCamera);
  assert.ok(renderer.camera.position.distanceTo(position)<1e-9);assert.ok(renderer.camera.quaternion.equals(quaternion));
  assert.ok(renderer.orbit.target.distanceTo(target)<1e-9);assert.equal(renderer.camera.zoom,zoom);
  assert.equal(renderer.orbit.enabled,true);assert.equal(controls.enabled,true);assert.equal(controls.camera,editorCamera);
  if(mode==='3d')assert.equal(controls.object,renderer.items.get('demo-2'),'gizmo returns to the previous selection');
  renderer.exitRuntime();// idempotent
}
// Collider debug outlines (development aid, Welle 2) exist only while walking and are released on exit.
{
  renderer.scene=renderer.scene??new THREE.Scene();
  const {collidersFromSnapshot}=await import('../dist/runtime/map-adapter.js'),colliders=collidersFromSnapshot(doc);
  renderer.enterRuntime({x:0,z:30,heading:0});renderer.showColliders(colliders);
  assert.equal(renderer.colliderDebug.children.length,colliders.length);assert.ok(renderer.scene.children.includes(renderer.colliderDebug));
  const outline=renderer.colliderDebug;renderer.exitRuntime();
  assert.equal(renderer.colliderDebug,null);assert.ok(!renderer.scene.children.includes(outline),'removed from the scene');
}
// Render resolution (Welle 4a): the walk may change it, leaving the walk restores the editor's resolution.
{
  const ratios=[];renderer.renderer.setPixelRatio=r=>ratios.push(r);renderer.editorPixelRatio=2;renderer.renderScale=2;
  renderer.enterRuntime({x:0,z:30,heading:0});renderer.setRenderScale(2);assert.deepEqual(ratios,[],'unchanged scale is a no-op');
  renderer.setRenderScale(1.45);assert.equal(renderer.renderScale,1.45);renderer.exitRuntime();
  assert.deepEqual(ratios,[1.45,2]);assert.equal(renderer.renderScale,2);
}
assert.equal(JSON.stringify(doc),snapshot,'walk mode never touches the document');
renderer.orbit.dispose();renderer.unbindCanvas();assert.equal(handlers.size,before);
for(const item of renderer.items.values())release(item);release(controls.getHelper());
console.log('PASS: renderer runtime hooks swap/restore camera, gizmo, orbit and selection; canvas listeners are removable.');
