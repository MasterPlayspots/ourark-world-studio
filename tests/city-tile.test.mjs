// City tile export (Stadt-Scan): clipping, building parts, ground layers, determinism, orbit camera.
// Synthetic map only (no OpenStreetMap data in this repository).
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {clipToRect,buildTile,writeGlb,orbitCamera} from '../scripts/city-tile.mjs';

// 1. Clipping a triangle to the tile.
assert.deepEqual(clipToRect([[1,1],[2,1],[1,2]],[0,0,10,10]),[[1,1],[2,1],[1,2]],'inside stays');
assert.deepEqual(clipToRect([[20,20],[30,20],[20,30]],[0,0,10,10]),[],'outside goes');
const cut=clipToRect([[-5,5],[5,5],[5,-5]],[0,0,10,10]);
assert.ok(cut.length>=3&&cut.every(([x,z])=>x>=0&&x<=10&&z>=0&&z<=10),'straddling is cut to the edge');

// 2. The synthetic city as one 250 m tile.
const doc=JSON.parse(await readFile(new URL('./fixtures/city-mini.map.json',import.meta.url),'utf8'));
const tile=buildTile(doc,[0,0,250]);
assert.equal(tile.buildings,6);
const names=tile.parts.map(p=>p.name);
for(const id of 'abcdef')assert.ok(names.includes(`building/${id}/facade`)&&names.includes(`building/${id}/roof`),id);
for(const kind of ['base','land','park','beach','road','path'])assert.ok(names.includes(`ground/${kind}`),kind);
assert.ok(!names.includes('ground/water')||tile.parts.find(p=>p.name==='ground/water').positions.every((v,i)=>i%3!==0||v<=250),'water clipped at x = 250');
for(const p of tile.parts.filter(p=>p.name.startsWith('ground/'))){
  for(let i=0;i<p.positions.length;i+=3)assert.ok(p.positions[i]>=0&&p.positions[i]<=250&&p.positions[i+2]>=0&&p.positions[i+2]<=250,`${p.name} inside the tile`);
}
// Roofs at the building height, facades from 0 up, no bottom caps.
const roofD=tile.parts.find(p=>p.name==='building/d/roof');assert.ok(roofD.positions.filter((_,i)=>i%3===1).every(y=>y===32));
const facadeB=tile.parts.find(p=>p.name==='building/b/facade');const ys=facadeB.positions.filter((_,i)=>i%3===1);assert.equal(Math.min(...ys),0);assert.equal(Math.max(...ys),18);
// A building outside the tile is not part of it.
assert.equal(buildTile(doc,[0,0,100]).buildings,2,"only a (40/40) and b (90/40)");

// 3. Deterministic bytes, orbit camera.
const sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(sha(writeGlb(buildTile(doc,[0,0,250]).parts)),sha(writeGlb(buildTile(doc,[0,0,250]).parts)));
const cam=orbitCamera([0,0,250]);assert.equal(cam.frames.length,600);assert.equal(cam.frames[0][0][1],45);
console.log('PASS: city tile — clipping, whole buildings as facade + roof, ground kinds clipped to the tile, heights, tile membership, deterministic GLB, orbit camera.');
