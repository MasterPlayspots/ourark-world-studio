import assert from 'node:assert/strict';
import {worlds} from '../dist/worlds/data.js';
import {buildWorld} from '../dist/worlds/scene.js';
import * as THREE from '../dist/worlds/vendor/three.module.js';
import {TransformControls} from '../dist/worlds/vendor/TransformControls.js';
import {createDocument,createObject,validateDocument,History,clone} from '../dist/world-studio/model.js';
import {WorldEditorRenderer} from '../dist/world-studio/renderer.js';

let meshCount=0;
for(const world of worlds){
  const d=createDocument(world);
  assert.equal(d.objects.length,5);
  assert.deepEqual(validateDocument(JSON.parse(JSON.stringify(d))),d);
  const built=buildWorld(world);assert.equal(built.targets.length,4);
  built.root.updateMatrixWorld(true);
  built.root.traverse(o=>{if(o.isMesh){meshCount++;assert.ok(o.matrixWorld.elements.every(Number.isFinite));assert.ok(!new THREE.Box3().setFromObject(o).isEmpty());}});

  // Exercise actual editor mesh/material and route code without requiring WebGL.
  const editor=Object.create(WorldEditorRenderer.prototype);
  Object.assign(editor,{content:new THREE.Group(),scene:new THREE.Scene(),items:new Map(),request(){},selected:null,selectionBox:new THREE.Box3Helper(new THREE.Box3()),doc:d});
  const originalColor=built.targets[0].children[0].material.color.clone();
  editor.createItem(d.objects[0],built.targets);
  const copy=clone(d.objects[0]);copy.id='copy';copy.position=[3,2,1];copy.color='#ff0066';
  editor.createItem(copy,built.targets);
  assert.ok(built.targets[0].children[0].material.color.equals(originalColor),'Source material must remain unchanged');
  assert.notEqual(editor.items.get(copy.id).visual.children[0].children[0].material,editor.items.get(d.objects[0].id).visual.children[0].children[0].material);
  d.objects[0].position=[2,3,4];d.objects[0].rotation=[25,-40,90];d.objects[0].scale=[2,.5,3];
  editor.applyObject(d.objects[0]);assert.deepEqual(editor.items.get(d.objects[0].id).group.position.toArray(),[2,3,4]);
  editor.updateRoute();const positions=editor.route.geometry.getAttribute('position');assert.equal(positions.getX(0),2);assert.equal(positions.getZ(0),4);
  for(const kind of ['box','sphere','ring','beacon']){const record=createObject(kind);editor.createItem(record,built.targets);assert.ok(!new THREE.Box3().setFromObject(editor.items.get(record.id).group).isEmpty());}

  const history=new History(),before=clone(d);
  d.objects[0].page.title='Edited destination';d.objects[0].locked=true;d.objects[1].visible=false;
  assert.ok(history.record(before,d));assert.deepEqual(history.undo(d),before);assert.deepEqual(history.redo(before),d);
  const imported=validateDocument(JSON.parse(JSON.stringify(d)));assert.equal(imported.objects[0].page.title,'Edited destination');assert.equal(imported.objects[1].visible,false);
  const invalid=clone(d);invalid.objects[0].position[0]=Infinity;assert.throws(()=>validateDocument(invalid));
  const duplicateId=clone(d);duplicateId.objects[1].id=duplicateId.objects[0].id;assert.throws(()=>validateDocument(duplicateId));
  const invalidScale=clone(d);invalidScale.objects[0].scale[0]=0;assert.throws(()=>validateDocument(invalidScale));
  const reset=createDocument(world);history.record(d,reset);assert.deepEqual(history.undo(reset),d);
}
const controls=new TransformControls(new THREE.PerspectiveCamera());
assert.ok(controls.getHelper());controls.setMode('rotate');assert.equal(controls.getMode(),'rotate');controls.setMode('scale');controls.setTranslationSnap(.5);assert.equal(controls.translationSnap,.5);
// No DOM was attached in this non-browser test; release the helper directly.
controls.getHelper().traverse(o=>{o.geometry?.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());});
console.log(`PASS: five worlds, ${meshCount} meshes, actual editable transforms/material isolation/route updates, JSON round-trip, undo/redo, reset and invalid imports.`);
