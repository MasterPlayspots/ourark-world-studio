// Wave-0 baseline: observes the existing editors in a real Chromium with GPU WebGL.
// Run: PLAYWRIGHT_CORE=/path/to/playwright-core npm run test:browser
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {loadPlaywright,startServer,launch,environment,drawnRatio,recorder,assert,artifactDir} from './harness.mjs';

const playwright=loadPlaywright();
if(!playwright){console.log('SKIP: playwright-core not found (set PLAYWRIGHT_CORE).');process.exit(0);}
const {origin,close}=await startServer(),browser=await launch(playwright),{results,step}=recorder();
const context=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true});
const page=await context.newPage(),errors=[];
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('pageerror',e=>errors.push(e.message));
page.on('requestfailed',r=>errors.push(`request failed: ${r.url()}`));
const shot=name=>page.screenshot({path:path.join(artifactDir,name)});
const text=id=>page.locator(`#${id}`).textContent();
const notice=async()=>(await text('notice')).trim();
const pointCount=async()=>Number(await text('count'));

try{
  await step('B01','Editor-Routen laden ohne Konsolenfehler',async()=>{
    const seen=[];
    for(const route of ['/','/studio/','/world-studio/']){
      await page.goto(origin+route,{waitUntil:'networkidle'});seen.push(`${route} "${await page.title()}"`);
    }
    await page.waitForTimeout(800);await shot('b01-world-studio.png');
    const ratio=await drawnRatio(page,'canvas:not(.perf-graph)');
    assert(ratio>.05,`World Studio Canvas zeigt kaum Inhalt (${ratio.toFixed(3)})`);
    assert(!errors.length,errors.join(' | '));return `${seen.join(', ')}; World-Canvas ${(ratio*100).toFixed(0)} % gezeichnet`;
  });

  await page.goto(origin+'/map-studio/',{waitUntil:'networkidle'});await page.waitForTimeout(600);
  const env=await environment(page);

  await step('B02','Map Studio 2D rendert Boden und Punkte',async()=>{
    const ratio=await drawnRatio(page),labels=await page.locator('.map-label:not([hidden])').count();
    await shot('map-studio-2d-orthographic.png');
    assert(ratio>.1,`kaum gezeichnet (${ratio.toFixed(3)})`);assert(labels===5,`${labels} sichtbare Labels statt 5`);
    return `${(ratio*100).toFixed(0)} % gezeichnet, ${labels} Labels`;
  });

  await step('B03','Wechsel auf 3D-Perspektive',async()=>{
    await page.click('#view-3d');await page.waitForTimeout(400);
    const ratio=await drawnRatio(page),projection=await text('projection');await shot('map-studio-3d-perspective.png');
    assert(projection.includes('3D'),projection);assert(ratio>.1,`kaum gezeichnet (${ratio.toFixed(3)})`);
    await page.click('#view-2d');await page.waitForTimeout(300);
    return `${projection}, ${(ratio*100).toFixed(0)} % gezeichnet; zurück auf 2D`;
  });

  await step('B04','Punkthöhe bearbeiten, Undo, Redo',async()=>{
    await page.fill('#point-height','20');await page.press('#point-height','Tab');
    const detail=async()=>page.locator('.point-row[aria-pressed="true"] small').textContent();
    assert((await detail()).includes('20 m'),`nach Edit: ${await detail()}`);
    await page.click('#undo');assert((await detail()).includes('12 m'),`nach Undo: ${await detail()}`);
    await page.click('#redo');assert((await detail()).includes('20 m'),`nach Redo: ${await detail()}`);
    await page.click('#undo');return 'Zentrale 12 → 20 → 12 → 20 → 12 m';
  });

  await step('B05','Punkt im 2D per Maus ziehen (ein Undo-Eintrag)',async()=>{
    await page.waitForFunction(()=>[...document.querySelectorAll('.map-label')].some(l=>l.textContent==='Datenzentrum'&&l.style.left));
    const canvas=await page.locator('#canvas').boundingBox();
    const label=await page.locator('.map-label',{hasText:'Datenzentrum'}).evaluate(el=>({x:parseFloat(el.style.left),y:parseFloat(el.style.top)}));
    const x=canvas.x+canvas.width*label.x/100,y=canvas.y+canvas.height*label.y/100;
    const before=Number(await page.inputValue('#point-x').catch(()=>NaN));
    await page.mouse.move(x,y);await page.mouse.down();
    for(let i=1;i<=10;i++)await page.mouse.move(x+i*8,y,{steps:2});
    await page.mouse.up();
    const name=await page.locator('#selected-name').textContent(),after=Number(await page.inputValue('#point-x'));
    assert(name==='Datenzentrum',`ausgewählt: ${name}`);assert(after>20,`X nach Drag ${after}`);
    await page.click('#undo');const undone=Number(await page.inputValue('#point-x'));
    assert(undone===20,`X nach einem Undo ${undone}`);
    return `X 20 → ${after} → Undo 20 (vorher gewählt X=${before})`;
  });

  await step('B06','Kartenbild importieren (PNG 800×400)',async()=>{
    const base64=await page.evaluate(async()=>{
      const c=new OffscreenCanvas(800,400),g=c.getContext('2d');g.fillStyle='#1d3b2f';g.fillRect(0,0,800,400);
      g.fillStyle='#c9b98a';g.fillRect(0,180,800,40);g.fillRect(380,0,40,400);
      const b=await c.convertToBlob({type:'image/png'});return btoa(String.fromCharCode(...new Uint8Array(await b.arrayBuffer())));
    });
    await page.setInputFiles('#image-file',{name:'campus-test.png',mimeType:'image/png',buffer:Buffer.from(base64,'base64')});
    await page.waitForFunction(()=>document.getElementById('map-name').textContent==='campus-test.png');await page.waitForTimeout(500);
    const depth=await page.inputValue('#map-depth');await shot('b06-map-image.png');
    assert(depth==='60',`Tiefe ${depth}`);
    // The history keeps the image once by reference (model.js History.pack); undo/redo must still restore it exactly.
    const name=()=>page.textContent('#map-name');
    await page.click('#undo');assert(await name()==='Leere Kartenfläche',`nach Undo: ${await name()}`);
    await page.click('#redo');assert(await name()==='campus-test.png',`nach Redo: ${await name()}`);
    return `Bild übernommen, Tiefe an Seitenverhältnis angepasst: 120 × ${depth} m; Undo entfernt, Redo stellt es wieder her`;
  });

  await step('B07','Punktliste importieren (2 Punkte)',async()=>{
    const list=[{name:'Tor Nord',type:'marker',x:0,z:-25,data:{Text:'Eingang'}},{name:'Halle',type:'building',x:-5,z:5,rotation:30}];
    await page.setInputFiles('#points-file',{name:'points.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(list))});
    await page.waitForFunction(()=>document.getElementById('count').textContent==='07');return `${await notice()}`;
  });

  let exported,exportedFile;
  await step('B08','Kartenprojekt exportieren',async()=>{
    const [download]=await Promise.all([page.waitForEvent('download'),page.click('#export')]);
    const file=path.join(artifactDir,'baseline-export.map.json');await download.saveAs(file);
    // Project envelope (contracts/map-project-v1.md): identity and revision around the unchanged map payload.
    exportedFile=JSON.parse(await (await import('node:fs/promises')).readFile(file,'utf8'));exported=exportedFile.payload;
    assert(exportedFile.schema==='ourark.map-project.v1','Umschlag');assert(/^[0-9a-f-]{36}$/.test(exportedFile.worldId),'worldId');assert(Number.isInteger(exportedFile.revision),'revision');
    assert(exported.schema==='motionspec.map.v3','schema');assert(exported.points.length===7,'Punktzahl');
    assert(exported.map.image?.dataUrl.startsWith('data:image/png;base64,'),'Bild fehlt');
    assert(exported.points.find(p=>p.name==='Tor Nord')?.data.Text==='Eingang','Punktdaten fehlen');
    return `${download.suggestedFilename()}, Umschlag v1 (Welt ${exportedFile.worldId.slice(0,8)}…), 7 Punkte, eingebettetes Bild, Daten erhalten`;
  });

  await step('B09','Unbekannte Formatversion wird abgelehnt, Projekt unverändert',async()=>{
    for(const bad of [{...exportedFile,payload:{...exported,schema:'motionspec.map.v9'}},{...exportedFile,schema:'ourark.map-project.v9'}]){
      await page.evaluate(()=>{document.getElementById('notice').hidden=true;});
      await page.setInputFiles('#project-file',{name:'future.map.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});
      await page.waitForFunction(()=>!document.getElementById('notice').hidden&&/neueren|gültige/.test(document.getElementById('notice').textContent));
      assert(await pointCount()===7,'Punktzahl verändert');
    }
    return `Karte v9 und Umschlag v9: ${await notice()}`;
  });

  await step('B10','Lokal speichern und nach Reload wiederherstellen (IndexedDB)',async()=>{
    await page.click('#save');await page.waitForFunction(()=>/^In diesem Browser gespeichert · Revision \d+$/.test(document.getElementById('status').textContent));
    page.once('dialog',d=>d.accept());await page.reload({waitUntil:'networkidle'});
    await page.waitForFunction(()=>/^Lokales Kartenprojekt geöffnet · Revision \d+$/.test(document.getElementById('status').textContent),null,{timeout:5000});
    const count=await pointCount(),image=await text('map-name');
    assert(count===7&&image==='campus-test.png',`nach Reload ${count} Punkte, Bild ${image}`);return `${count} Punkte, Bild ${image}`;
  });

  await step('B11','Projektdatei in frischem Browserprofil importieren',async()=>{
    const fresh=await browser.newContext({viewport:{width:1440,height:900}}),p2=await fresh.newPage();
    await p2.goto(origin+'/map-studio/',{waitUntil:'networkidle'});
    await p2.setInputFiles('#project-file',{name:'baseline.map.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exportedFile))});
    await p2.waitForFunction(()=>document.getElementById('count').textContent==='07');
    const image=await p2.locator('#map-name').textContent(),halle=exported.points.find(p=>p.name==='Halle');
    // Re-export from the fresh profile keeps the world identity (P01: metadata no longer dropped).
    const [again]=await Promise.all([p2.waitForEvent('download'),p2.click('#export')]),reexport=JSON.parse(await (await again.createReadStream()).toArray().then(c=>Buffer.concat(c).toString('utf8')));
    assert(reexport.worldId===exportedFile.worldId,'worldId nach Rundlauf');
    // Older files without envelope (bare motionspec.map.v3) still open.
    await p2.setInputFiles('#project-file',{name:'alt.map.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...exported,name:'Alt-Format'}))});
    await p2.waitForFunction(()=>document.getElementById('project-name').value==='Alt-Format');
    await fresh.close();assert(image==='campus-test.png',image);return `7 Punkte, Bild erhalten, Welt-ID im Rundlauf gleich, Altformat öffnet, Halle rotation=${halle.rotation}°`;
  });

  await step('B13','Altbestand migrieren, alter Eintrag bleibt; zweiter Tab überschreibt nicht (IndexedDB)',async()=>{
    const ctx=await browser.newContext({viewport:{width:1440,height:900}}),a=await ctx.newPage();
    await a.goto(origin+'/map-studio/',{waitUntil:'networkidle'});
    // Seed a pre-envelope entry `current` exactly as the old editor stored it.
    await a.evaluate(legacy=>new Promise((resolve,reject)=>{const r=indexedDB.open('motionspec-map-studio-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('projects');
      r.onsuccess=()=>{const tx=r.result.transaction('projects','readwrite');tx.objectStore('projects').put(legacy,'current');tx.oncomplete=()=>{r.result.close();resolve();};tx.onerror=()=>reject(tx.error);};}),{...exported,name:'Altbestand'});
    await a.reload({waitUntil:'networkidle'});
    await a.waitForFunction(()=>document.getElementById('project-name').value==='Altbestand'&&/neue Projektformat/.test(document.getElementById('notice').textContent));
    const store=()=>a.evaluate(()=>new Promise(resolve=>{const r=indexedDB.open('motionspec-map-studio-v1',1);r.onsuccess=()=>{const out={},tx=r.result.transaction('projects','readonly'),os=tx.objectStore('projects'),keys=os.getAllKeys();
      keys.onsuccess=()=>{for(const k of keys.result){const g=os.get(k);g.onsuccess=()=>{out[k]=g.result;};}};tx.oncomplete=()=>{r.result.close();resolve(out);};};}));
    const after=await store(),worldId=after.last;
    assert(after.current?.name==='Altbestand'&&after.current.schema==='motionspec.map.v3','alter Eintrag verändert');
    assert(after[`project:${worldId}`]?.payload?.name==='Altbestand','migrierte Kopie fehlt');
    // Two tabs on the same project: the first save wins, the second gets a conflict and writes nothing.
    const b=await ctx.newPage();await b.goto(origin+'/map-studio/',{waitUntil:'networkidle'});await b.waitForFunction(()=>document.getElementById('project-name').value==='Altbestand');
    await a.fill('#project-name','Tab A');await a.press('#project-name','Enter');await a.click('#save');
    await a.waitForFunction(()=>/Revision 1$/.test(document.getElementById('status').textContent));
    await b.fill('#project-name','Tab B');await b.press('#project-name','Enter');await b.click('#save');
    await b.waitForFunction(()=>/Revision 1 dieses Projekts/.test(document.getElementById('notice').textContent));
    const final=await store();await ctx.close();
    assert(final[`project:${worldId}`].payload.name==='Tab A'&&final[`project:${worldId}`].revision===1,'zweiter Tab hat überschrieben');
    return `Welt ${worldId.slice(0,8)}… migriert, current unverändert, Tab B: Konflikt, gespeichert bleibt „Tab A“ (Revision 1)`;
  });

  await step('B14','Re-Import älterer Revision speicherbar; andere Welt nur ohne Ungespeichertes; lokale Liste öffnet sie wieder',async()=>{
    const ctx=await browser.newContext({viewport:{width:1440,height:900}}),p=await ctx.newPage();
    await p.goto(origin+'/map-studio/',{waitUntil:'networkidle'});
    const exportFile=async()=>{const [d]=await Promise.all([p.waitForEvent('download'),p.click('#export')]);return JSON.parse(Buffer.concat(await (await d.createReadStream()).toArray()).toString('utf8'));};
    const save=async n=>{await p.click('#save');await p.waitForFunction(n=>document.getElementById('status').textContent.endsWith(`Revision ${n}`),n);};
    const rename=async name=>{await p.fill('#project-name',name);await p.press('#project-name','Enter');};
    const load=async(file,name)=>p.setInputFiles('#project-file',{name,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(file))});
    await rename('Welt A');await save(1);const rev1=await exportFile();await rename('Welt A2');await save(2);
    // Same world, older revision: replaces the document (undoable) and still saves as revision 3.
    await load(rev1,'a-rev1.map.json');await p.waitForFunction(()=>document.getElementById('project-name').value==='Welt A');await save(3);
    // Another world while unsaved: refused, nothing lost.
    const other={...rev1,worldId:'welt-b',revision:0,payload:{...rev1.payload,name:'Welt B'}};
    await rename('Welt A ungespeichert');await load(other,'b.map.json');
    await p.waitForFunction(()=>/Ungespeicherte Änderungen/.test(document.getElementById('notice').textContent));
    if(await p.inputValue('#project-name')!=='Welt A ungespeichert')throw new Error('ungespeicherte Arbeit ersetzt');
    await save(4);await load(other,'b.map.json');await p.waitForFunction(()=>document.getElementById('project-name').value==='Welt B');
    if(!(await p.isDisabled('#undo')))throw new Error('Undo führt in die andere Welt');
    await save(1);
    // Back to A through the list of projects stored in this browser.
    await p.click('#import');await p.waitForSelector('#local-list button');
    await p.locator('#local-list button',{hasText:'Welt A ungespeichert'}).click();
    await p.waitForFunction(()=>document.getElementById('project-name').value==='Welt A ungespeichert'&&/Revision 4$/.test(document.getElementById('status').textContent));
    await ctx.close();return 'Rev-1-Datei → gespeichert als Rev 3; andere Welt bei Ungespeichertem abgelehnt; Welt B getrennt (Rev 1); A über Liste wieder offen (Rev 4)';
  });

  await step('B15','Ziehen: Edits/Undo mittendrin abgewiesen, ein Undo vor das Ziehen, Redo zur Ablage, Label folgt',async()=>{
    const ctx=await browser.newContext({viewport:{width:1440,height:900}}),p=await ctx.newPage();
    await p.goto(origin+'/map-studio/',{waitUntil:'networkidle'});
    await p.waitForFunction(()=>[...document.querySelectorAll('.map-label')].some(l=>l.textContent==='Datenzentrum'&&l.style.left));
    const canvas=await p.locator('#canvas').boundingBox(),labelPos=()=>p.locator('.map-label',{hasText:'Datenzentrum'}).evaluate(el=>({x:parseFloat(el.style.left),y:parseFloat(el.style.top)}));
    const start=await labelPos(),x=canvas.x+canvas.width*start.x/100,y=canvas.y+canvas.height*start.y/100;
    await p.mouse.move(x,y);await p.mouse.down();for(let i=1;i<=5;i++)await p.mouse.move(x+i*8,y,{steps:2});
    const mid=await labelPos();if(!(mid.x>start.x))throw new Error(`Label folgt nicht (${start.x} → ${mid.x})`);
    // Edits and Undo mid-drag are refused with a notice (they would put History out of order).
    await p.focus('#canvas');await p.keyboard.press('ArrowDown');await p.keyboard.press('Meta+z');
    const busy=await p.textContent('#notice');if(!/gezogenen Punkt ablegen/.test(busy))throw new Error(`kein Hinweis: ${busy}`);
    for(let i=6;i<=10;i++)await p.mouse.move(x+i*8,y+20,{steps:2});
    await p.mouse.up();
    const read=async()=>[Number(await p.inputValue('#point-x')),Number(await p.inputValue('#point-z'))];
    const dropped=await read();await p.click('#undo');const undone=await read();await p.click('#redo');const redone=await read();
    await ctx.close();
    if(undone.join()!=='20,-20')throw new Error(`ein Undo führt nicht vor das Ziehen: ${undone}`);
    if(redone.join()!==dropped.join())throw new Error(`Redo ${redone} statt Ablage ${dropped}`);
    return `Label ${start.x.toFixed(1)} → ${mid.x.toFixed(1)} % beim Ziehen; Pfeil/Undo mittendrin abgewiesen; abgelegt ${dropped} → Undo ${undone} → Redo ${redone}`;
  });

  await step('B12','Keine Konsolen- oder Netzwerkfehler im Map Studio',async()=>{assert(!errors.length,errors.join(' | '));return 'keine';});

  const summary={date:new Date().toISOString(),origin,environment:env,results};
  await writeFile(path.join(artifactDir,'baseline-results.json'),JSON.stringify(summary,null,2));
  console.log(JSON.stringify(env));
}finally{await browser.close();await close();}
const failed=results.filter(r=>!r.ok).length;console.log(`${results.length-failed}/${results.length} browser checks passed.`);process.exitCode=failed?1:0;
