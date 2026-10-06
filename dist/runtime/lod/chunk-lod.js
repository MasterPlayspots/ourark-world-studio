// Static-world LOD and VRAM budget (layer 5) for chunked meshes (the kart's 120 m LoD2 building chunks): near
// (shadowDistance) a chunk casts shadows, up to viewDistance (the fog's far end) it is drawn without, beyond it is
// not drawn at all (no draw calls for what the fog hides anyway). Walls and roofs switch together, so roofs never
// float without their walls. Chunks hidden for evictAfterMs are
// evicted while the resident geometry exceeds budgetBytes (geometry.dispose() frees the GPU buffers; the CPU arrays
// stay, so three.js uploads them again by itself when the chunk becomes visible) — farthest, longest hidden first.

const ORIGIN=Object.freeze({x:0,y:0,z:0});

export class ChunkLod{
  constructor(meshes,{shadowDistance=260,viewDistance=1400,budgetBytes=64e6,evictAfterMs=10000,now=()=>performance.now()}={}){
    Object.assign(this,{shadowDistance,viewDistance,budgetBytes,evictAfterMs,now});
    this.entries=meshes.map(mesh=>({mesh,bytes:bytesOf(mesh.geometry),resident:true,hiddenSince:null,dist:0}));
    this.evicted=0;this.restored=0;
  }
  // Runs every frame over all chunks: plain loops and squared distances, no allocation (ADR 0006, P2 gate).
  update(cam){
    const now=this.now();
    for(const e of this.entries){
      const s=e.mesh.geometry.boundingSphere,c=s?s.center:ORIGIN,dx=c.x-cam.x,dy=c.y-cam.y,dz=c.z-cam.z;
      e.dist=Math.max(0,Math.sqrt(dx*dx+dy*dy+dz*dz)-(s?s.radius:0));
      const visible=e.dist<this.viewDistance;
      e.mesh.visible=visible;e.mesh.castShadow=visible&&e.dist<this.shadowDistance;
      if(visible){if(!e.resident){e.resident=true;this.restored++;}e.hiddenSince=null;}
      else e.hiddenSince??=now;
    }
    let resident=this.residentBytes();
    if(resident<=this.budgetBytes)return;
    const candidates=this.entries.filter(e=>e.resident&&e.hiddenSince!==null&&now-e.hiddenSince>=this.evictAfterMs)
      .sort((a,b)=>a.hiddenSince-b.hiddenSince||b.dist-a.dist);
    for(const e of candidates){
      if(resident<=this.budgetBytes)break;
      e.mesh.geometry.dispose();e.resident=false;resident-=e.bytes;this.evicted++;
    }
  }
  residentBytes(){let sum=0;for(const e of this.entries)if(e.resident)sum+=e.bytes;return sum;}
  stats(){return {chunks:this.entries.length,visible:this.entries.filter(e=>e.mesh.visible).length,shadowing:this.entries.filter(e=>e.mesh.castShadow).length,residentBytes:this.residentBytes(),
    totalBytes:this.entries.reduce((s,e)=>s+e.bytes,0),evicted:this.evicted,restored:this.restored,budgetBytes:this.budgetBytes};}
}

const bytesOf=geometry=>Object.values(geometry?.attributes??{}).reduce((sum,a)=>sum+(a.array?.byteLength??0),0)+(geometry?.index?.array?.byteLength??0);
