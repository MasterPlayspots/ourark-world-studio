// Functional checks for the exported public tree. Missing browser dependencies are failures, never skips.
// Linux deliberately uses headless software WebGL; these results are not physical-device GPU/FPS evidence.
// Run from the public checkout: PLAYWRIGHT_CORE=/absolute/path/to/playwright-core node tests/browser/public-smoke.browser.mjs
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createDevServer} from '../../scripts/serve.mjs';
import {readProject,serializeProject} from '../../dist/map-studio/project.js';

const require=createRequire(import.meta.url);
const root=fileURLToPath(new URL('../../',import.meta.url));
const artifacts=path.join(root,'.browser-artifacts/public-smoke');
const timeout=20_000;
const args=process.platform==='linux'
  ?['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
  :['--ignore-gpu-blocklist'];
const evidence={
  suite:'public-smoke',startedAt:new Date().toISOString(),ok:false,
  scope:'Functional browser smoke of the exported public source. No physical-device, FPS, production, usability or real-use benefit claim.',
  runtime:{node:process.version,os:process.platform,arch:process.arch,headless:true,
    requestedGraphics:process.platform==='linux'?'ANGLE SwiftShader software WebGL':'Chromium platform default; inspect reported renderer',args},
  checks:[],consoleErrors:[],pageErrors:[],externalRequests:[],failedRequests:[],httpErrors:[],screenshots:[],cleanupErrors:[]
};
let browser,server,page,origin,phase='setup';
const contexts=[];

function loadPlaywright(){
  const supplied=process.env.PLAYWRIGHT_CORE;
  if(supplied&&!path.isAbsolute(supplied))throw new Error('PLAYWRIGHT_CORE must be an absolute package-directory path.');
  const attempts=[];
  for(const candidate of [supplied,'playwright-core','playwright'].filter(Boolean)){
    try{
      const loaded=require(candidate);
      if(!loaded.chromium?.launch)throw new Error('Package has no Chromium launcher');
      evidence.runtime.playwrightSource=candidate;
      try{evidence.runtime.playwrightVersion=require(path.join(path.dirname(require.resolve(candidate)),'package.json')).version;}catch{}
      return loaded;
    }catch(error){attempts.push(`${candidate}: ${error.message}`);}
  }
  throw new Error(`Playwright is required; install playwright with Chromium separately or set PLAYWRIGHT_CORE and optionally CHROMIUM_PATH. No checks were skipped. ${attempts.join(' | ')}`);
}

async function check(name,work){
  phase=name;
  const result={name,ok:false};evidence.checks.push(result);
  try{result.detail=await work();result.ok=true;console.log(`PASS ${name}`);}
  catch(error){result.error=error.message;throw error;}
}

async function context(){
  const ctx=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,acceptDownloads:true,serviceWorkers:'block'});
  contexts.push(ctx);
  // Init scripts also run on about:blank, whose opaque origin cannot access storage.
  // Disable the optional overlay only on the actual dev-server document. Errors on that
  // origin remain real failures; do not catch or filter application storage errors.
  await ctx.addInitScript(expectedOrigin=>{
    if((location.protocol==='http:'||location.protocol==='https:')&&location.origin===expectedOrigin){
      localStorage.setItem('ourark.perf','0');
    }
  },origin);
  await ctx.route('**/*',async route=>{
    const requested=new URL(route.request().url());
    if((requested.protocol==='http:'||requested.protocol==='https:')&&requested.origin!==origin){
      evidence.externalRequests.push({phase,url:requested.href});
      await route.abort('blockedbyclient');return;
    }
    await route.continue();
  });
  ctx.on('page',p=>{
    p.setDefaultTimeout(timeout);p.setDefaultNavigationTimeout(timeout);
    p.on('console',message=>{if(message.type()==='error')evidence.consoleErrors.push({phase,message:message.text()});});
    p.on('pageerror',error=>evidence.pageErrors.push({phase,message:error.message}));
    p.on('requestfailed',request=>evidence.failedRequests.push({phase,url:request.url(),error:request.failure()?.errorText}));
    p.on('response',response=>{if(response.status()>=400)evidence.httpErrors.push({phase,url:response.url(),status:response.status()});});
    // Normal navigation must never silently discard unsaved test work.
    p.on('dialog',dialog=>{void dialog.dismiss();});
  });
  return ctx;
}

