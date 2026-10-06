// Scan worlds (ADR 0003): the fixture bundle baked by worldscan, its manifest and colliders, and walking in it.
// A5: 20 s of random walking never ends inside an object or outside the room.
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PLAYER,BOUNDS} from '../dist/runtime/physics/adapter.js';
import {Walker} from '../dist/runtime/walker.js';
import {SCAN_ID,readColliders,poseFromFrame,prepareScanWalk,bundleIdOf,checkManifest} from '../dist/runtime/scan/adapter.js';

const root=new URL('./fixtures/scans/',import.meta.url),[id]=(await readdir(root)).filter(n=>SCAN_ID.test(n));
assert.ok(id,'fixture bundle present');
const file=name=>readFile(new URL(`${id}/${name}`,root)),json=async name=>JSON.parse(await file(name));
const manifest=await json('manifest.json'),colliders=await json('colliders.json'),camera=await json('camera.json');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

// 1. Manifest: format, every listed file matches its hash, the id is the hash of the file list.
checkManifest(manifest,id);
for(const f of manifest.files)assert.equal(sha(await file(f.path)),f.sha256,f.path);
assert.equal(await bundleIdOf(manifest.files,async bytes=>sha(bytes)),id);
assert.throws(()=>checkManifest(manifest,'0'.repeat(64)),/Adresse/);
assert.throws(()=>checkManifest({...manifest,files:[{path:'../x.json',bytes:1,sha256:'0'.repeat(64)}]},id),/ungültig/);
assert.throws(()=>checkManifest({...manifest,files:manifest.files.filter(f=>f.path!=='colliders.json')},id),/colliders/);
assert.equal(manifest.stats.drawCalls,23);assert.equal(manifest.stats.triangles,68155);

// 2. Colliders: metres, a convex room outline, only real polygons; bad data is refused, not walked.
const room=readColliders(colliders);
assert.ok(room.colliders.length>100&&room.colliders.every(c=>c.vertices.length>=3));
assert.throws(()=>readColliders({...colliders,format:'x'}),/Format/);
assert.throws(()=>readColliders({...colliders,area:[[0,0],[1,1]]}),/Polygon/);
assert.throws(()=>readColliders({...colliders,colliders:[{polygon:[[0,0],[1,0],[NaN,1]]}]}),/Polygon/);

// 3. Source camera → start pose: first frame of office48 looks roughly south-east into the room.
const first=poseFromFrame(camera.frames[0]);
assert.ok(Math.abs(first.x-2.2408)<1e-9&&Math.abs(first.z-4.2221)<1e-9);
assert.ok(first.heading>0&&first.heading<90,`heading ${first.heading}`);
assert.deepEqual(poseFromFrame([[0,0,0],[0,0,-1]]),{x:0,z:0,heading:0,pitch:0});
assert.equal(Math.round(poseFromFrame([[0,0,0],[1,0,0]]).heading),90);

// 4. Prepared walk: metres (radius 0.3, eye floor + 1.6, 3 m/s), free start near the source camera.
const walk=prepareScanWalk({colliders,camera});
assert.equal(walk.physics.overlaps(walk.start),null,'start is free');
assert.ok(Math.hypot(walk.start.x-first.x,walk.start.z-first.z)<1,'starts next to the source camera');
assert.equal(walk.eye,colliders.floorY+PLAYER.eye);assert.equal(walk.speed,PLAYER.walkSpeed);

// 5. A5 — 20 s of random walking (fixed seed, several runs) never ends inside an object or outside the room.
function random(seed){let s=seed;return ()=>(s=(s*16807)%2147483647)/2147483647;}
for(const seed of [1,7,42,1234,99991]){
  const rand=random(seed),walker=new Walker({physics:walk.physics,start:walk.start,speed:walk.speed});
  let intent={x:0,z:1,turn:0},moved=0,last={...walker.pose};
  for(let i=0;i<20*60;i++){
    if(i%30===0)intent={x:rand()*2-1,z:rand()*2-1,turn:rand()*2-1};
    walker.step(1/60,intent);
    assert.equal(walk.physics.overlaps(walker.pose),null,`seed ${seed}, step ${i}: ${JSON.stringify(walker.pose)}`);
    moved+=Math.hypot(walker.pose.x-last.x,walker.pose.z-last.z);last={...walker.pose};
  }
  assert.ok(moved>3,`seed ${seed}: the player actually moved (${moved.toFixed(1)} m)`);
}

// 6. Walls hold: walking straight in each direction for 15 s ends inside the room, stopped by something.
for(const heading of [0,90,180,270]){
  const walker=new Walker({physics:walk.physics,start:{...walk.start,heading},speed:walk.speed});
  for(let i=0;i<15*60;i++)walker.step(1/60,{x:0,z:1,turn:0});
  assert.equal(walk.physics.overlaps(walker.pose),null);
  assert.ok(walker.contacts.length>0||walker.contacts.includes(BOUNDS.id),`heading ${heading}: stopped`);
}

// 7. A room with no free place is refused with a message.
assert.throws(()=>prepareScanWalk({colliders:{...colliders,colliders:[{id:'all',polygon:colliders.area}]},camera}),/Startplatz/);

console.log(`PASS: scan bundle ${id.slice(0,12)}… verified, colliders checked, start at the source camera, A5 random walk (5 × 20 s) stays in the room and outside every object, walls hold.`);
