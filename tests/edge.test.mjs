import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {SECURITY_HEADERS,CONTENT_SECURITY_POLICY,readCredentials,sameSecret,clientKey} from '../edge/policy.mjs';
import {createWorker,ENHANCE_MAX_BODY,ENHANCE_MAX_RESPONSE} from '../edge/app.mjs';
import {MapRoom,MAX_PER_IP} from '../edge/map-room.mjs';
import {TYPE as NET,encode as netEncode,decode as netDecode} from '../dist/runtime/net/protocol.js';
import {LoginGuard,MAX_FAILURES,WINDOW_SECONDS,BLOCK_SECONDS} from '../edge/guard.mjs';
import {createDevServer} from '../scripts/serve.mjs';

const basic=(user,password)=>'Basic '+Buffer.from(`${user}:${password}`).toString('base64');
const good=basic('tester','richtig');

// In-memory stand-ins for the Durable Object storage and namespace; the guard itself is the real class.
function fakeStorage(){
  const data=new Map();let alarm=null;
  return {data,get alarm(){return alarm;},get:async key=>data.get(key),put:async(key,value)=>{data.set(key,structuredClone(value));},deleteAll:async()=>{data.clear();},setAlarm:async at=>{alarm=at;},getAlarm:async()=>alarm,deleteAlarm:async()=>{alarm=null;}};
}
function fakeGuards(clock){
  const storages=new Map(),calls=[];
  const namespace={
    idFromName:name=>name,
    get:id=>({fetch:async(url,init)=>{
      calls.push(id);if(!storages.has(id))storages.set(id,fakeStorage());
      return new LoginGuard({storage:storages.get(id)},{},()=>clock.now).fetch(new Request(url,init));
    }})
  };
  return {namespace,storages,calls};
}
function setup({env:overrides={},assetResponse}={}){
  const clock={now:1_800_000_000_000},guards=fakeGuards(clock),assets=[];
  const env={MSW_USER:'tester',MSW_PASSWORD:'richtig',REVISION:'abc1234',LOGIN_GUARD:guards.namespace,
    ASSETS:{fetch:async request=>{assets.push(new URL(request.url).pathname);return assetResponse?assetResponse(request):new Response('asset',{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=0, must-revalidate','ETag':'"x"'}});}},
    ...overrides};
  const worker=createWorker();
  const call=(path='/map-studio/',init={},ip='203.0.113.7')=>worker.fetch(new Request('https://world.example'+path,{...init,headers:{'CF-Connecting-IP':ip,...init.headers}}),env,{waitUntil(){}});
  return {clock,guards,assets,env,call};
}
const assertBaseHeaders=response=>{for(const [name,value] of Object.entries(SECURITY_HEADERS))assert.equal(response.headers.get(name),value,name);};
const wrong=i=>({headers:{Authorization:basic('tester','falsch'+i)}});

test('worker entry exports only the default handler and the Durable Object classes (workerd rejects anything else)',()=>{
  // edge/worker.mjs imports the compiled WASM core (a Wrangler module rule), so its export list is checked as text here.
  const source=readFileSync(new URL('../edge/worker.mjs',import.meta.url),'utf8');
  const named=[...source.matchAll(/^export\s*\{\s*(\w+)\s*\}/gm)].map(m=>m[1]).sort();
  assert.deepEqual(named,['LoginGuard','MapRoom']);assert.match(source,/^export default createWorker\(\);$/m);
  assert.match(source,/^import simModule from '\.\.\/dist\/runtime\/sim\/sim\.wasm';$/m);
  assert.equal(typeof createWorker().fetch,'function');assert.equal(typeof LoginGuard,'function');assert.equal(typeof MapRoom,'function');
});

test('security policy is strict, self-only and forbids framing',()=>{
  assert.equal(SECURITY_HEADERS['Content-Security-Policy'],CONTENT_SECURITY_POLICY);
  for(const directive of ["default-src 'self'","script-src 'self'","object-src 'none'","base-uri 'none'","frame-ancestors 'none'","img-src 'self' data: blob:"])assert.ok(CONTENT_SECURITY_POLICY.includes(directive),directive);
  assert.doesNotMatch(CONTENT_SECURITY_POLICY,/script-src[^;]*unsafe/);
  assert.equal(SECURITY_HEADERS['X-Frame-Options'],'DENY');
  assert.equal(SECURITY_HEADERS['X-Content-Type-Options'],'nosniff');
  assert.equal(SECURITY_HEADERS['Referrer-Policy'],'no-referrer');
  assert.equal(SECURITY_HEADERS['X-Robots-Tag'],'noindex, nofollow');
});

test('credentials: scheme is case-insensitive, malformed headers count as an attempt, no header is no attempt',()=>{
  assert.equal(readCredentials(null),null);
  assert.equal(readCredentials(good),'tester:richtig');
  assert.equal(readCredentials('basic '+Buffer.from('a:b').toString('base64')),'a:b');
  assert.equal(readCredentials('Basic '+Buffer.from('ä:ö').toString('base64')),'ä:ö');
  assert.equal(readCredentials('Basic %%%not-base64'),'');
  assert.equal(readCredentials('Bearer token'),'');
});

test('secret comparison is exact for any length',async()=>{
  assert.equal(await sameSecret('tester:richtig','tester:richtig'),true);
  assert.equal(await sameSecret('tester:richtiG','tester:richtig'),false);
  assert.equal(await sameSecret('','tester:richtig'),false);
  assert.equal(await sameSecret('tester:richtig-und-viel-länger','tester:richtig'),false);
});

test('client key groups IPv6 by /64, keeps IPv4 whole and never throws',()=>{
  assert.equal(clientKey('203.0.113.7'),'203.0.113.7');
  assert.equal(clientKey('2001:db8:1:2:aaaa:bbbb:cccc:dddd'),'2001:db8:1:2::/64');
  assert.equal(clientKey('2001:DB8:0001:0002::1'),'2001:db8:1:2::/64');
  assert.equal(clientKey('2001:db8::1'),'2001:db8:0:0::/64');
  assert.equal(clientKey('::1'),'0:0:0:0::/64');
  assert.equal(clientKey('1::'),'1:0:0:0::/64');
  assert.equal(clientKey('::ffff:192.0.2.1'),'192.0.2.1');
  assert.equal(clientKey('1:2:3:4:5:6:7:8::9'),'unknown');
  assert.equal(clientKey('not-an-ip:::'),'unknown');
  assert.equal(clientKey(null),'unknown');
});

test('guard: blocks after too many different wrong credentials, before any further answer',async()=>{
  const storage=fakeStorage();let now=1_000_000;
  const guard=()=>new LoginGuard({storage},{},()=>now);
  const attempt=async(ok,fingerprint)=>(await (await guard().fetch(new Request('https://guard/attempt',{method:'POST',body:JSON.stringify({ok,fingerprint})}))).json()).blocked;
  for(let i=0;i<MAX_FAILURES;i++)assert.equal(await attempt(false,'f'+i),false,`failure ${i+1}`);
  assert.equal(await attempt(false,'f-last'),true,'the next different failure blocks');
  assert.equal(await attempt(true),true,'right credentials stay blocked (fresh instance, persisted state)');
  assert.ok(storage.alarm>=now+BLOCK_SECONDS*1000);
  now+=BLOCK_SECONDS*1000+1;
  assert.equal(await attempt(true),false,'block expires');
});

test('guard: the same stale credential repeated does not lock anyone out',async()=>{
  const storage=fakeStorage(),guard=new LoginGuard({storage},{},()=>1_000);
  for(let i=0;i<5*MAX_FAILURES;i++){const r=await guard.fetch(new Request('https://guard/attempt',{method:'POST',body:JSON.stringify({ok:false,fingerprint:'old-password'})}));assert.equal((await r.json()).blocked,false);}
});

test('guard: failures outside the window are forgotten and the alarm clears storage',async()=>{
  const storage=fakeStorage();let now=1_000;const guard=()=>new LoginGuard({storage},{},()=>now);
  const attempt=async fingerprint=>(await (await guard().fetch(new Request('https://guard/attempt',{method:'POST',body:JSON.stringify({ok:false,fingerprint})}))).json()).blocked;
  for(let i=0;i<MAX_FAILURES;i++)await attempt('a'+i);
  now+=WINDOW_SECONDS*1000+1;
  assert.equal(await attempt('b'),false,'old failures no longer count');
  now+=WINDOW_SECONDS*1000+1;await guard().alarm();
  assert.equal(storage.data.size,0,'idle state is removed');
});

test('guard: rejects anything but a well-formed attempt',async()=>{
  const guard=new LoginGuard({storage:fakeStorage()},{},()=>1);
  assert.equal((await guard.fetch(new Request('https://guard/attempt'))).status,405);
  assert.equal((await guard.fetch(new Request('https://guard/attempt',{method:'POST',body:'{'}))).status,400);
  assert.equal((await guard.fetch(new Request('https://guard/attempt',{method:'POST',body:JSON.stringify({ok:false})}))).status,400);
});

test('worker: no credentials → 401 with challenge, no guard call, no asset access',async()=>{
  const {call,guards,assets}=setup(),response=await call();
  assert.equal(response.status,401);assert.match(response.headers.get('WWW-Authenticate'),/^Basic realm=/);
  assert.equal(response.headers.get('Cache-Control'),'no-store');assertBaseHeaders(response);
  assert.deepEqual(guards.calls,[]);assert.deepEqual(assets,[]);assert.equal(response.headers.get('X-Revision'),null);
});

test('worker: wrong credentials → 401, recorded per client without storing the password',async()=>{
  const {call,guards,assets}=setup(),response=await call('/map-studio/',wrong(1));
  assert.equal(response.status,401);assert.deepEqual(guards.calls,['203.0.113.7']);assert.deepEqual(assets,[]);
  assert.doesNotMatch(JSON.stringify([...guards.storages.get('203.0.113.7').data.values()]),/falsch/);
});

test('worker: extra accounts from MSW_EXTRA_USERS are accepted, the main account stays valid',async()=>{
  const {call}=setup({env:{MSW_EXTRA_USERS:' Benutzer:Admin , zweiter:pa:ss ,kaputt'}});
  for(const [user,password] of [['tester','richtig'],['Benutzer','Admin'],['zweiter','pa:ss']])
    assert.equal((await call('/map-studio/',{headers:{Authorization:basic(user,password)}})).status,200,user);
  for(const [user,password] of [['Benutzer','admin'],['kaputt',''],['Benutzer','Admin , zweiter']])
    assert.equal((await call('/map-studio/',{headers:{Authorization:basic(user,password)}})).status,401,user);
});

test('worker: too many different failures → 429, and a blocked client cannot tell a right guess',async()=>{
  const {call,assets}=setup();
  for(let i=0;i<MAX_FAILURES;i++)assert.equal((await call('/map-studio/',wrong(i))).status,401);
  const denied=await call('/map-studio/',wrong('x'));
  assert.equal(denied.status,429);assert.equal(denied.headers.get('Retry-After'),String(BLOCK_SECONDS));assertBaseHeaders(denied);
  assert.equal((await call('/map-studio/',{headers:{Authorization:good}})).status,429);
  assert.deepEqual(assets,[]);
  assert.equal((await call('/map-studio/',{headers:{Authorization:good}},'198.51.100.9')).status,200,'other clients are unaffected');
});

test('worker: a browser resending an old password on every asset is not locked out',async()=>{
  const {call}=setup(),old={headers:{Authorization:basic('tester','altes-passwort')}};
  for(let i=0;i<40;i++)assert.equal((await call('/map-studio/editor.js',old)).status,401);
  assert.equal((await call('/map-studio/',{headers:{Authorization:good}})).status,200);
});

test('worker: hashed kart bundle files are immutable, everything else (and errors, and unhashed or malformed ?v) revalidates',async()=>{
  const {call}=setup({assetResponse:request=>new Response('x',{status:new URL(request.url).pathname.endsWith('missing.bin.gz')?404:200})});
  const cc=async path=>(await call(path,{headers:{Authorization:good}})).headers.get('Cache-Control');
  assert.equal(await cc('/kart/assets/kronach-height.bin.gz?v=0123456789abcdef'),'private, max-age=31536000, immutable');
  assert.equal(await cc('/kart/assets/kronach-height.bin.gz'),'private, no-cache','no hash → revalidate');
  assert.equal(await cc('/kart/assets/kronach-height.bin.gz?v=XYZ'),'private, no-cache','malformed hash → revalidate');
  assert.equal(await cc('/kart/assets/kronach.json'),'private, no-cache','the bundle JSON (which names the hashes) always revalidates');
  assert.equal(await cc('/kart/main.js?v=0123456789abcdef'),'private, no-cache','only the kart bundle, not code');
  assert.equal(await cc('/kart/assets/missing.bin.gz?v=0123456789abcdef'),'private, no-cache','a 404 is never cached as immutable');
});

test('worker: right credentials → asset with security headers, revision and private caching',async()=>{
  const {call,assets,guards}=setup(),response=await call('/map-studio/',{headers:{Authorization:good}});
  assert.equal(response.status,200);assert.equal(await response.text(),'asset');assert.deepEqual(assets,['/map-studio/']);assert.deepEqual(guards.calls,['203.0.113.7']);
  assertBaseHeaders(response);
  assert.match(response.headers.get('Strict-Transport-Security'),/max-age=\d{7,}/);
  assert.equal(response.headers.get('Cache-Control'),'private, no-cache');
  assert.equal(response.headers.get('ETag'),'"x"');
  assert.equal(response.headers.get('X-Revision'),'abc1234');
});

test('worker: 304, 404 and asset redirects pass through with headers',async()=>{
  for(const [status,init] of [[304,{headers:{ETag:'"x"'}}],[404,{}],[307,{headers:{Location:'/map-studio/'}}]]){
    const {call}=setup({assetResponse:()=>new Response(status===304?null:'body',{status,...init})});
    const response=await call('/map-studio',{headers:{Authorization:good}});
    assert.equal(response.status,status);assertBaseHeaders(response);assert.equal(response.headers.get('X-Revision'),'abc1234');
    if(init.headers?.Location)assert.equal(response.headers.get('Location'),'/map-studio/');
  }
});

test('worker: root and index redirect to the map studio, also with a query string',async()=>{
  const {call,assets}=setup();
  for(const path of ['/','/index.html','/?x=1']){
    const response=await call(path,{headers:{Authorization:good}});
    assert.equal(response.status,302,path);assert.equal(response.headers.get('Location'),'/map-studio/',path);
  }
  assert.deepEqual(assets,[]);
});

test('worker: only GET and HEAD, and only after authentication',async()=>{
  const {call}=setup();
  assert.equal((await call('/map-studio/',{method:'POST'})).status,401);
  const response=await call('/map-studio/',{method:'POST',headers:{Authorization:good}});
  assert.equal(response.status,405);assert.equal(response.headers.get('Allow'),'GET, HEAD');
  assert.equal((await call('/map-studio/',{method:'HEAD',headers:{Authorization:good}})).status,200);
});

test('worker: fails closed without secrets, without guard, or when the guard errors',async()=>{
  const broken={idFromName:n=>n,get:()=>({fetch:async()=>{throw new Error('guard down');}})};
  for(const env of [{MSW_PASSWORD:''},{MSW_USER:undefined},{LOGIN_GUARD:undefined},{LOGIN_GUARD:broken}]){
    const {call,assets}=setup({env}),response=await call('/map-studio/',{headers:{Authorization:good}});
    assert.equal(response.status,500,Object.keys(env).join());assert.deepEqual(assets,[]);assertBaseHeaders(response);
  }
});

// --- /api/enhance: Kartenbild-Verbesserung über renderboost, hinter derselben Anmeldung, mit R2-Hash-Cache ---
function enhanceSetup({originStatus=200,originBody,originText,originHeaders={},originThrows=false,withCache=true,configured=true}={}){
  const calls=[],stored=new Map();
  const fetchOrigin=async(url,init)=>{calls.push({url,init});if(originThrows)throw new Error('down');return new Response(originText??JSON.stringify(originBody??{engine:'lanczos-upscale',out:{width:4,height:2},contentType:'image/webp',outputBase64:'UklGRg==',compute:{cpuTotalMs:12},cost:{outMP:.01}}),{status:originStatus,headers:{'content-type':'application/json',...originHeaders}});};
  const RB_CACHE={get:async key=>stored.has(key)?{body:new Response(stored.get(key)).body,text:async()=>{throw new Error('hits must be streamed, not buffered');}}:null,put:async(key,value)=>{stored.set(key,value);}};
  const base=setup({env:configured?{RENDERBOOST_ORIGIN:'https://rb-origin.example',RENDERBOOST_TOKEN:'o'.repeat(64),...(withCache?{RB_CACHE}:{})}:{}});
  const worker=createWorker({fetchOrigin}),waits=[];
  const post=(body,headers={})=>worker.fetch(new Request('https://world.example/api/enhance',{method:'POST',body:typeof body==='string'?body:JSON.stringify(body),headers:{'CF-Connecting-IP':'203.0.113.7','Content-Type':'application/json',Authorization:good,...headers}}),base.env,{waitUntil:p=>waits.push(p)});
  return {...base,calls,stored,post,settle:()=>Promise.all(waits)};
}
const enhanceBody={inputBase64:'iVBORw0KGgo=',targetWidth:4,targetHeight:2,format:'webp',quality:90};

test('enhance: behind the same login, POST only, unavailable without configuration',async()=>{
  const e=enhanceSetup();
  const anonymous=await createWorker({fetchOrigin:async()=>{throw new Error('must not be called');}}).fetch(new Request('https://world.example/api/enhance',{method:'POST',body:'{}',headers:{'CF-Connecting-IP':'203.0.113.7'}}),e.env,{waitUntil(){}});
  assert.equal(anonymous.status,401);
  assert.equal((await e.call('/api/enhance',{headers:{Authorization:good}})).status,405);
  const off=enhanceSetup({configured:false});const r=await off.post(enhanceBody);
  assert.equal(r.status,503);assert.match((await r.json()).error,/nicht verfügbar/);assert.equal(off.calls.length,0);
});

test('enhance: miss goes to the origin with the token, the result is cached by content hash, the repeat is a hit',async()=>{
  const e=enhanceSetup();
  const first=await e.post(enhanceBody);await e.settle();
  assert.equal(first.status,200);assert.equal(first.headers.get('x-rb-cache'),'miss');assertBaseHeaders(first);
  assert.equal(e.calls.length,1);assert.equal(e.calls[0].url,'https://rb-origin.example/enhance');
  assert.equal(e.calls[0].init.headers.Authorization,'Bearer '+'o'.repeat(64));assert.equal(e.calls[0].init.method,'POST');
  const data=await first.json();assert.equal(data.outputBase64,'UklGRg==');assert.equal(e.stored.size,1);
  const second=await e.post(enhanceBody);
  assert.equal(second.headers.get('x-rb-cache'),'hit');assert.equal(e.calls.length,1,'no second origin call');assert.deepEqual(await second.json(),data);
  const other=await e.post({...enhanceBody,quality:80});await e.settle();
  assert.equal(other.headers.get('x-rb-cache'),'miss');assert.equal(e.calls.length,2,'different parameters are a different key');
});

test('enhance: origin refusals pass through, failures become 502, oversize is refused, no cache still works',async()=>{
  const refused=enhanceSetup({originStatus:400,originBody:{error:'Eingabebild zu groß.'}});
  const r=await refused.post(enhanceBody);await refused.settle();
  assert.equal(r.status,400);assert.match((await r.json()).error,/zu groß/);assert.equal(refused.stored.size,0,'errors are not cached');
  const down=enhanceSetup({originThrows:true});const d=await down.post(enhanceBody);
  assert.equal(d.status,502);assert.match((await d.json()).error,/nicht erreichbar/);
  const busy=enhanceSetup({originStatus:503,originBody:{error:'Ausgelastet.'}});assert.equal((await busy.post(enhanceBody)).status,503);
  const big=enhanceSetup();const b=await big.post('x'.repeat(ENHANCE_MAX_BODY+1));
  assert.equal(b.status,413);assert.equal(big.calls.length,0);
  const bad=enhanceSetup();assert.equal((await bad.post('kaputt')).status,400);assert.equal(bad.calls.length,0);
  const bypass=enhanceSetup({withCache:false});const n=await bypass.post(enhanceBody);
  assert.equal(n.status,200);assert.equal(n.headers.get('x-rb-cache'),'bypass');
});

test('enhance: only real image results are cached; oversize or foreign origin answers become 502; the upload must be a JSON object',async()=>{
  for(const originText of ['<html>Tunnel-Fehler</html>','{"outputBase64":"UklGRg==","contentType":"text/html"}','{"contentType":"image/webp"}']){
    const e=enhanceSetup({originText});const r=await e.post(enhanceBody);await e.settle();
    assert.equal(r.status,502,originText);assert.equal(e.stored.size,0,'not cached: '+originText);
  }
  const huge=enhanceSetup({originHeaders:{'content-length':String(ENHANCE_MAX_RESPONSE+1)}});const h=await huge.post(enhanceBody);await huge.settle();
  assert.equal(h.status,502);assert.equal(huge.stored.size,0);
  const notObject=enhanceSetup();assert.equal((await notObject.post('[1,2]')).status,400);assert.equal(notObject.calls.length,0);
});

test('local dev server sends the same security headers as the edge',async()=>{
  const server=createDevServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const base=`http://127.0.0.1:${server.address().port}`;
    for(const route of ['/map-studio/','/map-studio/editor.js','/does-not-exist']){
      const response=await fetch(base+route);await response.arrayBuffer();
      for(const [name,value] of Object.entries(SECURITY_HEADERS))assert.equal(response.headers.get(name),value,`${route} ${name}`);
    }
  }finally{await new Promise(resolve=>server.close(resolve));}
});

// --- Scan worlds (W6): /api/scenes and /scenes/<id>/<file> from the R2 binding SCENES ---
const SCENE_ID='a'.repeat(64);
function fakeScenes(entries){
  const store=new Map(Object.entries(entries).map(([key,text])=>[key,new TextEncoder().encode(text)])),reads=[];
  const object=(key,bytes,withBody)=>({key,size:bytes.length,httpEtag:`"${key.length}-${bytes.length}"`,...(withBody?{body:new Blob([bytes]).stream(),text:async()=>new TextDecoder().decode(bytes)}:{})});
  return {reads,get:async(key,{onlyIf}={})=>{reads.push(key);const bytes=store.get(key);if(!bytes)return null;
    const etag=`"${key.length}-${bytes.length}"`,match=onlyIf?.get?.('If-None-Match');return object(key,bytes,match!==etag);}};
}
test('scenes: behind the login; index from R2, empty without a bucket',async()=>{
  const bucket=fakeScenes({'index.json':JSON.stringify({format:'motionspec.scan.index.v1',scenes:[{id:SCENE_ID,name:'Office'}]})});
  const {call}=setup({env:{SCENES:bucket}});
  assert.equal((await call('/api/scenes')).status,401);
  assert.equal((await call(`/scenes/${SCENE_ID}/scene.glb`)).status,401);
  const list=await call('/api/scenes',{headers:{Authorization:good}});
  assert.equal(list.status,200);assert.equal((await list.json()).scenes[0].name,'Office');assert.equal(list.headers.get('Cache-Control'),'no-store');assertBaseHeaders(list);
  const empty=await setup().call('/api/scenes',{headers:{Authorization:good}});
  assert.deepEqual(await empty.json(),{format:'motionspec.scan.index.v1',scenes:[]});
});
test('scenes: files are immutable, typed, gzip passed through when accepted, 304 on a matching ETag',async()=>{
  const bucket=fakeScenes({[`${SCENE_ID}/scene.glb`]:'GLB-PLAIN',[`${SCENE_ID}/scene.glb.gz`]:'GZ',[`${SCENE_ID}/lightmap.webp`]:'WEBP'});
  const {call,assets}=setup({env:{SCENES:bucket}}),auth={Authorization:good};
  const plain=await call(`/scenes/${SCENE_ID}/scene.glb`,{headers:auth});
  assert.equal(plain.status,200);assert.equal(await plain.text(),'GLB-PLAIN');assert.equal(plain.headers.get('Content-Type'),'model/gltf-binary');
  assert.equal(plain.headers.get('Cache-Control'),'private, max-age=31536000, immutable');assert.equal(plain.headers.get('Content-Encoding'),null);assertBaseHeaders(plain);
  const gz=await call(`/scenes/${SCENE_ID}/scene.glb`,{headers:{...auth,'Accept-Encoding':'br, gzip'}});
  assert.equal(gz.headers.get('Content-Encoding'),'gzip');assert.equal(gz.headers.get('Content-Length'),'2');assert.equal(gz.headers.get('Vary'),'Accept-Encoding');
  const webp=await call(`/scenes/${SCENE_ID}/lightmap.webp`,{headers:{...auth,'Accept-Encoding':'gzip'}});
  assert.equal(webp.headers.get('Content-Encoding'),null,'images are never gzip-wrapped');assert.equal(webp.headers.get('Content-Type'),'image/webp');
  const again=await call(`/scenes/${SCENE_ID}/scene.glb`,{headers:{...auth,'If-None-Match':plain.headers.get('ETag')}});
  assert.equal(again.status,304);
  assert.equal((await call(`/scenes/${SCENE_ID}/scene.glb`,{method:'HEAD',headers:auth})).status,200);
  assert.equal(assets.length,0,'scene requests never reach the static assets');
});
test('scenes: only content-addressed paths of known types; other methods refused',async()=>{
  const bucket=fakeScenes({[`${SCENE_ID}/scene.glb`]:'x'});const {call}=setup({env:{SCENES:bucket}}),auth={headers:{Authorization:good}};
  for(const path of [`/scenes/${SCENE_ID}/../index.json`,`/scenes/${SCENE_ID.slice(1)}/scene.glb`,`/scenes/${SCENE_ID}/scene.exe`,`/scenes/${SCENE_ID}/missing.json`,`/scenes/${'A'.repeat(64)}/scene.glb`,'/scenes/index.json'])
    assert.equal((await call(path,auth)).status,404,path);
  assert.equal((await call(`/scenes/${SCENE_ID}/scene.glb`,{method:'PUT',headers:{Authorization:good}})).status,405);
  assert.equal((await setup().call(`/scenes/${SCENE_ID}/scene.glb`,auth)).status,404,'no bucket bound');
  assert.ok(!bucket.reads.some(key=>key.includes('..')));
});

// --- Geodata tilesets: /geo/<set>/tileset.json and /geo/<set>/L<k>/<e>_<n>.glb from the R2 binding GEO ---
test('geo: behind the login; tiles immutable, tileset revalidated, 304 on a matching ETag, strict paths',async()=>{
  const bucket=fakeScenes({'kronach-lk-2/tileset.json':'{"asset":{}}','kronach-lk-2/L0/1312_11136.glb':'glTF','kronach-lk-2/S/665_5567.bin':'KS01'});
  const {call}=setup({env:{GEO:bucket}}),auth={Authorization:good};
  assert.equal((await call('/geo/kronach-lk-2/tileset.json')).status,401);
  const set=await call('/geo/kronach-lk-2/tileset.json',{headers:auth});
  assert.equal(set.status,200);assert.match(set.headers.get('Content-Type'),/application\/json/);assert.doesNotMatch(set.headers.get('Cache-Control'),/immutable/);assertBaseHeaders(set);
  const tile=await call('/geo/kronach-lk-2/L0/1312_11136.glb',{headers:auth});
  assert.equal(tile.status,200);assert.equal(tile.headers.get('Content-Type'),'model/gltf-binary');assert.match(tile.headers.get('Cache-Control'),/immutable/);assert.equal(await tile.text(),'glTF');
  assert.equal((await call('/geo/kronach-lk-2/L0/1312_11136.glb',{headers:{...auth,'If-None-Match':tile.headers.get('ETag')}})).status,304);
  assert.equal((await call('/geo/kronach-lk-2/L0/1312_11136.glb',{method:'HEAD',headers:auth})).status,200);
  const surface=await call('/geo/kronach-lk-2/S/665_5567.bin',{headers:auth});
  assert.equal(surface.status,200);assert.equal(surface.headers.get('Content-Type'),'application/octet-stream');assert.match(surface.headers.get('Cache-Control'),/immutable/);
  for(const path of ['/geo/kronach-lk-2/../x/tileset.json','/geo/Kronach/tileset.json','/geo/kronach-lk-2/L0/1_2.exe','/geo/kronach-lk-2/tex/L0/1_2.jpg','/geo/kronach-lk-2/L0/9_9.glb','/geo/tileset.json'])
    assert.equal((await call(path,{headers:auth})).status,404,path);
  assert.equal((await call('/geo/kronach-lk-2/tileset.json',{method:'PUT',headers:auth})).status,405);
  assert.equal((await setup().call('/geo/kronach-lk-2/tileset.json',{headers:auth})).status,404,'no bucket bound');
  assert.ok(!bucket.reads.some(key=>key.includes('..')));
});

test('device check: stored behind the login with time and revision; size, format and method checked',async()=>{
  const puts=[],bucket={...fakeScenes({}),put:async(key,body)=>{puts.push([key,JSON.parse(body)]);}};
  const {call}=setup({env:{SCENES:bucket}}),report={format:'motionspec.device-check.v1',result:{fpsMean:60,a2:true},device:{gpu:'x'}};
  const post=(body,headers={})=>call('/api/device-check',{method:'POST',body,headers:{Authorization:good,'Content-Type':'application/json',...headers}});
  assert.equal((await call('/api/device-check',{method:'POST',body:JSON.stringify(report)})).status,401);
  const ok=await post(JSON.stringify(report));assert.equal(ok.status,201);
  const {stored}=await ok.json();assert.match(stored,/^device-checks\/\d{4}-\d{2}-\d{2}\/.+\.json$/);
  assert.equal(puts[0][0],stored);assert.equal(puts[0][1].revision,'abc1234');assert.equal(puts[0][1].report.result.fpsMean,60);assert.ok(puts[0][1].received);
  assert.equal((await post('x'.repeat(17*1024))).status,413);
  assert.equal((await post('{nope')).status,400);
  assert.equal((await post(JSON.stringify({format:'other'}))).status,400);
  assert.equal((await call('/api/device-check',{headers:{Authorization:good}})).status,405);
  assert.equal((await setup().call('/api/device-check',{method:'POST',body:JSON.stringify(report),headers:{Authorization:good}})).status,503);
  assert.equal(puts.length,1);
});

// --- Kart live telemetry: POST /api/kart-telemetry, GET /api/kart-insights (edge/telemetry.mjs) ---
function fakeTelemetryBucket(){
  const store=new Map();
  return {store,
    put:async(key,body)=>{store.set(key,body);},
    get:async key=>store.has(key)?{key,text:async()=>store.get(key)}:null,
    list:async({prefix})=>({objects:[...store.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key})),truncated:false})};
}
const telemetryBatch=(over={})=>({format:'ourark.kart-telemetry.v1',session:'0123456789abcdef',map:'kronach',seq:0,
  device:{gpu:'Apple M4',mobile:false,dpr:2,cores:10,memoryGB:16,canvas:'1400x820'},
  samples:[{t:1,mode:'walk',x:10,z:-20,nn:326,speed:1.6,fps:58,p95:19,calls:410,tris:250000,heapMB:60},{t:2,mode:'walk',x:12,z:-21,fps:31,p95:40}],...over});
test('kart telemetry: behind the login, validated, stored without IP; insights aggregate all sessions',async()=>{
  const bucket=fakeTelemetryBucket(),{call}=setup({env:{SCENES:bucket}}),auth={Authorization:good,'Content-Type':'application/json'};
  const post=body=>call('/api/kart-telemetry',{method:'POST',body:typeof body==='string'?body:JSON.stringify(body),headers:auth});
  assert.equal((await call('/api/kart-telemetry',{method:'POST',body:JSON.stringify(telemetryBatch())})).status,401);
  const ok=await post(telemetryBatch());assert.equal(ok.status,201);
  const {stored}=await ok.json();assert.match(stored,/^kart-telemetry\/\d{4}-\d{2}-\d{2}\/\d{6}-0123456789abcdef-00000\.json$/);
  const saved=JSON.parse(bucket.store.get(stored));
  assert.equal(saved.revision,'abc1234');assert.equal(saved.samples.length,2);assert.equal(saved.samples[0].heapMB,60);
  assert.ok(!JSON.stringify(saved).includes('203.0.113.7'),'no IP address stored');
  await post(telemetryBatch({session:'fedcba9876543210',seq:3,device:{mobile:true,gpu:'Adreno'},samples:[{t:5,mode:'kart',x:300,z:300,fps:24}]}));
  await post(telemetryBatch({map:'rosenberg',session:'aaaaaaaaaaaaaaaa',samples:[{t:1,mode:'plane',x:0,z:0,fps:90}]}));
  // Malformed input is refused and nothing is stored.
  const before=bucket.store.size;
  for(const bad of [{...telemetryBatch(),format:'x'},{...telemetryBatch(),session:'ZZ'},{...telemetryBatch(),samples:[]},
    {...telemetryBatch(),samples:Array.from({length:31},(_, i)=>({t:i,mode:'walk',x:0,z:0,fps:60}))},{...telemetryBatch(),samples:[{t:1,mode:'swim',x:0,z:0,fps:60}]}])
    assert.equal((await post(bad)).status,400);
  assert.equal((await post('x'.repeat(25*1024))).status,413);
  assert.equal((await post('{nope')).status,400);
  assert.equal(bucket.store.size,before);
  assert.equal((await call('/api/kart-telemetry',{headers:{Authorization:good}})).status,405);
  assert.equal((await setup().call('/api/kart-telemetry',{method:'POST',body:JSON.stringify(telemetryBatch()),headers:auth})).status,503);
  // Insights: only the asked map, sessions and devices counted, medians and cells.
  assert.equal((await call('/api/kart-insights?map=kronach')).status,401);
  const r=await call('/api/kart-insights?map=kronach&hours=24',{headers:{Authorization:good}});
  assert.equal(r.status,200);const insights=await r.json();
  assert.equal(insights.format,'ourark.kart-insights.v1');assert.equal(insights.sessions,2);assert.equal(insights.samples,3);
  assert.deepEqual(insights.devices,{mobile:1,desktop:1});assert.equal(insights.fps.median,31);assert.equal(insights.byMode.walk.samples,2);
  assert.ok(insights.grid.some(c=>c.x===25&&c.z===-25&&c.samples===2),'50 m cell around the walk samples');
  assert.equal((await call('/api/kart-insights',{method:'POST',headers:{Authorization:good}})).status,405);
});

// --- Globe (/globe/): its own CSP + Referer policy, the key route and the geocoder proxy (edge/globe.mjs) ---
test('globe: wider CSP and origin Referer only under /globe/, everything else stays strict',async()=>{
  const {call}=setup(),auth={headers:{Authorization:good}};
  const globe=await call('/globe/',auth),studio=await call('/map-studio/',auth);
  const csp=globe.headers.get('Content-Security-Policy');
  assert.match(csp,/connect-src 'self' data: blob: https:\/\/server\.arcgisonline\.com https:\/\/terrain\.reearth\.land https:\/\/tile\.googleapis\.com/);
  assert.match(csp,/script-src 'self' 'wasm-unsafe-eval'/);assert.match(csp,/worker-src 'self' blob:/);assert.match(csp,/frame-ancestors 'none'/);
  assert.equal(globe.headers.get('Referrer-Policy'),'strict-origin-when-cross-origin');
  assert.equal(studio.headers.get('Content-Security-Policy'),SECURITY_HEADERS['Content-Security-Policy']);
  assert.equal(studio.headers.get('Referrer-Policy'),'no-referrer');
});
test('globe config: the Google key only for signed-in testers, null when not configured',async()=>{
  assert.equal((await setup().call('/api/globe-config')).status,401);
  const none=await setup().call('/api/globe-config',{headers:{Authorization:good}});
  assert.equal(none.status,200);assert.equal((await none.json()).googleKey,null);assert.equal(none.headers.get('Cache-Control'),'no-store');
  const withKey=await setup({env:{GOOGLE_MAPS_KEY:'AIza-test'}}).call('/api/globe-config',{headers:{Authorization:good}});
  const config=await withKey.json();assert.equal(config.googleKey,'AIza-test');assert.match(config.attribution.terrain,/CC BY 4\.0/);
  assert.equal((await setup().call('/api/globe-config',{method:'POST',headers:{Authorization:good}})).status,405);
});
test('geocode: behind the login, proxied to Nominatim with an identifying User-Agent, trimmed answer, errors as 502',async()=>{
  const seen=[];
  const fetchOrigin=async(url,init)=>{seen.push({url,agent:init.headers['User-Agent']});
    if(url.includes('kaputt'))return new Response('nope',{status:503});
    return new Response(JSON.stringify([{display_name:'Kronach, Oberfranken, Bayern',lat:'50.2412',lon:'11.3285',type:'town',boundingbox:['50.2','50.3','11.2','11.4']},{display_name:'x',lat:'nan',lon:'1'}]),{headers:{'Content-Type':'application/json'}});};
  const worker=createWorker({fetchOrigin}),e=setup();
  const get=(q,auth=true)=>worker.fetch(new Request(`https://world.example/api/geocode?q=${encodeURIComponent(q)}`,{headers:{'CF-Connecting-IP':'203.0.113.7',...(auth?{Authorization:good}:{})}}),e.env,{waitUntil(){}});
  assert.equal((await get('Kronach',false)).status,401);
  const ok=await get('Kronach');assert.equal(ok.status,200);
  const body=await ok.json();assert.equal(body.places.length,1);assert.deepEqual([body.places[0].lat,body.places[0].lon,body.places[0].kind],[50.2412,11.3285,'town']);
  assert.match(seen[0].url,/^https:\/\/nominatim\.openstreetmap\.org\/search\?format=jsonv2&limit=6&accept-language=de&q=Kronach$/);
  assert.match(seen[0].agent,/^ourark-world-studio\/1\.0/);
  assert.equal((await get('')).status,400);assert.equal((await get('x'.repeat(121))).status,400);
  assert.equal((await get('kaputt')).status,502);
});

// --- Realtime (/api/realtime): the Worker route and the MapRoom Durable Object (edge/map-room.mjs) ---
test('realtime route: login, WebSocket upgrade, same origin, known map name → forwarded to that map\'s room',async()=>{
  const forwarded=[],forwardedIp=[],namespace={idFromName:name=>`id:${name}`,get:id=>({fetch:async request=>{forwarded.push([id,new URL(request.url).pathname]);forwardedIp.push(request.headers.get('CF-Connecting-IP'));return new Response('room',{status:200});}})};
  const {call}=setup({env:{MAP_ROOM:namespace}}),ws={Authorization:good,Upgrade:'websocket',Origin:'https://world.example','CF-Connecting-IP':'203.0.113.9'};
  assert.equal((await call('/api/realtime?map=kronach',{headers:{Upgrade:'websocket'}})).status,401);
  assert.equal((await call('/api/realtime?map=kronach',{headers:{Authorization:good}})).status,426,'no upgrade header');
  assert.equal((await call('/api/realtime?map=Kronach!',{headers:ws})).status,404,'map name checked');
  assert.equal((await call('/api/realtime?map=unknown-map',{headers:ws})).status,404,'only known maps get a room (no Durable Object per arbitrary name)');
  assert.equal((await call('/api/realtime/stats?map=unknown-map',{headers:{Authorization:good}})).status,404);
  assert.equal((await call('/api/realtime?map=kronach',{headers:{...ws,Origin:'https://evil.example'}})).status,403,'cross-site WebSocket refused');
  assert.equal((await call('/api/realtime?map=kronach',{headers:{...ws,Origin:'null'}})).status,403,'opaque origin refused, no crash');
  assert.equal((await call('/api/realtime?map=kronach',{headers:ws})).status,200);
  assert.deepEqual(forwarded,[['id:kronach','/connect']]);
  assert.equal(forwardedIp.at(-1),'203.0.113.9','client address forwarded for the per-IP cap');
  assert.equal((await setup().call('/api/realtime?map=kronach',{headers:ws})).status,503,'no namespace bound');
  const stats=await call('/api/realtime/stats?map=kronach',{headers:{Authorization:good}});assert.equal(stats.status,200);
  assert.deepEqual(forwarded.at(-1),['id:kronach','/stats']);
});
function fakeSocket(){
  const s={sent:[],closed:null,attachment:null,readyState:1,send(b){this.sent.push(b);},close(code,reason){this.closed=[code,reason];},
    serializeAttachment(v){this.attachment=structuredClone(v);},deserializeAttachment(){return this.attachment;}};
  return s;
}
function fakeRoomCtx(){const sockets=[];return {sockets,acceptWebSocket(ws){sockets.push(ws);},getWebSockets(){return sockets.filter(s=>!s.closed);}};}
test('MapRoom: accepts sockets with a WELCOME, relays validated poses as snapshots each tick, answers pings, cleans up',async()=>{
  const ctx=fakeRoomCtx(),clock={t:5000},timers=[];
  globalThis.WebSocketPair=function(){const c=fakeSocket(),s=fakeSocket();this[0]=c;this[1]=s;};
  const room=new MapRoom(ctx,{},{now:()=>clock.t,upgrade:client=>new Response(null,{status:200,headers:{'X-Client':'1'}}),
    setInterval:(fn)=>{timers.push(fn);return timers.length;},clearInterval:()=>{timers.length=0;}});
  const connect=()=>room.fetch(new Request('https://room/connect',{headers:{Upgrade:'websocket'}}));
  assert.equal((await room.fetch(new Request('https://room/connect'))).status,426);
  await connect();await connect();
  const [a,b]=ctx.sockets;
  assert.equal(netDecode(a.sent[0]).type,NET.WELCOME);const idA=a.attachment.id,idB=b.attachment.id;assert.notEqual(idA,idB);
  assert.equal(timers.length,1,'one tick loop while players are connected');
  await room.webSocketMessage(a,netEncode(NET.POSE,0,[{id:0,x:1,y:2,z:3,mode:'kart'}]).buffer);
  await room.webSocketMessage(b,netEncode(NET.POSE,0,[{id:0,x:5,y:2,z:3,mode:'kart'}]).buffer);
  timers[0]();
  const snapA=netDecode(a.sent.at(-1));assert.equal(snapA.type,NET.SNAPSHOT);assert.deepEqual(snapA.records.map(r=>r.id),[idB]);
  await room.webSocketMessage(a,netEncode(NET.PING,99,[]).buffer);assert.equal(netDecode(a.sent.at(-1)).type,NET.PONG);
  await room.webSocketMessage(a,'text is ignored');
  for(let i=0;i<25;i++)await room.webSocketMessage(b,new Uint8Array([9,9,9]).buffer);
  assert.equal(b.closed?.[0],1008,'a client sending garbage is closed');
  await room.webSocketClose(a,1000,'bye',true);await room.webSocketClose(b,1008,'',false);
  assert.equal(timers.length,0,'tick loop stops when the map is empty');
  const stats=await (await room.fetch(new Request('https://room/stats'))).json();assert.equal(stats.players,0);assert.ok(stats.bytesIn>0);
  delete globalThis.WebSocketPair;
});
test('MapRoom: oversized messages, floods, text spam, missing attachments and idle players are closed; ticking stops when nobody moves',async()=>{
  const ctx=fakeRoomCtx(),clock={t:10_000},timers=[];
  globalThis.WebSocketPair=function(){const c=fakeSocket(),s=fakeSocket();this[0]=c;this[1]=s;};
  const room=new MapRoom(ctx,{},{now:()=>clock.t,upgrade:()=>new Response(null,{status:200}),setInterval:fn=>{timers.push(fn);return timers.length;},clearInterval:()=>{timers.length=0;}});
  const connect=async()=>{await room.fetch(new Request('https://room/connect',{headers:{Upgrade:'websocket'}}));return ctx.sockets.at(-1);};
  const big=await connect();await room.webSocketMessage(big,new Uint8Array(4096).buffer);assert.equal(big.closed?.[0],1009,'oversized');
  const flood=await connect();for(let i=0;i<150;i++)await room.webSocketMessage(flood,netEncode(NET.POSE,0,[{id:0,x:0,y:0,z:0,mode:'kart'}]).buffer);
  assert.equal(flood.closed?.[0],1008,'sustained rate-limit refusals close the connection');
  const text=await connect();for(let i=0;i<150;i++)await room.webSocketMessage(text,'spam');assert.equal(text.closed?.[0],1008,'text spam counts too');
  const orphan=fakeSocket();await room.webSocketMessage(orphan,netEncode(NET.PING,1,[]).buffer);assert.equal(orphan.closed?.[0],1011,'no attachment → closed, no NaN ids');
  assert.equal(room.room.join().id>0,true);
  const idle=await connect();await room.webSocketMessage(idle,netEncode(NET.POSE,0,[{id:0,x:0,y:0,z:0,mode:'walk'}]).buffer);
  clock.t+=31_000;timers[0]?.();assert.equal(idle.closed?.[0],1000,'idle for 30 s → closed');
  const quiet=await connect();assert.equal(timers.length,1);clock.t+=4000;timers[0]();
  assert.equal(timers.length,0,'no fresh player → tick loop stops (Durable Object may hibernate)');
  await room.webSocketMessage(quiet,netEncode(NET.POSE,0,[{id:0,x:1,y:0,z:1,mode:'walk'}]).buffer);assert.equal(timers.length,1,'next pose restarts ticking');
  delete globalThis.WebSocketPair;
});
test('MapRoom: loads the WASM core and the map height grid from the assets and rejects poses off the terrain',async()=>{
  const ctx=fakeRoomCtx(),clock={t:1000};
  globalThis.WebSocketPair=function(){const c=fakeSocket(),s=fakeSocket();this[0]=c;this[1]=s;};
  const kart={terrain:{file:'synthetic-height.bin',width:4,depth:4,cell:1,scale:.01}},grid=new Uint8Array(new Uint16Array(16).fill(2500).buffer);
  const assets={fetch:async request=>{const p=new URL(request.url).pathname;
    return p.endsWith('kronach.json')?new Response(JSON.stringify(kart)):p.endsWith(kart.terrain.file)?new Response(grid):new Response('',{status:404});}};
  const simModule=await WebAssembly.compile(readFileSync(new URL('../dist/runtime/sim/sim.wasm',import.meta.url)));
  const room=new MapRoom(ctx,{ASSETS:assets},{now:()=>clock.t,upgrade:()=>new Response(null,{status:200}),setInterval:()=>1,clearInterval:()=>{},simModule});
  await room.fetch(new Request('https://room/connect?map=kronach',{headers:{Upgrade:'websocket'}}));
  await room.ready;
  const ws=ctx.sockets[0],g=room.ground(0,0);
  assert.ok(g>10&&g<40,`Synthetic 25 m ground at the centre from WASM (${g})`);
  await room.webSocketMessage(ws,netEncode(NET.POSE,0,[{id:0,x:0,y:g,z:0,mode:'walk'}]).buffer);
  clock.t+=500;await room.webSocketMessage(ws,netEncode(NET.POSE,0,[{id:0,x:1,y:g+60,z:0,mode:'walk'}]).buffer);
  assert.equal(room.room.stats().rejected.ground,1,'a walker 60 m above synthetic terrain is refused');
  delete globalThis.WebSocketPair;
});
test('MapRoom review fixes: ground refusals do not close the socket, asset names are checked, failed loads back off, per-IP cap',async()=>{
  const ctx=fakeRoomCtx(),clock={t:1000};
  globalThis.WebSocketPair=function(){const c=fakeSocket(),s=fakeSocket();this[0]=c;this[1]=s;};
  const fetched=[];let fail=true;
  const assets={fetch:async request=>{const p=new URL(request.url).pathname;fetched.push(p);
    if(fail)return new Response('',{status:500});
    return p.endsWith('.json')?new Response(JSON.stringify({terrain:{file:'../../secret.bin',width:2,depth:2,cell:1,scale:.01}})):new Response(new Uint8Array(8));}};
  const simModule=await WebAssembly.compile(readFileSync(new URL('../dist/runtime/sim/sim.wasm',import.meta.url)));
  const room=new MapRoom(ctx,{ASSETS:assets},{now:()=>clock.t,upgrade:()=>new Response(null,{status:200}),setInterval:()=>1,clearInterval:()=>{},simModule});
  const connect=(map='kronach',ip='203.0.113.7')=>room.fetch(new Request(`https://room/connect?map=${map}`,{headers:{Upgrade:'websocket','CF-Connecting-IP':ip}}));
  await connect('../etc');assert.equal(fetched.length,0,'map names outside [a-z0-9-] are never fetched');
  await connect();await room.ready;const after=fetched.length;assert.ok(after>0);
  await connect();await room.ready;assert.equal(fetched.length,after,'a failed load is not retried right away (backoff)');
  fail=false;clock.t+=61_000;await connect();await room.ready;
  assert.ok(!fetched.includes('/kart/assets/../../secret.bin')&&room.terrain===null,'height file names are checked too');
  for(let i=4;i<MAX_PER_IP;i++)assert.equal((await connect()).status,200);
  assert.equal((await connect()).status,429,'more than MAX_PER_IP connections from one address are refused');
  assert.equal((await connect('kronach','198.51.100.1')).status,200,'another address still gets in');
  // A player the terrain check keeps refusing (rooftop, bridge) is corrected, but not kicked as a flood.
  room.ground=()=>0;const ws=ctx.sockets.find(s=>s.attachment.ip==='203.0.113.7');
  for(let i=0;i<200;i++){clock.t+=50;await room.webSocketMessage(ws,netEncode(NET.POSE,0,[{id:0,x:1,y:40,z:1,mode:'walk'}]).buffer);}
  assert.equal(ws.closed,null,'ground refusals are not counted as flood');assert.ok(room.room.stats().rejected.ground>=200);
  await room.webSocketClose(ws);assert.equal((await connect()).status,200,'closing frees the address slot');
  delete globalThis.WebSocketPair;
});
test('MapRoom: after hibernation the constructor adopts the still connected sockets',()=>{
  const ctx=fakeRoomCtx();const s=fakeSocket();s.attachment={id:41};ctx.sockets.push(s);
  const room=new MapRoom(ctx,{},{setInterval:()=>1,clearInterval:()=>{}});
  assert.equal(room.room.size,1);assert.equal(room.room.join().id,42);
});
test('dev server realtime: two real WebSocket clients, poses in, snapshots out, foreign origin refused',async()=>{
  const server=createDevServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`ws://127.0.0.1:${server.address().port}/api/realtime?map=rosenberg`;
  const open=()=>new Promise((resolve,reject)=>{const ws=new WebSocket(base);ws.binaryType='arraybuffer';const inbox=[];ws.onmessage=e=>inbox.push(netDecode(e.data));ws.onopen=()=>resolve({ws,inbox});ws.onerror=reject;});
  try{
    const a=await open(),b=await open();
    await new Promise(r=>setTimeout(r,60));
    assert.equal(a.inbox[0].type,NET.WELCOME);const idB=b.inbox[0].records[0].id;
    a.ws.send(netEncode(NET.POSE,0,[{id:0,x:0,y:1,z:0,mode:'walk'}]));b.ws.send(netEncode(NET.POSE,0,[{id:0,x:12,y:1,z:-3,mode:'walk'}]));
    await new Promise(r=>setTimeout(r,180));
    const snap=a.inbox.filter(m=>m.type===NET.SNAPSHOT).at(-1);
    assert.deepEqual(snap.records.map(r=>r.id),[idB]);assert.ok(Math.abs(snap.records[0].x-12)<.1);
    a.ws.send(netEncode(NET.PING,77,[]));await new Promise(r=>setTimeout(r,60));assert.ok(a.inbox.some(m=>m.type===NET.PONG&&m.tick===77));
    const stats=await (await fetch(`http://127.0.0.1:${server.address().port}/api/realtime/stats?map=rosenberg`)).json();assert.equal(stats.players,2);assert.ok(stats.tick>0);
    a.ws.close();b.ws.close();
    await assert.rejects(new Promise((resolve,reject)=>{const ws=new WebSocket(base,{headers:{Origin:'https://evil.example'}});ws.onopen=resolve;ws.onerror=reject;}));
    // DNS rebinding: a foreign Host with a matching Origin is refused by the loopback-only dev server.
    await assert.rejects(new Promise((resolve,reject)=>{const ws=new WebSocket(base,{headers:{Host:'evil.example',Origin:'http://evil.example'}});ws.onopen=resolve;ws.onerror=reject;}));
  }finally{await new Promise(resolve=>server.close(resolve));server.closeAllConnections?.();}
});
