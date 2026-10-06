// Request handling of the Cloudflare Worker in front of the static assets in dist/ (entry: edge/worker.mjs).
// Basic auth for testers, the LoginGuard Durable Object as failed-attempt brake, security headers and the
// deployed revision. Secrets MSW_USER / MSW_PASSWORD come from `wrangler secret put`, REVISION from
// `wrangler deploy --var`.
import {SECURITY_HEADERS,STRICT_TRANSPORT_SECURITY,readCredentials,sameSecret,fingerprint,clientKey,securityHeadersFor,assetCacheControl,REVALIDATE_CACHE} from './policy.mjs';
import {BLOCK_SECONDS} from './guard.mjs';
import {kartTelemetry,kartInsights} from './telemetry.mjs';
import {globeConfig,geocode} from './globe.mjs';
import {realtime} from './realtime.mjs';

// Kartenbild-Verbesserung (renderboost-Origin auf fcfuzz): Eingabe ≤ 12 MB Bild als Base64 im JSON.
export const ENHANCE_MAX_BODY=Math.ceil(12*1024*1024*4/3)+64*1024;
// renderboost caps its output at 20 MB; as Base64 in JSON that is below 28 MB.
export const ENHANCE_MAX_RESPONSE=28*1024*1024;
// A cacheable answer is a JSON object carrying an image result (checked without parsing megabytes of Base64).
const RESULT_SHAPE=/"contentType"\s*:\s*"image\/(webp|png|jpeg)"/,RESULT_DATA=/"outputBase64"\s*:\s*"[A-Za-z0-9+/]/;
const ENHANCE_TIMEOUT_MS=100_000;
const REALM='Basic realm="MotionSpec World Studio (Test)", charset="UTF-8"';
// Scan worlds (ADR 0003, W6): bundles from R2 (binding SCENES, bucket motionspec-world-scenes), published by
// `worldscan publish`. Paths are content addressed (<sha256>/<file>), so they are immutable; gzip variants
// (<file>.gz) are stored next to them and passed through untouched when the browser accepts gzip.
export const SCENE_PATH=/^\/scenes\/([0-9a-f]{64})\/([a-z0-9_-]+(?:\.[a-z0-9]+)+)$/;
export const SCENE_CACHE='private, max-age=31536000, immutable';
const SCENE_TYPES={glb:'model/gltf-binary',json:'application/json; charset=utf-8',webp:'image/webp',png:'image/png'};

