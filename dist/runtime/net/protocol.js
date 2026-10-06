// Network protocol v1 (contracts/net-protocol-v1.md), shared by the browser and the Worker. Little endian.
// Header 12 B: magic "OA" u16 · version u8 · type u8 · tick u32 · count u16 · flags u16.
// Record 16 B: id u32 · x, y, z i16 (1/16 m relative to the map centre, ±2047.9 m) · heading u16 (2π/65536) ·
// speed i16 (cm/s, ±327 m/s) · mode u8 · flags u8. A message carries at most 64 records (1036 B).

export const MAGIC=0x414f,VERSION=1,HEADER_BYTES=12,RECORD_BYTES=16,MAX_RECORDS=64,POS_SCALE=16,SPEED_SCALE=100;
// POSE carries in its header `tick` the last snapshot/delta tick the client applied (the acknowledgement).
export const TYPE=Object.freeze({POSE:1,SNAPSHOT:2,PING:3,PONG:4,WELCOME:5,DELTA:6,CORRECT:7});
// Record flags: TELEPORT (client → server only), BRAKING and CRASHED (state for vertex-shader mutation on others).
export const FLAG=Object.freeze({TELEPORT:1,BRAKING:2,CRASHED:4});
const TYPES=new Set(Object.values(TYPE));
const MODES=['none','kart','plane','walk','car'];
const TAU=Math.PI*2;

export const quantize=(value,scale)=>Math.max(-32768,Math.min(32767,Math.round(value*scale)));

// Range limits made explicit (W3, finding P02). quantize() clamps; these checks let callers see it instead.
// POS_LIMIT: largest position the i16 record can carry (2047.9375 m). ROOM_BOUND: what the map room accepts
// (edge/room.mjs), the binding limit for shared walking. Map Studio allows maps up to 5000 m (±2500 m).
export const POS_LIMIT=32767/POS_SCALE,ROOM_BOUND=2000;
/** Record would be clamped by encode()? (x, y, z beyond the i16 range). */
export const poseOutOfRange=r=>[r.x,r.y,r.z].some(v=>Math.abs(v??0)>POS_LIMIT);
/** Can every position of this map travel through the network unchanged and be accepted by the room? */
export function mapFitsNetwork(map,bound=ROOM_BOUND){
  const limit=Math.min(bound,POS_LIMIT),reach=Math.max(map.width,map.depth)/2;
  return {ok:reach<=limit,reach,limit};
}
export const dequantize=(q,scale)=>q/scale;

/** type, tick, records [{id,x,y,z,heading,speed,mode,flags}], header flags → Uint8Array. */
export function encode(type,tick,records=[],flags=0){
  if(records.length>MAX_RECORDS)throw new RangeError(`at most ${MAX_RECORDS} records per message`);
  const bytes=new Uint8Array(HEADER_BYTES+records.length*RECORD_BYTES),v=new DataView(bytes.buffer);
  v.setUint16(0,MAGIC,true);v.setUint8(2,VERSION);v.setUint8(3,type);v.setUint32(4,tick>>>0,true);v.setUint16(8,records.length,true);v.setUint16(10,flags,true);
  records.forEach((r,i)=>{
    const o=HEADER_BYTES+i*RECORD_BYTES,h=(((r.heading??0)%TAU)+TAU)%TAU;
    v.setUint32(o,r.id>>>0,true);
    v.setInt16(o+4,quantize(r.x??0,POS_SCALE),true);v.setInt16(o+6,quantize(r.y??0,POS_SCALE),true);v.setInt16(o+8,quantize(r.z??0,POS_SCALE),true);
    v.setUint16(o+10,Math.round(h/TAU*65536)%65536,true);
    v.setInt16(o+12,quantize(r.speed??0,SPEED_SCALE),true);
    v.setUint8(o+14,Math.max(0,MODES.indexOf(r.mode??'none')));v.setUint8(o+15,(r.flags??0)&255);
  });
  return bytes;
}

