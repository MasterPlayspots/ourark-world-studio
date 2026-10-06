// Globe support routes behind the login: GET /api/globe-config hands the optional Google browser key (secret
// GOOGLE_MAPS_KEY, restricted at Google to https://world.ourark.io/*) to signed-in testers only, and
// GET /api/geocode?q= looks places up via OpenStreetMap Nominatim (usage policy: identifying User-Agent,
// ≤ 1 request/s, attribution, results cached), so the page itself only ever talks to its own origin for this.

export const GEOCODE_URL='https://nominatim.openstreetmap.org/search';
export const GEOCODE_AGENT='ourark-world-studio/1.0 (+https://ourark.io)';
export const GEOCODE_MAX_QUERY=120,GEOCODE_TTL_S=86400;
let lastLookup=0;

export function globeConfig(request,env,jsonReply){
  if(request.method!=='GET')return jsonReply(405,{error:'Nur GET.'},{Allow:'GET'});
  return jsonReply(200,{googleKey:env.GOOGLE_MAPS_KEY||null,
    attribution:{imagery:'Esri World Imagery (Esri, Maxar, Earthstar Geographics, GIS User Community)',terrain:'Re:Earth Terrain / Mapterhorn (CC BY 4.0)',
      places:'© OpenStreetMap-Mitwirkende (ODbL), Nominatim',city:'Kronach: Bayerische Vermessungsverwaltung, CC BY 4.0'}});
}

// Nominatim answer → small list (name, lat, lon, kind, bounding box).
export function parsePlaces(list){
  return (Array.isArray(list)?list:[]).slice(0,6).map(p=>({name:String(p.display_name??'').slice(0,160),lat:Number(p.lat),lon:Number(p.lon),
    kind:String(p.type??p.addresstype??''),box:Array.isArray(p.boundingbox)?p.boundingbox.map(Number):null})).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon));
}

export async function geocode(request,env,jsonReply,fetchOrigin=(url,init)=>fetch(url,init),ctx={waitUntil(){}},now=()=>Date.now()){
  if(request.method!=='GET')return jsonReply(405,{error:'Nur GET.'},{Allow:'GET'});
  const q=(new URL(request.url).searchParams.get('q')??'').trim();
  if(!q||q.length>GEOCODE_MAX_QUERY)return jsonReply(400,{error:'Suchbegriff fehlt oder ist zu lang.'});
  const target=`${GEOCODE_URL}?format=jsonv2&limit=6&accept-language=de&q=${encodeURIComponent(q)}`;
  const cache=globalThis.caches?.default,cacheKey=new Request(`https://geocode.cache/${encodeURIComponent(q.toLowerCase())}`);
  const cached=cache&&await cache.match(cacheKey);
  if(cached)return jsonReply(200,await cached.text());
  // Nominatim allows one request per second: queue politely within this isolate.
  const wait=Math.max(0,lastLookup+1000-now());lastLookup=now()+wait;
  if(wait)await new Promise(resolve=>setTimeout(resolve,wait));
  let response;
  try{response=await fetchOrigin(target,{headers:{'User-Agent':GEOCODE_AGENT,'Accept':'application/json'}});}
  catch{return jsonReply(502,{error:'Ortssuche nicht erreichbar.'});}
  if(!response.ok)return jsonReply(502,{error:`Ortssuche antwortet mit ${response.status}.`});
  let places;try{places=parsePlaces(await response.json());}catch{return jsonReply(502,{error:'Ortssuche lieferte kein JSON.'});}
  const body=JSON.stringify({query:q,places,attribution:'© OpenStreetMap-Mitwirkende, Nominatim'});
  if(cache)ctx.waitUntil(cache.put(cacheKey,new Response(body,{headers:{'Cache-Control':`max-age=${GEOCODE_TTL_S}`}})));
  return jsonReply(200,body);
}
