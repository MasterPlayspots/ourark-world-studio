// Sim state layout v1: 64-byte entity records, offsets that match the WGSL struct, the EntityStore on one ArrayBuffer.
import assert from 'node:assert/strict';
import {ENTITY_BYTES,OFFSET,MODE,WGSL_ENTITY,EntityStore} from '../dist/runtime/sim/layout.js';

{ // Record size and offsets: 16-byte aligned vectors exactly where WGSL puts vec3<f32> (align 16, size 12).
  assert.equal(ENTITY_BYTES,64);
  assert.deepEqual(OFFSET,{id:0,flags:4,tick:8,pos:16,vel:32,heading:48,pitch:52,roll:56,mutation:60});
  for(const k of ['pos','vel'])assert.equal(OFFSET[k]%16,0,`${k} 16-byte aligned`);
  assert.match(WGSL_ENTITY,/struct Entity \{/);
  // The WGSL text declares the fields in the same order as the offsets.
  const order=[...WGSL_ENTITY.matchAll(/(\w+)\s*:\s*(?:vec3<f32>|u32|f32)/g)].map(m=>m[1]).filter(n=>!n.startsWith('_'));
  assert.deepEqual(order,['id','flags','tick','pos','vel','heading','pitch','roll','mutation']);
  assert.deepEqual(MODE,{none:0,kart:1,plane:2,walk:3,car:4});
}
{ // Store: one ArrayBuffer, records written and read back through typed views, ids map to slots, slots reused.
  const store=new EntityStore(4);
  assert.equal(store.buffer.byteLength,4*64);
  const a=store.upsert(7,{mode:'kart',pos:[1.5,2,-3],vel:[4,0,0],heading:1.25,tick:42,mutation:3});
  const b=store.upsert(9,{mode:'plane',pos:[10,300,20]});
  assert.notEqual(a,b);assert.equal(store.count,2);
  const e=store.read(7);
  assert.equal(e.id,7);assert.equal(e.mode,'kart');assert.deepEqual(e.pos,[1.5,2,-3]);assert.deepEqual(e.vel,[4,0,0]);
  assert.equal(e.tick,42);assert.equal(e.mutation,3);assert.ok(Math.abs(e.heading-1.25)<1e-6);
  // Same id updates the same slot; the raw bytes sit at slot*64.
  assert.equal(store.upsert(7,{pos:[2,2,2]}),a);
  const f32=new Float32Array(store.buffer,a*64+OFFSET.pos,3);assert.deepEqual([...f32],[2,2,2]);
  assert.equal(new Uint32Array(store.buffer,a*64,1)[0],7);
  store.remove(7);assert.equal(store.count,1);assert.equal(store.read(7),null);
  assert.equal(store.upsert(11,{mode:'walk'}),a,'freed slot is reused');
  // Full store refuses new ids instead of growing (fixed memory, no allocation per update).
  store.upsert(12,{});store.upsert(13,{});
  assert.equal(store.upsert(14,{}),-1);
  assert.deepEqual([...store.ids()].sort((x,y)=>x-y),[9,11,12,13]);
}
console.log('PASS: sim state layout v1 — 64-byte records, WGSL-compatible offsets, EntityStore on one ArrayBuffer.');
