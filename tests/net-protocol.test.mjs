// Network protocol v1: 12-byte header + 16-byte entity records, quantisation and strict decoding.
import assert from 'node:assert/strict';
import {HEADER_BYTES,RECORD_BYTES,MAX_RECORDS,TYPE,encode,decode,quantize,dequantize} from '../dist/runtime/net/protocol.js';

{ // Sizes and header layout: magic "OA", version 1, type, tick, count, flags — little endian.
  assert.equal(HEADER_BYTES,12);assert.equal(RECORD_BYTES,16);assert.equal(MAX_RECORDS,64);
  const bytes=encode(TYPE.SNAPSHOT,123456,[],5);
  assert.equal(bytes.byteLength,12);
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  assert.equal(String.fromCharCode(bytes[0],bytes[1]),'OA');assert.equal(v.getUint8(2),1);assert.equal(v.getUint8(3),TYPE.SNAPSHOT);
  assert.equal(v.getUint32(4,true),123456);assert.equal(v.getUint16(8,true),0);assert.equal(v.getUint16(10,true),5);
}
{ // Record round trip within the quantisation steps: 1/16 m, 2π/65536 rad, 1 cm/s.
  const e={id:4000000001,x:-1234.56,y:87.3,z:2047.9,heading:-2.5,speed:-33.33,mode:'plane',flags:3};
  const out=decode(encode(TYPE.POSE,7,[e]));
  assert.equal(out.type,TYPE.POSE);assert.equal(out.tick,7);assert.equal(out.records.length,1);
  const r=out.records[0];
  assert.equal(r.id,e.id);assert.equal(r.mode,'plane');assert.equal(r.flags,3);
  for(const k of ['x','y','z'])assert.ok(Math.abs(r[k]-e[k])<=1/32+1e-9,`${k} ${r[k]}`);
  const dh=Math.abs(((r.heading-e.heading+Math.PI*3)%(Math.PI*2))-Math.PI);assert.ok(dh<=Math.PI/65536+1e-9,'heading');
  assert.ok(Math.abs(r.speed-e.speed)<=.005+1e-9,'speed');
  assert.equal(encode(TYPE.SNAPSHOT,1,Array.from({length:64},(_,i)=>({id:i,x:0,y:0,z:0}))).byteLength,12+64*16);
}
{ // Clamping: positions beyond ±2047.9 m and speeds beyond ±327 m/s saturate instead of wrapping.
  assert.equal(quantize(5000,16),32767);assert.equal(quantize(-5000,16),-32768);
  assert.equal(dequantize(quantize(10,16),16),10);
  const r=decode(encode(TYPE.POSE,0,[{id:1,x:9999,y:0,z:-9999,speed:999}])).records[0];
  assert.ok(r.x>2047&&r.x<2048&&r.z<=-2048&&r.speed>327&&r.speed<328);
}
{ // Strict decoding: anything malformed is null, never an exception or a partial message.
  const good=encode(TYPE.SNAPSHOT,1,[{id:1,x:0,y:0,z:0}]);
  const bad=[new Uint8Array(0),new Uint8Array(11),good.slice(0,good.length-1),
    (()=>{const b=good.slice();b[0]=0;return b;})(),(()=>{const b=good.slice();b[2]=2;return b;})(),
    (()=>{const b=good.slice();b[3]=99;return b;})(),(()=>{const b=good.slice();new DataView(b.buffer).setUint16(8,2,true);return b;})(),
    (()=>{const b=new Uint8Array(12+65*16);b.set(good.slice(0,12));new DataView(b.buffer).setUint16(8,65,true);return b;})()];
  for(const b of bad)assert.equal(decode(b),null);
  assert.equal(decode('text'),null);
  assert.ok(decode(good.buffer),'ArrayBuffer input works too');
  assert.throws(()=>encode(TYPE.SNAPSHOT,0,Array.from({length:65},()=>({id:1,x:0,y:0,z:0}))),/at most 64/);
}
console.log('PASS: net protocol v1 — header, 16-byte records, quantisation, clamping, strict decoding.');
