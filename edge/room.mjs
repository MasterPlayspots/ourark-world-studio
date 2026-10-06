// Map room (pure logic, no Workers API): the players of one map, their last validated poses, a spatial hash of
// CELL-metre cells for interest management and the per-tick snapshot frames. edge/map-room.mjs (Durable Object) and
// the dev server (scripts/serve.mjs) wrap it with sockets. Clients report their own pose (v1: client authority);
// the room only accepts what is plausible: inside the map bounds, not faster than the mode allows, not too often.
import {TYPE,FLAG,encode,decode,MAX_RECORDS,quantizeRecord,dequantizeRecord,encodeDelta,ROOM_BOUND} from '../dist/runtime/net/protocol.js';

// Y_MAX stays inside the protocol's i16 range at 1/16 m (±2047.9 m), so the check can actually fire.
export const CELL=64,TICK_MS=50,MAX_PLAYERS=64,STALE_MS=3000,BOUND=ROOM_BOUND,Y_MIN=-500,Y_MAX=2000;
// m/s: highest plausible speed per mode (kart/car/plane/walk simulations plus margin).
export const MAX_SPEED=Object.freeze({kart:40,car:60,plane:80,walk:8});
// Interest: how many cells around your own you see — walkers 3×3, karts/cars 5×5, planes 9×9.
const RING={walk:1,kart:2,car:2,plane:4};
export const interestRing=mode=>RING[mode]??1;
export const FLAG_TELEPORT=FLAG.TELEPORT;
// Only these record flags travel to other players (vertex-shader mutation); unknown bits are dropped.
export const STATE_FLAGS=FLAG.BRAKING|FLAG.CRASHED;
export const GROUND_BELOW=3,GROUND_ABOVE=15;
const BUCKET=30,REFILL_PER_S=30,TELEPORT_GAP_MS=2000,RESYNC_AFTER=10;
// Deltas need the acknowledged tick's content: kept per viewer for HISTORY ticks (1.6 s at 20 Hz).
export const HISTORY=32,CORRECTION_GAP_MS=500;
// Network culling: how often a visible player is refreshed, by cell distance (Chebyshev) — 1 every tick, 2 every
// 2nd, 3+ every 4th. Skipped players keep their acknowledged values, which costs nothing in a delta.
export const refreshEvery=d=>d<=1?1:d===2?2:4;
// Spatial-hash key without strings (⚡ PERF-04): cells span ±BOUND/CELL ≈ ±32, so 2048 per axis is ample.
const cellKey=(i,j)=>(i+1024)*2048+(j+1024);
const blank=now=>({pose:null,at:0,joined:now,tokens:BUCKET,refilled:now,lastTeleport:0,strikes:0,sent:new Map(),ack:0,lastCorrection:0});

