// Optional real-browser harness. The repository has no npm dependencies, so
// playwright-core is resolved from PLAYWRIGHT_CORE (path to a playwright-core
// package directory) or from a normal node_modules lookup.
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createDevServer} from '../../scripts/serve.mjs';

const require=createRequire(import.meta.url);
export const artifactDir=fileURLToPath(new URL('../../.browser-artifacts/',import.meta.url));

export function loadPlaywright(){
  const candidates=[process.env.PLAYWRIGHT_CORE,'playwright-core','playwright'].filter(Boolean);
  for(const name of candidates){try{return require(name);}catch{}}
  return null;
}

export async function startServer(options){
  const server=createDevServer(undefined,options);
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  return {server,origin:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(r=>server.close(r))};
}

// Real GPU WebGL (ANGLE) instead of a software fallback, so rendered pixels are meaningful.
// extraArgs: additional Chromium switches for one suite (e.g. --enable-precise-memory-info for heap sampling).
export async function launch(playwright,extraArgs=[]){
  await mkdir(artifactDir,{recursive:true});
  const browser=await playwright.chromium.launch({headless:process.env.HEADED!=='1',executablePath:process.env.CHROMIUM_PATH||undefined,args:['--use-angle=metal','--ignore-gpu-blocklist','--enable-gpu',...extraArgs]});
  // The live performance meter stays off in the suites (no overlay in pixel checks, no extra animation loop).
  const newContext=browser.newContext.bind(browser);
  browser.newContext=async(...args)=>{const context=await newContext(...args);await context.addInitScript(()=>{try{localStorage.setItem('ourark.perf','0');}catch{}});return context;};
  return browser;
}

export async function environment(page){
  return page.evaluate(()=>{
    const gl=document.createElement('canvas').getContext('webgl2'),info=gl?.getExtension('WEBGL_debug_renderer_info');
    return {userAgent:navigator.userAgent,platform:navigator.platform,webgl2:Boolean(gl),gpu:info?gl.getParameter(info.UNMASKED_RENDERER_WEBGL):null,devicePixelRatio,viewport:`${innerWidth}x${innerHeight}`};
  });
}

// Share of canvas pixels that differ from the scene background: a coarse "something was drawn" signal.
export async function drawnRatio(page,selector='#canvas',background=[11,18,36]){
  const png=(await page.locator(selector).screenshot()).toString('base64');
  return page.evaluate(async({png,background})=>{
    const image=new Image();image.src=`data:image/png;base64,${png}`;await image.decode();
    const canvas=new OffscreenCanvas(image.width,image.height),ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
    const data=ctx.getImageData(0,0,image.width,image.height).data;let differing=0;
    for(let i=0;i<data.length;i+=16)if(Math.abs(data[i]-background[0])+Math.abs(data[i+1]-background[1])+Math.abs(data[i+2]-background[2])>24)differing++;
    return differing/(data.length/16);
  },{png,background});
}

export function recorder(){
  const results=[];
  return {
    results,
    async step(id,title,fn){
      try{const detail=await fn();results.push({id,title,ok:true,detail:detail??''});console.log(`PASS ${id} ${title}${detail?` — ${detail}`:''}`);}
      catch(error){results.push({id,title,ok:false,detail:error.message});console.log(`FAIL ${id} ${title} — ${error.message}`);}
    }
  };
}

export const assert=(condition,message)=>{if(!condition)throw new Error(message);};
