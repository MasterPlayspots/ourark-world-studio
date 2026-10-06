// Net client: connection life cycle, 20 Hz poses with the teleport flag, snapshot interpolation 100 ms behind,
// extrapolation and removal, round-trip time and byte rates, reconnect with backoff.
import assert from 'node:assert/strict';
import {NetClient,SEND_MS,INTERP_MS} from '../dist/runtime/net/client.js';
import {TYPE,FLAG,encode,decode,encodeDelta,quantizeRecord} from '../dist/runtime/net/protocol.js';

const clock={t:0};const timers=[];
const fakeTimers={now:()=>clock.t,setInterval:(fn,ms)=>{const t={fn,ms,next:clock.t+ms};timers.push(t);return t;},clearInterval:t=>{const i=timers.indexOf(t);if(i>=0)timers.splice(i,1);},
  setTimeout:(fn,ms)=>{const t={fn,ms,next:clock.t+ms,once:true};timers.push(t);return t;}};
const advance=ms=>{const end=clock.t+ms;for(;;){const due=timers.filter(t=>t.next<=end).sort((a,b)=>a.next-b.next)[0];if(!due)break;clock.t=due.next;if(due.once)timers.splice(timers.indexOf(due),1);else due.next+=due.ms;due.fn();}clock.t=end;};
const sockets=[];
class FakeSocket{constructor(url){this.url=url;this.sent=[];this.readyState=0;sockets.push(this);}send(b){this.sent.push(b);}close(){this.readyState=3;this.onclose?.({});}
  open(){this.readyState=1;this.onopen?.({});}deliver(bytes){this.onmessage?.({data:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)});}}
FakeSocket.OPEN=1;

