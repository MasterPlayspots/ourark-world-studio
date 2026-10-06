// Project envelope (W2) and the shared file budget (W1) for map projects — contracts/map-project-v1.md.
// model.js stays responsible for the map payload only (motionspec.map.v3); this adapter carries identity,
// revision and geo reference around it, so they are no longer dropped by validateDocument (finding P01).
// Export, import and editing all measure the same bytes: UTF-8 of exactly the JSON the export writes (P03).
import {validateDocument} from './model.js';
import {isValidated,validatedJson} from '../runtime/frozen.js';

export const ENVELOPE_SCHEMA='ourark.map-project.v1';
// One budget for export, import and edits. Raising it only moves storage and decode cost; larger projects need
// referenced assets or a versioned package format instead of growing base64 fields.
export const MAX_PROJECT_BYTES=16*1024*1024;
const MAX_GEO_REFERENCE_CHARS=4000,MAX_REVISION=2**31-1;
const ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/;

export const newWorldId=()=>crypto.randomUUID();
const id=(value,name)=>{if(typeof value!=='string'||!ID.test(value))throw new Error(`${name}: 1 bis 100 Zeichen aus Buchstaben, Ziffern und . _ : - erforderlich.`);return value;};

// Strict: used for envelopes. `lenient` (bare map files) keeps every valid value and skips invalid ones, so
// files that opened before still open.
export function validateMeta(input,{lenient=false}={}){
  const meta={},source=input&&typeof input==='object'&&!Array.isArray(input)?input:{};
  const take=(key,check)=>{if(source[key]===undefined||source[key]===null)return;try{meta[key]=check(source[key]);}catch(error){if(!lenient)throw error;}};
  take('worldId',v=>id(v,'Welt-ID'));
  take('workspaceId',v=>id(v,'Workspace-ID'));
  take('revision',v=>{if(!Number.isInteger(v)||v<0||v>MAX_REVISION)throw new Error('Revision: ganze Zahl ab 0 erforderlich.');return v;});
  take('geoReference',v=>{
    const json=v&&typeof v==='object'&&!Array.isArray(v)?JSON.stringify(v):null;
    if(json===null||json.length>MAX_GEO_REFERENCE_CHARS)throw new Error(`Geo-Bezug: JSON-Objekt mit maximal ${MAX_GEO_REFERENCE_CHARS.toLocaleString('de-DE')} Zeichen erforderlich.`);
    return JSON.parse(json);
  });
  if(!lenient&&meta.worldId===undefined)throw new Error('Projektdatei ohne Welt-ID.');
  meta.worldId??=newWorldId();meta.revision??=0;
  return meta;
}

/** Parsed file content (envelope or bare v1/v2/v3 map) → {meta, doc, envelope, hasWorldId}. hasWorldId is false
 *  when the file named no (valid) world and meta.worldId was generated. */
export function readProject(input){
  const schema=typeof input?.schema==='string'?input.schema:'';
  const version=/^ourark\.map-project\.v(\d+)$/.exec(schema)?.[1];
  if(version){
    if(Number(version)>1)throw new Error(`Dieses Projekt stammt aus einer neueren, unbekannten Formatversion (${schema.slice(0,40)}). Das geöffnete Projekt bleibt unverändert.`);
    if(!input.payload||typeof input.payload!=='object')throw new Error('Projektdatei ohne Karteninhalt.');
    return {meta:validateMeta(input),doc:validateDocument(input.payload),envelope:true,hasWorldId:true};
  }
  // Bare map files: metadata written next to the map fields is lifted into the envelope instead of dropped.
  const meta=validateMeta(input,{lenient:true});
  return {meta,doc:validateDocument(input),envelope:false,hasWorldId:meta.worldId===input?.worldId};
}

/** The object written to files and to the local store. Key order is fixed, so the bytes are reproducible. */
export function envelope(doc,meta){
  const out={schema:ENVELOPE_SCHEMA,worldId:meta.worldId};
  if(meta.workspaceId!==undefined)out.workspaceId=meta.workspaceId;
  out.revision=meta.revision;
  if(meta.geoReference!==undefined)out.geoReference=meta.geoReference;
  out.payload=doc;
  return out;
}
export const serializeProject=(doc,meta)=>JSON.stringify(envelope(doc,meta));

// UTF-8 length as written to the file (the native encoder: ~3 ms for 16 MB, a JS loop took ~45 ms per edit).
const encoder=new TextEncoder();
export const utf8Length=text=>encoder.encode(text).length;
// Bytes of validated (deeply frozen, never changed) points and surface lists, by identity: an edit re-measures only what it
// replaced (M04: the full serialisation took ~3.7 ms per edit at 5000 points).
const ITEM_BYTES=new WeakMap();
const itemBytes=value=>{
  if(!isValidated(value))return utf8Length(JSON.stringify(value));
  let bytes=ITEM_BYTES.get(value);if(bytes===undefined){bytes=utf8Length(validatedJson(value));ITEM_BYTES.set(value,bytes);}return bytes;
};
// JSON of a non-empty array is "[" + items joined by "," + "]": the shell is serialised with [] and the items added.
const arrayBytes=items=>{let sum=Math.max(0,items.length-1);for(const item of items)sum+=itemBytes(item);return sum;};
/** Exact byte size of serializeProject(doc, meta), without building the (up to ~11 MB) image string again.
 *  Valid for validated documents: their image data URL is plain ASCII that JSON does not escape. */
export function projectBytes(doc,meta){
  // The map is kept as it is (also without an `image` key); only an image's data URL is counted separately.
  const image=doc.map.image,shell={...doc,map:image?{...doc.map,image:{name:image.name,dataUrl:''}}:doc.map,points:[]};
  let bytes=arrayBytes(doc.points)+(image?image.dataUrl.length:0);
  if(Array.isArray(doc.surfaces)){shell.surfaces=[];bytes+=isValidated(doc.surfaces)?itemBytes(doc.surfaces)-2:arrayBytes(doc.surfaces);}
  return bytes+utf8Length(serializeProject(shell,meta));
}
export const mb=bytes=>(bytes/1048576).toLocaleString('de-DE',{maximumFractionDigits:1});
export const budgetText=()=>`${mb(MAX_PROJECT_BYTES)} MB`;
/** Edits may not push a project over the budget; one that is already over (older data) may still shrink. */
export function checkEditBudget(beforeBytes,afterBytes){
  if(afterBytes>MAX_PROJECT_BYTES&&afterBytes>beforeBytes)
    throw new Error(`Änderung nicht übernommen: Das Projekt würde ${mb(afterBytes)} MB groß, erlaubt sind ${budgetText()} (Export, Import und lokales Speichern nutzen dieselbe Grenze). Tipp: Kartenbild verkleinern oder Punktdaten kürzen.`);
}
