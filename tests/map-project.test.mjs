// Map project contract (W1–W3 from the visuals deep dive, contracts/map-project-v1.md): the envelope keeps
// identity/revision/geo reference (P01), one byte budget for export/import/edits (P03), per-world local keys with
// a legacy migration and compare-and-set saves, explicit network range checks (P02) and measurement probes.
import assert from 'node:assert/strict';
import {SCHEMA,demoDocument,newPoint} from '../dist/map-studio/model.js';
import {ENVELOPE_SCHEMA,MAX_PROJECT_BYTES,readProject,serializeProject,envelope,projectBytes,utf8Length,checkEditBudget} from '../dist/map-studio/project.js';
import {loadLocal,saveLocal,listLocal,loadProject,SaveConflict,projectKey,LEGACY_WORLD_ID} from '../dist/map-studio/storage.js';
import {POS_LIMIT,ROOM_BOUND,mapFitsNetwork,poseOutOfRange,encode,decode,TYPE} from '../dist/runtime/net/protocol.js';
import {BOUND,Room} from '../edge/room.mjs';
import {EntityCuller,cameraFrom} from '../dist/runtime/gpu/cull.js';
import {EntityStore} from '../dist/runtime/sim/layout.js';
import {registerPerfProbe,readPerfProbes} from '../dist/runtime/perf-probes.js';

const extra={workspaceId:'ws-kronach',worldId:'world-7',revision:3,geoReference:{crs:'EPSG:25832',origin:[650000,5570000],heightDatum:'DHHN2016'}};