async function navigate(p,route){
  const response=await p.goto(origin+route,{waitUntil:'networkidle'});
  assert.equal(response?.status(),200,`Route ${route} must return HTTP 200`);
}

async function shot(name,p=page){
  const filename=`${name}.png`;
  await p.screenshot({path:path.join(artifacts,filename),fullPage:true});
  evidence.screenshots.push(filename);
}

async function renderedCanvas(p){
  await p.locator('#canvas').waitFor({state:'visible'});
  await p.waitForFunction(()=>{
    const canvas=document.querySelector('#canvas');
    return canvas?.width>100&&canvas.height>100&&document.querySelector('#fallback')?.hidden;
  });
  await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const png=await p.locator('#canvas').screenshot();
  const result=await p.evaluate(async encoded=>{
    const image=new Image();image.src=`data:image/png;base64,${encoded}`;await image.decode();
    const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
    const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    const colors=new Map();let samples=0;
    for(let i=0;i<pixels.length;i+=64){
      const color=`${pixels[i]>>4},${pixels[i+1]>>4},${pixels[i+2]>>4}`;
      colors.set(color,(colors.get(color)||0)+1);samples++;
    }
    return {width:canvas.width,height:canvas.height,colorBuckets:colors.size,
      nonDominantFraction:1-Math.max(...colors.values())/samples};
  },png.toString('base64'));
  assert.ok(result.colorBuckets>4&&result.nonDominantFraction>.002,`Canvas looks empty: ${JSON.stringify(result)}`);
  return {...result,screenshotSha256:createHash('sha256').update(png).digest('hex')};
}

async function importFile(p,filename){
  await p.getByRole('button',{name:'Importieren',exact:true}).click();
  const picker=p.waitForEvent('filechooser');
  await p.locator('#choose-project').click();
  await (await picker).setFiles(filename);
  await p.waitForFunction(()=>document.querySelector('#project-name').value==='First editable campus'&&document.querySelector('#point-name').value==='Workshop');
}

async function height(p,value){
  await p.waitForFunction(expected=>document.querySelector('#point-height').value===String(expected),value);
  assert.match(await p.locator('.point-row[aria-pressed="true"] small').textContent(),new RegExp(`\\b${value} m\\b`));
}

function cleanBrowserEvidence(){
  for(const key of ['consoleErrors','pageErrors','externalRequests','failedRequests','httpErrors']){
    assert.deepEqual(evidence[key],[],`Unexpected browser ${key}: ${JSON.stringify(evidence[key])}`);
  }
}

