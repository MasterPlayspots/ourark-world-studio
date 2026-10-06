// Map room logic (edge/room.mjs): join limits, pose validation, spatial hash interest, per-tick snapshots, timeouts.
import assert from 'node:assert/strict';
import {Room,CELL,TICK_MS,MAX_PLAYERS,interestRing,FLAG_TELEPORT,Y_MAX} from '../edge/room.mjs';
import {TYPE,FLAG,encode,decode,decodeDelta,applyDelta,quantizeRecord} from '../dist/runtime/net/protocol.js';

const pose=(p)=>encode(TYPE.POSE,0,[{id:0,y:0,speed:0,heading:0,mode:'kart',...p}]);
const clock={t:1_000_000};const now=()=>clock.t;

{ // Join hands out ids and a WELCOME; the room refuses more than MAX_PLAYERS.
  const room=new Room({now});
  const a=room.join();assert.ok(a.id>0);
  const w=decode(a.welcome);assert.equal(w.type,TYPE.WELCOME);assert.equal(w.records[0].id,a.id);
  const ids=new Set([a.id]);for(let i=1;i<MAX_PLAYERS;i++)ids.add(room.join().id);
  assert.equal(ids.size,MAX_PLAYERS);assert.equal(room.join(),null,'full');
  room.leave(a.id);assert.ok(room.join(),'a free place again');
}
{ // Interest: others in the 3×3 (walk) / 5×5 (kart) / 9×9 (plane) cells around you, never yourself.
  assert.equal(CELL,64);assert.equal(TICK_MS,50);
  assert.equal(interestRing('walk'),1);assert.equal(interestRing('kart'),2);assert.equal(interestRing('plane'),4);
  const room=new Room({now});
  const me=room.join().id,near=room.join().id,far=room.join().id,flyer=room.join().id;
  room.receive(me,pose({x:0,z:0,mode:'walk'}));
  room.receive(near,pose({x:70,z:10}));          // next cell
  room.receive(far,pose({x:600,z:600}));          // 9 cells away
  room.receive(flyer,pose({x:250,z:0,y:200,mode:'plane'}));
  const frames=room.tick();
  const forMe=decode(frames.get(me));assert.equal(forMe.type,TYPE.SNAPSHOT);
  assert.deepEqual(forMe.records.map(r=>r.id).sort(),[near].sort(),'walker sees only its 3×3');
  const forFlyer=decode(frames.get(flyer)).records.map(r=>r.id).sort((x,y)=>x-y);
  assert.deepEqual(forFlyer,[me,near].sort((x,y)=>x-y),'plane sees 9×9, not the far one');
  assert.ok(!decode(frames.get(far)).records.length,'far player sees nobody');
  assert.equal(forMe.tick,1);assert.equal(decode(room.tick().get(me)).tick,2,'tick counts up');
}
{ // Validation: malformed, wrong type, out of bounds, too fast, or too frequent poses are refused.
  const room=new Room({now});const id=room.join().id;
  assert.equal(room.receive(id,pose({x:0,z:0})).ok,true);
  assert.equal(room.receive(id,new Uint8Array([1,2,3])).reason,'malformed');
  assert.equal(room.receive(id,encode(TYPE.SNAPSHOT,0,[{id:0,x:0,y:0,z:0}])).reason,'type');
  assert.equal(room.receive(9999,pose({x:0,z:0})).reason,'unknown');
  clock.t+=100;assert.equal(room.receive(id,pose({x:5000,z:0})).reason,'bounds');
  assert.ok(Y_MAX<=2047,'height bound inside the protocol range (i16 at 1/16 m)');
  clock.t+=100;assert.equal(room.receive(id,pose({x:60,z:0})).reason,'speed','60 m in 0.2 s is too fast for a kart');
  clock.t+=1000;assert.equal(room.receive(id,pose({x:40,z:0})).ok,true,'40 m in 1.2 s is plausible');
  let refused=0;for(let i=0;i<60;i++){if(room.receive(id,pose({x:40,z:0})).reason==='rate')refused++;}
  assert.ok(refused>20,`rate limit (${refused} refused)`);
  // A ping is answered right away with the same tick (round-trip time on the client).
  clock.t+=1000;// the flood above used up the bucket
  const pong=room.receive(id,encode(TYPE.PING,4242,[]));assert.equal(decode(pong.reply).type,TYPE.PONG);assert.equal(decode(pong.reply).tick,4242);
}
{ // Silent players drop out of the snapshots after the timeout; stats count bytes in and out.
  const room=new Room({now});const a=room.join().id,b=room.join().id;
  room.receive(a,pose({x:0,z:0}));room.receive(b,pose({x:10,z:0}));
  assert.equal(decode(room.tick().get(a)).records.length,1);
  clock.t+=4000;room.receive(a,pose({x:0,z:0}));
  assert.equal(decode(room.tick().get(a)).records.length,0,'b timed out');
  const s=room.stats();assert.ok(s.bytesIn>0&&s.bytesOut>0&&s.players===2&&s.tick===2);
}
{ // Teleports: the flag allows one jump per 2 s; a client that keeps insisting without it is resynced after 10 tries.
  const room=new Room({now});const id=room.join().id;
  room.receive(id,pose({x:0,z:0}));
  clock.t+=50;assert.equal(room.receive(id,pose({x:800,z:0,flags:FLAG_TELEPORT})).ok,true,'reset to the start line');
  clock.t+=50;assert.equal(room.receive(id,pose({x:0,z:0,flags:FLAG_TELEPORT})).reason,'speed','second jump too soon');
  clock.t+=2000;// resyncs share the teleport gap: no jump-every-0.5-s without the flag
  let result;for(let i=0;i<10;i++){clock.t+=50;result=room.receive(id,pose({x:-900,z:0}));}
  assert.equal(result.ok,true,'resynced');assert.equal(room.stats().rejected.resync,1);
  let again;for(let i=0;i<10;i++){clock.t+=50;again=room.receive(id,pose({x:900,z:0}));}
  assert.equal(again.reason,'speed','a second resync within 2 s is refused');
  const other=room.join().id;room.receive(other,pose({x:-890,z:0}));
  const seen=decode(room.tick().get(other)).records[0];assert.equal(seen.flags&FLAG_TELEPORT,0,'flag not forwarded');assert.ok(Math.abs(seen.x+900)<.1);
}
{ // After the Durable Object woke from hibernation the room is empty: connected ids are adopted, new ids stay unique.
  const room=new Room({now});room.adopt(7);room.adopt(3);
  assert.equal(room.size,2);assert.equal(room.join().id,8,'next id above the adopted ones');
  assert.equal(room.receive(7,pose({x:0,z:0})).ok,true);
}
{ // With a ground function (WASM core + map height grid): cars/karts/walkers must be near the terrain, planes above it.
  const ground=(x,z)=>Math.abs(x)<500&&Math.abs(z)<500?x*.1:null;// a slope; null = outside the detailed grid
  const room=new Room({now,ground});const id=room.join().id;
  assert.equal(room.receive(id,pose({x:10,z:0,y:1})).ok,true,'on the ground');
  clock.t+=200;assert.equal(room.receive(id,pose({x:10,z:0,y:40})).reason,'ground','a kart 39 m in the air');
  clock.t+=200;assert.equal(room.receive(id,pose({x:10,z:0,y:-6})).reason,'ground','under the terrain');
  clock.t+=200;assert.equal(room.receive(id,pose({x:10,z:0,y:12})).ok,true,'a kicker jump (11 m) is allowed');
  clock.t+=200;assert.equal(room.receive(id,pose({x:10,z:0,y:150,mode:'plane',flags:FLAG_TELEPORT})).ok,true,'planes may fly (mode switch = teleport)');
  clock.t+=200;assert.equal(room.receive(id,pose({x:10,z:0,y:-10,mode:'plane'})).reason,'ground','but not below the terrain');
  clock.t+=2500;assert.equal(room.receive(id,pose({x:600,z:0,y:300,mode:'plane',flags:FLAG_TELEPORT})).ok,true,'outside the grid: not checked');
}
{ // Deltas: once a client acknowledges a tick (POSE header tick), it gets DELTAs against that tick; applied they equal the truth.
  const room=new Room({now});const me=room.join().id,other=room.join().id;
  room.receive(me,pose({x:0,z:0}));room.receive(other,pose({x:20,z:0}));
  const first=room.tick().get(me);assert.equal(decode(first).type,TYPE.SNAPSHOT,'no ack yet → full snapshot');
  const base=new Map(decode(first).records.map(r=>[r.id,quantizeRecord(r)]));
  clock.t+=50;room.receive(me,encode(TYPE.POSE,decode(first).tick,[{id:0,x:0,y:0,z:0,mode:'kart'}]));
  room.receive(other,pose({x:21.5,z:-.5}));
  const d=decodeDelta(room.tick().get(me));assert.equal(d.type,TYPE.DELTA);assert.equal(d.baseTick,decode(first).tick);
  const now2=applyDelta(base,d.entries).get(other);assert.equal(now2.x,quantizeRecord({x:21.5}).x);assert.equal(now2.z,quantizeRecord({z:-.5}).z);
  assert.equal(room.stats().deltas,1);
}
{ // Network culling: neighbours every tick, two cells away every 2nd tick, farther every 4th (plane sees 9 × 9 cells).
  const room=new Room({now});const me=room.join().id,near=room.join().id,mid=room.join().id,far=room.join().id;
  room.receive(me,pose({x:0,z:0,y:100,mode:'plane'}));room.receive(near,pose({x:30,z:0}));room.receive(mid,pose({x:140,z:0}));room.receive(far,pose({x:250,z:0}));
  let ack=0;const seen={near:0,mid:0,far:0};
  for(let i=0;i<8;i++){
    clock.t+=50;room.receive(me,encode(TYPE.POSE,ack,[{id:0,x:0,y:100,z:0,mode:'plane'}]));
    for(const [id,x] of [[near,30+i],[mid,140+i],[far,250+i]])room.receive(id,pose({x,z:0}));
    const bytes=room.tick().get(me),msg=decode(bytes)??decodeDelta(bytes);ack=msg.tick;
    if(msg.type===TYPE.DELTA)for(const e of msg.entries){if(e.id===near)seen.near++;if(e.id===mid)seen.mid++;if(e.id===far)seen.far++;}
  }
  assert.deepEqual(seen,{near:7,mid:4,far:2},'updates per distance over 7 deltas');
}
{ // Corrections: a refused pose is answered with the last accepted one (≤ 2 per second), so the client can resync at once.
  const room=new Room({now});const id=room.join().id;
  room.receive(id,pose({x:0,z:0}));
  clock.t+=100;const r=room.receive(id,pose({x:90,z:0}));assert.equal(r.reason,'speed');
  const c=decode(r.correction);assert.equal(c.type,TYPE.CORRECT);assert.ok(Math.abs(c.records[0].x)<.1);
  clock.t+=100;assert.equal(room.receive(id,pose({x:95,z:0})).correction,undefined,'rate-limited');
  clock.t+=600;assert.ok(room.receive(id,pose({x:96,z:0})).correction,'again after 0.5 s');
  // State flags travel to others (vertex-shader mutation), the teleport flag never does.
  const other=room.join().id;clock.t+=2000;room.receive(id,pose({x:0,z:0,flags:FLAG.BRAKING|FLAG.CRASHED|FLAG.TELEPORT}));room.receive(other,pose({x:5,z:0}));
  const seenFlags=decode(room.tick().get(other)).records[0].flags;assert.equal(seenFlags,FLAG.BRAKING|FLAG.CRASHED);
}
{ // Bandwidth (ADR 0005 target < 64 kbit/s per client): 64 karts in 5 × 5 cells, all moving, acking every tick.
  let t=0;const room=new Room({now:()=>t});const ps=[];
  for(let i=0;i<64;i++){const id=room.join().id;ps.push({id,x:((i*37)%300)-150,z:((i*91)%300)-150,h:i*.7,v:10+(i%5)*6,ack:0});}
  let bytes=0,ticks=0;
  for(let k=0;k<100;k++){t+=50;
    for(const p of ps){p.h+=.03;p.x+=Math.sin(p.h)*p.v/20;p.z-=Math.cos(p.h)*p.v/20;room.receive(p.id,encode(TYPE.POSE,p.ack,[{id:0,x:p.x,y:5,z:p.z,heading:p.h,speed:p.v,mode:'kart'}]));}
    const frames=room.tick();
    for(const p of ps){const f=frames.get(p.id);p.ack=(decode(f)??decodeDelta(f)).tick;if(k>=20){bytes+=f.byteLength;ticks++;}}
  }
  const kbit=bytes/ticks*20*8/1000;console.log(`  64 Karts dicht: ${kbit.toFixed(1)} kbit/s pro Spieler`);
  assert.ok(kbit<64,`under the 64 kbit/s target (${kbit.toFixed(1)})`);assert.deepEqual(room.stats().rejected,{});
}
{ // Review fix: only the state flags (BRAKING, CRASHED) are forwarded — unknown bits from a client never reach others.
  const clock={t:1000},room=new Room({now:()=>clock.t}),a=room.join().id,b=room.join().id;
  room.receive(a,pose({x:0,z:0,flags:0xf8|FLAG.BRAKING}));room.receive(b,pose({x:3,z:0}));
  assert.equal(decode(room.tick().get(b)).records[0].flags,FLAG.BRAKING);
}
console.log('PASS: map room — join limit, interest per mode, validation (bounds, speed, rate), ping, timeouts, stats.');
