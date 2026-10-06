// Durable Object: one instance per map (idFromName(map)). Holds the WebSocket connections of that map's players
// (Hibernation API: idle maps cost nothing, clients stay connected), feeds their messages into the pure Room logic
// (edge/room.mjs) and sends every player its snapshot each TICK_MS while anyone is connected. Each socket carries
// its player id as attachment, so a woken instance can adopt the connected players again.
import {Room,TICK_MS} from './room.mjs';
import {loadSim} from '../dist/runtime/sim/wasm.js';
import {decodeHeightFile} from '../dist/runtime/assets/codec.js';

import {HEADER_BYTES,RECORD_BYTES,MAX_RECORDS} from '../dist/runtime/net/protocol.js';

export const MAX_GARBAGE=20;   // malformed messages tolerated per connection before it is closed (1008)
export const MAX_MESSAGE=HEADER_BYTES+RECORD_BYTES*MAX_RECORDS;   // larger frames are refused before any copy (1009)
export const FLOOD_LIMIT=100,FLOOD_WINDOW_MS=5000;   // refused messages (any reason, text frames too) per window → 1008
export const IDLE_MS=30000;
export const MAX_PER_IP=8;      // open connections per client address (CF-Connecting-IP) and map; more → 429
export const TERRAIN_RETRY_MS=60000;   // a failed terrain load is retried at most this often
const ASSET_NAME=/^[a-z0-9][a-z0-9_-]{0,63}$/,ASSET_FILE=/^[a-z0-9][a-z0-9_-]{0,63}\.bin(\.gz)?$/;    // no pose for this long → the connection is closed, so an open tab does not keep billing
const json=body=>new Response(JSON.stringify(body),{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});

