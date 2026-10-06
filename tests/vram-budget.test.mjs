// VRAM budget (layer 5): chunk LOD by distance, eviction of long-hidden chunks beyond the budget, automatic restore.
import assert from 'node:assert/strict';
import {ChunkLod} from '../dist/runtime/lod/chunk-lod.js';

const fakeMesh=(kind,x,z,bytes)=>{const m={visible:true,userData:{lod:{kind}},geometry:{boundingSphere:{center:{x,y:0,z},radius:30},disposed:0,dispose(){this.disposed++;},attributes:{position:{array:{byteLength:bytes}}}}};return m;};
const clock={t:0};
{ // Near: drawn with shadows; up to the view distance (fog end) without; beyond not drawn. Walls and roofs together.
  const wall=fakeMesh('wall',0,-200,1e6),roof=fakeMesh('roof',0,-200,1e6),farRoof=fakeMesh('roof',0,-3000,1e6);
  const lod=new ChunkLod([wall,roof,farRoof],{shadowDistance:260,viewDistance:1400,budgetBytes:1e9,now:()=>clock.t});
  lod.update({x:0,y:2,z:0});assert.equal(wall.visible,true);assert.equal(wall.castShadow,true);assert.equal(farRoof.visible,false);
  lod.update({x:0,y:2,z:400});
  assert.equal(wall.visible,true);assert.equal(roof.visible,true,'roofs never float without walls');assert.equal(wall.castShadow,false,'shadows fade first');
  const s=lod.stats();assert.equal(s.chunks,3);assert.equal(s.visible,2);assert.equal(s.shadowing,0);assert.equal(s.residentBytes,3e6);
}
{ // Budget: hidden chunks are evicted (geometry disposed) oldest-hidden first until resident bytes fit; visible never.
  const meshes=[0,1,2,3].map(i=>fakeMesh('wall',0,-i*400,10e6));
  const lod=new ChunkLod(meshes,{shadowDistance:100,viewDistance:260,budgetBytes:25e6,evictAfterMs:5000,now:()=>clock.t});
  clock.t=0;lod.update({x:0,y:0,z:0});// only mesh 0 visible
  assert.equal(lod.stats().residentBytes,40e6,'nothing evicted before the grace period');
  clock.t=6000;lod.update({x:0,y:0,z:0});
  const s=lod.stats();assert.ok(s.residentBytes<=25e6,`fits the budget (${s.residentBytes})`);assert.equal(meshes[0].geometry.disposed,0,'visible chunk kept');
  assert.equal(s.evicted,2);assert.ok(meshes[3].geometry.disposed===1&&meshes[2].geometry.disposed===1,'farthest/oldest hidden first');
  // Coming close again: visible, counted resident again (three.js re-uploads a disposed geometry when drawn).
  clock.t=7000;lod.update({x:0,y:0,z:-1200});assert.equal(meshes[3].visible,true);assert.equal(lod.stats().restored,1);
}
console.log('PASS: chunk LOD + VRAM budget — shadow/view/hidden levels, eviction after a grace period, never visible chunks, restore.');