await mkdir(artifacts,{recursive:true});
try{
  try{evidence.commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{evidence.commit=null;}
  try{const manifest=JSON.parse(await readFile(path.join(root,'PUBLIC_SOURCE.json'),'utf8'));evidence.sourceCommit=manifest.sourceCommit;}catch{}
  const playwright=loadPlaywright();
  server=createDevServer();
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  origin=`http://127.0.0.1:${server.address().port}`;
  browser=await playwright.chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args});
  evidence.runtime.browserVersion=browser.version();
  const main=await context();page=await main.newPage();

  await check('Map Studio starts with WebGL and visible geometry',async()=>{
    await navigate(page,'/map-studio/?stats=1');
    await page.waitForFunction(()=>globalThis.__MOTIONSPEC_RENDER_STATS__?.triangles>0);
    evidence.runtime.graphics=await page.evaluate(()=>{
      const gl=document.querySelector('#canvas').getContext('webgl2');
      const debug=gl?.getExtension('WEBGL_debug_renderer_info');
      const renderer=gl?(debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)):null;
      return {webgl2:Boolean(gl),renderer,software:/swiftshader|llvmpipe|software/i.test(renderer||''),
        userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight],dpr:devicePixelRatio};
    });
    assert.equal(evidence.runtime.graphics.webgl2,true,'A functioning WebGL2 context is required');
    const canvas=await renderedCanvas(page);await shot('01-map-start');return canvas;
  });

  await check('UI file picker imports Workshop and edits height/data',async()=>{
    await importFile(page,path.join(root,'examples/map-starter.map.json'));
    assert.equal(Number(await page.locator('#count').textContent()),1);await height(page,6);
    await page.locator('#point-height').fill('12');await page.locator('#point-height').press('Tab');await height(page,12);
    await page.locator('#point-data').fill(JSON.stringify({assetId:'building-001',purpose:'Workshop',status:'Public smoke check'}));
    await page.locator('#data-apply').click();
    await page.locator('#undo').click();
    assert.equal(JSON.parse(await page.locator('#point-data').inputValue()).status,undefined,'Undo must remove the data edit');
    await page.locator('#undo').click();await height(page,6);
    await page.locator('#redo').click();await height(page,12);
    await page.locator('#redo').click();
    assert.equal(JSON.parse(await page.locator('#point-data').inputValue()).status,'Public smoke check');
    return {points:1,heightSequence:[6,12,6,12],dataUndoRedo:true};
  });

  await check('2D and 3D render the same edited map',async()=>{
    await page.locator('#view-2d').click();
    assert.equal(await page.locator('#view-2d').getAttribute('aria-pressed'),'true');
    const top=await renderedCanvas(page);await shot('02-map-2d');
    await page.locator('#view-3d').click();
    assert.equal(await page.locator('#view-3d').getAttribute('aria-pressed'),'true');
    assert.match(await page.locator('#projection').textContent(),/3D/);await height(page,12);
    const perspective=await renderedCanvas(page);await shot('03-map-3d');
    assert.notEqual(top.screenshotSha256,perspective.screenshotSha256,'View change must change the rendered canvas');
    return {top,perspective};
  });

  await check('Walking moves, pauses, resumes and returns to intact editor data',async()=>{
    await page.locator('#walk-enter').click();
    await page.waitForFunction(()=>document.querySelector('#runtime-state').textContent==='Aktiv · unterwegs');
    await page.waitForFunction(()=>Boolean(document.querySelector('#runtime-position').textContent.trim()));
    const before=await page.locator('#runtime-position').textContent();
    await page.locator('#canvas').focus();await page.keyboard.down('ArrowUp');
    try{await page.waitForFunction(old=>document.querySelector('#runtime-position').textContent!==old,before);}
    finally{await page.keyboard.up('ArrowUp');}
    const after=await page.locator('#runtime-position').textContent();
    await page.locator('#runtime-pause').click();
    await page.locator('#runtime-paused').waitFor({state:'visible'});
    assert.equal(await page.locator('#runtime-state').textContent(),'Pausiert');await shot('04-walk-paused');
    await page.locator('#runtime-resume').click();
    await page.waitForFunction(()=>document.querySelector('#runtime-state').textContent==='Aktiv · unterwegs');
    await page.locator('#runtime-exit').click();
    await page.locator('#runtime-hud').waitFor({state:'hidden'});
    await height(page,12);
    assert.equal(JSON.parse(await page.locator('#point-data').inputValue()).status,'Public smoke check');
    return {before,after,paused:true,resumed:true,editorRestored:true};
  });

  await check('Explicit local save survives page reload',async()=>{
    await page.locator('#save').click();
    await page.waitForFunction(()=>/In diesem Browser gespeichert · Revision 1$/.test(document.querySelector('#status').textContent));
    await page.reload({waitUntil:'networkidle'});
    await page.waitForFunction(()=>/Lokales Kartenprojekt geöffnet · Revision 1$/.test(document.querySelector('#status').textContent));
    await height(page,12);
    assert.equal(await page.locator('#point-name').inputValue(),'Workshop');
    assert.equal(JSON.parse(await page.locator('#point-data').inputValue()).status,'Public smoke check');
    return {localRevision:1,restoredHeight:12};
  });

  let exportedPath,exported;
  await check('Downloaded export validates and round-trips without losing identity or data',async()=>{
    const received=page.waitForEvent('download');await page.locator('#export').click();
    const download=await received;assert.equal(await download.failure(),null);
    exportedPath=path.join(artifacts,'edited-campus.map.json');await download.saveAs(exportedPath);
    exported=JSON.parse(await readFile(exportedPath,'utf8'));
    const parsed=readProject(exported);
    assert.equal(parsed.meta.worldId,'example-campus');assert.equal(parsed.meta.revision,1);
    assert.equal(parsed.doc.points.length,1);assert.equal(parsed.doc.points[0].height,12);
    assert.deepEqual(parsed.doc.points[0].data,{assetId:'building-001',purpose:'Workshop',status:'Public smoke check'});
    const again=readProject(JSON.parse(serializeProject(parsed.doc,parsed.meta)));
    assert.deepEqual(again.doc,parsed.doc);assert.deepEqual(again.meta,parsed.meta);
    cleanBrowserEvidence();
    return {filename:download.suggestedFilename(),worldId:parsed.meta.worldId,revision:parsed.meta.revision,height:12};
  });

  await check('Fresh browser profile imports the downloaded file through the UI',async()=>{
    const fresh=await context(),p=await fresh.newPage();
    await navigate(p,'/map-studio/');await importFile(p,exportedPath);await height(p,12);
    assert.equal(JSON.parse(await p.locator('#point-data').inputValue()).status,'Public smoke check');
    await shot('05-reimport-fresh-profile',p);
    await p.locator('#save').click();
    await p.waitForFunction(()=>/In diesem Browser gespeichert · Revision 2$/.test(document.querySelector('#status').textContent));
    await fresh.close();return {separateBrowserStorage:true,importedHeight:12};
  });

  await check('World Studio has procedural scene content and working WebGL',async()=>{
    await navigate(page,'/world-studio/');
    await page.locator('#object-list [data-select]').first().waitFor({state:'visible'});
    assert.ok(await page.locator('#world-title').textContent());
    const canvas=await renderedCanvas(page);await shot('06-world-studio');
    return {title:await page.locator('#world-title').textContent(),objects:await page.locator('#object-list [data-select]').count(),canvas};
  });

  await check('Layer editor displays editable DOM layers and switches CSS 3D',async()=>{
    await navigate(page,'/studio/');
    await page.waitForFunction(()=>document.querySelector('#scene-layers').children.length>0&&document.querySelector('#layer-list').children.length>0);
    await page.locator('#viewport').waitFor({state:'visible'});
    await page.locator('#view-3d').click();
    assert.equal(await page.locator('#view-3d').getAttribute('aria-pressed'),'true');
    assert.match(await page.locator('#dimension-status').textContent(),/3D/);
    await page.locator('#view-2d').click();await shot('07-layer-studio');
    return {layers:await page.locator('#scene-layers > *').count(),view:'DOM/CSS, not a mesh canvas'};
  });

  await check('Kart and globe entry routes are inert optional-integration gates',async()=>{
    const results=[];
    for(const route of ['/kart/','/globe/']){
      const scripts=[];
      const onRequest=request=>{if(request.resourceType()==='script')scripts.push(request.url());};
      page.on('request',onRequest);
      try{
        await navigate(page,route);
        assert.match(await page.locator('body').innerText(),/optional integration/i);
        assert.match(await page.locator('body').innerText(),/excluded/i);
        assert.equal(await page.locator('script').count(),0,`${route} must not initialize its integration`);
        assert.deepEqual(scripts,[],`${route} must not load scripts`);
        assert.equal(await page.locator('a[href="/map-studio/"]').count(),1);
        await shot(route.includes('kart')?'08-kart-gate':'09-globe-gate');
        results.push({route,title:await page.title(),scripts:0});
      }finally{page.off('request',onRequest);}
    }
    return results;
  });

  await check('No console errors, uncaught errors, failed HTTP or external requests',async()=>{
    cleanBrowserEvidence();return 'All exercised pages remained local and error-free.';
  });
  evidence.ok=true;
}catch(error){
  evidence.failure={phase,message:error.message,stack:error.stack};
  console.error(`FAIL ${phase}: ${error.message}`);process.exitCode=1;
  if(page&&!page.isClosed())try{await shot('failure');}catch{}
}finally{
  for(const ctx of contexts)try{await ctx.close();}catch(error){evidence.cleanupErrors.push(`context: ${error.message}`);}
  if(browser)try{await browser.close();}catch(error){evidence.cleanupErrors.push(`browser: ${error.message}`);}
  if(server)try{
    server.closeAllConnections?.();
    if(server.listening)await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
  }catch(error){evidence.cleanupErrors.push(`server: ${error.message}`);}
  if(evidence.cleanupErrors.length){evidence.ok=false;process.exitCode=1;}
  evidence.finishedAt=new Date().toISOString();
  await writeFile(path.join(artifacts,'results.json'),JSON.stringify(evidence,null,2)+'\n');
  console.log(`${evidence.checks.filter(check=>check.ok).length}/${evidence.checks.length} checks passed. Evidence: ${path.relative(root,artifacts)}/results.json`);
}
