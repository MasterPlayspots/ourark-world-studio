// Kart live telemetry: anonymous measurement batches from every kart session (POST /api/kart-telemetry) and the
// aggregate over all sessions of the last hours (GET /api/kart-insights). Stored as small JSON objects in the
// scenes bucket under kart-telemetry/<date>/<time>-<session>-<seq>.json with receiving time, live revision and
// country; no IP address, no account. The browser part is dist/kart/insights.js.

export const TELEMETRY_FORMAT='ourark.kart-telemetry.v1';
export const INSIGHTS_FORMAT='ourark.kart-insights.v1';
export const TELEMETRY_MAX=24*1024,MAX_SAMPLES=30,MAX_HOURS=48,MAX_OBJECTS=400,CELL=50;
const MODES=new Set(['kart','plane','walk']),MAPS=/^[a-z0-9-]{1,32}$/,SESSION=/^[0-9a-f]{16}$/;
const INSIGHTS_TTL_MS=30_000;
const cache=new Map();

const finite=(v,lo,hi)=>typeof v==='number'&&Number.isFinite(v)&&v>=lo&&v<=hi;
const median=values=>{if(!values.length)return null;const s=[...values].sort((a,b)=>a-b),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2;};
const quantile=(values,q)=>{if(!values.length)return null;const s=[...values].sort((a,b)=>a-b);return s[Math.min(s.length-1,Math.floor(s.length*q))];};
const round=(v,d=1)=>v==null?null:Math.round(v*10**d)/10**d;

// Keeps only the known fields of one sample, or null when it is malformed.
export function cleanSample(s){
  if(!s||typeof s!=='object'||!MODES.has(s.mode))return null;
  if(!finite(s.t,0,86400)||!finite(s.x,-20000,20000)||!finite(s.z,-20000,20000)||!finite(s.fps,0,1000))return null;
  const out={t:round(s.t,1),mode:s.mode,x:round(s.x,1),z:round(s.z,1),fps:round(s.fps,1)};
  for(const [k,lo,hi] of [['nn',-500,9000],['speed',0,200],['p95',0,10000],['calls',0,1e6],['tris',0,1e9],['heapMB',0,1e5],['rtt',0,60000],['netIn',0,1e7],['netOut',0,1e7],['remotes',0,64]])if(finite(s[k],lo,hi))out[k]=round(s[k],1);
  return out;
}

// Validates a batch; returns {batch} or {error,status}.
export function cleanBatch(body){
  if(!body||body.format!==TELEMETRY_FORMAT)return {status:400,error:'Unbekanntes Format.'};
  if(!SESSION.test(body.session??'')||!MAPS.test(body.map??'')||!Number.isInteger(body.seq)||body.seq<0||body.seq>100000)return {status:400,error:'Sitzung, Karte oder Folge fehlt.'};
  if(!Array.isArray(body.samples)||!body.samples.length||body.samples.length>MAX_SAMPLES)return {status:400,error:'Messpunkte fehlen oder zu viele.'};
  const samples=body.samples.map(cleanSample).filter(Boolean);
  if(!samples.length)return {status:400,error:'Keine gültigen Messpunkte.'};
  const d=body.device&&typeof body.device==='object'?body.device:{};
  const device={gpu:typeof d.gpu==='string'?d.gpu.slice(0,120):null,mobile:d.mobile===true,dpr:finite(d.dpr,.5,8)?d.dpr:null,
    cores:finite(d.cores,1,256)?d.cores:null,memoryGB:finite(d.memoryGB,.25,1024)?d.memoryGB:null,canvas:typeof d.canvas==='string'?d.canvas.slice(0,20):null};
  return {batch:{session:body.session,map:body.map,seq:body.seq,device,samples}};
}

export async function kartTelemetry(request,env,jsonReply){
  if(request.method!=='POST')return jsonReply(405,{error:'Nur POST.'},{Allow:'POST'});
  if(!env.SCENES)return jsonReply(503,{error:'Messwerte können hier nicht gespeichert werden.'});
  const text=await request.text();
  if(text.length>TELEMETRY_MAX)return jsonReply(413,{error:'Zu groß.'});
  let body;try{body=JSON.parse(text);}catch{return jsonReply(400,{error:'Kein JSON.'});}
  const {batch,error,status}=cleanBatch(body);
  if(error)return jsonReply(status,{error});
  const now=new Date(),iso=now.toISOString();
  const key=`kart-telemetry/${iso.slice(0,10)}/${iso.slice(11,19).replace(/:/g,'')}-${batch.session}-${String(batch.seq).padStart(5,'0')}.json`;
  await env.SCENES.put(key,JSON.stringify({received:iso,revision:env.REVISION||'unknown',country:request.cf?.country??null,...batch}),{httpMetadata:{contentType:'application/json'}});
  return jsonReply(201,{stored:key});
}