function reply(status,body,headers={}){
  return new Response(body,{status,headers:{...SECURITY_HEADERS,'Strict-Transport-Security':STRICT_TRANSPORT_SECURITY,'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store',...headers}});
}
const jsonReply=(status,body,headers={})=>reply(status,typeof body==='string'?body:JSON.stringify(body),{'Content-Type':'application/json; charset=utf-8',...headers});
async function scenes(request,env,pathname){
  if(!['GET','HEAD'].includes(request.method))return reply(405,'',{Allow:'GET, HEAD'});
  if(pathname==='/api/scenes'){
    const index=env.SCENES?await env.SCENES.get('index.json'):null;
    return jsonReply(200,index?await index.text():{format:'motionspec.scan.index.v1',scenes:[]});
  }
  const match=SCENE_PATH.exec(pathname),type=match&&SCENE_TYPES[match[2].split('.').pop()];
  if(!match||!type||!env.SCENES)return reply(404,'Nicht gefunden.');
  const key=`${match[1]}/${match[2]}`,gzip=/\bgzip\b/.test(request.headers.get('Accept-Encoding')??'')&&/\.(glb|json)$/.test(key);
  const object=(gzip&&await env.SCENES.get(key+'.gz',{onlyIf:request.headers}))||await env.SCENES.get(key,{onlyIf:request.headers});
  if(!object)return reply(404,'Nicht gefunden.');
  const encoded=object.key.endsWith('.gz'),headers={'Content-Type':type,'Cache-Control':SCENE_CACHE,'ETag':object.httpEtag,'Vary':'Accept-Encoding',...(encoded?{'Content-Encoding':'gzip'}:{})};
  // A failed precondition (If-None-Match matched) leaves the body out: 304.
  if(!('body' in object)||!object.body)return new Response(null,{status:304,headers:{...SECURITY_HEADERS,'Strict-Transport-Security':STRICT_TRANSPORT_SECURITY,...headers}});
  return new Response(request.method==='HEAD'?null:object.body,{status:200,encodeBody:encoded?'manual':'automatic',headers:{...SECURITY_HEADERS,'Strict-Transport-Security':STRICT_TRANSPORT_SECURITY,'Content-Length':String(object.size),...headers}});
}
// Geodata tilesets (Landkreis Kronach, scripts/geo/kronach_lk_*.py) from R2 (binding GEO, bucket motionspec-world-geo):
// /geo/<set>/tileset.json, /geo/<set>/L<level>/<e>_<n>.glb and the ground-height files /geo/<set>/S/<e>_<n>.bin. A set name carries its version (kronach-lk-2), so its
// tiles never change and are cached as immutable; the tileset.json is revalidated (ETag) so a set can be repaired.
export const GEO_PATH=/^\/geo\/([a-z0-9][a-z0-9-]{0,62})\/(tileset\.json|L[0-9]{1,2}\/[0-9]{1,6}_[0-9]{1,6}\.glb|S\/[0-9]{1,6}_[0-9]{1,6}\.bin)$/;
async function geo(request,env,pathname){
  if(!['GET','HEAD'].includes(request.method))return reply(405,'',{Allow:'GET, HEAD'});
  const match=GEO_PATH.exec(pathname);
  if(!match||!env.GEO)return reply(404,'Nicht gefunden.');
  const key=`${match[1]}/${match[2]}`,object=await env.GEO.get(key,{onlyIf:request.headers});
  if(!object)return reply(404,'Nicht gefunden.');
  const json=key.endsWith('.json'),headers={...SECURITY_HEADERS,'Strict-Transport-Security':STRICT_TRANSPORT_SECURITY,
    'Content-Type':json?'application/json; charset=utf-8':key.endsWith('.glb')?'model/gltf-binary':'application/octet-stream','Cache-Control':json?REVALIDATE_CACHE:SCENE_CACHE,'ETag':object.httpEtag};
  if(!('body' in object)||!object.body)return new Response(null,{status:304,headers});
  return new Response(request.method==='HEAD'?null:object.body,{status:200,headers:{...headers,'Content-Length':String(object.size)}});
}
// POST /api/device-check (W8): one device-check report (runtime/device-check.js) per request, ≤ 16 KB, stored as
// device-checks/<date>/<time>-<random>.json in the scenes bucket with the receiving time and the live revision.
export const DEVICE_CHECK_MAX=16*1024;
async function deviceCheck(request,env){
  if(request.method!=='POST')return jsonReply(405,{error:'Nur POST.'},{Allow:'POST'});
  if(!env.SCENES)return jsonReply(503,{error:'Ergebnisse können hier nicht gespeichert werden.'});
  const text=await request.text();
  if(text.length>DEVICE_CHECK_MAX)return jsonReply(413,{error:'Bericht zu groß.'});
  let report;try{report=JSON.parse(text);}catch{return jsonReply(400,{error:'Kein JSON.'});}
  if(report?.format!=='motionspec.device-check.v1'||typeof report.result!=='object'||typeof report.device!=='object')return jsonReply(400,{error:'Unbekanntes Format.'});
  const now=new Date(),key=`device-checks/${now.toISOString().slice(0,10)}/${now.toISOString().replace(/[:.]/g,'-')}-${crypto.randomUUID().slice(0,8)}.json`;
  await env.SCENES.put(key,JSON.stringify({received:now.toISOString(),revision:env.REVISION||'unknown',country:request.cf?.country??null,report}),{httpMetadata:{contentType:'application/json'}});
  return jsonReply(201,{stored:key});
}
const hex=buffer=>[...new Uint8Array(buffer)].map(b=>b.toString(16).padStart(2,'0')).join('');
// POST /api/enhance → renderboost /enhance. The renderboost HTTP path is deterministic (Lanczos only), so the same
// request body always yields the same bytes: the SHA-256 of the body is the R2 cache key (x-rb-cache: hit|miss|bypass).
async function enhance(request,env,ctx,fetchOrigin){
  if(request.method!=='POST')return jsonReply(405,{error:'Nur POST.'},{Allow:'POST'});
  if(!env.RENDERBOOST_ORIGIN||!env.RENDERBOOST_TOKEN)return jsonReply(503,{error:'Die Bildverbesserung ist hier nicht verfügbar.'});
  if(Number(request.headers.get('Content-Length')||0)>ENHANCE_MAX_BODY)return jsonReply(413,{error:'Bild zu groß.'});
  const body=await request.arrayBuffer();
  if(body.byteLength>ENHANCE_MAX_BODY)return jsonReply(413,{error:'Bild zu groß.'});
  // The origin validates every field; here only the shape, so megabytes of Base64 are not parsed twice.
  const first=new Uint8Array(body).find(b=>b>32);if(first!==0x7b)return jsonReply(400,{error:'Ungültiges JSON.'});
  const key=`enhance/v${env.RB_CACHE_VERSION||'1'}/${hex(await crypto.subtle.digest('SHA-256',body))}.json`;
  // Hits are streamed from R2 instead of being buffered in the isolate (128 MB limit).
  if(env.RB_CACHE){const hit=await env.RB_CACHE.get(key);if(hit)return reply(200,hit.body,{'Content-Type':'application/json; charset=utf-8','x-rb-cache':'hit'});}
  let response;
  try{response=await fetchOrigin(new URL('/enhance',env.RENDERBOOST_ORIGIN).href,{method:'POST',headers:{Authorization:`Bearer ${env.RENDERBOOST_TOKEN}`,'Content-Type':'application/json'},body,signal:AbortSignal.timeout(ENHANCE_TIMEOUT_MS)});}
  catch{return jsonReply(502,{error:'Die Bildverbesserung ist gerade nicht erreichbar.'});}
  const gateway=()=>jsonReply(502,{error:'Die Bildverbesserung ist gerade nicht erreichbar.'});
  if(Number(response.headers.get('Content-Length')||0)>ENHANCE_MAX_RESPONSE){response.body?.cancel();return gateway();}
  const text=await response.text();
  if(text.length>ENHANCE_MAX_RESPONSE)return gateway();
  if(!response.ok){
    // Refusals the user can act on pass through with the origin's message; everything else is a gateway error.
    if([400,413,503,504].includes(response.status)){let error='Die Bildverbesserung hat abgelehnt.';try{const parsed=JSON.parse(text);if(typeof parsed.error==='string')error=parsed.error.slice(0,200);}catch{}return jsonReply(response.status,{error},response.status===503?{'Retry-After':'5'}:{});}
    return gateway();
  }
  // Only real image results are cached; a tunnel error page with status 200 must not poison the cache.
  if(text.trimStart()[0]!=='{'||!RESULT_SHAPE.test(text)||!RESULT_DATA.test(text))return gateway();
  if(env.RB_CACHE)ctx.waitUntil(env.RB_CACHE.put(key,text,{httpMetadata:{contentType:'application/json'}}));
  return jsonReply(200,text,{'x-rb-cache':env.RB_CACHE?'miss':'bypass'});
}
async function askGuard(namespace,key,attempt){
  const response=await namespace.get(namespace.idFromName(key)).fetch('https://login-guard/attempt',{method:'POST',body:JSON.stringify(attempt)});
  if(!response.ok)throw new Error(`Login guard answered ${response.status}`);
  return (await response.json()).blocked===true;
}

