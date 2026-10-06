// Entity culling + LOD (layer 5) on the 64-byte records (layer 1): frustum, dot-product facing, distance LOD.
// The CPU path is the reference for the WebGPU compute shader (same rules; GPU parity is checked in the browser).
import assert from 'node:assert/strict';
import {LOD,CULLED,cullCpu,cameraFrom,WGSL_CULL,EntityCuller} from '../dist/runtime/gpu/cull.js';
import {EntityStore,WGSL_ENTITY} from '../dist/runtime/sim/layout.js';

// A camera at the origin looking north (−z), 60° fov, aspect 1, near 1, far 2000 → column-major view-projection.
function perspective(fovDeg,aspect,near,far){const f=1/Math.tan(fovDeg*Math.PI/360);return [f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)/(near-far),-1, 0,0,2*far*near/(near-far),0];}
const cam=cameraFrom({position:[0,2,0],forward:[0,0,-1],viewProj:perspective(60,1,1,2000),lod:[30,90,250],radius:3});

{ // Rules: in front and near → LOD 0, then 1, 2, beyond the last distance culled; behind (facing) and outside the frustum culled.
  const store=new EntityStore(16);
  const put=(id,x,y,z)=>store.upsert(id,{mode:'kart',pos:[x,y,z]});
  const slots={near:put(1,0,0,-10),mid:put(2,0,0,-60),far:put(3,0,0,-200),gone:put(4,0,0,-400),behind:put(5,0,0,40),side:put(6,300,0,-20),edge:put(7,6,0,-10)};
  const out=cullCpu(store.f32,store.u32,16,cam);
  assert.equal(out[slots.near],LOD.NEAR);assert.equal(out[slots.mid],LOD.MID);assert.equal(out[slots.far],LOD.FAR);
  assert.equal(out[slots.gone],CULLED,'beyond the LOD range');assert.equal(out[slots.behind],CULLED,'behind the camera (facing)');
  assert.equal(out[slots.side],CULLED,'outside the frustum');assert.equal(out[slots.edge],LOD.NEAR,'inside the side margin (radius)');
  for(let s=0;s<16;s++)if(!Object.values(slots).includes(s))assert.equal(out[s],CULLED,'empty slots are culled');
}
{ // The WGSL compute shader declares exactly the layout-v1 Entity struct and the same rules.
  assert.ok(WGSL_CULL.includes(WGSL_ENTITY),'shares the Entity struct of sim state layout v1');
  for(const k of ['@compute @workgroup_size(64)','var<storage, read> entities','dot(','cam.lod','atomicAdd'])assert.ok(WGSL_CULL.includes(k),k);
}
{ // 10 000 entities on the CPU: fast enough as the fallback.
  const store=new EntityStore(10000);for(let i=0;i<10000;i++)store.upsert(i+1,{mode:'kart',pos:[(i%100)*6-300,0,-Math.floor(i/100)*6]});
  const t0=performance.now();const out=cullCpu(store.f32,store.u32,10000,cam);const ms=performance.now()-t0;
  const counts=[0,0,0,0];for(const v of out)counts[v===CULLED?3:v]++;
  console.log(`  CPU: 10 000 Entities in ${ms.toFixed(2)} ms · nah ${counts[0]} · mittel ${counts[1]} · fern ${counts[2]} · verworfen ${counts[3]}`);
  assert.ok(ms<50);assert.ok(counts[0]>0&&counts[1]>0&&counts[2]>0&&counts[3]>0);
}
{ // Review fix: a failing GPU (device lost, mapAsync rejected) falls back to the CPU path for good, with the same result.
  const culler=new EntityCuller(16);let unmapped=0;
  culler.backend='webgpu';
  culler.gpu={device:{queue:{writeBuffer(){},submit(){}},createCommandEncoder:()=>({beginComputePass:()=>({setPipeline(){},setBindGroup(){},dispatchWorkgroups(){},end(){}}),copyBufferToBuffer(){},finish(){}})},
    readback:{mapAsync:async()=>{throw new Error('device lost');},getMappedRange(){},unmap(){unmapped++;}}};
  const store=new EntityStore(16);store.upsert(1,{mode:'kart',pos:[0,0,-10]});
  const out=await culler.cull(new Uint8Array(store.buffer),16,cam);
  assert.equal(culler.backend,'cpu');assert.match(culler.gpuError,/device lost/);assert.equal(out[store.slot(1)],LOD.NEAR);
}
console.log('PASS: entity culling — frustum, facing, distance LOD on layout-v1 records; WGSL shares the struct; CPU fallback speed.');
