// Entity culling and LOD (layer 5) on sim-state-v1 records (layer 1), on the GPU via a WebGPU compute shader
// (layer 2) or on the CPU with the very same rules. Per entity: active? → dot-product facing (behind the camera,
// farther than two radii → culled) → frustum test in clip space with a radius margin → distance LOD (NEAR / MID /
// FAR) or CULLED beyond the last distance. The entity bytes go to the GPU unchanged (queue.writeBuffer from the
// EntityStore's ArrayBuffer or from WASM memory) — no repacking, because the WGSL struct is the layout itself.
import {WGSL_ENTITY,ENTITY_BYTES} from '../sim/layout.js';

export const LOD=Object.freeze({NEAR:0,MID:1,FAR:2});
export const CULLED=255;
const ACTIVE=1<<8,CAMERA_FLOATS=32;

/** position, forward (unit), viewProj (column-major 16), lod [near, mid, far] m, radius m → camera block (128 B). */
export function cameraFrom({position,forward,viewProj,lod=[30,90,250],radius=3}){
  const data=new Float32Array(CAMERA_FLOATS);
  data.set(viewProj,0);data.set([position[0],position[1],position[2],1],16);data.set([forward[0],forward[1],forward[2],0],20);
  data.set([lod[0],lod[1],lod[2],radius],24);
  return {data,u32:new Uint32Array(data.buffer)};
}

/** CPU reference: f32/u32 views on the records, entity count, camera block → Uint8Array of LOD codes per slot. */
export function cullCpu(f32,u32,count,cam,out=new Uint8Array(count)){
  const c=cam.data,f=Math.fround;
  for(let i=0;i<count;i++){
    const w=i*16;let code=CULLED;
    if(u32[w+1]&ACTIVE){
      const x=f32[w+4],y=f32[w+5],z=f32[w+6],dx=f(x-c[16]),dy=f(y-c[17]),dz=f(z-c[18]),dist=f(Math.hypot(dx,dy,dz)),r=c[27];
      const facing=f((dx*c[20]+dy*c[21]+dz*c[22])/Math.max(dist,1e-4));
      if(!(facing<-.3&&dist>2*r)){
        const cx=c[0]*x+c[4]*y+c[8]*z+c[12],cy=c[1]*x+c[5]*y+c[9]*z+c[13],cz=c[2]*x+c[6]*y+c[10]*z+c[14],cw=c[3]*x+c[7]*y+c[11]*z+c[15],m=cw+r*2;
        if(cw>-r&&Math.abs(cx)<=m&&Math.abs(cy)<=m&&cz<=cw+r)code=dist<c[24]?LOD.NEAR:dist<c[25]?LOD.MID:dist<c[26]?LOD.FAR:CULLED;
      }
    }
    out[i]=code;
  }
  return out;
}

export const WGSL_CULL=`${WGSL_ENTITY}
struct Camera {
  viewProj: mat4x4<f32>,
  pos: vec4<f32>,
  forward: vec4<f32>,
  lod: vec4<f32>,   // x near, y mid, z far (m), w entity radius (m)
  count: u32, _p0: u32, _p1: u32, _p2: u32,
};
@group(0) @binding(0) var<storage, read> entities: array<Entity>;
@group(0) @binding(1) var<uniform> cam: Camera;
@group(0) @binding(2) var<storage, read_write> result: array<u32>;
@group(0) @binding(3) var<storage, read_write> counts: array<atomic<u32>, 4>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= cam.count) { return; }
  let e = entities[i];
  var code = 255u;
  if ((e.flags & 256u) != 0u) {
    let d = e.pos - cam.pos.xyz;
    let dist = length(d);
    let r = cam.lod.w;
    let facing = dot(d / max(dist, 1e-4), cam.forward.xyz);
    if (!(facing < -0.3 && dist > 2.0 * r)) {
      let c = cam.viewProj * vec4<f32>(e.pos, 1.0);
      let m = c.w + r * 2.0;
      if (c.w > -r && abs(c.x) <= m && abs(c.y) <= m && c.z <= c.w + r) {
        if (dist < cam.lod.x) { code = 0u; } else if (dist < cam.lod.y) { code = 1u; } else if (dist < cam.lod.z) { code = 2u; }
      }
    }
  }
  result[i] = code;
  atomicAdd(&counts[min(code, 3u)], 1u);
}`;

