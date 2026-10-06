// Sim state layout v1 (contracts/sim-state-v1.md): one entity = 64 bytes, laid out exactly like the WGSL struct below
// (vec3<f32> is 16-byte aligned in WGSL), so the same bytes can later be written from WASM linear memory into a
// WebGPU storage buffer without repacking. EntityStore keeps a fixed number of records in one ArrayBuffer: updates
// write into typed views, nothing is allocated per update.

export const ENTITY_BYTES=64;
export const OFFSET=Object.freeze({id:0,flags:4,tick:8,pos:16,vel:32,heading:48,pitch:52,roll:56,mutation:60});
// flags: bits 0–3 mode, bits 4–7 LOD level, bit 8 active.
export const MODE=Object.freeze({none:0,kart:1,plane:2,walk:3,car:4});
const MODE_NAME=Object.fromEntries(Object.entries(MODE).map(([k,v])=>[v,k]));
const ACTIVE=1<<8;

export const WGSL_ENTITY=`struct Entity {
  id: u32,
  flags: u32,
  tick: u32,
  _pad0: u32,
  pos: vec3<f32>,
  _pad1: f32,
  vel: vec3<f32>,
  _pad2: f32,
  heading: f32,
  pitch: f32,
  roll: f32,
  mutation: u32,
};`;

export class EntityStore{
  constructor(capacity){
    this.capacity=capacity;this.buffer=new ArrayBuffer(capacity*ENTITY_BYTES);
    this.u32=new Uint32Array(this.buffer);this.f32=new Float32Array(this.buffer);
    this.slots=new Map();this.free=[];for(let i=capacity-1;i>=0;i--)this.free.push(i);
  }
  get count(){return this.slots.size;}
  ids(){return this.slots.keys();}
  slot(id){return this.slots.get(id)??-1;}
  // Writes the given fields of entity `id` (creating its record if needed); returns the slot, −1 when full.
  upsert(id,{mode,pos,vel,heading,pitch,roll,tick,mutation}={}){
    let s=this.slots.get(id);
    if(s===undefined){
      if(!this.free.length)return -1;
      s=this.free.pop();this.slots.set(id,s);
      this.u32.fill(0,s*16,s*16+16);this.u32[s*16]=id;this.u32[s*16+1]=ACTIVE;
    }
    const w=s*16;// 16 words of 4 bytes per record
    if(mode!==undefined)this.u32[w+1]=(this.u32[w+1]&~0xf)|(MODE[mode]??0);
    if(tick!==undefined)this.u32[w+2]=tick>>>0;
    if(pos){this.f32[w+4]=pos[0];this.f32[w+5]=pos[1];this.f32[w+6]=pos[2];}
    if(vel){this.f32[w+8]=vel[0];this.f32[w+9]=vel[1];this.f32[w+10]=vel[2];}
    if(heading!==undefined)this.f32[w+12]=heading;
    if(pitch!==undefined)this.f32[w+13]=pitch;
    if(roll!==undefined)this.f32[w+14]=roll;
    if(mutation!==undefined)this.u32[w+15]=mutation>>>0;
    return s;
  }
  read(id){
    const s=this.slots.get(id);if(s===undefined)return null;const w=s*16,f=this.f32,u=this.u32;
    return {id:u[w],mode:MODE_NAME[u[w+1]&0xf]??'none',lod:(u[w+1]>>4)&0xf,tick:u[w+2],pos:[f[w+4],f[w+5],f[w+6]],vel:[f[w+8],f[w+9],f[w+10]],
      heading:f[w+12],pitch:f[w+13],roll:f[w+14],mutation:u[w+15]};
  }
  remove(id){const s=this.slots.get(id);if(s===undefined)return;this.slots.delete(id);this.u32.fill(0,s*16,s*16+16);this.free.push(s);}
}
