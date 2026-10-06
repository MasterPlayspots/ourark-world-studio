// Realtime client (protocol v1): reports the own pose every SEND_MS over /api/realtime, keeps the last snapshots of
// the other players and draws them INTERP_MS in the past (smooth movement between 20 Hz snapshots), extrapolating at
// most EXTRAP_MS when snapshots are late. Remote players live in the 64-byte EntityStore (sim state layout v1).
// Measures round-trip time, bytes per second both ways and the snapshot rate. Reconnects with growing pauses.
import {TYPE,encode,decode,decodeDelta,applyDelta,quantizeRecord,dequantizeRecord,poseOutOfRange} from './protocol.js';
import {EntityStore} from '../sim/layout.js';

export const SEND_MS=50,PING_MS=2000,INTERP_MS=100,EXTRAP_MS=250,GONE_MS=1500,HISTORY=12,MAX_REMOTES=64,SNAP_SPEED=80,BASELINES=32;
const BACKOFF=[1000,2000,5000,10000];
const TAU=Math.PI*2,wrap=a=>((a+Math.PI)%TAU+TAU)%TAU-Math.PI;

export class NetClient{
  // state() → {mode,x,y,z,heading,speed,teleport,flags}; onCorrection(pose) when the server refused a pose;
  // WebSocket/now/timers injectable for tests.
  constructor({url,state,onCorrection=()=>{},WebSocket:WS=globalThis.WebSocket,now=()=>performance.now(),setInterval:si=(f,ms)=>setInterval(f,ms),
    clearInterval:ci=t=>clearInterval(t),setTimeout:st=(f,ms)=>setTimeout(f,ms)}){
    Object.assign(this,{url,state,onCorrection,WS,now,si,ci,st});
    this.ack=0;this.baselines=new Map();this.lastSeen=new Map();this.corrections=0;this.deltaCount=0;this.clampedPoses=0;
    this.id=null;this.ws=null;this.closed=false;this.attempt=0;this.store=new EntityStore(MAX_REMOTES);this.history=new Map();
    this.rtt=null;this.inLog=[];this.outLog=[];this.snapTimes=[];this.serverTick=0;this.timers=[];
  }
  connect(){
    if(this.closed)return;
    const ws=new this.WS(this.url);ws.binaryType='arraybuffer';this.ws=ws;
    ws.onopen=()=>{this.attempt=0;};
    ws.onmessage=e=>this.receive(e.data);
    ws.onclose=()=>{if(this.ws!==ws)return;this.ws=null;this.id=null;this.ack=0;this.baselines.clear();if(!this.closed)this.st(()=>this.connect(),BACKOFF[Math.min(this.attempt++,BACKOFF.length-1)]);};
    ws.onerror=()=>{};
    if(!this.timers.length){
      this.timers.push(this.si(()=>this.sendPose(),SEND_MS),this.si(()=>this.send(encode(TYPE.PING,Math.floor(this.now())>>>0,[])),PING_MS));
    }
  }
  close(){this.closed=true;for(const t of this.timers)this.ci(t);this.timers=[];this.ws?.close();this.ws=null;}
  send(bytes){
    if(!this.ws||this.ws.readyState!==1)return;
    this.ws.send(bytes);this.outLog.push([this.now(),bytes.byteLength]);
  }
  sendPose(){
    // Only ask for the state when it can be sent: state() may clear one-shot flags (teleport).
    if(!this.ws||this.ws.readyState!==1)return;
    const s=this.state();if(!s)return;
    // Header tick = the newest snapshot/delta applied (acknowledgement for the server's deltas).
    // The wire format clamps to ±2047.9 m; counted (stats().clampedPoses) so it is never silent (W3).
    if(poseOutOfRange(s))this.clampedPoses++;
    this.send(encode(TYPE.POSE,this.ack,[{id:0,x:s.x,y:s.y,z:s.z,heading:s.heading,speed:s.speed,mode:s.mode,flags:(s.teleport?1:0)|((s.flags??0)&~1)}]));
  }
  receive(data){
    const now=this.now();this.inLog.push([now,data?.byteLength??0]);
    let records,tick;
    const msg=decode(data);
    if(msg?.type===TYPE.WELCOME){this.id=msg.records[0]?.id??null;return;}
    if(msg?.type===TYPE.PONG){this.rtt=Math.max(0,(Math.floor(now)>>>0)-msg.tick);return;}
    if(msg?.type===TYPE.CORRECT){this.corrections++;if(msg.records[0])this.onCorrection(msg.records[0]);return;}
    // The server tick restarts at 0 when its Durable Object wakes up again: older baselines no longer apply.
    const t=msg?.type===TYPE.SNAPSHOT?msg.tick:null;if(t!==null&&t<this.serverTick-1)this.baselines.clear();
    if(msg?.type===TYPE.SNAPSHOT){
      tick=msg.tick;records=msg.records;this.baselines.set(tick,new Map(records.map(r=>[r.id,quantizeRecord(r)])));
    }else{
      const d=decodeDelta(data);if(!d)return;
      const base=this.baselines.get(d.baseTick);if(!base)return;// base already dropped: wait for the next full snapshot
      const cur=applyDelta(base,d.entries);tick=d.tick;this.baselines.set(tick,cur);records=[...cur.values()].map(dequantizeRecord);this.deltaCount++;
    }
    this.ack=tick;
    // Bounded by count in insertion order (ticks may restart, so their values are no ordering to rely on).
    for(const t of this.baselines.keys()){if(this.baselines.size<=BASELINES)break;this.baselines.delete(t);}
    this.serverTick=tick;this.snapTimes.push(now);if(this.snapTimes.length>40)this.snapTimes.shift();
    for(const r of records){
      if(r.id===this.id)continue;
      this.lastSeen.set(r.id,now);
      let h=this.history.get(r.id);if(!h){h=[];this.history.set(r.id,h);}
      // Players refreshed less often (network culling) repeat their values: only real changes become samples,
      // so interpolation spans the gap instead of stuttering.
      const last=h[h.length-1];
      if(last&&last.x===r.x&&last.y===r.y&&last.z===r.z&&last.heading===r.heading&&last.speed===r.speed&&last.flags===r.flags&&last.mode===r.mode)continue;
      h.push({t:now,...r});if(h.length>HISTORY)h.shift();
    }
  }
  // Interpolated remote players for drawing now → [{id,mode,pos:[x,y,z],heading,speed}].
  render(){
    const now=this.now(),at=now-INTERP_MS,out=[];
    for(const [id,h] of this.history){
      const last=h[h.length-1];
      if(now-(this.lastSeen.get(id)??last.t)>GONE_MS){this.history.delete(id);this.lastSeen.delete(id);this.store.remove(id);continue;}
      let p;
      const i=h.findIndex(s=>s.t>at);
      if(i>0){
        const a=h[i-1],b=h[i],gap=Math.max(1,b.t-a.t),f=(at-a.t)/gap;
        // A jump beyond any plausible speed is a teleport: show the new place instead of a streak across the map.
        const jump=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)>SNAP_SPEED*gap/1000*1.5+5;
        p=jump?{...b}:{x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,z:a.z+(b.z-a.z)*f,heading:wrap(a.heading+wrap(b.heading-a.heading)*f),speed:a.speed+(b.speed-a.speed)*f,mode:b.mode,flags:b.flags};
      }else if(i===0){p={...h[0]};}
      else{// behind the newest snapshot: extrapolate along heading and speed, capped
        const dt=Math.min(EXTRAP_MS,at-last.t)/1000;
        p={...last,x:last.x+Math.sin(last.heading)*last.speed*dt,z:last.z-Math.cos(last.heading)*last.speed*dt};
      }
      this.store.upsert(id,{mode:p.mode,pos:[p.x,p.y,p.z],heading:p.heading,tick:this.serverTick});
      out.push({id,mode:p.mode,pos:[p.x,p.y,p.z],heading:p.heading,speed:p.speed,flags:p.flags??0});
    }
    return out;
  }
  stats(){
    const now=this.now(),sum=log=>{while(log.length&&now-log[0][0]>1000)log.shift();return log.reduce((a,[,b])=>a+b,0);};
    const t=this.snapTimes,hz=t.length>1?(t.length-1)*1000/Math.max(1,t[t.length-1]-t[0]):0;
    return {connected:!!this.ws&&this.ws.readyState===1,id:this.id,rttMs:this.rtt,inBytesPerS:sum(this.inLog),outBytesPerS:sum(this.outLog),
      snapshotHz:Math.round(hz*10)/10,remotes:this.history.size,serverTick:this.serverTick,ack:this.ack,deltas:this.deltaCount,corrections:this.corrections,clampedPoses:this.clampedPoses};
  }
}