// Aggregate over stored batches (pure, used by the endpoint and the tests).
export function aggregate(batches,{map=null,since=0}={}){
  const sessions=new Map(),fps=[],p95=[],byMode={},cells=new Map(),gpus=new Map();
  let samples=0;
  for(const b of batches){
    if(map&&b.map!==map)continue;
    if(since&&Date.parse(b.received)<since)continue;
    if(!sessions.has(b.session))sessions.set(b.session,b.device??{});
    for(const s of b.samples??[]){
      samples++;fps.push(s.fps);if(s.p95!=null)p95.push(s.p95);
      (byMode[s.mode]??={fps:[]}).fps.push(s.fps);
      const key=`${Math.floor(s.x/CELL)},${Math.floor(s.z/CELL)}`;
      (cells.get(key)??cells.set(key,{fps:[],sessions:new Set()}).get(key)).fps.push(s.fps);cells.get(key).sessions.add(b.session);
    }
  }
  for(const d of sessions.values()){const g=d.gpu??'unbekannt';gpus.set(g,(gpus.get(g)??0)+1);}
  const grid=[...cells.entries()].map(([key,c])=>{const [i,j]=key.split(',').map(Number);return {x:(i+.5)*CELL,z:(j+.5)*CELL,samples:c.fps.length,sessions:c.sessions.size,fps:round(median(c.fps))};});
  const devices=[...sessions.values()];
  return {
    format:INSIGHTS_FORMAT,cell:CELL,sessions:sessions.size,samples,
    devices:{mobile:devices.filter(d=>d.mobile).length,desktop:devices.filter(d=>!d.mobile).length},
    gpus:[...gpus.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([gpu,count])=>({gpu,count})),
    fps:{median:round(median(fps)),p10:round(quantile(fps,.1)),below30:fps.length?round(fps.filter(v=>v<30).length/fps.length,3):null},
    frameP95:round(median(p95)),
    byMode:Object.fromEntries(Object.entries(byMode).map(([m,v])=>[m,{samples:v.fps.length,fps:round(median(v.fps))}])),
    slowest:grid.filter(c=>c.samples>=5).sort((a,b)=>a.fps-b.fps).slice(0,5),
    grid:grid.sort((a,b)=>b.samples-a.samples).slice(0,600)
  };
}

export async function kartInsights(request,env,jsonReply,now=Date.now()){
  if(request.method!=='GET')return jsonReply(405,{error:'Nur GET.'},{Allow:'GET'});
  if(!env.SCENES)return jsonReply(503,{error:'Keine Messwerte verfügbar.'});
  const url=new URL(request.url),map=MAPS.test(url.searchParams.get('map')??'')?url.searchParams.get('map'):null;
  const hours=Math.min(MAX_HOURS,Math.max(1,Number(url.searchParams.get('hours'))||24)),since=now-hours*3600_000;
  const cacheKey=`${map}|${hours}`,hit=cache.get(cacheKey);
  if(hit&&now-hit.at<INSIGHTS_TTL_MS)return jsonReply(200,hit.body);
  // Newest objects first: list the days the window touches (newest day first), stop at MAX_OBJECTS.
  const keys=[];
  for(let day=new Date(now);day.getTime()>=since-86400_000&&keys.length<MAX_OBJECTS;day=new Date(day.getTime()-86400_000)){
    const prefix=`kart-telemetry/${day.toISOString().slice(0,10)}/`,dayKeys=[];let cursor;
    do{const page=await env.SCENES.list({prefix,cursor,limit:1000});dayKeys.push(...page.objects.map(o=>o.key));cursor=page.truncated?page.cursor:undefined;}while(cursor);
    keys.push(...dayKeys.sort().reverse());
  }
  const batches=(await Promise.all(keys.slice(0,MAX_OBJECTS).map(async key=>{try{return JSON.parse(await (await env.SCENES.get(key)).text());}catch{return null;}}))).filter(Boolean);
  const body={...aggregate(batches,{map,since}),map,hours,updatedAt:new Date(now).toISOString(),objectsRead:batches.length,capped:keys.length>MAX_OBJECTS};
  cache.set(cacheKey,{at:now,body});
  return jsonReply(200,body);
}