let me={mode:'kart',x:1,y:2,z:3,heading:.5,speed:10,teleport:false};
const client=new NetClient({url:'wss://world.example/api/realtime?map=kronach',state:()=>me,WebSocket:FakeSocket,...fakeTimers});
{ // Connects, sends nothing before open, then a pose every SEND_MS and a ping every 2 s.
  assert.equal(SEND_MS,50);assert.equal(INTERP_MS,100);
  me={...me,teleport:true};let flagReads=0;const original=client.state;client.state=()=>{const s=original();if(s.teleport)flagReads++;return s;};
  client.connect();const ws=sockets[0];assert.equal(ws.url,'wss://world.example/api/realtime?map=kronach');
  advance(200);assert.equal(ws.sent.length,0,'not yet open');assert.equal(flagReads,0,'state (and its one-shot flag) untouched while closed');
  me={...me,teleport:false};client.state=original;
  ws.open();ws.deliver(encode(TYPE.WELCOME,5,[{id:42,x:0,y:0,z:0}]));assert.equal(client.id,42);
  advance(1000);
  const poses=ws.sent.map(b=>decode(b)).filter(m=>m.type===TYPE.POSE);
  assert.ok(poses.length>=19&&poses.length<=21,`20 Hz (${poses.length})`);
  const r=poses[0].records[0];assert.equal(r.mode,'kart');assert.ok(Math.abs(r.x-1)<.1&&Math.abs(r.speed-10)<.01);assert.equal(r.flags,0);
  me={...me,teleport:true};advance(50);me={...me,teleport:false};
  assert.equal(decode(ws.sent.at(-1)).records[0].flags&1,1,'teleport flag sent once');advance(50);assert.equal(decode(ws.sent.at(-1)).records[0].flags&1,0);
  advance(1000);assert.ok(ws.sent.some(b=>decode(b).type===TYPE.PING),'ping');
}
{ // Interpolation: drawn 100 ms behind the newest snapshot, linear between two snapshots; heading the short way.
  const ws=sockets[0];
  ws.deliver(encode(TYPE.SNAPSHOT,10,[{id:7,x:0,y:0,z:0,heading:3.1,speed:20,mode:'kart'}]));
  advance(50);ws.deliver(encode(TYPE.SNAPSHOT,11,[{id:7,x:1,y:0,z:0,heading:-3.1,speed:20,mode:'kart'}]));
  advance(75);// render time = now − 100 ms = 25 ms after the first snapshot → halfway between the two (50 ms apart)
  const [e]=client.render();
  assert.equal(e.id,7);assert.equal(e.mode,'kart');
  assert.ok(Math.abs(e.pos[0]-.5)<.06,`x halfway (${e.pos[0]})`);
  assert.ok(Math.abs(Math.abs(e.heading)-Math.PI)<.05,'heading wrapped through ±π, not through 0');
  assert.equal(client.store.read(7).mode,'kart','kept in the 64-byte EntityStore');
  // No newer snapshot: extrapolated along speed and heading for at most 250 ms, then held.
  advance(1000);const [late]=client.render();assert.ok(late.pos[0]<3,'no runaway extrapolation');
  advance(2500);assert.equal(client.render().length,0,'removed after 2 s without snapshots');assert.equal(client.store.count,0);
}
{ // Round-trip time from PONG; byte rates over the last second; snapshot rate.
  const ws=sockets[0];const ping=ws.sent.map(b=>decode(b)).filter(m=>m.type===TYPE.PING).at(-1);
  advance(40);ws.deliver(encode(TYPE.PONG,ping.tick,[]));
  const s=client.stats();assert.ok(s.rttMs>=40&&s.rttMs<=2100,`rtt ${s.rttMs}`);assert.equal(s.connected,true);
  assert.ok(s.outBytesPerS>500&&s.outBytesPerS<700,`~20 × 28 B/s up (${s.outBytesPerS})`);
}
{ // Lost connection: reconnects with growing pauses; close() stops for good.
  sockets[0].close();assert.equal(client.stats().connected,false);
  advance(900);assert.equal(sockets.length,1,'waits ~1 s');advance(200);assert.equal(sockets.length,2,'reconnected');
  sockets[1].close();advance(1200);assert.equal(sockets.length,2,'second pause is longer');advance(1000);assert.equal(sockets.length,3);
  client.close();advance(10000);assert.equal(sockets.length,3,'no reconnect after close()');
}
{ // Deltas and acks: the client applies DELTAs to its acknowledged base and acks the newest tick in its POSE header;
  // corrections reach onCorrection; state flags (braking, crashed) are sent, the teleport flag only once.
  sockets.length=0;timers.length=0;clock.t=100000;
  const corrections=[];let st={mode:'plane',x:0,y:100,z:0,heading:0,speed:40,flags:FLAG.CRASHED};
  const c=new NetClient({url:'wss://x/api/realtime?map=kronach',state:()=>st,WebSocket:FakeSocket,onCorrection:r=>corrections.push(r),...fakeTimers});
  c.connect();const ws=sockets[0];ws.open();ws.deliver(encode(TYPE.WELCOME,1,[{id:1,x:0,y:0,z:0}]));
  const r1={id:5,x:10,y:0,z:0,heading:0,speed:5,mode:'kart',flags:0};
  ws.deliver(encode(TYPE.SNAPSHOT,20,[r1]));advance(50);
  const pose1=decode(ws.sent.filter(b=>decode(b)?.type===TYPE.POSE).at(-1));assert.equal(pose1.tick,20,'ack of the snapshot');
  assert.equal(pose1.records[0].flags,FLAG.CRASHED,'state flags sent');
  const base=new Map([[5,quantizeRecord(r1)]]),cur=new Map([[5,quantizeRecord({...r1,x:11,flags:FLAG.BRAKING})]]);
  ws.deliver(encodeDelta(21,20,base,cur));advance(50);
  assert.equal(decode(ws.sent.filter(b=>decode(b)?.type===TYPE.POSE).at(-1)).tick,21,'ack of the delta');
  advance(150);const [e]=c.render();assert.ok(e.pos[0]>10,'delta applied');assert.equal(e.flags,FLAG.BRAKING,'remote flags for mutation');
  ws.deliver(encodeDelta(30,25,base,cur));// unknown base: ignored, no ack change
  advance(50);assert.equal(decode(ws.sent.filter(b=>decode(b)?.type===TYPE.POSE).at(-1)).tick,21);
  ws.deliver(encode(TYPE.CORRECT,22,[{id:1,x:3,y:100,z:4,mode:'plane'}]));
  assert.equal(corrections.length,1);assert.ok(Math.abs(corrections[0].x-3)<.1);assert.equal(c.stats().corrections,1);
  c.close();
}
{ // Review fix: the server tick restarts at 0 after the Durable Object woke up (hibernation) while the socket stays
  // open — old baselines are dropped instead of piling up, and the baseline count stays bounded.
  sockets.length=0;timers.length=0;clock.t=200000;
  const c=new NetClient({url:'wss://x/api/realtime?map=kronach',state:()=>({mode:'kart',x:0,y:0,z:0,heading:0,speed:0}),WebSocket:FakeSocket,...fakeTimers});
  c.connect();const ws=sockets[0];ws.open();
  for(let t=50000;t<50040;t++)ws.deliver(encode(TYPE.SNAPSHOT,t,[{id:5,x:t%7,y:0,z:0,mode:'kart'}]));
  assert.ok(c.baselines.size<=32,`bounded (${c.baselines.size})`);
  for(let t=1;t<=20;t++)ws.deliver(encode(TYPE.SNAPSHOT,t,[{id:5,x:t%7,y:0,z:0,mode:'kart'}]));
  assert.ok([...c.baselines.keys()].every(t=>t<=20),'pre-restart baselines dropped');assert.equal(c.baselines.size,20);
  assert.equal(c.serverTick,20);assert.equal(c.ack,20);
  c.close();
}
console.log('PASS: net client — 20 Hz poses, teleport flag, interpolation 100 ms behind, extrapolation cap, removal, rtt, rates, reconnect.');