export class MapRoom{
  // The compiled WASM core, set by edge/worker.mjs (Workers cannot compile WASM at runtime, so it comes as a module).
  static simModule=null;
  // options (tests only): now, upgrade(client) → Response, setInterval/clearInterval, simModule.
  constructor(ctx,env,options={}){
    this.now=options.now??Date.now;this.ctx=ctx;this.env=env;this.simModule=options.simModule??MapRoom.simModule;
    this.sim=null;this.terrain=null;this.ready=Promise.resolve();
    this.room=new Room({now:this.now,ground:(x,z)=>this.ground(x,z)});this.garbage=new Map();this.strikes=new Map();this.timer=null;this.socketIds=new WeakMap();
    this.upgrade=options.upgrade??(client=>new Response(null,{status:101,webSocket:client}));
    this.setInterval=options.setInterval??((fn,ms)=>setInterval(fn,ms));this.clearInterval=options.clearInterval??(t=>clearInterval(t));
    for(const ws of ctx.getWebSockets()){
      const a=ws.deserializeAttachment();
      if(Number.isInteger(a?.id)){this.room.adopt(a.id);if(Number.isFinite(a.lastHeard))this.room.players.get(a.id).joined=a.lastHeard;}
      if(a?.map)this.loadTerrain(a.map);
    }
    if(this.room.size)this.startTicking();
  }
  async fetch(request){
    const {pathname}=new URL(request.url);
    if(pathname==='/stats')return json(this.room.stats());
    if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('WebSocket erwartet.',{status:426,headers:{Upgrade:'websocket'}});
    const map=new URL(request.url).searchParams.get('map'),ip=request.headers.get('CF-Connecting-IP')??'';
    if(ip&&this.connectionsFrom(ip)>=MAX_PER_IP)return new Response('Zu viele Verbindungen.',{status:429});
    if(map)this.loadTerrain(map);
    const joined=this.room.join();
    if(!joined)return new Response('Karte voll.',{status:503});
    const pair=new WebSocketPair(),[client,server]=[pair[0],pair[1]];
    try{this.ctx.acceptWebSocket(server);server.serializeAttachment({id:joined.id,map,ip,lastHeard:this.now()});server.send(joined.welcome);}
    catch(error){this.room.leave(joined.id);throw error;}
    this.startTicking();
    return this.upgrade(client);
  }
  async webSocketMessage(ws,message){
    const id=ws.deserializeAttachment()?.id;
    if(!Number.isInteger(id)){ws.close(1011,'Kein Spieler');return;}
    const size=typeof message==='string'?message.length:message.byteLength;
    if(size>MAX_MESSAGE){ws.close(1009,'Nachricht zu groß');this.drop(id);return;}
    if(!this.room.players.has(id))this.room.adopt(id);
    if(typeof message==='string'){this.strike(ws,id);return;}// protocol v1 is binary only
    const result=this.room.receive(id,new Uint8Array(message));
    // The last well-formed pose also survives hibernation; waking must not restart the idle allowance.
    const heard=this.room.players.get(id)?.heard,attachment=ws.deserializeAttachment();
    if(Number.isFinite(heard)&&heard!==attachment?.lastHeard)ws.serializeAttachment({...attachment,lastHeard:heard});
    if(result.ok&&!result.reply)this.startTicking();
    if(result.reply)ws.send(result.reply);
    if(result.correction)ws.send(result.correction);
    // Terrain refusals are plausibility, not abuse (a bridge or roof the height grid does not know): corrected, never kicked.
    if(!result.ok&&result.reason!=='ground'&&this.strike(ws,id))return;
    if(result.reason==='malformed'||result.reason==='type'){
      const n=(this.garbage.get(id)??0)+1;this.garbage.set(id,n);
      if(n>MAX_GARBAGE){ws.close(1008,'Protokollfehler');this.drop(id);}
    }
  }
  // Terrain height from the WASM core where the map's height grid covers the point, else null (not checked).
  ground(x,z){
    const t=this.terrain;if(!t||!this.sim||Math.abs(x)>t.half||Math.abs(z)>t.half)return null;
    return this.sim.ground(x,z);
  }
  // Loads the WASM core and the map's DGM height grid (kart bundle: /kart/assets/<map>.json + height .bin) once.
  loadTerrain(map){
    if(this.terrainFor===map||!this.simModule||!this.env?.ASSETS||!ASSET_NAME.test(map))return this.ready;
    if(this.terrainFailed?.map===map&&this.now()-this.terrainFailed.at<TERRAIN_RETRY_MS)return this.ready;
    this.terrainFor=map;
    this.ready=(async()=>{
      try{
        const asset=path=>this.env.ASSETS.fetch(new Request(`https://assets${path}`));
        const res=await asset(`/kart/assets/${map}.json`);if(!res.ok)throw new Error(`Metadaten ${res.status}`);
        const t=(await res.json()).terrain;if(!ASSET_FILE.test(t?.file??''))throw new Error('Höhendatei-Name ungültig');
        // Packed or raw (runtime/assets/codec.js: delta planes + gzip since Welle P3, ADR 0006).
        const heights=await decodeHeightFile(new Uint8Array(await (await asset(`/kart/assets/${t.file}`)).arrayBuffer()),t);
        const sim=await loadSim(this.simModule);
        sim.setTerrain(heights,t.width,t.depth,t.cell,t.scale);
        this.sim=sim;this.terrain={half:Math.min(t.width,t.depth)*t.cell/2-1};
      }catch(error){console.warn('MapRoom terrain',map,error?.message);this.terrainFor=null;this.terrainFailed={map,at:this.now()};}
    })();
    return this.ready;
  }
  // Open connections from one address: sockets whose player is still in the room (survives hibernation via attachments).
  connectionsFrom(ip){let n=0;for(const ws of this.ctx.getWebSockets()){const a=ws.deserializeAttachment();if(a?.ip===ip&&this.room.players.has(a.id))n++;}return n;}
  async webSocketClose(ws){this.drop(ws.deserializeAttachment()?.id);}
  async webSocketError(ws){this.drop(ws.deserializeAttachment()?.id);}
  // Counts a refused message; a connection with more than FLOOD_LIMIT in FLOOD_WINDOW_MS is closed. → closed?
  strike(ws,id){
    const now=this.now(),s=this.strikes.get(id)??{n:0,since:now};
    if(now-s.since>FLOOD_WINDOW_MS){s.n=0;s.since=now;}
    s.n++;this.strikes.set(id,s);
    if(s.n>FLOOD_LIMIT){ws.close(1008,'Zu viele Nachrichten');this.drop(id);return true;}
    return false;
  }
  drop(id){this.room.leave(id);this.garbage.delete(id);this.strikes.delete(id);if(!this.room.size)this.stopTicking();}
  // Player id of a socket, deserialised once per socket object instead of every tick (⚡ PERF-04). A woken instance
  // gets new socket objects, so the cache never outlives hibernation.
  idOf(ws){let id=this.socketIds.get(ws);if(id===undefined){id=ws.deserializeAttachment()?.id;this.socketIds.set(ws,id);}return id;}
  startTicking(){if(!this.timer)this.timer=this.setInterval(()=>this.tick(),TICK_MS);}
  stopTicking(){if(this.timer){this.clearInterval(this.timer);this.timer=null;}}
  idleDeadline(player){return Math.max(player.joined,player.heard??0,player.at??0)+IDLE_MS;}
  expireIdle(sockets=this.ctx.getWebSockets()){
    const now=this.now();
    for(const ws of sockets){const id=this.idOf(ws),p=this.room.players.get(id);if(p&&now>=this.idleDeadline(p)){ws.close(1000,'Inaktiv');this.drop(id);}}
  }
  async scheduleIdleAlarm(){
    const deadlines=[...this.room.players.values()].map(p=>this.idleDeadline(p));
    if(deadlines.length)await this.ctx.storage.setAlarm(Math.min(...deadlines));
    else await this.ctx.storage.deleteAlarm?.();
  }
  // Durable Object alarms wake an otherwise hibernating room to enforce the idle deadline.
  async alarm(){this.expireIdle();await this.scheduleIdleAlarm();}
  tick(){
    const sockets=this.ctx.getWebSockets();
    if(!sockets.length){this.stopTicking();return;}
    this.expireIdle(sockets);
    const frames=this.room.tick();
    for(const ws of sockets){
      const id=this.idOf(ws);
      const frame=frames.get(id);if(frame)try{ws.send(frame);}catch{}
    }
    // Nobody moving: an alarm performs the eventual cleanup while the tick loop can hibernate.
    // Non-Worker hosts without alarm storage keep ticking until the same deadline is reached.
    if(!this.room.active&&this.ctx.storage?.setAlarm){
      this.stopTicking();
      const pending=this.scheduleIdleAlarm().catch(error=>{console.warn('MapRoom idle alarm',error?.message);if(this.room.size)this.startTicking();});
      this.ctx.waitUntil?.(pending);
    }
  }
}