/** Uint8Array | ArrayBuffer → {type,tick,flags,records} or null when anything is off (never throws). */
export function decode(data){
  let bytes;
  if(data instanceof Uint8Array)bytes=data;else if(data instanceof ArrayBuffer)bytes=new Uint8Array(data);else return null;
  if(bytes.byteLength<HEADER_BYTES)return null;
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(v.getUint16(0,true)!==MAGIC||v.getUint8(2)!==VERSION)return null;
  const type=v.getUint8(3),count=v.getUint16(8,true);
  if(!TYPES.has(type)||type===TYPE.DELTA||count>MAX_RECORDS||bytes.byteLength!==HEADER_BYTES+count*RECORD_BYTES)return null;
  const records=[];
  for(let i=0;i<count;i++){
    const o=HEADER_BYTES+i*RECORD_BYTES,heading=v.getUint16(o+10,true)/65536*TAU;
    records.push({id:v.getUint32(o,true),x:dequantize(v.getInt16(o+4,true),POS_SCALE),y:dequantize(v.getInt16(o+6,true),POS_SCALE),
      z:dequantize(v.getInt16(o+8,true),POS_SCALE),heading:heading>Math.PI?heading-TAU:heading,speed:dequantize(v.getInt16(o+12,true),SPEED_SCALE),
      mode:MODES[v.getUint8(o+14)]??'none',flags:v.getUint8(o+15)});
  }
  return {type,tick:v.getUint32(4,true),flags:v.getUint16(10,true),records};
}

// ---- Deltas (type DELTA): header (count = entries) · base tick u32 · entries. Entry: id varint · mask u8 ·
// fields. mask bits 0 x, 1 y, 2 z, 3 heading, 4 speed, 5 mode+flags, 6 NEW (all fields absolute), 7 GONE.
// Numbers are zigzag varints of the quantised difference to the acknowledged base (heading the short way).
const FIELDS=['x','y','z','h','s'],NEW=64,GONE=128,MODE_FLAGS=32;
export const MAX_DELTA_ENTRIES=MAX_RECORDS*2;

/** Record in real units → integers exactly as the 16-byte record stores them. */
export function quantizeRecord(r){
  const h=(((r.heading??0)%TAU)+TAU)%TAU;
  return {id:r.id>>>0,x:quantize(r.x??0,POS_SCALE),y:quantize(r.y??0,POS_SCALE),z:quantize(r.z??0,POS_SCALE),
    h:Math.round(h/TAU*65536)%65536,s:quantize(r.speed??0,SPEED_SCALE),mode:Math.max(0,MODES.indexOf(r.mode??'none')),flags:(r.flags??0)&255};
}
export function dequantizeRecord(q){
  const heading=q.h/65536*TAU;
  return {id:q.id,x:q.x/POS_SCALE,y:q.y/POS_SCALE,z:q.z/POS_SCALE,heading:heading>Math.PI?heading-TAU:heading,speed:q.s/SPEED_SCALE,mode:MODES[q.mode]??'none',flags:q.flags};
}
const zig=n=>(n<<1)^(n>>31),unzig=n=>(n>>>1)^-(n&1);
function pushVarint(out,n){n>>>=0;while(n>127){out.push((n&127)|128);n>>>=7;}out.push(n);}

