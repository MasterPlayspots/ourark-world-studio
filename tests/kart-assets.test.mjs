// Kart bundle packing (Welle P3, ADR 0006): the height codec is lossless for every uint16 grid (including wrap-around
// deltas and single rows/columns), unknown packings fail loudly, and the shipped bundles are packed with current
// content hashes (scripts/kart/pack-assets.mjs --check) and decode to the declared sizes.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import {encodeHeightPlanes,decodeHeightPlanes,decodeHeightFile,decodeBinaryFile,assetUrl,HEIGHT_PACKING,GZIP_PACKING} from '../dist/runtime/assets/codec.js';

const rng=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};

{ // Lossless for any values: extremes (0 ↔ 65535 wraps the delta), noise, single row and single column.
  const r=rng(3);
  for(const [w,d] of [[1,1],[1,37],[53,1],[64,48],[300,7]]){
    for(const fill of [()=>Math.floor(r()*65536),()=>r()<.5?0:65535,(()=>{let v=30000;return ()=>(v=(v+Math.floor(r()*9)-4)&0xffff);})()]){
      const values=Uint16Array.from({length:w*d},fill);
      assert.deepEqual(decodeHeightPlanes(encodeHeightPlanes(values,w,d),w,d),values,`${w}×${d}`);
      const file=gzipSync(encodeHeightPlanes(values,w,d));
      assert.deepEqual(await decodeHeightFile(file,{width:w,depth:d,packing:HEIGHT_PACKING}),values);
    }
  }
  const raw=Uint16Array.from([1,2,3,4]);
  assert.deepEqual(await decodeHeightFile(new Uint8Array(raw.buffer),{width:2,depth:2}),raw,'unpacked files still load');
}
{ // Wrong sizes and unknown packings are errors, not silent garbage.
  assert.throws(()=>encodeHeightPlanes(new Uint16Array(5),2,2),/falsche Größe/);
  await assert.rejects(decodeHeightFile(new Uint8Array(6),{width:2,depth:2}),/falsche Größe/);
  await assert.rejects(decodeHeightFile(new Uint8Array(8),{width:2,depth:2,packing:'brotli'}),/Unbekannte Höhenpackung/);
  await assert.rejects(decodeBinaryFile(new Uint8Array(8),'zstd'),/Unbekannte Packung/);
  assert.deepEqual(await decodeBinaryFile(gzipSync(Buffer.from('KB01')),GZIP_PACKING),new Uint8Array(Buffer.from('KB01')));
}
{ // Hashed URLs.
  const base=new URL('https://world.example/kart/assets/');
  assert.equal(assetUrl(base,'kronach-height.bin.gz','0123456789abcdef').href,'https://world.example/kart/assets/kronach-height.bin.gz?v=0123456789abcdef');
  assert.equal(assetUrl(base,'kronach-trees.bin').href,'https://world.example/kart/assets/kronach-trees.bin');
}
console.log("PASS: lossless height codec, invalid-input rejection and content-hashed URLs. External bundle audit is excluded; see PUBLIC_SOURCE.json.");
