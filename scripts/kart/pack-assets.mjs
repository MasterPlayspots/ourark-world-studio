#!/usr/bin/env node
// Packs the kart bundles for transfer (Welle P3, ADR 0006). Run after the prepare_*.py scripts, which write raw files:
//   node scripts/kart/pack-assets.mjs          (pack + hash; idempotent: a second run changes nothing)
//   node scripts/kart/pack-assets.mjs --check  (fail if a bundle is not packed or a hash is stale; used by the tests)
// - Height grids (terrain, land grid): delta planes + gzip (runtime/assets/codec.js), raw .bin removed.
// - LoD2 buildings: gzip, raw .bin removed. Trees stay raw (gzip saves only 14 %).
// - Aerial photo: a 1024 px WebP preview for the first frame (needs `cwebp`); the full JPEG follows in the background.
// - Every referenced file gets `hash` (first 16 hex of SHA-256): the client loads it as ?v=<hash>, the Worker serves
//   such requests as immutable, so a changed file always gets a new URL.
// gzip is deterministic here (Node zlib, level 9, mtime 0), so packing the same input gives the same bytes.
import {readFile,writeFile,unlink,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {encodeHeightPlanes,decodeHeightFile,decodeBinaryFile,HEIGHT_PACKING,GZIP_PACKING} from '../../dist/runtime/assets/codec.js';

const DIR=new URL('../../dist/kart/assets/',import.meta.url),CHECK=process.argv.includes('--check');
const MAPS=['rosenberg','kronach'],PREVIEW_PX=1024,PREVIEW_QUALITY=80;
const file=name=>new URL(name,DIR);
const exists=async name=>{try{await access(file(name));return true;}catch{return false;}};
const hashOf=bytes=>createHash('sha256').update(bytes).digest('hex').slice(0,16);
const gzip=bytes=>gzipSync(bytes,{level:9});
const problems=[];let changed=false;

async function packHeight(grid,label){
  if(grid.packing===HEIGHT_PACKING)return;
  if(CHECK){problems.push(`${label}: Höhenraster nicht gepackt`);return;}
  const raw=await readFile(file(grid.file)),values=new Uint16Array(raw.buffer,raw.byteOffset,raw.length/2);
  const packed=gzip(encodeHeightPlanes(values,grid.width,grid.depth)),name=`${grid.file}.gz`;
  const back=await decodeHeightFile(packed,{width:grid.width,depth:grid.depth,packing:HEIGHT_PACKING});
  if(Buffer.compare(Buffer.from(back.buffer),raw)!==0)throw new Error(`${label}: Rückweg nicht bytegleich`);
  await writeFile(file(name),packed);await unlink(file(grid.file));
  console.log(`${label}: ${grid.file} ${raw.length} → ${name} ${packed.length} B`);
  grid.file=name;grid.packing=HEIGHT_PACKING;changed=true;
}
async function packGzip(entry,label){
  if(entry.packing===GZIP_PACKING)return;
  if(CHECK){problems.push(`${label}: nicht gepackt`);return;}
  const raw=await readFile(file(entry.file)),packed=gzip(raw),name=`${entry.file}.gz`;
  if(Buffer.compare(Buffer.from(await decodeBinaryFile(packed,GZIP_PACKING)),raw)!==0)throw new Error(`${label}: Rückweg nicht bytegleich`);
  await writeFile(file(name),packed);await unlink(file(entry.file));
  console.log(`${label}: ${entry.file} ${raw.length} → ${name} ${packed.length} B`);
  entry.file=name;entry.packing=GZIP_PACKING;changed=true;
}
async function preview(texture,label){
  const name=texture.file.replace(/\.[a-z]+$/,'.preview.webp');
  if(texture.preview?.file===name&&await exists(name))return;
  if(CHECK){problems.push(`${label}: Vorschaubild fehlt`);return;}
  execFileSync('cwebp',['-quiet','-q',String(PREVIEW_QUALITY),'-m','6','-resize',String(PREVIEW_PX),String(PREVIEW_PX),
    new URL(texture.file,DIR).pathname,'-o',new URL(name,DIR).pathname]);
  texture.preview={file:name,size:PREVIEW_PX};changed=true;
  console.log(`${label}: Vorschau ${name}`);
}
async function stamp(entry,label){
  const hash=hashOf(await readFile(file(entry.file)));
  if(entry.hash===hash)return;
  if(CHECK){problems.push(`${label}: Hash von ${entry.file} veraltet (${entry.hash??'fehlt'} ≠ ${hash})`);return;}
  entry.hash=hash;changed=true;
}
async function save(name,meta){if(!CHECK)await writeFile(file(name),JSON.stringify(meta,null,1));}

const lands=new Set();
for(const map of MAPS){
  const name=`${map}.json`,meta=JSON.parse(await readFile(file(name),'utf8'));
  await packHeight(meta.terrain,`${map} Gelände`);
  if(meta.buildings)await packGzip(meta.buildings,`${map} Gebäude`);
  await preview(meta.texture,`${map} Luftbild`);
  for(const [entry,label] of [[meta.terrain,'Gelände'],[meta.texture,'Luftbild'],[meta.texture.preview,'Vorschau'],[meta.buildings,'Gebäude'],[meta.trees,'Bäume']])
    if(entry)await stamp(entry,`${map} ${label}`);
  if(meta.land)lands.add(meta.land);
  await save(name,meta);
}
for(const land of lands){
  const name=`${land}.json`,meta=JSON.parse(await readFile(file(name),'utf8'));
  await packHeight(meta.grid,`${land} Raster`);
  await stamp(meta.grid,`${land} Raster`);await stamp(meta.texture,`${land} Luftbild`);
  await save(name,meta);
}
if(problems.length){console.error(`FAIL: ${problems.join(' | ')}\nAbhilfe: node scripts/kart/pack-assets.mjs`);process.exit(1);}
console.log(CHECK?'PASS: Kartenbündel gepackt, Hashes aktuell.':changed?'Kartenbündel gepackt.':'Nichts zu tun – alles gepackt und aktuell.');
