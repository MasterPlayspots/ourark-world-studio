// Welle-2 gate in a real browser: walk flags in the inspector, checked start positions (auto, stored, blocked)
// through the real import and "Welt betreten" path, and the ?colliders development outline.
import path from 'node:path';
import {loadPlaywright,startServer,launch,recorder,assert,artifactDir} from './harness.mjs';

const playwright=loadPlaywright();
if(!playwright){console.log('SKIP: playwright-core not found (set PLAYWRIGHT_CORE).');process.exit(0);}
const {origin,close}=await startServer(),browser=await launch(playwright),{results,step}=recorder();
const context=await browser.newContext({viewport:{width:1440,height:900}});
const page=await context.newPage(),errors=[];
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('pageerror',e=>errors.push(e.message));
const shot=name=>page.screenshot({path:path.join(artifactDir,name)});
const runtimeState=()=>page.evaluate(()=>document.body.dataset.runtime??'editing');
const waitState=s=>page.waitForFunction(s=>(document.body.dataset.runtime??'editing')===s,s,{timeout:5000});
const noticeText=()=>page.textContent('#notice');

const point=(id,name,over={})=>({id,name,type:'building',x:0,z:0,width:10,depth:6,height:6,rotation:0,color:'#5eead4',visible:true,locked:false,data:{},...over});
const project=(name,points,spawn=null)=>({schema:'motionspec.map.v2',name,map:{width:60,depth:60,color:'#101f34',image:null},runtime:{spawn},points});
async function importProject(doc){
  await page.setInputFiles('#project-file',{name:`${doc.name}.map.json`,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(doc))});
  await page.waitForFunction(name=>document.getElementById('title').textContent===name,doc.name);
}
async function enterAndReport(){
  await page.click('#walk-enter');
  await page.waitForFunction(()=>document.body.dataset.runtime==='playing'||/konnte nicht betreten/.test(document.getElementById('notice').textContent),null,{timeout:5000});
  return runtimeState();
}
// Share of canvas pixels in the collider outline colour (#ff5d8f), measured in the page from a screenshot.
async function outlineRatio(){
  const png=(await page.locator('#canvas').screenshot()).toString('base64');
  return page.evaluate(async png=>{
    const bitmap=await createImageBitmap(await (await fetch(`data:image/png;base64,${png}`)).blob()),c=new OffscreenCanvas(bitmap.width,bitmap.height),g=c.getContext('2d');g.drawImage(bitmap,0,0);
    const d=g.getImageData(0,0,c.width,c.height).data;let hits=0;
    for(let i=0;i<d.length;i+=4)if(d[i]>200&&d[i+1]<140&&d[i+2]>100&&d[i+2]<190)hits++;
    return hits/(d.length/4);
  },png);
}

