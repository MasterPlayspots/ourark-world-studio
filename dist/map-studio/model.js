import {isSimple} from '../runtime/geometry/polygon.js';
import {markValidated,isValidated,validatedJson} from '../runtime/frozen.js';

// v3 (worldport P2): building footprints as polygons, maps up to 5 km, up to 5000 points. v1 and v2 open as v3.
export const SCHEMA = 'motionspec.map.v3';
export const LEGACY_SCHEMA = 'motionspec.map.v1';
const READABLE = new Set([LEGACY_SCHEMA,'motionspec.map.v2',SCHEMA]);
export const MAX_POINTS = 5000;
export const MAX_MAP_METRES = 5000;
export const MAX_FOOTPRINT_VERTICES = 64;
// All footprints together: bounds the drawing work (extruded walls, tiles) of one document.
export const MAX_TOTAL_FOOTPRINT_VERTICES = 100000;
// Ground surfaces (worldport, e.g. OpenStreetMap): areas (land, park, beach, water, parking) and ribbons with a
// width (road, path), in map metres. Drawn under the points; they do not block the player.
export const SURFACE_KINDS = ['land','park','beach','water','parking','road','path'];
export const RIBBON_KINDS = new Set(['road','path']);
export const MAX_SURFACES = 20000;
export const MAX_SURFACE_POINTS = 400000;
// Areas are triangulated when drawn: at most 2000 corners each; ribbons are cheap: up to 5000 points.
const MAX_POINTS_PER_SURFACE = 5000,MAX_AREA_POINTS = 2000,SURFACE_MARGIN = 50;
const MAX_SIZE = 300;
// Uploads by the user stay at 4 MB; an image enhanced by renderboost (4K WebP) may be up to 8 MiB in the document.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const ENHANCE_LONG_SIDE = 3840;
export const categories = {building:'Gebäude', station:'Station', marker:'Datenpunkt'};
export const copy = value => structuredClone(value);
// Deep copy that shares the map image object: images are replaced, never mutated in place, so edits and drags
// do not clone up to ~5.6 MB of data URL each time.
export const copyKeepingImage = doc => {const clone=copy({...doc,map:{...doc.map,image:null}});clone.map.image=doc.map.image;return clone;};
export const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
// Validated points (and surface lists) are frozen and remembered: the editor copies only the document shell for an
// edit, so unchanged points keep their identity and every stage (validation, history, size check, renderer, list) can
// skip them. A frozen point is never changed in place — edits replace it (M04 optimisation).
// The validated document itself is frozen too (shell, map, list): History caches its pack by identity.
const VALID_SURFACES=new WeakMap();
/** Shallow copy for an edit: a new shell, map and point list; the points themselves are shared (and frozen). */
export const editableShell = doc => ({...doc,map:{...doc.map},runtime:{...doc.runtime,spawn:doc.runtime?.spawn?{...doc.runtime.spawn}:null},points:[...doc.points]});
const number = (value,min,max,name) => {
  if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max) throw new Error(`${name}: Wert zwischen ${min} und ${max} erforderlich.`);
  return value;
};
const text = (value,max,name) => {
  if(typeof value!=='string'||value.length>max) throw new Error(`${name}: maximal ${max} Zeichen.`);
  return value;
};
// Walkability defaults per category (ADR 0001): buildings and stations block movement,
// data markers do not; every point can be inspected. Independent of visible/locked.
export function walkDefaults(type) {return {solid:type!=='marker',interactive:true};}
const flag=(value,fallback,name)=>{
  if(value===undefined)return fallback;
  if(typeof value!=='boolean')throw new Error(`${name}: true oder false erforderlich.`);
  return value;
};
// Category change: walk flags follow the new category's defaults (the inspector offers overrides from Welle 2).
export function withType(point,type) {return {...point,type,...walkDefaults(type)};}
export function newPoint(index=1) {
  return {id:crypto.randomUUID(),name:`Infrastruktur ${index}`,type:'building',x:0,z:0,width:10,depth:8,height:6,rotation:0,color:'#4ade80',visible:true,locked:false,data:{}};
}
export function demoDocument() {
  const specs=[['Zentrale',-30,-20,18,12,12,'#4ade80','building'],['Datenzentrum',20,-20,22,14,8,'#72a8ef','building'],['Energie',-30,20,12,12,5,'#f3c969','station'],['Mobilität',10,20,18,10,4,'#86efac','station'],['Besucherpunkt',42,22,4,4,3,'#d5b5ff','marker']];
  return validateDocument({schema:SCHEMA,name:'Infrastructure Campus',map:{width:120,depth:80,color:'#1c1c1c',image:null},runtime:{spawn:null},points:specs.map(([name,x,z,width,depth,height,color,type],i)=>({...newPoint(i+1),id:`demo-${i+1}`,name,x,z,width,depth,height,color,type,data:{Bereich:name,Hinweis:'Beispieldaten – hier eure Informationen hinterlegen.'}}))});
}
export function validateDocument(input) {
  const version=typeof input?.schema==='string'&&/^motionspec\.map\.v(\d+)$/.exec(input.schema)?.[1];
  if(version&&Number(version)>3) throw new Error(`Diese Datei stammt aus einer neueren, unbekannten Formatversion (${input.schema.slice(0,40)}). Das geöffnete Projekt bleibt unverändert.`);
  if(!input||!READABLE.has(input.schema)||!input.map||!Array.isArray(input.points)||input.points.length>MAX_POINTS) throw new Error(`Keine gültige Kartenprojekt-Datei (maximal ${MAX_POINTS.toLocaleString('de-DE')} Punkte).`);
  const hex=value=>{if(typeof value!=='string'||!/^#[\da-f]{6}$/i.test(value))throw new Error('Ungültige Farbe.');return value;};
  const map={width:number(input.map.width,10,MAX_MAP_METRES,'Kartenbreite'),depth:number(input.map.depth,10,MAX_MAP_METRES,'Kartentiefe'),color:hex(input.map.color),image:null};
  if(input.map.image!==null&&input.map.image!==undefined) {
    const image=input.map.image;
    if(!image||typeof image.dataUrl!=='string'||image.dataUrl.length>MAX_IMAGE_BYTES*1.4||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(image.dataUrl))throw new Error('Kartenbild: PNG, JPEG oder WebP bis 8 MB erforderlich.');
    // Frozen: images are only ever replaced, so document copies and the History may share them.
    map.image=Object.freeze({name:text(image.name,160,'Bildname'),dataUrl:image.dataUrl});
  }
  const ids=new Set();
  const corners=input.points.reduce((sum,p)=>sum+(Array.isArray(p?.footprint)?p.footprint.length:0),0);
  if(corners>MAX_TOTAL_FOOTPRINT_VERTICES)throw new Error(`Grundrisse: zusammen höchstens ${MAX_TOTAL_FOOTPRINT_VERTICES.toLocaleString('de-DE')} Ecken (diese Datei hat ${corners.toLocaleString('de-DE')}).`);
  const points=input.points.map(p=>{
    if(isValidated(p)){if(ids.has(p.id))throw new Error('Ungültige oder doppelte Punkt-ID / Kategorie.');ids.add(p.id);return p;}
    if(!p||typeof p.id!=='string'||!p.id.length||p.id.length>100||ids.has(p.id)||!Object.hasOwn(categories,p.type))throw new Error('Ungültige oder doppelte Punkt-ID / Kategorie.');
    ids.add(p.id);
    const data=p.data??{},json=typeof data==='object'&&data!==null&&!Array.isArray(data)?JSON.stringify(data):null;
    if(json===null||json.length>6000)throw new Error('Punktdaten müssen ein JSON-Objekt mit maximal 6.000 Zeichen sein.');
    const walk=walkDefaults(p.type),limit=MAX_MAP_METRES/2,footprint=validateFootprint(p.footprint);
    // With a footprint, width and depth are its bounding box (lists, labels and focus use them).
    const size=footprint?extent(footprint):{width:number(p.width,.5,MAX_SIZE,'Breite'),depth:number(p.depth,.5,MAX_SIZE,'Tiefe')};
    const point={id:p.id,name:text(p.name,80,'Punktname')||'Infrastruktur',type:p.type,x:number(p.x,-limit,limit,'Position X'),z:number(p.z,-limit,limit,'Position Z'),...size,height:number(p.height,.2,MAX_SIZE,'Höhe'),rotation:number(p.rotation,-360,360,'Drehung'),color:hex(p.color),visible:p.visible!==false,locked:p.locked===true,data:JSON.parse(json),solid:flag(p.solid,walk.solid,'Kollision'),interactive:flag(p.interactive,walk.interactive,'Interaktion')};
    if(footprint)point.footprint=footprint;
    markValidated(point);
    return point;
  });
  const doc={schema:SCHEMA,name:text(input.name,100,'Projektname')||'Meine Karte',map,runtime:validateRuntime(input.runtime),points};
  if(input.surfaces!==undefined&&input.surfaces!==null){
    // Up to 400,000 surface points: an unchanged, already validated list is reused while the map size is the same.
    const key=`${map.width}x${map.depth}`,known=VALID_SURFACES.get(input.surfaces);
    doc.surfaces=known===key?input.surfaces:markValidated(validateSurfaces(input.surfaces,map));VALID_SURFACES.set(doc.surfaces,key);
  }
  // Source notice that must travel with imported data (e.g. OpenStreetMap, ODbL); shown in both studios.
  if(input.attribution!==undefined&&input.attribution!==null&&input.attribution!=='')doc.attribution=text(input.attribution,300,'Quellenangabe');
  return markValidated(doc);
}
const SIMPLE=new Set(),SIMPLE_LIMIT=50000;
function validateSurfaces(surfaces,map){
  const fail=reason=>{throw new Error(`Bodenfläche: ${reason}`);};
  if(!Array.isArray(surfaces)||surfaces.length>MAX_SURFACES)fail(`höchstens ${MAX_SURFACES.toLocaleString('de-DE')} Flächen als Liste.`);
  const total=surfaces.reduce((sum,s)=>sum+(Array.isArray(s?.points)?s.points.length:0),0);
  if(total>MAX_SURFACE_POINTS)fail(`zusammen höchstens ${MAX_SURFACE_POINTS.toLocaleString('de-DE')} Punkte (diese Datei hat ${total.toLocaleString('de-DE')}).`);
  const limitX=map.width/2+SURFACE_MARGIN,limitZ=map.depth/2+SURFACE_MARGIN;
  return surfaces.map(s=>{
    if(!s||typeof s!=='object'||!SURFACE_KINDS.includes(s.kind))fail('unbekannte Art.');
    const ribbon=RIBBON_KINDS.has(s.kind),points=s.points;
    if(!Array.isArray(points)||points.length<(ribbon?2:3)||points.length>(ribbon?MAX_POINTS_PER_SURFACE:MAX_AREA_POINTS))fail(ribbon?'Linien brauchen 2 bis 5.000 Punkte.':'Flächen brauchen 3 bis 2.000 Punkte.');
    if(!points.every(v=>Array.isArray(v)&&v.length===2&&typeof v[0]==='number'&&typeof v[1]==='number'&&Math.abs(v[0])<=limitX&&Math.abs(v[1])<=limitZ))fail('Punkte müssen Zahlen [x, z] innerhalb der Karte sein.');
    const out={kind:s.kind,points:points.map(([x,z])=>[x,z])};
    if(ribbon){if(typeof s.width!=='number'||!(s.width>=.5&&s.width<=60))fail('Straßen und Wege brauchen eine Breite von 0,5 bis 60 m.');out.width=s.width;}
    else if(s.width!==undefined)fail('Flächen haben keine Breite.');
    return out;
  });
}
// Footprint: a simple polygon [[x, z], …] in metres relative to the point (before rotation), 3–64 corners.
function validateFootprint(footprint){
  if(footprint===undefined||footprint===null)return undefined;
  const fail=reason=>{throw new Error(`Grundriss: ${reason}`);};
  if(!Array.isArray(footprint))fail('Liste von Ecken [x, z] erforderlich.');
  if(footprint.length<3||footprint.length>MAX_FOOTPRINT_VERTICES)fail(`3 bis ${MAX_FOOTPRINT_VERTICES} Ecken erforderlich.`);
  if(!footprint.every(v=>Array.isArray(v)&&v.length===2&&v.every(n=>typeof n==='number'&&Number.isFinite(n))))fail('jede Ecke braucht zwei Zahlen [x, z].');
  const {width,depth}=extent(footprint);
  if(width>MAX_SIZE||depth>MAX_SIZE||footprint.some(([x,z])=>Math.abs(x)>MAX_SIZE||Math.abs(z)>MAX_SIZE))fail(`höchstens ${MAX_SIZE} m groß.`);
  // Outlines already found simple are remembered (edits re-validate the whole document every time).
  const key=JSON.stringify(footprint);
  if(!SIMPLE.has(key)){if(!isSimple(footprint))fail('Die Umrisslinie darf sich nicht selbst schneiden und braucht eine Fläche.');if(SIMPLE.size>=SIMPLE_LIMIT)SIMPLE.clear();SIMPLE.add(key);}
  return footprint.map(([x,z])=>[x,z]);
}
const round=n=>Math.round(n*1000)/1000;
function extent(footprint){const xs=footprint.map(([x])=>x),zs=footprint.map(([,z])=>z);return {width:Math.max(.5,round(Math.max(...xs)-Math.min(...xs))),depth:Math.max(.5,round(Math.max(...zs)-Math.min(...zs)))};}
// Width/depth edits on a footprint building scale its outline; boxes just take the value.
export function resizePoint(point,key,value){
  if(!point.footprint)return {...point,[key]:value};
  const factor=value/point[key],axis=key==='width'?0:1;
  return {...point,[key]:value,footprint:point.footprint.map(v=>{const next=[...v];next[axis]=round(v[axis]*factor);return next;})};
}
// Persistent walk settings. v1 files have none; the spawn is then derived at runtime (Welle 2).
function validateRuntime(runtime) {
  if(runtime===undefined||runtime===null)return {spawn:null};
  if(typeof runtime!=='object'||Array.isArray(runtime))throw new Error('Begehbarkeitseinstellungen sind ungültig.');
  const spawn=runtime.spawn;
  if(spawn===undefined||spawn===null)return {spawn:null};
  if(typeof spawn!=='object')throw new Error('Startpunkt ist ungültig.');
  return {spawn:{x:number(spawn.x,-MAX_MAP_METRES/2,MAX_MAP_METRES/2,'Start X'),z:number(spawn.z,-MAX_MAP_METRES/2,MAX_MAP_METRES/2,'Start Z'),heading:number(spawn.heading,-360,360,'Startrichtung')}};
}
// Kartenbild verbessern (renderboost): long side to 4K, aspect kept; images already larger are only sharpened.
export function enhanceTarget({width,height},longSide=ENHANCE_LONG_SIDE){
  const scale=longSide/Math.max(width,height);
  return scale<=1?{width,height}:{width:Math.round(width*scale),height:Math.round(height*scale)};
}
export function enhancedName(name,contentType){
  const ext={'image/webp':'webp','image/png':'png','image/jpeg':'jpg'}[contentType]??'png';
  const base=name.replace(/\.[a-z0-9]{2,5}$/i,'').replace(/-4k$/,'');
  return `${base.slice(0,160-4-ext.length)}-4k.${ext}`;
}
export function mapToWorld(u,v,map) {return [(u-.5)*map.width,0,(v-.5)*map.depth];}
export function worldToMap(x,z,map) {return [x/map.width+.5,z/map.depth+.5];}
export function movePoint(point,x,z,map,snap=false) {
  const step=n=>snap?Math.round(n):Math.round(n*100)/100;
  return {...point,x:clamp(step(x),-map.width/2,map.width/2),z:clamp(step(z),-map.depth/2,map.depth/2)};
}
export const HISTORY_LIMIT = 35;
// Undo/redo keeps whole documents, but the map image (up to ~5.6 MB as data URL) is stored once per distinct
// image and referenced by id, instead of being copied into every entry. Images that no entry references any
// more are released. Entries themselves are small, so comparing and copying them stays cheap.
export class History {
  constructor(){this.past=[];this.future=[];this.images=new Map();this.imageIds=new Map();this.nextImage=1;this.objects=new Map();this.pruneAt=20000;}
  // An entry is the document as JSON in parts: `head` (everything except points and surfaces, the image replaced by
  // a reference), one JSON text per point and one for the surfaces. Unchanged points share their text across entries,
  // so an edit serialises only what it replaced and 35 entries of a 5000-point city cost ~35 × 5000 references instead
  // of 35 copies of the whole document (M04: ~41 MB). Comparing two entries compares the parts.
  pack(doc){
    const image=doc.map.image;let ref=null;
    if(image){ref=this.imageIds.get(image.dataUrl);if(ref===undefined){ref=this.nextImage++;this.imageIds.set(image.dataUrl,ref);this.images.set(ref,{dataUrl:image.dataUrl});}}
    const surfaces=Array.isArray(doc.surfaces)?this.text(doc.surfaces):null,shell={...doc,map:{...doc.map,image:image?{name:image.name,ref}:null},points:[]};
    if(surfaces!==null)shell.surfaces=[];
    return {ref,head:JSON.stringify(shell),points:doc.points.map(p=>this.text(p)),surfaces};
  }
  // Text of a point or surface list; validated objects are remembered by their text, so Undo/Redo hands back the
  // very same (validated, frozen) objects and every identity cache keeps working after it.
  text(value){const json=validatedJson(value);if(isValidated(value))this.objects.set(json,value);return json;}
  object(json){return this.objects.get(json)??JSON.parse(json);}
  static same(a,b){
    if(a.head!==b.head||a.surfaces!==b.surfaces||a.points.length!==b.points.length)return false;
    for(let i=0;i<a.points.length;i++)if(a.points[i]!==b.points[i])return false;
    return true;
  }
  // → a validated document (cheap: its points are the remembered validated objects).
  unpack(entry){
    const doc=JSON.parse(entry.head),image=doc.map.image;
    doc.points=entry.points.map(json=>this.object(json));if(entry.surfaces!==null)doc.surfaces=this.object(entry.surfaces);
    return validateDocument({...doc,map:{...doc.map,image:image?{name:image.name,dataUrl:this.images.get(image.ref).dataUrl}:null}});
  }
  release(){
    const used=new Set([...this.past,...this.future].map(entry=>entry.ref));
    for(const [ref,{dataUrl}] of this.images)if(!used.has(ref)){this.images.delete(ref);this.imageIds.delete(dataUrl);}
    // Remembered objects no entry refers to are dropped now and then (a full sweep costs ~entries × points).
    if(this.objects.size>this.pruneAt){
      const texts=new Set();for(const entry of [...this.past,...this.future]){for(const json of entry.points)texts.add(json);if(entry.surfaces!==null)texts.add(entry.surfaces);}
      for(const json of this.objects.keys())if(!texts.has(json))this.objects.delete(json);
      this.pruneAt=Math.max(20000,this.objects.size*2);
    }
  }
  record(before,after){
    const packed=this.pack(before),changed=!History.same(packed,this.pack(after));
    if(changed){this.past.push(packed);if(this.past.length>HISTORY_LIMIT)this.past.shift();this.future=[];}
    this.release();return changed;
  }
  step(from,to,current){if(!from.length)return null;to.push(this.pack(current));const doc=this.unpack(from.pop());this.release();return doc;}
  undo(current){return this.step(this.past,this.future,current);}
  redo(current){return this.step(this.future,this.past,current);}
}
