// StateLayout — a fixed field order that copies simulation state into and out of one flat Float64Array without
// allocating (Welle P2, ADR 0006). This is the preparation for rollback netcode: the whole simulation state is one
// memory block, a snapshot is one copy, a rollback is one copy back, and replaying the same commands from it must
// give bit-identical state (tests/sim-snapshot.test.mjs). Numbers are stored as is (Float64 keeps every JS number
// exactly), booleans as 0/1, nullable numbers with NaN as null. Pure logic, no DOM.

export class StateLayout {
  // fields: [name, kind] with kind 'num' | 'bool' | 'nullable'.
  constructor(fields){
    this.fields=fields.map(([name,kind='num'])=>{
      if(!['num','bool','nullable'].includes(kind))throw new Error(`Unbekannte Feldart ${kind} für ${name}`);
      return {name,kind};
    });
    this.size=this.fields.length;
  }
  write(obj,buf,offset=0){
    const f=this.fields;
    for(let i=0;i<f.length;i++){
      const v=obj[f[i].name],kind=f[i].kind;
      buf[offset+i]=kind==='bool'?(v?1:0):kind==='nullable'?(v==null?NaN:v):v;
    }
    return offset+f.length;
  }
  read(buf,offset,obj){
    const f=this.fields;
    for(let i=0;i<f.length;i++){
      const v=buf[offset+i],kind=f[i].kind;
      obj[f[i].name]=kind==='bool'?v===1:kind==='nullable'?(Number.isNaN(v)?null:v):v;
    }
    return offset+f.length;
  }
}

// A group of simulations saved into one buffer. Each part implements stateSize, saveState(buf, offset) → next
// offset and loadState(buf, offset) → next offset (Kart, Race, Plane, Pedestrian).
export class SimSnapshot {
  constructor(parts){this.parts=parts;this.size=parts.reduce((n,p)=>n+p.stateSize,0);}
  create(){return new Float64Array(this.size);}
  save(buf=this.create()){let o=0;for(const p of this.parts)o=p.saveState(buf,o);return buf;}
  restore(buf){let o=0;for(const p of this.parts)o=p.loadState(buf,o);}
}

// Optional object (a plane before its first launch): one presence slot, then the fields (NaN when absent).
// Loading reuses `current` when there is one, so references held by the renderer stay valid.
export function saveOptional(layout,obj,buf,offset){
  buf[offset]=obj?1:0;
  if(obj)layout.write(obj,buf,offset+1);else buf.fill(NaN,offset+1,offset+1+layout.size);
  return offset+1+layout.size;
}
export function loadOptional(layout,buf,offset,current){
  if(buf[offset]!==1)return [null,offset+1+layout.size];
  const obj=current??{};layout.read(buf,offset+1,obj);
  return [obj,offset+1+layout.size];
}
