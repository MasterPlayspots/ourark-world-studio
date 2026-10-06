// Local project store (IndexedDB) — contracts/map-project-v1.md. Each world has its own key `project:<worldId>`
// holding the envelope; `last` names the project saved most recently (or the migrated legacy project). The pre-envelope entry `current` is never
// changed or deleted: it is migrated by copying, and `last` only switches after the copy was read back.
import {envelope,readProject,validateMeta} from './project.js';

const DB_NAME='motionspec-map-studio-v1',STORE='projects',LEGACY_KEY='current',LAST_KEY='last';
// The legacy entry has no identity; one fixed id makes the migration repeatable without duplicate copies.
export const LEGACY_WORLD_ID='lokal-altbestand';
export const projectKey=worldId=>`project:${worldId}`;
export class SaveConflict extends Error{}
export class SaveRevisionLimit extends Error{}

export async function openStore(idb=globalThis.indexedDB){
  return new Promise((resolve,reject)=>{
    const request=idb.open(DB_NAME,1);
    request.onupgradeneeded=()=>request.result.createObjectStore(STORE);
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
    request.onblocked=()=>reject(new Error('Lokaler Speicher ist durch einen anderen Tab blockiert.'));
  });
}
// One transaction: `work(store, abort)` issues the requests and may return a function that yields the result
// once the transaction completed. abort(error) rolls back and rejects with that error.
async function transact(idb,mode,work){
  const db=await openStore(idb);
  try{return await new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,mode);let failure=null,result=()=>undefined;
    const abort=error=>{failure=error;tx.abort();};
    tx.oncomplete=()=>resolve(result());tx.onerror=()=>reject(failure??tx.error);tx.onabort=()=>reject(failure??tx.error);
    result=work(tx.objectStore(STORE),abort)??result;
  });}finally{db.close();}
}
const read=(idb,key)=>transact(idb,'readonly',store=>{const request=store.get(key);return ()=>request.result??null;});

/** → {meta, doc, migrated?} | null. Opens `last`; without it, migrates the legacy `current` entry. */
export async function loadLocal({idb}={}){
  const last=await read(idb,LAST_KEY);
  if(typeof last==='string'){const stored=await read(idb,projectKey(last));if(stored)return readProject(stored);}
  const legacy=await read(idb,LEGACY_KEY);
  if(!legacy)return null;
  const parsed=readProject(legacy),known=parsed.envelope||parsed.meta.worldId===legacy.worldId;
  const project={...parsed,meta:{...parsed.meta,worldId:known?parsed.meta.worldId:LEGACY_WORLD_ID}};
  const existing=await read(idb,projectKey(project.meta.worldId));
  // An earlier run already copied it (and it may have been saved since): only switch `last`, never overwrite.
  if(existing){await transact(idb,'readwrite',store=>{store.put(project.meta.worldId,LAST_KEY);});return {...readProject(existing),migrated:true};}
  await migrate(idb,project);
  return {...project,migrated:true};
}
async function migrate(idb,{meta,doc}){
  const key=projectKey(meta.worldId);
  // add(): fails instead of overwriting if another tab copied it in the meantime.
  await transact(idb,'readwrite',store=>{store.add(envelope(doc,meta),key);});
  const copy=await read(idb,key);
  if(!copy||readProject(copy).meta.worldId!==meta.worldId)throw new Error('Migration des lokalen Projekts konnte nicht bestätigt werden.');
  await transact(idb,'readwrite',store=>{store.put(meta.worldId,LAST_KEY);});
}

/** All projects stored in this browser → [{worldId, name, revision}] (newest key order, `current` excluded). */
export async function listLocal({idb}={}){
  return transact(idb,'readonly',store=>{
    const out=[],cursor=store.openCursor();
    cursor.onsuccess=()=>{const c=cursor.result;if(!c)return;if(typeof c.key==='string'&&c.key.startsWith('project:')&&c.value?.payload)out.push({worldId:c.value.worldId,name:c.value.payload.name,revision:c.value.revision});c.continue();};
    return ()=>out;
  });
}
/** One stored project → {meta, doc} | null. */
export async function loadProject(worldId,{idb}={}){const stored=await read(idb,projectKey(worldId));return stored?readProject(stored):null;}

/** Saves doc under meta.worldId if the stored revision still equals meta.revision (or nothing is stored yet).
 *  Read, compare and write happen in one transaction, so two tabs cannot both win. → the new revision. */
export async function saveLocal(doc,meta,{idb}={}){
  meta=validateMeta(meta);
  const key=projectKey(meta.worldId),next=meta.revision+1;
  // Validate the next revision before opening a write transaction. An accepted imported
  // maximum revision must not be incremented into an envelope that readProject rejects.
  try{validateMeta({...meta,revision:next});}
  catch{throw new SaveRevisionLimit('Lokales Speichern nicht möglich: Die maximale Projektrevision ist erreicht. Der lokale Bestand bleibt unverändert. Bitte das Projekt als Datei exportieren.');}
  await transact(idb,'readwrite',(store,abort)=>{
    const request=store.get(key);
    request.onsuccess=()=>{
      const stored=request.result;
      if(stored&&stored.revision!==meta.revision){abort(new SaveConflict(`In diesem Browser liegt bereits Revision ${stored.revision} dieses Projekts (zum Beispiel aus einem anderen Tab); geöffnet ist Revision ${meta.revision}. Nichts überschrieben – bitte als Datei exportieren und die Seite neu laden.`));return;}
      store.put(envelope(doc,{...meta,revision:next}),key);store.put(meta.worldId,LAST_KEY);
    };
  });
  return next;
}
