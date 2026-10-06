import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {worlds} from '../dist/worlds/data.js';
import {buildWorld} from '../dist/worlds/scene.js';
import * as THREE from '../dist/worlds/vendor/three.module.js';
import {TransformControls} from '../dist/worlds/vendor/TransformControls.js';
import {createDocument,createObject,validateDocument,readImport,History,clone} from '../dist/world-studio/model.js';
import {WorldEditorRenderer} from '../dist/world-studio/renderer.js';
import {readProject,serializeProject,MAX_PROJECT_BYTES} from '../dist/map-studio/project.js';

// Exercise the exact import dispatcher used by World Studio with a current Map Studio
// export, not just the legacy bare-map fixture that previously hid this regression.
{
  const starter=JSON.parse(await readFile(new URL('../examples/map-starter.map.json',import.meta.url),'utf8'));
  const {doc,meta}=readProject(starter);
  const exported=serializeProject(doc,meta),imported=readImport(exported);
  assert.equal(imported.kind,'map');assert.deepEqual(imported.doc,doc);
  assert.equal(imported.doc.points[0].name,'Workshop');
  assert.equal(imported.doc.points[0].data.assetId,'building-001');
  for(const schema of ['motionspec.map.v1','motionspec.map.v2','motionspec.map.v3']){
    const legacy=readImport(JSON.stringify({...starter.payload,schema}));
    assert.equal(legacy.kind,'map');assert.equal(legacy.doc.schema,'motionspec.map.v3');
    assert.equal(legacy.doc.points[0].name,'Workshop');
  }
  assert.throws(()=>readImport(JSON.stringify({...starter,worldId:''})),/Welt-ID/);
  assert.throws(()=>readImport(JSON.stringify({...starter,schema:'ourark.map-project.v2'})),/neueren/);
  assert.throws(()=>readImport(JSON.stringify({...starter,payload:null})),/Karteninhalt/);
  assert.throws(()=>readImport(JSON.stringify({...starter,payload:{...starter.payload,points:null}})));
  // JSON member order is not a format requirement. A map's schema can follow a large field.
  const padding='x'.repeat(1024*1024);
  assert.equal(readImport(JSON.stringify({padding,...starter})).kind,'map');
  const scene=createDocument(worlds[0]);
  assert.deepEqual(readImport(JSON.stringify(scene)),{kind:'scene',doc:scene});
  assert.throws(()=>readImport(JSON.stringify({...scene,padding})),/scene smaller than 1 MB/);
  assert.throws(()=>readImport(JSON.stringify({...scene,padding:'🌍'.repeat(300_000)})),/scene smaller than 1 MB/,'scene budget counts UTF-8 bytes');
  assert.throws(()=>readImport(' '.repeat(MAX_PROJECT_BYTES+1)),/smaller than 16 MB/);
}

// Render text through the real createItem/applyObject methods. The canvas stub records
// the strings painted, so a changed model without a refreshed texture cannot pass.
{
  const previousDocument=Object.getOwnPropertyDescriptor(globalThis,'document'),drawn=[];
  globalThis.document={createElement(tag){
    assert.equal(tag,'canvas');
    return {width:0,height:0,getContext(){return {
      clearRect(){},fillRect(){},strokeRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},
      createLinearGradient(){return {addColorStop(){}};},
      measureText(text){return {width:text.length*20};},fillText(text){drawn.push(text);}
    };}};
  }};
  try{
    for(const kind of ['text','panel']){
      drawn.length=0;
      const editor=Object.create(WorldEditorRenderer.prototype);
      Object.assign(editor,{content:new THREE.Group(),items:new Map(),request(){},updateSelectionBox(){}});
      const record=createObject(kind);record.name='Before rename';record.page.title='';record.page.body='';
      editor.createItem(record,[]);assert.ok(drawn.includes('Before rename'));
      const face=editor.items.get(record.id).visual.children[0],original=face.material.map;
      let disposed=false;original.addEventListener('dispose',()=>{disposed=true;});
      drawn.length=0;record.name='After rename';editor.applyObject(record);
      assert.ok(drawn.includes('After rename'),`${kind} must repaint its displayed name fallback`);
      assert.notEqual(face.material.map,original);assert.equal(disposed,true,'replaced texture released');
      record.page.title='Explicit heading';editor.applyObject(record);
      const explicit=face.material.map;drawn.length=0;record.name='Unshown new name';editor.applyObject(record);
      assert.equal(face.material.map,explicit,'unchanged displayed heading reuses its texture');assert.equal(drawn.length,0);
      // Delimiters inside user text must not make distinct content share a cache key.
      record.page.title='One\nTwo';record.page.body='Three';editor.applyObject(record);
      const beforeBoundaryChange=face.material.map;
      record.page.title='One';record.page.body='Two\nThree';editor.applyObject(record);
      assert.notEqual(face.material.map,beforeBoundaryChange,'heading/body boundaries are part of the key');
      editor.content.traverse(object=>{object.geometry?.dispose();object.material?.map?.dispose();object.material?.dispose();});
    }
  }finally{
    if(previousDocument)Object.defineProperty(globalThis,'document',previousDocument);else delete globalThis.document;
  }
}

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
console.log(`PASS: five worlds, ${meshCount} meshes, actual editable transforms/material isolation/route updates, map envelope/legacy imports and budgets, text fallback repaint, JSON round-trip, undo/redo, reset and invalid imports.`);