// 1. P01 fixed: metadata next to a bare map is lifted into the envelope; an envelope round trip keeps everything.
{
  const bare={...demoDocument(),...extra};
  const {meta,doc,envelope:wasEnvelope}=readProject(JSON.parse(JSON.stringify(bare)));
  assert.equal(wasEnvelope,false);assert.deepEqual(meta,extra,'nothing dropped');assert.equal(doc.schema,SCHEMA);assert.equal('worldId' in doc,false,'payload stays a pure map');
  const file=serializeProject(doc,meta),again=readProject(JSON.parse(file));
  assert.equal(JSON.parse(file).schema,ENVELOPE_SCHEMA);assert.equal(again.envelope,true);assert.deepEqual(again.meta,extra);assert.deepEqual(again.doc,doc);
  assert.equal(serializeProject(again.doc,again.meta),file,'byte-identical second export');
}
// 2. Older payloads still open (v1/v2/v3, without metadata → new worldId, revision 0); unknown/invalid envelopes are refused.
{
  for(const schema of ['motionspec.map.v1','motionspec.map.v2',SCHEMA]){
    const {meta,doc}=readProject({...demoDocument(),schema});assert.equal(doc.schema,SCHEMA);assert.match(meta.worldId,/^[0-9a-f-]{36}$/);assert.equal(meta.revision,0);
  }
  const lenient=readProject({...demoDocument(),worldId:'bad id with spaces',revision:-1});assert.notEqual(lenient.meta.worldId,'bad id with spaces');assert.equal(lenient.meta.revision,0,'bare files: invalid values skipped, file still opens');
  assert.throws(()=>readProject({schema:'ourark.map-project.v2',payload:demoDocument()}),/neueren/);
  assert.throws(()=>readProject({schema:ENVELOPE_SCHEMA,worldId:'a b',revision:0,payload:demoDocument()}),/Welt-ID/);
  assert.throws(()=>readProject({schema:ENVELOPE_SCHEMA,worldId:'w',revision:0,geoReference:'EPSG:4326',payload:demoDocument()}),/Geo-Bezug/);
  assert.throws(()=>readProject({schema:ENVELOPE_SCHEMA,worldId:'w',revision:0}),/Karteninhalt/);
  assert.throws(()=>readProject({schema:ENVELOPE_SCHEMA,revision:0,payload:demoDocument()}),/ohne Welt-ID/,'envelope needs a worldId');
  assert.equal(readProject(demoDocument()).hasWorldId,false);assert.equal(readProject({...demoDocument(),worldId:'w-9'}).hasWorldId,true);assert.equal(lenient.hasWorldId,false);
}
// 3. W1: projectBytes is exactly the UTF-8 size of the exported file (umlauts, emoji, image).
{
  const demo=demoDocument(),doc={...demo,points:[{...demo.points[0],data:{Hinweis:'Größe – Ü 🚗'}},...demo.points.slice(1)]};doc.name='Kronach Süd 🗺';
  doc.map={...doc.map,image:{name:'karte.webp',dataUrl:`data:image/webp;base64,${'QUJD'.repeat(5000)}`}};
  const meta={worldId:'w1',revision:2,geoReference:{note:'Höhe ü. NN'}};
  for(const d of [doc,{...doc,map:{...doc.map,image:null}}])assert.equal(projectBytes(d,meta),Buffer.byteLength(serializeProject(d,meta),'utf8'));
  for(const text of ['abc','äöü','€','🚗','\ud83d']) assert.equal(utf8Length(text),Buffer.byteLength(text,'utf8'),JSON.stringify(text));
}
// 4. P03 now a controlled decision: the deep-dive document (3000 points × ~5.8 kB data) is over budget, edits that grow
// it are refused with a clear message, shrinking stays possible; a document within budget always re-imports.
{
  const data=Object.fromEntries(Array.from({length:60},(_,i)=>[`Feld ${i}`,'x'.repeat(80)]));
  const big=readProject({...demoDocument(),points:Array.from({length:3000},(_,i)=>({...newPoint(i),id:`p${i}`,x:i%50,z:Math.floor(i/50),data}))});
  const bytes=projectBytes(big.doc,big.meta);assert.ok(bytes>MAX_PROJECT_BYTES,`over budget (${bytes})`);
  assert.throws(()=>checkEditBudget(bytes,bytes+10),/nicht übernommen.*16 MB/);
  assert.doesNotThrow(()=>checkEditBudget(bytes,bytes-10),'older oversize data may shrink');
  assert.doesNotThrow(()=>checkEditBudget(100,MAX_PROJECT_BYTES),'exactly at the budget is fine');
  const fits=readProject({...demoDocument(),points:big.doc.points.slice(0,2000)});const json=serializeProject(fits.doc,fits.meta);
  assert.ok(Buffer.byteLength(json)<=MAX_PROJECT_BYTES);assert.deepEqual(readProject(JSON.parse(json)).doc,fits.doc,'export within budget is accepted by import');
}