try{
  await page.goto(origin+'/map-studio/',{waitUntil:'networkidle'});await page.waitForTimeout(400);

  await step('C01','Inspector: „Blockiert Bewegung“/„Interaktiv“ je Kategorie, umschaltbar, per Undo zurück',async()=>{
    const flags=()=>page.evaluate(()=>({solid:document.getElementById('point-solid').checked,interactive:document.getElementById('point-interactive').checked}));
    await page.click('.point-row:nth-child(1)');const building=await flags();
    await page.click('.point-row:nth-child(5)');const marker=await flags();
    assert(building.solid&&building.interactive,'Gebäude blockiert und ist interaktiv');assert(!marker.solid&&marker.interactive,'Datenpunkt blockiert nicht');
    await page.check('#point-solid');assert((await flags()).solid,'eingeschaltet');
    await page.click('#undo');assert(!(await flags()).solid,'Undo');
    return 'Gebäude blockiert, Datenpunkt nicht; Schalter und Undo wirken';
  });

  await step('C02','Standardstart blockiert: Suche findet den nächsten freien Platz, Betreten gelingt',async()=>{
    await importProject(project('Südwand',[point('wall','Südwand',{width:60,depth:8,z:26}),point('hall','Halle',{width:20,depth:10})]));
    const state=await enterAndReport();assert(state==='playing',`Zustand ${state}: ${await noticeText()}`);
    await shot('w2-auto-spawn.png');await page.click('#runtime-exit');await waitState('editing');
    return 'Start außerhalb der Wand gefunden, Begehmodus aktiv';
  });

  await step('C03','Gespeicherter Start in einem Gebäude: verständlich abgelehnt, Editor bleibt nutzbar',async()=>{
    await importProject(project('Start in Halle',[point('hall','Halle',{width:20,depth:10})],{x:0,z:0,heading:0}));
    const state=await enterAndReport(),text=await noticeText();
    assert(state==='editing',`Zustand ${state}`);assert(/Startpunkt liegt in „Halle“/.test(text),text);
    assert(!(await page.isDisabled('#export')),'Export nutzbar');
    return text.slice(0,90)+' …';
  });

  await step('C04','Vollständig blockierte Karte: Betreten abgelehnt',async()=>{
    await importProject(project('Voll',[point('all','Alles',{width:60,depth:60})]));
    const state=await enterAndReport(),text=await noticeText();
    assert(state==='editing',`Zustand ${state}`);assert(/keinen freien Platz/.test(text),text);
    return 'Meldung: keinen freien Platz';
  });

  await step('C05','Gültiger gespeicherter Start wird benutzt',async()=>{
    await importProject(project('Frei',[point('hall','Halle',{width:20,depth:10})],{x:20,z:20,heading:90}));
    const state=await enterAndReport();assert(state==='playing',`Zustand ${state}: ${await noticeText()}`);
    await page.click('#runtime-exit');await waitState('editing');return 'Begehmodus mit gespeichertem Start';
  });

  await step('C05b','Ein verspätetes „Vollbild beendet“ ohne Vollbild pausiert den neuen Begehmodus nicht',async()=>{
    // Race seen under load: a failed start's fullscreen grant is undone and its exit event arrives during the next walk.
    await page.click('#walk-enter');await waitState('playing');
    await page.evaluate(()=>document.dispatchEvent(new Event('fullscreenchange')));await page.waitForTimeout(150);
    const state=await runtimeState();await page.click('#runtime-exit');await waitState('editing');
    assert(state==='playing',`Zustand ${state}`);return 'läuft weiter';
  });

  await step('C06','?colliders zeigt die Kollisionsumrisse nur im Begehmodus',async()=>{
    await page.click('#walk-enter');await waitState('playing');await page.waitForTimeout(300);const without=await outlineRatio();
    await page.click('#runtime-exit');await waitState('editing');
    await page.goto(origin+'/map-studio/?colliders',{waitUntil:'networkidle'});await page.waitForTimeout(400);
    const editor=await outlineRatio();
    await page.click('#walk-enter');await waitState('playing');await page.waitForTimeout(300);const walking=await outlineRatio();await shot('w2-colliders.png');
    await page.click('#runtime-exit');await waitState('editing');await page.waitForTimeout(200);const after=await outlineRatio();
    assert(without<.0005,`ohne Parameter ${without}`);assert(walking>.001,`mit Parameter ${walking}`);assert(editor<.0005&&after<.0005,`im Editor ${editor}/${after}`);
    return `Umrissanteil: ohne ${(without*100).toFixed(2)} %, mit ${(walking*100).toFixed(2)} %, danach ${(after*100).toFixed(2)} %`;
  });

  await step('C07','Keine Konsolenfehler',async()=>{assert(!errors.length,errors.join(' | '));return 'keine';});
}finally{
  await browser.close();await close();
}
const failed=results.filter(r=>!r.ok).length;console.log(`${results.length-failed}/${results.length} collision browser checks passed.`);process.exitCode=failed?1:0;
