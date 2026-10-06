// Real UI regressions found during the 2026-10-06 public-source audit.
// No external data/services; Linux software WebGL is functional evidence, not an FPS/device benchmark.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createDevServer} from '../../scripts/serve.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url)),require=createRequire(import.meta.url);
const artifacts=path.join(root,'.browser-artifacts/audit-regressions');
await mkdir(artifacts,{recursive:true});
const evidence={suite:'public-audit-regressions',startedAt:new Date().toISOString(),ok:false,
  commit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
  scope:'Chromium UI correctness only; no hardware FPS, full cross-browser or customer-value claim.',checks:[],errors:[]};
let browser,server,origin,phase='setup',downloadCount=0;
const lastExport=new WeakMap();
const args=process.platform==='linux'?['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']:['--ignore-gpu-blocklist'];
function playwright(){
  const failures=[];
  for(const candidate of [process.env.PLAYWRIGHT_CORE,'playwright-core','playwright'].filter(Boolean)){
    try{const api=require(candidate);if(!api.chromium?.launch)throw new Error('Chromium launcher missing');return api;}
    catch(error){failures.push(error.message);}
  }
  throw new Error(`Playwright with Chromium is required; no checks skipped. ${failures.join(' | ')}`);
}
async function open(route){
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true,serviceWorkers:'block'});
  await context.addInitScript(expected=>{
    if(location.origin===expected)localStorage.setItem('ourark.perf','0');
    globalThis.__paintedText=[];
    const paint=CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText=function(text,...rest){globalThis.__paintedText.push(String(text));return paint.call(this,text,...rest);};
  },origin);
  await context.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(['http:','https:'].includes(url.protocol)&&url.origin!==origin){evidence.errors.push({phase,kind:'external request',url:url.href});await route.abort();}
    else await route.continue();
  });
  const page=await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(20000);
  page.on('pageerror',error=>evidence.errors.push({phase,kind:'pageerror',message:error.message}));
  page.on('console',message=>{if(message.type()==='error')evidence.errors.push({phase,kind:'console',message:message.text()});});
  page.on('response',response=>{if(response.status()>=400)evidence.errors.push({phase,kind:'http',status:response.status(),url:response.url()});});
  page.on('requestfailed',request=>evidence.errors.push({phase,kind:'requestfailed',url:request.url(),message:request.failure()?.errorText}));
  page.on('dialog',dialog=>void dialog.dismiss());
  const response=await page.goto(origin+route,{waitUntil:'networkidle'});assert.equal(response.status(),200);
  return {context,page};
}
async function check(name,route,fn){
  phase=name;const entry={name,ok:false};evidence.checks.push(entry);let context,page;
  try{({context,page}=await open(route));entry.detail=await fn(page);entry.ok=true;console.log(`PASS ${name}`);}
  catch(error){entry.error=error.stack;console.error(`FAIL ${name}: ${error.message}`);if(page)await page.screenshot({path:path.join(artifacts,`failure-${evidence.checks.length}.png`)}).catch(()=>{});}
  finally{await context?.close();}
}
async function exported(page){
  // Keep repeated user downloads apart: Chromium throttles rapid download bursts.
  const delay=1100-(Date.now()-(lastExport.get(page)??0));
  if(delay>0)await new Promise(resolve=>setTimeout(resolve,delay));
  lastExport.set(page,Date.now());
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#export').click()]);
  const file=path.join(artifacts,`export-${++downloadCount}.json`);await download.saveAs(file);
  return JSON.parse(await readFile(file,'utf8'));
}
async function importMap(page,data,name='audit.map.json'){
  await page.setInputFiles('#project-file',{name,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
}
async function waitName(page,name){await page.waitForFunction(name=>document.querySelector('#project-name').value===name,name);}
async function saveMap(page){await page.locator('#save').click();await page.waitForFunction(()=>!document.querySelector('#save').disabled&&/In diesem Browser gespeichert/.test(document.querySelector('#status').textContent));}

try{
  server=createDevServer();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  origin=`http://127.0.0.1:${server.address().port}`;
  browser=await playwright().chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args});
  evidence.runtime={node:process.version,platform:process.platform,browser:browser.version(),args};

  await check('Map metadata and payload undo/redo preserve local save revisions','/map-studio/',async page=>{
    const initial=await exported(page),old={...initial,workspaceId:'workspace-old',geoReference:{crs:'LOCAL',origin:'old'}};
    await importMap(page,old);await page.waitForFunction(()=>/Ungespeicherte/.test(document.querySelector('#status').textContent));
    await saveMap(page);const saved=await exported(page);assert.equal(saved.revision,1);
    const changed={...saved,workspaceId:'workspace-new',geoReference:{crs:'LOCAL',origin:'new'}};
    await importMap(page,changed);await page.waitForFunction(()=>/Ungespeicherte/.test(document.querySelector('#status').textContent));
    assert.equal(await page.locator('#undo').isEnabled(),true);assert.equal((await exported(page)).workspaceId,'workspace-new');
    await page.locator('#undo').click();let value=await exported(page);assert.equal(value.workspaceId,'workspace-old');assert.deepEqual(value.geoReference,old.geoReference);
    await page.locator('#redo').click();assert.equal((await exported(page)).workspaceId,'workspace-new');
    await saveMap(page);const revision=(await exported(page)).revision;assert.equal(revision,2);
    await page.locator('#undo').click();value=await exported(page);assert.equal(value.revision,revision);assert.equal(value.workspaceId,'workspace-old');
    await saveMap(page);assert.equal((await exported(page)).revision,3,'Undo must keep the latest CAS token');
    const before=await exported(page),combined={...before,workspaceId:'workspace-combined',geoReference:{crs:'LOCAL',origin:'combined'},payload:{...before.payload,name:'Combined edit'}};
    await importMap(page,combined);await waitName(page,'Combined edit');await page.locator('#undo').click();
    value=await exported(page);assert.deepEqual(value,before,'Undo restores both payload and project metadata');
    await page.locator('#redo').click();value=await exported(page);assert.equal(value.payload.name,'Combined edit');assert.equal(value.workspaceId,'workspace-combined');
    await page.screenshot({path:path.join(artifacts,'map-metadata.png')});return {metadataUndo:true,payloadUndo:true,saveRevision:3};
  });

  await check('Deferred points import cannot overwrite or vanish inside a drag','/map-studio/',async page=>{
    await page.waitForFunction(()=>[...document.querySelectorAll('.map-label')].some(l=>l.textContent==='Datenzentrum'&&l.style.left));
    const count=Number(await page.locator('#count').textContent());
    await page.evaluate(()=>{const original=File.prototype.text;File.prototype.text=function(){if(this.name!=='deferred-points.json')return original.call(this);globalThis.__fileWaiting=true;return new Promise(resolve=>{globalThis.__releaseFile=async()=>resolve(await original.call(this));});};});
    const points=[{name:'Asynchronous audit point',x:0,z:0,height:2,color:'#ffffff',data:{audit:true}}];
    await page.setInputFiles('#points-file',{name:'deferred-points.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(points))});
    await page.waitForFunction(()=>globalThis.__fileWaiting===true);
    const canvas=await page.locator('#canvas').boundingBox(),label=await page.locator('.map-label',{hasText:'Datenzentrum'}).evaluate(el=>({x:parseFloat(el.style.left),y:parseFloat(el.style.top)}));
    const x=canvas.x+canvas.width*label.x/100,y=canvas.y+canvas.height*label.y/100;
    await page.mouse.move(x,y);await page.mouse.down();
    try{
      await page.mouse.move(x+40,y,{steps:5});await page.evaluate(()=>globalThis.__releaseFile());
      await page.waitForFunction(()=>/gezogenen Punkt ablegen/.test(document.querySelector('#notice').textContent));
      await page.mouse.move(x+65,y+10,{steps:4});
    }finally{await page.mouse.up();}
    assert.equal(Number(await page.locator('#count').textContent()),count);
    assert.equal((await exported(page)).payload.points.some(p=>p.name==='Asynchronous audit point'),false);
    await page.setInputFiles('#points-file',{name:'retry-points.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(points))});
    await page.waitForFunction(n=>Number(document.querySelector('#count').textContent)===n,count+1);
    assert.equal((await exported(page)).payload.points.some(p=>p.name==='Asynchronous audit point'),true);
    return {rejectedDuringDrag:true,retryAfterDrop:true};
  });

  await check('Actual Map export opens in World Studio, survives reload and can be walked','/map-studio/',async page=>{
    const starter=JSON.parse(await readFile(path.join(root,'examples/map-starter.map.json'),'utf8'));
    await importMap(page,starter);await waitName(page,starter.payload.name);
    const map=await exported(page);assert.equal(map.schema,'ourark.map-project.v1');await saveMap(page);
    await page.goto(origin+'/world-studio/',{waitUntil:'networkidle'});
    await page.setInputFiles('#import-file',{name:'from-map-editor.map.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(map))});
    await page.waitForFunction(name=>document.querySelector('#world-title').textContent===name,map.payload.name);
    await page.waitForFunction(()=>/uploaded:/.test(document.querySelector('#notice').textContent));
    assert.doesNotMatch(await page.locator('#notice').textContent(),/could not be stored/);
    assert.equal(await page.locator('#add-object').isVisible(),false);assert.equal(await page.locator('#add-object').isDisabled(),true);
    assert.match(await page.locator('#world-units').textContent(),/1 unit = 1 m/);
    await page.reload({waitUntil:'networkidle'});await page.waitForFunction(name=>document.querySelector('#world-title').textContent===name,map.payload.name);
    await page.locator('#walk-enter').click();await page.waitForFunction(()=>document.body.dataset.runtime==='playing');
    await page.waitForFunction(()=>/X /.test(document.querySelector('#runtime-position').textContent));
    const position=await page.locator('#runtime-position').textContent();await page.locator('#canvas').focus();await page.keyboard.down('ArrowUp');
    try{await page.waitForFunction(old=>document.querySelector('#runtime-position').textContent!==old,position);}finally{await page.keyboard.up('ArrowUp');}
    await page.locator('#runtime-exit').click();await page.waitForFunction(()=>(document.body.dataset.runtime??'editing')==='editing');
    await page.setInputFiles('#import-file',{name:'invalid-project.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...map,geoReference:'invalid'}))});
    await page.waitForFunction(()=>/Geo-Bezug/.test(document.querySelector('#notice').textContent));
    assert.equal(await page.locator('#world-title').textContent(),map.payload.name);
    await page.screenshot({path:path.join(artifacts,'world-map-import.png')});return {schema:map.schema,reload:true,walking:true,rejectedInvalidMetadata:true};
  });

  await check('World text rename repaints, saves and round-trips through the UI','/world-studio/#alpine',async page=>{
    const scene=await exported(page);scene.objects=[{id:'audit-text',kind:'text',name:'Before rename',sourceIndex:0,position:[0,1,0],rotation:[0,0,0],scale:[1,1,1],color:'#ffffff',visible:true,locked:false,animation:'none',page:{enabled:true,title:'',body:''}}];scene.selected='audit-text';
    await page.setInputFiles('#import-file',{name:'text-scene.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(scene))});
    await page.waitForFunction(()=>document.querySelector('#object-name').value==='Before rename');
    await page.locator('#object-name').fill('After rename');await page.locator('#object-name').press('Tab');
    await page.waitForFunction(()=>globalThis.__paintedText.includes('After rename'));
    await page.locator('#position-x').fill('2.5');await page.locator('#position-x').press('Tab');
    const edited=await exported(page);assert.equal(edited.objects[0].name,'After rename');assert.equal(edited.objects[0].position[0],2.5);
    assert.match(await page.locator('#world-units').textContent(),/5 m/);assert.equal(await page.locator('#position-unit').textContent(),'units');
    await page.locator('#save').click();await page.reload({waitUntil:'networkidle'});
    await page.waitForFunction(()=>document.querySelector('#object-name').value==='After rename');assert.deepEqual(await exported(page),edited);
    const fresh=await open('/world-studio/#alpine');
    try{await fresh.page.setInputFiles('#import-file',{name:'roundtrip.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(edited))});await fresh.page.waitForFunction(()=>document.querySelector('#object-name').value==='After rename');assert.deepEqual(await exported(fresh.page),edited);}finally{await fresh.context.close();}
    await page.screenshot({path:path.join(artifacts,'world-text-rename.png')});return {canvasRepaint:true,localReload:true,freshImport:true};
  });

  await check('Browser modules load and slashless integration links resolve correctly','/map-studio/',async page=>{
    const modules=await page.evaluate(async()=>{const core=await import('/worldport/core.mjs'),osm=await import('/worldport/osm.mjs');return {core:Object.keys(core),osm:Object.keys(osm)};});
    assert.ok(modules.core.length&&modules.osm.length);
    for(const kind of ['kart','globe']){
      await page.goto(origin+'/'+kind,{waitUntil:'networkidle'});assert.equal(page.url(),origin+'/'+kind+'/');
      const href=await page.locator('a[href^="integration.html"]').evaluate(el=>el.href);assert.equal(new URL(href).pathname,`/${kind}/integration.html`);
      const response=await page.request.get(href);assert.equal(response.status(),200);
    }
    return {modules,gates:['kart','globe']};
  });

  await check('Layer edits, keyboard movement and CSS 3D are reflected in exported JSON','/studio/',async page=>{
    await page.locator('#layer-name').fill('Audit layer');await page.locator('#layer-name').press('Tab');
    await page.locator('#prop-x').fill('80');await page.locator('#prop-x').press('Tab');
    const layer=page.locator('[data-layer="motion"]');await layer.focus();await page.keyboard.press('ArrowRight');
    await page.locator('#view-3d').click();const scene=await exported(page),edited=scene.layers.find(l=>l.id==='motion');
    assert.equal(edited.name,'Audit layer');assert.equal(edited.x,84);assert.equal(scene.view.mode,'3d');assert.equal(scene.makepadConnected,false);
    await page.screenshot({path:path.join(artifacts,'layer-edits.png')});return {x:edited.x,view:scene.view.mode,export:true,persistence:'Not implemented; documented limitation.'};
  });

  await check('Kart insights requires opt-in while local measurements remain available','/kart/',async page=>{
    const cases=[null,'0','1','invalid','unavailable'];
    for(const preference of cases){
      await page.reload({waitUntil:'networkidle'});
      const initial=await page.evaluate(async preference=>{
        localStorage.clear();
        if(preference==='unavailable')Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new Error('Storage unavailable');}});
        else if(preference!==null)localStorage.setItem('ourark.kart.telemetry',preference);
        const outgoing=[];const originalFetch=window.fetch.bind(window);
        window.fetch=(url,options)=>{if(url==='/api/kart-telemetry'){outgoing.push({kind:'fetch',body:JSON.parse(options.body)});return Promise.resolve(new Response('{}',{status:201}));}return originalFetch(url,options);};
        Object.defineProperty(navigator,'sendBeacon',{configurable:true,value:(url,body)=>{outgoing.push({kind:'beacon',url});return true;}});
        const {KartInsights}=await import('/kart/insights.js');
        const insights=new KartInsights({meta:{name:'Synthetic case',origin:{east:500000,north:5538630.7},terrain:{width:100,depth:100,offset:0}},mapName:'synthetic',image:null,
          renderer:{info:{render:{calls:1,triangles:2},memory:{geometries:0,textures:0}},domElement:{width:440,height:440},getPixelRatio:()=>1,getContext:()=>null},
          state:()=>({mode:'kart',x:0,y:0,z:0,speed:0,heading:0})});
        const sample=()=>{insights.intervals.push(16,17,16);insights.lastCalls=1;insights.lastTris=2;insights.sample(performance.now());};
        window.__telemetryCase={insights,outgoing,sample};
        insights.setOpen(true);sample();insights.flush(false);sample();insights.flush(true);
        return {enabled:insights.enabled,samples:insights.samples.length,calls:outgoing.map(x=>x.kind),queue:insights.queue.length};
      },preference);
      assert.equal(initial.enabled,preference==='1');assert.equal(initial.samples,2);assert.equal(initial.queue,0);
      assert.deepEqual(initial.calls,preference==='1'?['fetch','beacon']:[]);
      assert.match(await page.locator('.ki-perf').textContent(),/fps/);
      const checkbox=page.locator('.ki-send input');
      await checkbox.check();
      const enabled=await page.evaluate(()=>{const c=window.__telemetryCase;c.outgoing.length=0;c.sample();c.insights.flush(false);return c.outgoing;});
      assert.equal(enabled.length,1);assert.equal(enabled[0].body.samples.length,1);
      await page.evaluate(()=>window.__telemetryCase.sample());
      await checkbox.uncheck();
      const disabled=await page.evaluate(()=>{const c=window.__telemetryCase;c.outgoing.length=0;c.sample();c.insights.flush(false);c.insights.flush(true);return {calls:c.outgoing.length,queue:c.insights.queue.length,samples:c.insights.samples.length,stored:(()=>{try{return localStorage.getItem('ourark.kart.telemetry');}catch{return null;}})()};});
      assert.equal(disabled.calls,0);assert.equal(disabled.queue,0);assert.equal(disabled.samples,5);
      assert.equal(disabled.stored,preference==='unavailable'?null:'0');
    }
    return {preferences:cases,localPanel:true,fetchAndBeacon:true,scope:'Real insights module and panel with synthetic renderer/state and intercepted outbound sinks; not a full kart or deployed transport test.'};
  });

  evidence.ok=evidence.checks.every(c=>c.ok)&&evidence.errors.length===0;
}catch(error){evidence.setupError=error.stack;console.error(error);}
finally{
  try{await browser?.close();}catch(error){evidence.errors.push({kind:'browser cleanup',message:error.message});evidence.ok=false;}
  try{if(server)await new Promise(resolve=>server.close(resolve));}catch(error){evidence.errors.push({kind:'server cleanup',message:error.message});evidence.ok=false;}
  evidence.finishedAt=new Date().toISOString();await writeFile(path.join(artifacts,'results.json'),JSON.stringify(evidence,null,2)+'\n');
}
console.log(`${evidence.checks.filter(c=>c.ok).length}/${evidence.checks.length} audit regression groups passed; ${evidence.errors.length} browser errors.`);
process.exitCode=evidence.ok?0:1;
