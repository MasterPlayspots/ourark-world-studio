// worldport — converts 2D world data into a walkable MotionspecWorld (connector core, plan: handoff §5).
// Pure and deterministic, no DOM and no network: the same code serves the browser import, the CLI and later MCP.
// P1: point data (CSV rows / objects with lat, lng) → motionspec.map.v3 project for the Map Studio.

export const LIMITS=Object.freeze({maxPoints:5000,maxDataChars:6000,maxMapMetres:5000,minMapMetres:10});
const PALETTE=['#5eead4','#f3c969','#72a8ef','#d5b5ff','#ff8a65','#a3e635','#f472b6','#99f6e4'];
// Readable labels for common columns; everything else keeps its column name.
const LABELS={source:'Quelle',category:'Kategorie',description:'Beschreibung',tags:'Tags',igPhoto_credit:'Bildnachweis',motion_heading:'Blickrichtung (°)',motion_fov_angle:'Sichtwinkel (°)',motion_fov_range:'Sichtweite'};
// Never copied into the world: coordinates and identity (used directly), links, media paths, camera paths.
// Columns are judged by their words (snake_case, kebab-case and camelCase split), so "blink_rate" stays.
const SKIP_COLUMN=/^(lat|lng|id|name|record_no|record_key|motion_path)$/i,SKIP_WORDS=new Set(['link','links','url','urls','href','src','website','homepage','video','poster']);
const SKIP_VALUE=/https?:\/\/|^assets\/|^(javascript|data|vbscript|file):|^\/\/|^www\./i;
const words=column=>column.replace(/([a-z0-9])([A-Z])/g,'$1 $2').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
const skipColumn=column=>SKIP_COLUMN.test(column)||words(column).some(word=>SKIP_WORDS.has(word));
// Texts are shortened by whole characters (code points), never inside an emoji.
const clip=(text,length)=>{const chars=Array.from(text);return chars.length>length?chars.slice(0,Math.max(0,length)).join(''):text;};
const MAX_KEY_CHARS=100;

// RFC 4180 CSV → array of objects keyed by the header row (BOM and CRLF tolerated).
export function parseCsv(text){
  const rows=[];let row=[],field='',quoted=false,i=0;const s=text.replace(/^﻿/,'');
  const endField=()=>{row.push(field);field='';},endRow=()=>{endField();if(row.length>1||row[0]!=='')rows.push(row);row=[];};
  while(i<s.length){
    const c=s[i];
    if(quoted){if(c==='"'){if(s[i+1]==='"'){field+='"';i+=2;continue;}quoted=false;i++;continue;}field+=c;i++;continue;}
    if(c==='"'&&field===''){quoted=true;i++;continue;}
    if(c===','){endField();i++;continue;}
    if(c==='\r'&&s[i+1]==='\n'){endRow();i+=2;continue;}
    if(c==='\n'||c==='\r'){endRow();i++;continue;}
    field+=c;i++;
  }
  if(quoted)throw new Error('CSV: Unbeendetes Anführungszeichen.');
  if(field!==''||row.length)endRow();
  // Repeated column names get a suffix (a, a_2, a_3) instead of overwriting each other.
  const seen=new Map(),header=(rows[0]??[]).map(key=>{const n=(seen.get(key)??0)+1;seen.set(key,n);return n===1?key:`${key}_${n}`;});
  return rows.slice(1).map(values=>Object.fromEntries(header.map((key,index)=>[key,values[index]??''])));
}

// Plain decimals become numbers; leading zeros (postcodes, ids), "-0" and very long digit runs stay text.
const toNumber=value=>/^-?(0|[1-9]\d{0,14})(\.\d{1,15})?$/.test(value)&&value!=='-0'?Number(value):value;
// A coordinate is a decimal number (optionally with exponent); blanks, hex and words are not.
const coordinate=value=>{const text=String(value??'').trim();return /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(text)?Number(text):NaN;};
const COORDINATES='Original-Koordinaten';
// Variables are collected as entries (never assigned onto an object), so columns like "__proto__" or
// "constructor" are ordinary keys.
function variables(record){
  const entries=[];
  for(const [column,raw] of Object.entries(record)){
    const value=String(raw??'').trim();
    if(!value||skipColumn(column)||SKIP_VALUE.test(value))continue;
    entries.push([clip(Object.hasOwn(LABELS,column)?LABELS[column]:column,MAX_KEY_CHARS),toNumber(value)]);
  }
  entries.push([COORDINATES,`lat ${coordinate(record.lat)} · lng ${coordinate(record.lng)}`]);
  return entries;
}
// Keep the data within the studio's limit: shorten the longest texts; if that is not enough (very many
// columns), drop the last columns. Every round makes progress, so this always ends. Reported as a warning.
function fitData(entries,warnings,name){
  const size=()=>JSON.stringify(Object.fromEntries(entries)).length;
  let json=size(),cut=false;
  while(json>LIMITS.maxDataChars){
    cut=true;
    let longest=-1;
    entries.forEach(([key,value],i)=>{if(key!==COORDINATES&&typeof value==='string'&&Array.from(value).length>8&&(longest<0||value.length>entries[longest][1].length))longest=i;});
    if(longest>=0){const value=entries[longest][1],chars=Array.from(value).length;entries[longest]=[entries[longest][0],clip(value,Math.min(chars-2,chars-(json-LIMITS.maxDataChars)-2))+'…'];}
    else{const i=entries.findLastIndex(([key])=>key!==COORDINATES);if(i<0)break;entries.splice(i,1);}
    json=size();
  }
  if(cut)warnings.push(`„${name}“: Daten auf ${LIMITS.maxDataChars} Zeichen gekürzt.`);
  return Object.fromEntries(entries);
}

