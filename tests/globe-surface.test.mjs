// Globe surface grid (dist/globe/surface.js): terrain + rasterised LoD2 roofs from the real Kronach kart bundle.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {buildSurface,utm32,readSurfaceFile,SurfaceTiles} from '../dist/globe/surface.js';
import {gunzip} from '../dist/runtime/assets/codec.js';
import {decodeHeightFile,decodeBinaryFile} from '../dist/runtime/assets/codec.js';

const dir=new URL('../dist/kart/assets/',import.meta.url),meta=JSON.parse(await readFile(new URL('kronach.json',dir),'utf8'));
const heights=await decodeHeightFile(new Uint8Array(await readFile(new URL(meta.terrain.file,dir))),meta.terrain);
const kb01=await decodeBinaryFile(new Uint8Array(await readFile(new URL(meta.buildings.file,dir))),meta.buildings.packing);

// 1. Without buildings the grid is the terrain itself (bilinear like the kart's terrainSampler).
{
  const bare=buildSurface(heights,meta.terrain);
  const t=meta.terrain,h=(i,j)=>heights[j*t.width+i]*t.scale;
  assert.ok(Math.abs(bare.at(0,0)-h(500,500))<1e-4,'node at the tile centre');
  assert.ok(Math.abs(bare.at(.5,0)-(h(500,500)+h(501,500))/2)<1e-4,'bilinear between nodes');
  assert.equal(bare.roofs,0);assert.ok(bare.covers(0,0)&&!bare.covers(499.5,0));
}

// 2. With roofs: roof triangle centroids read their roof height (1 m grid accuracy), never lower than the terrain,
//    and the old town really gets higher (houses ≥ 4 m above ground).
{
  const s=buildSurface(heights,meta.terrain,kb01),bare=buildSurface(heights,meta.terrain);
  const view=new DataView(kb01.buffer,kb01.byteOffset,kb01.byteLength),roofVerts=view.getUint32(4,true);
  const raw=new Int16Array(kb01.buffer.slice(kb01.byteOffset+12,kb01.byteOffset+12+roofVerts*6));
  assert.ok(s.roofs>20000,`roof triangles: ${s.roofs}`);
  let checked=0,low=0,deep=0,raised=0;const diffs=[];
  for(let t=0;t+8<raw.length;t+=9*7){// every 7th triangle
    const x=(raw[t]+raw[t+3]+raw[t+6])*.05/3,y=(raw[t+1]+raw[t+4]+raw[t+7])*.05/3,z=(raw[t+2]+raw[t+5]+raw[t+8])*.05/3;
    if(!s.covers(x,z))continue;checked++;
    const d=s.at(x,z)-y;diffs.push(d);if(d<-.5)low++;if(d<-2)deep++;
    if(s.at(x,z)-bare.at(x,z)>=4)raised++;
  }
  assert.ok(checked>2000,`checked ${checked}`);
  // Measured on Kronach: median 0.00 m, IQR −0.00…+0.09 m; the misses are centroids of sub-metre roof parts at the
  // eaves, where the 1 m bilinear read blends with the ground next to the house.
  diffs.sort((a,b)=>a-b);assert.ok(Math.abs(diffs[diffs.length>>1])<.05,`median ${diffs[diffs.length>>1]}`);
  assert.ok(low/checked<.15,`centroids more than 0.5 m below the roof: ${low}/${checked}`);
  assert.ok(deep/checked<.05,`more than 2 m below: ${deep}/${checked}`);
  assert.ok(raised/checked>.5,`roofs clearly above ground: ${raised}/${checked}`);
  for(let k=0;k<s.data.length;k+=997)assert.ok(s.data[k]>=bare.data[k]-1e-6,'never below the terrain');
}

// 3. Lookups are cheap (the point of it): far below a microsecond each.
{
  const s=buildSurface(heights,meta.terrain,kb01);let sum=0;const n=1e6,t0=performance.now();
  for(let i=0;i<n;i++)sum+=s.at((i%997)-498,((i*7)%991)-495);
  const us=(performance.now()-t0)/n*1000;assert.ok(us<1&&Number.isFinite(sum),`${us.toFixed(3)} µs per lookup`);
  console.log(`  ${s.roofs} Dachdreiecke, ${(us*1000).toFixed(0)} ns pro Abfrage`);
}

// 4. UTM 32N in the browser (Krüger series) against pyproj (EPSG:4326 → EPSG:25832): below a millimetre.
{
  const ref=[[11.324506,50.240442,665749.9976,5567950.0369],[11.1684,50.1591,654882.8488,5558571.2692],[11.6106,50.5232,685043.5938,5600060.0916],
    [9,48,500000,5316300.2243],[13.5,54,794879.1905,5992898.1573],[11.2023,50.2405,657036.65,5567691.7458]];
  for(const [lon,lat,e,n] of ref){const [E,N]=utm32(lon,lat);assert.ok(Math.abs(E-e)<.001&&Math.abs(N-n)<.001,`${lon},${lat}: ${E},${N}`);}
}

// 5. County surface files (KS01): heights + roofs per km, looked up by UTM; a roof raises the ground, NaN until loaded.
{
  const h=new Uint16Array(1e6).fill(15000);                         // 150 m above the 200 m offset → 350 m NN
  const roof=new Int16Array([-200,3400,-200, 200,3400,-200, 0,3400,200]); // one roof triangle 170 m above the offset (20 m above ground), 5 cm units
  const kb=new Uint8Array(12+roof.byteLength);kb.set(new TextEncoder().encode('KB01'));new DataView(kb.buffer).setUint32(4,3,true);kb.set(new Uint8Array(roof.buffer),12);
  const hz=gzipSync(Buffer.from(h.buffer)),file=Buffer.concat([Buffer.from('KS01'),Buffer.from(new Uint32Array([20000,hz.length]).buffer),hz,gzipSync(Buffer.from(kb))]);
  const parsed=await readSurfaceFile(new Uint8Array(file),gunzip);assert.equal(parsed.offset,200);assert.equal(parsed.heights[123],15000);
  const tiles=new SurfaceTiles({load:async(te,tn)=>te===665&&tn===5567?parsed:null});
  assert.ok(Number.isNaN(tiles.at(665500,5567500)),'NaN until loaded');await new Promise(r=>setTimeout(r,10));
  assert.ok(Math.abs(tiles.at(665100,5567100)-350)<1e-3,'terrain: offset + 150 m');
  // Roof triangle around the tile centre (x −10…+10 m, z −10…+10 m), 20 m above the ground → 370 m NN.
  assert.ok(Math.abs(tiles.at(665500.5,5567500.5)-370)<.01,`roof: ${tiles.at(665500.5,5567500.5)}`);
  tiles.at(1,1);await new Promise(r=>setTimeout(r,10));assert.ok(Number.isNaN(tiles.at(1,1)),'missing tile stays NaN');
}

console.log('PASS: globe surface grid — terrain identity, roofs rasterised on the real Kronach bundle, never below ground, sub-µs lookups, UTM below 1 mm, KS01 county files.');
