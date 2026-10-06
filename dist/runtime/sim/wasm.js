// Loader and thin wrapper for the WASM simulation core (sim/ → dist/runtime/sim/sim.wasm). Entities, inputs and the
// terrain grid live in the module's linear memory; this wrapper only creates typed views on it — no copies, so the
// same bytes can go to WebGPU (queue.writeBuffer(buffer, 0, sim.memory.buffer, sim.entitiesPtr, n * 64)).
import {ENTITY_BYTES,OFFSET,MODE} from './layout.js';

export const FLAG={active:1<<8,onGround:1<<9,crashed:1<<10,stalled:1<<11};
const MODE_NAME=Object.fromEntries(Object.entries(MODE).map(([k,v])=>[v,k]));

/** source: WebAssembly.Module (Worker, Node), ArrayBuffer/Uint8Array, or a URL string (browser). */
export async function loadSim(source){
  let module=source;
  if(typeof source==='string'||source instanceof URL)module=await WebAssembly.compileStreaming(fetch(source));
  else if(!(source instanceof WebAssembly.Module))module=await WebAssembly.compile(source);
  const instance=await WebAssembly.instantiate(module,{});
  return new WasmSim(instance);
}

export class WasmSim{
  constructor(instance){
    const x=this.exports=instance.exports;
    if(x.sim_entity_bytes()!==ENTITY_BYTES)throw new Error('Sim-Kern und Layout v1 passen nicht zusammen');
    this.memory=x.memory;this.capacity=x.sim_capacity();
    this.entitiesPtr=x.sim_entities();this.inputsPtr=x.sim_inputs();this.heightPtr=x.sim_height();
    this.views();
  }
  // Typed views on linear memory (recreated if the memory ever grows).
  views(){
    const b=this.memory.buffer;this.viewBuffer=b;
    this.f32=new Float32Array(b,this.entitiesPtr,this.capacity*16);this.u32=new Uint32Array(b,this.entitiesPtr,this.capacity*16);
    this.inF32=new Float32Array(b,this.inputsPtr,this.capacity*4);this.inU32=new Uint32Array(b,this.inputsPtr,this.capacity*4);
  }
  check(){if(this.memory.buffer!==this.viewBuffer)this.views();}
  /** The entity records as bytes (count × 64 B), a view — not a copy — for GPU upload or the network. */
  entityBytes(count=this.capacity){this.check();return new Uint8Array(this.memory.buffer,this.entitiesPtr,count*ENTITY_BYTES);}
  setTerrain(heights,width,depth,cell=1,scale=.01){
    const count=width*depth,cell32=Math.fround(cell),scale32=Math.fround(scale);
    if(!Number.isInteger(width)||!Number.isInteger(depth)||width<2||depth<2||count>1_000_000)throw new RangeError('Ungültige Höhenraster-Größe');
    if(!Number.isFinite(cell)||!Number.isFinite(cell32)||cell32<=0||!Number.isFinite(scale)||!Number.isFinite(scale32)||scale<0)throw new RangeError('Ungültiger Höhenraster-Maßstab');
    if(!(heights instanceof Uint16Array)||heights.length!==count)throw new TypeError('Höhenraster braucht genau Breite × Tiefe Uint16-Werte');
    // Validate and construct the view before changing either the active grid or its metadata.
    const grid=new Uint16Array(this.memory.buffer,this.heightPtr,count);
    if(!this.exports.sim_set_terrain(width,depth,cell,scale))throw new Error('Höhenraster abgelehnt');
    grid.set(heights);
  }
  ground(x,z){return this.exports.sim_ground(x,z);}
  spawn(slot,{id=slot+1,mode,x=0,z=0,heading=0,height=80}){
    if(!this.exports.sim_spawn(slot,id,MODE[mode]??0,x,z,heading,height))throw new RangeError(`spawn ${slot} ${mode}`);
  }
  despawn(slot){this.exports.sim_despawn(slot);}
  /** car {throttle,steer,handbrake} · walk {forward,strafe,turn,run,jump} · plane {pitch,roll,yaw,throttle (−1|0|1)} */
  setInput(slot,input={}){
    this.check();const o=slot*4,mode=MODE_NAME[this.u32[slot*16+1]&0xf];
    if(mode==='walk'){this.inF32[o]=input.forward??0;this.inF32[o+1]=input.strafe??0;this.inF32[o+2]=input.turn??0;this.inU32[o+3]=(input.run?1:0)|(input.jump?2:0);}
    else if(mode==='plane'){this.inF32[o]=input.pitch??0;this.inF32[o+1]=input.roll??0;this.inF32[o+2]=input.yaw??0;this.inU32[o+3]=(input.throttle>0?1:0)|(input.throttle<0?2:0);}
    else{this.inF32[o]=input.throttle??0;this.inF32[o+1]=input.steer??0;this.inF32[o+2]=0;this.inU32[o+3]=input.handbrake?1:0;}
  }
  step(dt,steps=1,count=this.capacity){this.exports.sim_step(dt,steps,count);}
  read(slot){
    this.check();const w=slot*16,f=this.f32,u=this.u32,flags=u[w+1];
    return {id:u[w],mode:MODE_NAME[flags&0xf]??'none',flags,onGround:!!(flags&FLAG.onGround),crashed:!!(flags&FLAG.crashed),tick:u[w+2],
      x:f[w+OFFSET.pos/4],y:f[w+OFFSET.pos/4+1],z:f[w+OFFSET.pos/4+2],vel:[f[w+8],f[w+9],f[w+10]],
      heading:f[w+12],pitch:f[w+13],roll:f[w+14],speed:this.exports.sim_speed(slot)};
  }
}
