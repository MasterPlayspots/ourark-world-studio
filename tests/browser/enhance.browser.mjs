// Kartenbild verbessern in a real browser, through the dev proxy against a stand-in renderboost origin:
// result replaces the image (Undo restores it), origin refusals and a missing service leave the image untouched.
import {createServer} from 'node:http';
import path from 'node:path';
import {loadPlaywright,startServer,launch,recorder,assert,artifactDir} from './harness.mjs';

const playwright=loadPlaywright();
if(!playwright){console.log('SKIP: playwright-core not found (set PLAYWRIGHT_CORE).');process.exit(0);}
// Stand-in origin: answers with whatever the test puts into `reply`, records what it received.
const seen=[];let reply={status:200,body:{}};
const origin=createServer((req,res)=>{let body='';req.on('data',c=>body+=c);req.on('end',()=>{seen.push({auth:req.headers.authorization,body:JSON.parse(body)});res.writeHead(reply.status,{'content-type':'application/json'});res.end(JSON.stringify(reply.body));});});
await new Promise(r=>origin.listen(0,'127.0.0.1',r));
const configured=await startServer({enhance:{url:`http://127.0.0.1:${origin.address().port}`,token:'z'.repeat(40)}}),plain=await startServer();
const browser=await launch(playwright),{results,step}=recorder();
const page=await (await browser.newContext({viewport:{width:1440,height:900}})).newPage(),errors=[];
page.on('console',m=>{if(m.type()==='error'&&!/status of (400|503)/.test(m.text()))errors.push(m.text());});page.on('pageerror',e=>errors.push(e.message));
const pngBase64=(w,h,fill)=>page.evaluate(async([w,h,fill])=>{const c=new OffscreenCanvas(w,h),g=c.getContext('2d');g.fillStyle=fill;g.fillRect(0,0,w,h);g.fillStyle='#fff';g.fillRect(w/4,h/4,w/2,4);const b=await c.convertToBlob({type:'image/png'});return btoa(String.fromCharCode(...new Uint8Array(await b.arrayBuffer())));},[w,h,fill]);
const name=()=>page.textContent('#map-name');
async function importImage(){
  const base64=await pngBase64(800,400,'#1d3b2f');
  await page.setInputFiles('#image-file',{name:'campus.png',mimeType:'image/png',buffer:Buffer.from(base64,'base64')});
  await page.waitForFunction(()=>document.getElementById('map-name').textContent==='campus.png');
}
const noticeMatching=re=>page.waitForFunction(re=>new RegExp(re).test(document.getElementById('notice').textContent),re.source,{timeout:8000});

try{
  await page.goto(configured.origin+'/map-studio/',{waitUntil:'networkidle'});
  await step('E01','Knopf erscheint erst mit Kartenbild; Verbessern ersetzt das Bild (4K-Ziel, WebP angefragt, Token nur serverseitig)',async()=>{
    assert(await page.isHidden('#image-enhance'),'ohne Bild verborgen');
    await importImage();assert(await page.isVisible('#image-enhance'),'mit Bild sichtbar');
    reply={status:200,body:{contentType:'image/png',outputBase64:await pngBase64(1600,800,'#2a5a45'),out:{width:1600,height:800},compute:{cpuTotalMs:1234}}};
    await page.click('#image-enhance');await noticeMatching(/Kartenbild verbessert: 800 × 400 → 1600 × 800 px · 1,2 CPU-s/);
    assert(await name()==='campus-4k.png',`Name ${await name()}`);
    const sent=seen.at(-1);
    assert(sent.auth==='Bearer '+'z'.repeat(40),'Token vom Server gesetzt');
    assert(sent.body.targetWidth===3840&&sent.body.targetHeight===1920&&sent.body.format==='webp',JSON.stringify({...sent.body,inputBase64:'…'}));
    const pageSawToken=await page.evaluate(()=>document.documentElement.outerHTML.includes('zzzzzzzz'));assert(!pageSawToken,'Token nie im Browser');
    await page.screenshot({path:path.join(artifactDir,'e01-enhanced.png')});
    return 'campus.png → campus-4k.png, Ziel 3840 × 1920, Meldung mit CPU-Sekunden';
  });
  await step('E02','Undo stellt das Originalbild wieder her, Redo das verbesserte',async()=>{
    await page.click('#undo');assert(await name()==='campus.png',await name());
    await page.click('#redo');assert(await name()==='campus-4k.png',await name());return 'Undo/Redo wirken';
  });
  await step('E03','Ablehnung der Origin: Meldung, Bild unverändert',async()=>{
    reply={status:400,body:{error:'Eingabebild zu groß.'}};
    await page.click('#image-enhance');await noticeMatching(/Bildverbesserung nicht möglich: Eingabebild zu groß\./);
    assert(await name()==='campus-4k.png',await name());assert(!(await page.isDisabled('#image-enhance')),'Knopf wieder bedienbar');
    return 'Meldung angezeigt, Bild und Undo-Stand unverändert';
  });
  await step('E04','Ohne konfigurierten Dienst: „nicht verfügbar“, nichts geändert',async()=>{
    await page.goto(plain.origin+'/map-studio/',{waitUntil:'networkidle'});await importImage();
    await page.click('#image-enhance');await noticeMatching(/nicht verfügbar/);assert(await name()==='campus.png');
    return 'Meldung „nicht verfügbar“';
  });
  await step('E05','Keine unerwarteten Konsolenfehler (CSP erlaubt den Aufruf)',async()=>{assert(!errors.length,errors.join(' | '));return 'keine';});
}finally{await browser.close();await configured.close();await plain.close();await new Promise(r=>origin.close(r));}
const failed=results.filter(r=>!r.ok).length;console.log(`${results.length-failed}/${results.length} enhance browser checks passed.`);process.exitCode=failed?1:0;
