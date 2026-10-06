// Protocol v1 deltas (type DELTA) and corrections: quantised records, field masks, zigzag varints, strict decoding,
// and the bandwidth they save against full snapshots.
import assert from 'node:assert/strict';
import {TYPE,FLAG,encode,quantizeRecord,dequantizeRecord,encodeDelta,decodeDelta,applyDelta,decode} from '../dist/runtime/net/protocol.js';

const rec=(id,x,z,o={})=>({id,x,y:o.y??20,z,heading:o.heading??0,speed:o.speed??10,mode:o.mode??'kart',flags:o.flags??0});
const toMap=list=>new Map(list.map(r=>[r.id,quantizeRecord(r)]));

{ // Quantised records round-trip like the 16-byte record.
  const q=quantizeRecord(rec(9,12.34,-5.5,{heading:-1,speed:-3.21,mode:'plane',flags:FLAG.CRASHED}));
  assert.deepEqual(Object.keys(q),['id','x','y','z','h','s','mode','flags']);
  const r=dequantizeRecord(q);assert.ok(Math.abs(r.x-12.34)<1/32&&Math.abs(r.speed+3.21)<.006&&r.mode==='plane'&&r.flags===FLAG.CRASHED);
  assert.equal(FLAG.TELEPORT,1);assert.equal(FLAG.BRAKING,2);assert.equal(FLAG.CRASHED,4);
}
{ // Delta against a baseline: changed fields only, new entities in full, removed ones marked; apply gives the current map.
  const base=toMap([rec(1,0,0),rec(2,10,0),rec(3,50,50)]);
  const cur=toMap([rec(1,.5,-.3),rec(2,10,0,{speed:12}),rec(4,-20,7,{mode:'walk'})]);
  const bytes=encodeDelta(77,70,base,cur);
  const msg=decodeDelta(bytes);
  assert.equal(msg.type,TYPE.DELTA);assert.equal(msg.tick,77);assert.equal(msg.baseTick,70);
  const out=applyDelta(base,msg.entries);
  assert.deepEqual([...out.keys()].sort(),[1,2,4]);for(const [id,q] of cur)assert.deepEqual(out.get(id),q,`entity ${id}`);
  assert.ok(!out.has(3),'removed');
  assert.equal(decode(bytes),null,'deltas are not plain snapshots');
  // An unchanged entity costs nothing at all.
  assert.equal(decodeDelta(encodeDelta(78,77,cur,cur)).entries.length,0);
  // Heading across ±π takes the short way (small diff, not 65 535).
  const turn=decodeDelta(encodeDelta(2,1,toMap([rec(5,0,0,{heading:3.13})]),toMap([rec(5,0,0,{heading:-3.13})])));
  assert.ok(turn.entries[0].diff.h!==undefined&&Math.abs(turn.entries[0].diff.h)<300,"242 units the short way, not 65 292");
}
{ // Strict decoding: truncated, trailing bytes, wrong type, overlong varints → null.
  const good=encodeDelta(3,2,toMap([rec(1,0,0)]),toMap([rec(1,1,1),rec(2,5,5)]));
  for(const bad of [good.slice(0,good.length-1),new Uint8Array([...good,0]),(()=>{const b=good.slice();b[3]=TYPE.SNAPSHOT;return b;})(),
    (()=>{const b=new Uint8Array(good.length+8);b.set(good.slice(0,16));b.fill(0xff,16);new DataView(b.buffer).setUint16(8,1,true);return b;})()])
    assert.equal(decodeDelta(bad),null);
  assert.equal(decodeDelta(new Uint8Array(3)),null);
}
{ // Bandwidth: 63 visible players driving at 10–40 m/s for one second at 20 Hz.
  let base=new Map(),fullBytes=0,deltaBytes=0;
  const players=Array.from({length:63},(_,i)=>({id:i+1,x:(i%8)*30-100,z:Math.floor(i/8)*30-100,heading:i*.3,speed:10+(i%4)*10}));
  for(let t=1;t<=20;t++){
    for(const p of players){p.x+=Math.sin(p.heading)*p.speed/20;p.z-=Math.cos(p.heading)*p.speed/20;p.heading+=.02;}
    const recs=players.map(p=>rec(p.id,p.x,p.z,{heading:p.heading,speed:p.speed}));
    fullBytes+=encode(TYPE.SNAPSHOT,t,recs).byteLength;
    const cur=toMap(recs);deltaBytes+=t===1?encode(TYPE.SNAPSHOT,t,recs).byteLength:encodeDelta(t,t-1,base,cur).byteLength;base=cur;
  }
  const kbit=b=>Math.round(b*8/1000);
  console.log(`  63 sichtbare Spieler, 1 s: voll ${kbit(fullBytes)} kbit/s · Delta ${kbit(deltaBytes)} kbit/s (−${Math.round((1-deltaBytes/fullBytes)*100)} %)`);
  assert.ok(deltaBytes<fullBytes*.6,'deltas save at least 40 %');
}
console.log('PASS: protocol deltas — quantised records, masks, zigzag varints, new/removed, short-way heading, strict decoding, bandwidth.');
