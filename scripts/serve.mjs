import {createServer} from 'node:http';
import {readFile,readdir,realpath,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {SECURITY_HEADERS,securityHeadersFor} from '../edge/policy.mjs';
import {globeConfig,geocode} from '../edge/globe.mjs';
import {ENHANCE_MAX_BODY} from '../edge/app.mjs';
import {cleanBatch,aggregate} from '../edge/telemetry.mjs';
import {handleUpgrade,localRooms} from './ws-local.mjs';

export const siteRoot=fileURLToPath(new URL('../dist/',import.meta.url));
// Scan worlds (ADR 0003): local stand-in for the Worker routes GET /scenes/<id>/<file> (R2 bucket, W6) and
// GET /api/scenes. Bundles are content addressed, so they are cached immutably like the Worker will do.
export const scenesRoot=process.env.SCENES_DIR?path.resolve(process.env.SCENES_DIR):fileURLToPath(new URL('../tests/fixtures/scans/',import.meta.url));
const SCENE_PATH=/^\/scenes\/([0-9a-f]{64})\/([a-z0-9_-]+(?:\.[a-z0-9]+)+)$/i,SCENE_CACHE='private, max-age=31536000, immutable';
async function sceneIndex(root){
  const scenes=[];
  for(const id of (await readdir(root).catch(()=>[])).filter(n=>/^[0-9a-f]{64}$/.test(n)).sort()){
    try{const m=JSON.parse(await readFile(path.join(root,id,'manifest.json'),'utf8'));if(m.id===id)scenes.push({id,name:m.name,stats:m.stats});}catch{}
  }
  return {format:'motionspec.scan.index.v1',scenes};
}
async function serveScenes(req,res,pathname,root){
  const send=(status,body,type,extra={})=>{res.writeHead(status,{...SECURITY_HEADERS,'Content-Type':type,'X-Content-Type-Options':'nosniff',...extra});res.end(req.method==='HEAD'?undefined:body);};
  if(!['GET','HEAD'].includes(req.method)){send(405,'','text/plain; charset=utf-8',{Allow:'GET, HEAD'});return;}
  if(pathname==='/api/scenes'){send(200,JSON.stringify(await sceneIndex(root)),'application/json; charset=utf-8',{'Cache-Control':'no-store'});return;}
  const match=SCENE_PATH.exec(pathname);
  try{
    if(!match)throw new Error('Invalid scene path');
    const data=await readFile(path.join(root,match[1],match[2]));
    send(200,data,mime[path.extname(match[2])]||'application/octet-stream',{'Content-Length':data.length,'Cache-Control':SCENE_CACHE});
  }catch{send(404,'Not found','text/plain; charset=utf-8');}
}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.txt':'text/plain; charset=utf-8','.glb':'model/gltf-binary','.gltf':'model/gltf+json','.wasm':'application/wasm','.xml':'application/xml'};
// Local stand-in for the Worker route POST /api/enhance: forwards to a renderboost origin (RENDERBOOST_URL +
// RENDERBOOST_TOKEN), without the R2 cache. Without configuration it answers 503 like an unconfigured Worker.
async function proxyEnhance(req,res,{url,token}={}){
  const json=(status,body,extra={})=>{const text=typeof body==='string'?body:JSON.stringify(body);res.writeHead(status,{...SECURITY_HEADERS,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...extra});res.end(text);};
  if(req.method!=='POST'){json(405,{error:'Nur POST.'},{Allow:'POST'});return;}
  if(!url||!token){req.resume();json(503,{error:'Die Bildverbesserung ist hier nicht verfügbar.'});return;}
  const chunks=[];let size=0;
  for await(const chunk of req){size+=chunk.length;if(size>ENHANCE_MAX_BODY){json(413,{error:'Bild zu groß.'});return;}chunks.push(chunk);}
  try{
    const response=await fetch(new URL('/enhance',url),{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:Buffer.concat(chunks),signal:AbortSignal.timeout(100_000)});
    json(response.status,await response.text(),{'x-rb-cache':'bypass'});
  }catch{json(502,{error:'Die Bildverbesserung ist gerade nicht erreichbar.'});}
}
async function globeLocal(req,res,requested){
  const webReply=(status,body,headers={})=>new Response(typeof body==='string'?body:JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers}});
  const request=new Request('http://local'+req.url,{method:req.method});req.resume();
  const env={GOOGLE_MAPS_KEY:process.env.GOOGLE_MAPS_KEY};
  const response=requested==='/api/globe-config'?globeConfig(request,env,webReply):await geocode(request,env,webReply);
  res.writeHead(response.status,{...SECURITY_HEADERS,...Object.fromEntries(response.headers)});res.end(await response.text());
}
const kartBatches=[];
async function kartLocal(req,res,requested){
  const reply=(status,body)=>{res.writeHead(status,{...SECURITY_HEADERS,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
  if(requested==='/api/kart-insights'){
    const url=new URL(req.url,'http://local'),hours=Math.min(48,Number(url.searchParams.get('hours'))||24);
    req.resume();reply(200,{...aggregate(kartBatches,{map:url.searchParams.get('map'),since:Date.now()-hours*3600_000}),map:url.searchParams.get('map'),hours,updatedAt:new Date().toISOString(),local:true});return;
  }
  if(req.method!=='POST'){req.resume();reply(405,{error:'Nur POST.'});return;}
  let text='';for await(const chunk of req)text+=chunk;
  let body;try{body=JSON.parse(text);}catch{reply(400,{error:'Kein JSON.'});return;}
  const {batch,error,status}=cleanBatch(body);if(error){reply(status,{error});return;}
  kartBatches.push({received:new Date().toISOString(),...batch});if(kartBatches.length>2000)kartBatches.shift();
  reply(201,{stored:'memory'});
}

// HTTP routes plus the local realtime WebSocket (/api/realtime, scripts/ws-local.mjs).
export function createDevServer(root=siteRoot,options={}){
  const server=createHttpServer(root,options);server.on('upgrade',handleUpgrade);return server;
}
function createHttpServer(root=siteRoot,{enhance,scenes=scenesRoot}={}){
  const handle=async(req,res)=>{
    let url;
    try{url=new URL(req.url,'http://localhost');}
    catch{req.resume();res.writeHead(400,{...SECURITY_HEADERS,'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end('Bad request');return;}
    const requested=url.pathname;
    if(requested==='/api/enhance'){await proxyEnhance(req,res,enhance);return;}
    if(requested==='/api/scenes'||requested.startsWith('/scenes/')){await serveScenes(req,res,requested,scenes);return;}
    // Local stand-ins for the globe routes, same code as the Worker (key from env GOOGLE_MAPS_KEY).
    if(requested==='/api/globe-config'||requested==='/api/geocode'){await globeLocal(req,res,requested);return;}
    // Local stand-in for /api/realtime/stats (the WebSocket itself is the 'upgrade' handler).
    if(requested==='/api/realtime/stats'){const map=new URL(req.url,'http://local').searchParams.get('map');const r=localRooms.get(map)?.room;req.resume();
      res.writeHead(200,{...SECURITY_HEADERS,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(r?r.stats():{players:0,tick:0,bytesIn:0,bytesOut:0,rejected:{}}));return;}
    // Local stand-ins for the kart telemetry routes: same validation and aggregation as the Worker, kept in memory.
    if(requested==='/api/kart-telemetry'||requested==='/api/kart-insights'){await kartLocal(req,res,requested);return;}
    // Local stand-in for POST /api/device-check: accepted, not stored (the Worker stores in R2).
    if(requested==='/api/device-check'){req.resume();res.writeHead(req.method==='POST'?200:405,{...SECURITY_HEADERS,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(req.method==='POST'?{stored:null}:{error:'Nur POST.'}));return;}
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{...SECURITY_HEADERS,Allow:'GET, HEAD'});res.end();return;}
    try{
      const pathname=decodeURIComponent(requested);
      if(pathname.includes('\0')||pathname.includes('\\'))throw new Error('Invalid path');
      let file=path.resolve(root,'.'+pathname),resolvedRoot=await realpath(root);
      if(file!==resolvedRoot&&!file.startsWith(resolvedRoot+path.sep))throw new Error('Invalid path');
      if((await stat(file)).isDirectory()){
        // Relative links resolve against the canonical directory URL (not its parent).
        if(!requested.endsWith('/')){res.writeHead(308,{...securityHeadersFor(requested+'/'),'Location':requested+'/'+url.search,'Cache-Control':'no-store'});res.end();return;}
        file=path.join(file,'index.html');
      }
      const real=await realpath(file);
      if(!real.startsWith(resolvedRoot+path.sep))throw new Error('Invalid path');
      const data=await readFile(real);
      res.writeHead(200,{...securityHeadersFor(pathname),'Content-Type':mime[path.extname(real)]||'application/octet-stream','Content-Length':data.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
      res.end(req.method==='HEAD'?undefined:data);
    }catch{res.writeHead(404,{...SECURITY_HEADERS,'Content-Type':'text/plain; charset=utf-8'});res.end('Not found');}
  };
  // An asynchronous route rejection must affect this request, never the whole development server.
  return createServer((req,res)=>{void handle(req,res).catch(()=>{
    req.resume();
    if(res.headersSent){res.destroy();return;}
    res.writeHead(500,{...SECURITY_HEADERS,'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end('Internal server error');
  });});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const port=Number(process.env.PORT||8080),host=process.env.HOST||'127.0.0.1';
  // No login here: realtime only answers loopback hosts (scripts/ws-local.mjs), the rest would be open to the network.
  if(!/^(127\.0\.0\.1|localhost|::1)$/.test(host))console.warn(`Warnung: HOST=${host} macht den Dev-Server ohne Login im Netz erreichbar.`);
  if(!Number.isInteger(port)||port<0||port>65535)throw new Error('PORT must be a valid port number.');
  const server=createDevServer(siteRoot,{enhance:{url:process.env.RENDERBOOST_URL,token:process.env.RENDERBOOST_TOKEN}});server.listen(port,host,()=>console.log(`Ourark World Studio: http://${host}:${server.address().port}/map-studio/`));
  server.on('error',error=>{console.error(error.message);process.exitCode=1;});
}