/** Culler with a WebGPU backend when available, the CPU reference otherwise. */
export class EntityCuller{
  static async create({capacity,gpu=globalThis.navigator?.gpu,preferGpu=true}={}){
    const culler=new EntityCuller(capacity);
    if(preferGpu&&gpu)try{await culler.initGpu(gpu);}catch(error){culler.gpuError=String(error?.message??error);}
    return culler;
  }
  constructor(capacity){this.capacity=capacity;this.backend='cpu';this.busy=false;this.lastMs=0;this.gpuError=null;this.lastStats=null;}
  async initGpu(gpu){
    const adapter=await gpu.requestAdapter({powerPreference:'high-performance'});if(!adapter)throw new Error('kein WebGPU-Adapter');
    const device=await adapter.requestDevice(),n=this.capacity;
    const module=device.createShaderModule({code:WGSL_CULL});
    const info=await module.getCompilationInfo?.();if(info?.messages?.some(m=>m.type==='error'))throw new Error(info.messages.map(m=>m.message).join('; '));
    const pipeline=await device.createComputePipelineAsync({layout:'auto',compute:{module,entryPoint:'main'}});
    const S=GPUBufferUsage;
    this.gpu={device,pipeline,
      entities:device.createBuffer({size:n*ENTITY_BYTES,usage:S.STORAGE|S.COPY_DST}),
      camera:device.createBuffer({size:CAMERA_FLOATS*4,usage:S.UNIFORM|S.COPY_DST}),
      result:device.createBuffer({size:n*4,usage:S.STORAGE|S.COPY_SRC}),
      counts:device.createBuffer({size:16,usage:S.STORAGE|S.COPY_DST}),
      readback:device.createBuffer({size:n*4,usage:S.MAP_READ|S.COPY_DST})};
    const g=this.gpu;
    g.bind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[g.entities,g.camera,g.result,g.counts].map((buffer,binding)=>({binding,resource:{buffer}}))});
    this.backend='webgpu';
  }
  /** bytes: the records (Uint8Array view on the EntityStore buffer or WASM memory), count, camera → Uint8Array codes. */
  // lastMs/lastStats.totalMs is the whole call as the caller waits for it: on WebGPU upload (writeBuffer), submit,
  // GPU work and the mapAsync readback together — not pure GPU time. uploadMs is the CPU side until submit, waitMs
  // the readback wait (W3: report GPU culling with its transfers, never as compute time alone).
  async cull(bytes,count,cam){
    const t0=performance.now();let out;this.phase=null;
    if(this.backend==='webgpu'){
      try{out=await this.cullGpu(bytes,count,cam);}
      catch(error){this.backend='cpu';this.gpuError=String(error?.message??error);}// device lost etc.: CPU from now on
    }
    if(!out){
      const f32=new Float32Array(bytes.buffer,bytes.byteOffset,count*16),u32=new Uint32Array(bytes.buffer,bytes.byteOffset,count*16);
      out=cullCpu(f32,u32,count,cam);
    }
    this.note(this.phase?'webgpu':'cpu',count,performance.now()-t0,this.phase);
    return out;
  }
  /** Records one culling pass (also for callers that run cullCpu themselves, e.g. the kart's synchronous path). */
  note(backend,count,totalMs,phase=null){
    this.lastMs=totalMs;this.lastStats={backend,count,totalMs,uploadMs:phase?.uploadMs??null,waitMs:phase?.waitMs??null};
  }
  async cullGpu(bytes,count,cam){
    const t0=performance.now(),g=this.gpu,q=g.device.queue;count=Math.min(count,this.capacity);
    cam.u32[28]=count;
    q.writeBuffer(g.entities,0,bytes.buffer,bytes.byteOffset,count*ENTITY_BYTES);// one copy, no repacking
    q.writeBuffer(g.camera,0,cam.data);q.writeBuffer(g.counts,0,new Uint32Array(4));
    const enc=g.device.createCommandEncoder(),pass=enc.beginComputePass();
    pass.setPipeline(g.pipeline);pass.setBindGroup(0,g.bind);pass.dispatchWorkgroups(Math.ceil(count/64));pass.end();
    enc.copyBufferToBuffer(g.result,0,g.readback,0,count*4);q.submit([enc.finish()]);
    const submitted=performance.now();
    await g.readback.mapAsync(globalThis.GPUMapMode?.READ??1,0,count*4);
    try{const codes=Uint8Array.from(new Uint32Array(g.readback.getMappedRange(0,count*4)),v=>v>255?255:v);
      this.phase={uploadMs:submitted-t0,waitMs:performance.now()-submitted};return codes;}
    finally{g.readback.unmap();}
  }
  /** GPU vs CPU on random entities → {backend,count,mismatches,gpuMs,cpuMs}. */
  async selfTest(count=Math.min(this.capacity,10000)){
    const bytes=new Uint8Array(count*ENTITY_BYTES),f32=new Float32Array(bytes.buffer),u32=new Uint32Array(bytes.buffer);
    let seed=7;const rand=()=>((seed=(seed*16807)%2147483647)/2147483647);
    for(let i=0;i<count;i++){u32[i*16]=i+1;u32[i*16+1]=ACTIVE|1;f32[i*16+4]=(rand()-.5)*800;f32[i*16+5]=rand()*40;f32[i*16+6]=(rand()-.5)*800;}
    const f=1/Math.tan(Math.PI/6),cam=cameraFrom({position:[0,2,0],forward:[0,0,-1],viewProj:[f,0,0,0,0,f,0,0,0,0,-1.001,-1,0,0,-2.001,0]});
    const t0=performance.now(),cpu=cullCpu(f32,u32,count,cam),cpuMs=performance.now()-t0;
    const gpuCodes=await this.cull(bytes,count,cam);
    let mismatches=0;for(let i=0;i<count;i++)if(gpuCodes[i]!==cpu[i])mismatches++;
    return {backend:this.backend,count,mismatches,gpuMs:+this.lastMs.toFixed(2),cpuMs:+cpuMs.toFixed(2),error:this.gpuError};
  }
}