// --- Minimal IndexedDB (only what storage.js uses): one object store; like the real one, transactions on the same
// store run one after another and apply their writes only on completion (abort discards them).
function fakeIndexedDB({failPutOn=null}={}){
  const data=new Map();let created=false,chain=Promise.resolve();
  const later=fn=>setTimeout(fn,0);
  return {data,open(){
    const request={};
    later(()=>{const db={close(){},createObjectStore(){created=true;},transaction(){
      const ready=chain;let finish;chain=new Promise(r=>finish=r);
      const staged=new Map(),tx={pending:0,aborted:false,abort(){if(tx.aborted)return;tx.aborted=true;later(()=>{tx.onabort?.();finish();});}};
      const step=fn=>{tx.pending++;ready.then(()=>later(()=>{if(tx.aborted)return;fn();if(--tx.pending===0&&!tx.aborted)later(()=>{if(tx.aborted||tx.pending)return;for(const [k,v] of staged)data.set(k,structuredClone(v));tx.oncomplete?.();finish();});}));};
      tx.objectStore=()=>({
        get(key){const r={};step(()=>{r.result=staged.has(key)?staged.get(key):structuredClone(data.get(key));r.onsuccess?.();});return r;},
        put(value,key){step(()=>{if(failPutOn===key){tx.error=new Error('quota');tx.abort();return;}staged.set(key,structuredClone(value));});},
        add(value,key){step(()=>{if(staged.has(key)||data.has(key)){tx.error=new Error('ConstraintError');tx.abort();return;}staged.set(key,structuredClone(value));});},
        openCursor(){const r={},keys=[...new Set([...data.keys(),...staged.keys()])].sort();let i=0;
          const emit=()=>step(()=>{const k=keys[i];r.result=k===undefined?null:{key:k,value:staged.has(k)?staged.get(k):structuredClone(data.get(k)),continue(){i++;emit();}};r.onsuccess?.();});
          emit();return r;}
      });
      return tx;
    }};request.result=db;if(!created)request.onupgradeneeded?.();request.onsuccess?.();});
    return request;
  }};
}
// 5. Legacy migration: the old `current` entry is copied (never changed), `last` switches after the read-back.
{
  const idb=fakeIndexedDB(),legacy={...demoDocument(),name:'Alt'};idb.data.set('current',structuredClone(legacy));
  const first=await loadLocal({idb});assert.equal(first.migrated,true);assert.equal(first.doc.name,'Alt');assert.equal(first.meta.worldId,LEGACY_WORLD_ID,'fixed id: repeatable migration');
  assert.deepEqual(idb.data.get('current'),legacy,'legacy entry unchanged');
  assert.equal(idb.data.get('last'),first.meta.worldId);assert.equal(idb.data.get(projectKey(first.meta.worldId)).schema,ENVELOPE_SCHEMA);
  const second=await loadLocal({idb});assert.equal(second.migrated,undefined);assert.equal(second.meta.worldId,first.meta.worldId,'reload opens the migrated project');
  assert.equal(await loadLocal({idb:fakeIndexedDB()}),null,'empty store');
}
{ // A failing switch of `last` leaves `current` alone, and retries create no further copies.
  const idb=fakeIndexedDB({failPutOn:'last'});idb.data.set('current',demoDocument());
  await assert.rejects(loadLocal({idb}));await assert.rejects(loadLocal({idb}));await assert.rejects(loadLocal({idb}));
  assert.equal(idb.data.has('last'),false);assert.ok(idb.data.has('current'));
  assert.deepEqual([...idb.data.keys()].filter(k=>k.startsWith('project:')),[projectKey(LEGACY_WORLD_ID)],'exactly one copy after three attempts');
}
{ // A copy that was saved since (newer revision) is never overwritten by a repeated migration.
  const idb=fakeIndexedDB();idb.data.set('current',{...demoDocument(),name:'Alt'});
  await saveLocal({...demoDocument(),name:'Weiterbearbeitet'},{worldId:LEGACY_WORLD_ID,revision:0},{idb});idb.data.delete('last');
  const again=await loadLocal({idb});assert.equal(again.doc.name,'Weiterbearbeitet');assert.equal(again.meta.revision,1);
}
// 6. Separate keys per world; compare-and-set revisions (a second tab cannot overwrite a newer save).
{
  const idb=fakeIndexedDB(),a={worldId:'world-a',revision:0},b={worldId:'world-b',revision:0};
  const docA={...demoDocument(),name:'A'},docB={...demoDocument(),name:'B'};
  assert.equal(await saveLocal(docA,a,{idb}),1);assert.equal(await saveLocal(docB,b,{idb}),1);
  assert.equal(idb.data.get(projectKey('world-a')).payload.name,'A');assert.equal(idb.data.get(projectKey('world-b')).payload.name,'B','two projects do not overwrite each other');
  assert.equal((await loadLocal({idb})).meta.worldId,'world-b','last saved is reopened');
  assert.equal(await saveLocal({...docA,name:'A2'},{...a,revision:1},{idb}),2);
  await assert.rejects(saveLocal({...docA,name:'stale tab'},{...a,revision:1},{idb}),SaveConflict);
  assert.equal(idb.data.get(projectKey('world-a')).payload.name,'A2');assert.equal(idb.data.get(projectKey('world-a')).revision,2,'conflict wrote nothing');
  const listed=await listLocal({idb});assert.deepEqual(listed.map(p=>[p.worldId,p.name,p.revision]),[['world-a','A2',2],['world-b','B',1]],'both projects reachable');
  assert.equal((await loadProject('world-a',{idb})).doc.name,'A2');assert.equal(await loadProject('nope',{idb}),null);
  const [x,y]=await Promise.allSettled([saveLocal({...docA,name:'tab 1'},{...a,revision:2},{idb}),saveLocal({...docA,name:'tab 2'},{...a,revision:2},{idb})]);
  assert.equal([x,y].filter(r=>r.status==='fulfilled').length,1,'concurrent saves from the same base: exactly one wins');
}
// 7. W3 / P02: the network range is explicit; maps beyond it are reported instead of silently clamped.
{
  assert.equal(POS_LIMIT,2047.9375);assert.equal(BOUND,ROOM_BOUND);assert.equal(ROOM_BOUND,2000);
  assert.deepEqual(mapFitsNetwork({width:4000,depth:120}),{ok:true,reach:2000,limit:2000});
  assert.equal(mapFitsNetwork({width:5000,depth:5000}).ok,false);assert.equal(mapFitsNetwork({width:4200,depth:10},Infinity).ok,false,'protocol limit applies even without a room');
  assert.equal(poseOutOfRange({x:2047,y:0,z:-2047}),false);assert.equal(poseOutOfRange({x:2500,y:0,z:0}),true);
  assert.equal(decode(encode(TYPE.POSE,0,[{id:1,x:2500}])).records[0].x,POS_LIMIT,'wire format unchanged (v1 still clamps)');
  assert.ok(new Room());
}
// 8. W3: GPU culling reports its whole cost (upload + readback), CPU stays the default; probes feed the perf log.
{
  const f=1/Math.tan(Math.PI/6),cam=cameraFrom({position:[0,2,0],forward:[0,0,-1],viewProj:[f,0,0,0,0,f,0,0,0,0,-1.001,-1,0,0,-2.001,0]});
  const store=new EntityStore(16);store.upsert(1,{mode:'kart',pos:[0,0,-10]});
  const cpu=await EntityCuller.create({capacity:16,preferGpu:false});await cpu.cull(new Uint8Array(store.buffer),16,cam);
  assert.equal(cpu.lastStats.backend,'cpu');assert.equal(cpu.lastStats.uploadMs,null);assert.ok(cpu.lastStats.totalMs>=0);
  const gpu=new EntityCuller(16);gpu.backend='webgpu';
  gpu.gpu={device:{queue:{writeBuffer(){},submit(){}},createCommandEncoder:()=>({beginComputePass:()=>({setPipeline(){},setBindGroup(){},dispatchWorkgroups(){},end(){}}),copyBufferToBuffer(){},finish(){}})},
    readback:{mapAsync:()=>new Promise(r=>setTimeout(r,5)),getMappedRange:()=>new Uint32Array(16).buffer,unmap(){}}};
  await gpu.cull(new Uint8Array(store.buffer),16,cam);
  const s=gpu.lastStats;assert.equal(s.backend,'webgpu');assert.ok(s.waitMs>=4,'readback wait measured');assert.ok(s.totalMs>=s.uploadMs+s.waitMs-.5,'total covers upload and readback');
  const off=registerPerfProbe('cull',()=>gpu.lastStats);registerPerfProbe('broken',()=>{throw new Error('nope');});
  const probes=readPerfProbes();assert.equal(probes.cull.backend,'webgpu');assert.deepEqual(probes.broken,{error:'nope'});
  off();assert.equal(readPerfProbes().cull,undefined);
}
console.log('PASS: map project — envelope keeps metadata (P01), one byte budget (P03), per-world keys + migration + CAS, network range explicit (P02), cull/probe measurements.');