/** Delta from `base` (Map id→quantised) to `cur` (Map id→quantised) → Uint8Array. */
export function encodeDelta(tick,baseTick,base,cur){
  const body=[],entries=[];
  for(const [id,q] of cur){
    const b=base.get(id);
    if(!b){entries.push([id,NEW,q]);continue;}
    let mask=0;const diff={};
    for(const [bit,k] of FIELDS.entries()){
      let d=q[k]-b[k];if(k==='h'){d=((d+32768)%65536+65536)%65536-32768;}
      if(d){mask|=1<<bit;diff[k]=d;}
    }
    if(q.mode!==b.mode||q.flags!==b.flags)mask|=MODE_FLAGS;
    if(mask)entries.push([id,mask,q,diff]);
  }
  for(const id of base.keys())if(!cur.has(id))entries.push([id,GONE]);
  if(entries.length>MAX_DELTA_ENTRIES)throw new RangeError('too many delta entries');
  for(const [id,mask,q,diff] of entries){
    pushVarint(body,id);body.push(mask);
    if(mask&NEW){for(const k of FIELDS)pushVarint(body,zig(q[k]));body.push(q.mode,q.flags);continue;}
    if(mask&GONE)continue;
    for(const [bit,k] of FIELDS.entries())if(mask&(1<<bit))pushVarint(body,zig(diff[k]));
    if(mask&MODE_FLAGS)body.push(q.mode,q.flags);
  }
  const out=new Uint8Array(HEADER_BYTES+4+body.length),v=new DataView(out.buffer);
  v.setUint16(0,MAGIC,true);v.setUint8(2,VERSION);v.setUint8(3,TYPE.DELTA);v.setUint32(4,tick>>>0,true);v.setUint16(8,entries.length,true);v.setUint16(10,0,true);
  v.setUint32(12,baseTick>>>0,true);out.set(body,16);
  return out;
}

/** DELTA bytes → {type,tick,baseTick,entries:[{id,mask,abs?,diff?,mode?,flags?}]} or null (never throws). */
export function decodeDelta(data){
  const bytes=data instanceof Uint8Array?data:data instanceof ArrayBuffer?new Uint8Array(data):null;
  if(!bytes||bytes.byteLength<HEADER_BYTES+4)return null;
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(v.getUint16(0,true)!==MAGIC||v.getUint8(2)!==VERSION||v.getUint8(3)!==TYPE.DELTA)return null;
  const count=v.getUint16(8,true);if(count>MAX_DELTA_ENTRIES)return null;
  let o=HEADER_BYTES+4;
  const varint=()=>{let n=0,shift=0;for(let i=0;i<5;i++){if(o>=bytes.length)return null;const b=bytes[o++];n|=(b&127)<<shift;if(!(b&128))return n>>>0;shift+=7;}return null;};
  const byte=()=>o<bytes.length?bytes[o++]:null;
  const entries=[];
  for(let i=0;i<count;i++){
    const id=varint(),mask=byte();if(id===null||mask===null)return null;
    const e={id,mask};
    if(mask&NEW){
      e.abs={};for(const k of FIELDS){const n=varint();if(n===null)return null;e.abs[k]=unzig(n);}
      e.mode=byte();e.flags=byte();if(e.flags===null)return null;
    }else if(!(mask&GONE)){
      e.diff={};for(const [bit,k] of FIELDS.entries())if(mask&(1<<bit)){const n=varint();if(n===null)return null;e.diff[k]=unzig(n);}
      if(mask&MODE_FLAGS){e.mode=byte();e.flags=byte();if(e.flags===null)return null;}
    }
    entries.push(e);
  }
  if(o!==bytes.length)return null;
  return {type:TYPE.DELTA,tick:v.getUint32(4,true),baseTick:v.getUint32(12,true),entries};
}

/** Base map + decoded entries → new Map id→quantised (the base is not modified). */
export function applyDelta(base,entries){
  const out=new Map(base);
  for(const e of entries){
    if(e.mask&GONE){out.delete(e.id);continue;}
    if(e.mask&NEW){out.set(e.id,{id:e.id,...e.abs,mode:e.mode,flags:e.flags});continue;}
    const b=out.get(e.id);if(!b)continue;// unknown base entity: ignored (the next full snapshot repairs it)
    const q={...b};
    for(const [k,d] of Object.entries(e.diff??{}))q[k]=k==='h'?((q.h+d)%65536+65536)%65536:q[k]+d;
    if(e.mode!==undefined){q.mode=e.mode;q.flags=e.flags;}
    out.set(e.id,q);
  }
  return out;
}