// records: [{lat, lng, id?, name?, …variables}] with lat = north and lng = east (e.g. Leaflet CRS.Simple).
// options: name, scale (metres per source unit), exclude {column: [values]}, colorBy (column), size {width, depth, height} in m.
export function convertPoints(records,{name='Importierte Welt',scale=1,exclude={},colorBy='source',size={width:6,depth:6,height:10},margin=40}={}){
  if(!(scale>0)||!Number.isFinite(scale))throw new Error('Maßstab muss eine positive Zahl sein.');
  if(!(margin>=0)||2*margin>=LIMITS.maxMapMetres-LIMITS.minMapMetres)throw new Error(`Rand muss zwischen 0 und ${(LIMITS.maxMapMetres-LIMITS.minMapMetres)/2} m liegen.`);
  const warnings=[],withCoordinates=records.filter(r=>Number.isFinite(coordinate(r.lat))&&Number.isFinite(coordinate(r.lng)));
  const included=withCoordinates.filter(r=>!Object.entries(exclude).some(([column,values])=>values.includes(r[column])));
  const kept=included.slice(0,LIMITS.maxPoints),truncated=included.length-kept.length;
  if(truncated)warnings.push(`Nur die ersten ${LIMITS.maxPoints} Punkte übernommen (${truncated} weitere; das Map Studio erlaubt höchstens ${LIMITS.maxPoints}).`);
  const lats=kept.map(r=>coordinate(r.lat)),lngs=kept.map(r=>coordinate(r.lng));
  const range=values=>values.length?[Math.min(...values),Math.max(...values)]:[0,0];
  const [cLat,cLng]=kept.length?[(Math.min(...lats)+Math.max(...lats))/2,(Math.min(...lngs)+Math.max(...lngs))/2]:[0,0];
  const spanX=kept.length?Math.max(...lngs)-Math.min(...lngs):0,spanZ=kept.length?Math.max(...lats)-Math.min(...lats):0;
  let effective=scale;
  const fit=LIMITS.maxMapMetres-2*margin;
  if(Math.max(spanX,spanZ)*scale>fit){effective=fit/Math.max(spanX,spanZ);warnings.push(`Ausdehnung über ${LIMITS.maxMapMetres} m: Maßstab von ${scale} auf ${+effective.toPrecision(4)} m pro Einheit verkleinert.`);}
  const colors=new Map(),sources=new Map(),ids=new Set();
  // Ids must be unique in the studio; real data sometimes repeats them across sources.
  const uniqueId=(id,source)=>{if(!ids.has(id)){ids.add(id);return id;}const base=`${id}-${source||'dup'}`.slice(0,96);let candidate=base,n=2;while(ids.has(candidate))candidate=`${base}-${n++}`;ids.add(candidate);warnings.push(`doppelte ID „${id}“ → „${candidate}“.`);return candidate;};
  const points=kept.map((record,index)=>{
    const key=String(record[colorBy]??'');if(!colors.has(key))colors.set(key,PALETTE[colors.size%PALETTE.length]);
    if(record.source)sources.set(record.source,(sources.get(record.source)??0)+1);
    const id=uniqueId(String(record.id||`${record.source||'punkt'}-${record.record_no||index}`).slice(0,96),record.source),label=String(record.name||id).slice(0,80);
    return {id,name:label,type:'station',x:(lngs[index]-cLng)*effective,z:-(lats[index]-cLat)*effective,
      width:size.width,depth:size.depth,height:size.height,rotation:0,color:colors.get(key),visible:true,locked:false,
      data:fitData(variables(record),warnings,label),solid:true,interactive:true};
  });
  const side=span=>Math.min(LIMITS.maxMapMetres,Math.max(LIMITS.minMapMetres,Math.ceil(span*effective+2*margin)));
  const document={schema:'motionspec.map.v3',name:String(name).slice(0,100),map:{width:side(spanX),depth:side(spanZ),color:'#101f34',image:null},runtime:{spawn:null},points};
  return {document,report:{input:records.length,withoutCoordinates:records.length-withCoordinates.length,excluded:withCoordinates.length-included.length,
    truncated,points:points.length,sources:Object.fromEntries(sources),scale:effective,bounds:{lat:range(lats),lng:range(lngs)},warnings}};
}