export class Room{
  // ground(x,z) → terrain height in the map frame or null where unknown (MapRoom: WASM core + map height grid).
  constructor({now=Date.now,maxPlayers=MAX_PLAYERS,ground=null}={}){
    Object.assign(this,{now,maxPlayers,ground});
    this.players=new Map();this.nextId=1;this.tickCount=0;this.active=0;this.bytesIn=0;this.bytesOut=0;this.rejected={};this.deltas=0;this.snapshots=0;
  }
  get size(){return this.players.size;}
  join(){
    if(this.players.size>=this.maxPlayers)return null;
    const id=this.nextId++;
    this.players.set(id,{id,...blank(this.now())});
    return {id,welcome:encode(TYPE.WELCOME,this.tickCount,[{id,x:0,y:0,z:0}])};
  }
  // Re-registers a still connected player after the Durable Object woke up with an empty room (hibernation).
  adopt(id){
    if(!this.players.has(id))this.players.set(id,{id,...blank(this.now())});
    this.nextId=Math.max(this.nextId,id+1);
  }
  leave(id){this.players.delete(id);}
  reject(reason){this.rejected[reason]=(this.rejected[reason]??0)+1;return {ok:false,reason};}
  // A refused pose is answered with the last accepted one (CORRECT, ≤ 1 per CORRECTION_GAP_MS): the client resyncs.
  refuse(p,reason,now){
    const result=this.reject(reason);
    if(p.pose&&now-p.lastCorrection>=CORRECTION_GAP_MS){p.lastCorrection=now;result.correction=encode(TYPE.CORRECT,this.tickCount,[{id:p.id,...p.pose}]);}
    return result;
  }
  // One message from player `id` → {ok, reason?, reply?}.
  receive(id,data){
    this.bytesIn+=data?.byteLength??0;
    const p=this.players.get(id);if(!p)return this.reject('unknown');
    const now=this.now();
    p.tokens=Math.min(BUCKET,p.tokens+(now-p.refilled)/1000*REFILL_PER_S);p.refilled=now;
    if(p.tokens<1)return this.reject('rate');
    p.tokens-=1;
    const msg=decode(data);if(!msg)return this.reject('malformed');
    if(msg.type===TYPE.PING)return {ok:true,reply:encode(TYPE.PONG,msg.tick,[],this.tickCount&0xffff)};
    if(msg.type!==TYPE.POSE)return this.reject('type');
    if(msg.records.length!==1)return this.reject('malformed');
    p.heard=now;// the client is alive, even while its poses are refused (MapRoom's idle timeout)
    if(p.sent.has(msg.tick))p.ack=msg.tick;// acknowledgement of a snapshot/delta this player received
    const r=msg.records[0];
    if(!(r.mode in MAX_SPEED))return this.reject('mode');
    if(Math.abs(r.x)>BOUND||Math.abs(r.z)>BOUND||r.y<Y_MIN||r.y>Y_MAX)return this.refuse(p,'bounds',now);
    // Terrain check: vehicles on the ground stay within −GROUND_BELOW…+GROUND_ABOVE of it (jumps, ramps), planes above it.
    const g=this.ground?.(r.x,r.z);
    if(g!=null&&(r.y<g-GROUND_BELOW||(r.mode!=='plane'&&r.y>g+GROUND_ABOVE)))return this.refuse(p,'ground',now);
    if(p.pose){
      const dt=Math.max(.001,(now-p.at)/1000),dist=Math.hypot(r.x-p.pose.x,r.y-p.pose.y,r.z-p.pose.z);
      const limit=MAX_SPEED[r.mode]*dt*1.5+5;
      const teleport=(r.flags&FLAG_TELEPORT)&&now-p.lastTeleport>=TELEPORT_GAP_MS;
      if(dist>limit&&!teleport){
        // A client that keeps insisting (lost packets, a reset without the flag) is resynced after a while — at most
        // once per teleport gap, so resyncs are no flag-free way to jump around.
        if(++p.strikes<RESYNC_AFTER||now-p.lastTeleport<TELEPORT_GAP_MS)return this.refuse(p,'speed',now);
        this.rejected.resync=(this.rejected.resync??0)+1;p.lastTeleport=now;
      }
      if(teleport&&dist>limit)p.lastTeleport=now;
    }
    p.strikes=0;p.pose={x:r.x,y:r.y,z:r.z,heading:r.heading,speed:r.speed,mode:r.mode,flags:r.flags&STATE_FLAGS};p.at=now;
    return {ok:true};
  }
  // Advances one tick: for every player the others it can see (nearest first, ≤ 64), as a DELTA against its last
  // acknowledged tick when that is still known, else as a full SNAPSHOT → Map id→bytes.
  tick(){
    this.tickCount++;
    const now=this.now(),grid=new Map(),cellOf=v=>Math.floor(v/CELL);let active=0;
    for(const p of this.players.values()){
      if(!p.pose||now-p.at>STALE_MS)continue;
      active++;p.q=quantizeRecord({id:p.id,...p.pose});// once per tick, shared by every viewer
      const key=cellKey(cellOf(p.pose.x),cellOf(p.pose.z));
      (grid.get(key)??grid.set(key,[]).get(key)).push(p);
    }
    this.active=active;// read by MapRoom instead of building stats() every tick
    const frames=new Map();
    for(const viewer of this.players.values()){
      let visible=[];const cx=viewer.pose?cellOf(viewer.pose.x):0,cz=viewer.pose?cellOf(viewer.pose.z):0;
      if(viewer.pose){
        const ring=interestRing(viewer.pose.mode);
        for(let i=cx-ring;i<=cx+ring;i++)for(let j=cz-ring;j<=cz+ring;j++){const cell=grid.get(cellKey(i,j));if(cell)for(const o of cell)if(o!==viewer)visible.push(o);}
        if(visible.length>MAX_RECORDS){
          const d=o=>(o.pose.x-viewer.pose.x)**2+(o.pose.z-viewer.pose.z)**2;
          visible.sort((a,b)=>d(a)-d(b));visible.length=MAX_RECORDS;
        }
      }
      const base=viewer.ack&&this.tickCount-viewer.ack<=HISTORY?viewer.sent.get(viewer.ack):null,cur=new Map();
      for(const o of visible){
        const dist=Math.max(Math.abs(cellOf(o.pose.x)-cx),Math.abs(cellOf(o.pose.z)-cz)),known=base?.get(o.id);
        cur.set(o.id,known&&this.tickCount%refreshEvery(dist)!==0?known:o.q);
      }
      let bytes;
      if(base){bytes=encodeDelta(this.tickCount,viewer.ack,base,cur);this.deltas++;}
      else{bytes=encode(TYPE.SNAPSHOT,this.tickCount,[...cur.values()].map(dequantizeRecord));this.snapshots++;}
      viewer.sent.set(this.tickCount,cur);
      for(const t of viewer.sent.keys()){if(t<this.tickCount-HISTORY)viewer.sent.delete(t);else break;}
      this.bytesOut+=bytes.byteLength;frames.set(viewer.id,bytes);
    }
    return frames;
  }
  stats(){return {players:this.players.size,active:[...this.players.values()].filter(p=>p.pose&&this.now()-p.at<=STALE_MS).length,
    tick:this.tickCount,bytesIn:this.bytesIn,bytesOut:this.bytesOut,deltas:this.deltas,snapshots:this.snapshots,rejected:{...this.rejected}};}
}