export function createWorker({fetchOrigin=(url,init)=>fetch(url,init)}={}){
  return {
    async fetch(request,env,ctx){
      const user=env.MSW_USER,password=env.MSW_PASSWORD,guard=env.LOGIN_GUARD;
      if(!user||!password||!guard)return reply(500,'Server nicht konfiguriert.');
      const given=readCredentials(request.headers.get('Authorization'));
      if(given===null)return reply(401,'Anmeldung erforderlich.',{'WWW-Authenticate':REALM});
      // Optional further tester accounts: secret MSW_EXTRA_USERS="user:password,user2:password2".
      const accounts=[`${user}:${password}`,...(env.MSW_EXTRA_USERS??'').split(',').map(entry=>entry.trim()).filter(entry=>/^[^:]+:.+$/.test(entry))];
      const ok=(await Promise.all(accounts.map(account=>sameSecret(given,account)))).includes(true);
      let blocked;
      try{blocked=await askGuard(guard,clientKey(request.headers.get('CF-Connecting-IP')),ok?{ok}:{ok,fingerprint:await fingerprint(password,given)});}
      catch{return reply(500,'Anmeldung derzeit nicht möglich.');}
      if(blocked)return reply(429,'Zu viele Fehlversuche. Bitte später erneut versuchen.',{'Retry-After':String(BLOCK_SECONDS)});
      if(!ok)return reply(401,'Anmeldung erforderlich.',{'WWW-Authenticate':REALM});
      const {pathname}=new URL(request.url);
      if(pathname==='/api/enhance')return enhance(request,env,ctx,fetchOrigin);
      if(pathname==='/api/device-check')return deviceCheck(request,env);
      if(pathname==='/api/kart-telemetry')return kartTelemetry(request,env,jsonReply);
      if(pathname==='/api/kart-insights')return kartInsights(request,env,jsonReply);
      if(pathname==='/api/realtime'||pathname==='/api/realtime/stats')return realtime(request,env,reply,pathname);
      if(pathname==='/api/globe-config')return globeConfig(request,env,jsonReply);
      if(pathname==='/api/geocode')return geocode(request,env,jsonReply,fetchOrigin,ctx);
      if(pathname==='/api/scenes'||pathname.startsWith('/scenes/'))return scenes(request,env,pathname);
      if(pathname.startsWith('/geo/'))return geo(request,env,pathname);
      if(!['GET','HEAD'].includes(request.method))return reply(405,'',{Allow:'GET, HEAD'});
      if(pathname==='/'||pathname==='/index.html')return reply(302,null,{Location:'/map-studio/'});
      const asset=await env.ASSETS.fetch(request),headers=new Headers(asset.headers);
      for(const [name,value] of Object.entries(securityHeadersFor(pathname)))headers.set(name,value);
      headers.set('Strict-Transport-Security',STRICT_TRANSPORT_SECURITY);
      // Hashed kart bundle files (?v=) are immutable; errors and everything else are revalidated.
      headers.set('Cache-Control',asset.status===200?assetCacheControl(new URL(request.url)):REVALIDATE_CACHE);
      headers.set('X-Revision',env.REVISION||'unknown');
      return new Response(asset.body,{status:asset.status,statusText:asset.statusText,headers});
    }
  };
}
