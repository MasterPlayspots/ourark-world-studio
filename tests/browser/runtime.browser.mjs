// Wave-1 gate in a real browser: entering/leaving the walk mode never changes the document or history,
// focus loss pauses, failed starts leave the editor usable, and repeated cycles leak no listeners or loops.
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {loadPlaywright,startServer,launch,environment,recorder,assert,artifactDir} from './harness.mjs';

const playwright=loadPlaywright();
const {origin,close}=await startServer(),browser=await launch(playwright),{results,step}=recorder();
const context=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true});

// Count live listeners and RAF requests from page start, so leaks are measured rather than assumed.
await context.addInitScript(()=>{
  const live=[],add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener;
  const probe=window.__probe={raf:0,listeners:()=>live.length};
  EventTarget.prototype.addEventListener=function(type,fn,options){if(fn&&!live.some(l=>l.t===this&&l.type===type&&l.fn===fn))live.push({t:this,type,fn});return add.call(this,type,fn,options);};
  EventTarget.prototype.removeEventListener=function(type,fn,options){const i=live.findIndex(l=>l.t===this&&l.type===type&&l.fn===fn);if(i>=0)live.splice(i,1);return remove.call(this,type,fn,options);};
  const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=fn=>{probe.raf++;return raf(fn);};
});
const page=await context.newPage(),errors=[];
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('pageerror',e=>errors.push(e.message));
const shot=name=>page.screenshot({path:path.join(artifactDir,name)});
const state=()=>page.evaluate(()=>document.body.dataset.runtime??'editing');
const waitState=s=>page.waitForFunction(s=>(document.body.dataset.runtime??'editing')===s,s,{timeout:5000});
const exportJson=async()=>{const [d]=await Promise.all([page.waitForEvent('download'),page.click('#export')]);const f=path.join(artifactDir,`rt-${Date.now()}.json`);await d.saveAs(f);
  // Exports are project envelopes (contracts/map-project-v1.md); these checks are about the map payload.
  const file=JSON.parse(await (await import('node:fs/promises')).readFile(f,'utf8'));if(file.schema!=='ourark.map-project.v1')throw new Error('Export ohne Projektumschlag');return JSON.stringify(file.payload);};
const editorState=()=>page.evaluate(()=>({undo:document.getElementById('undo').disabled,redo:document.getElementById('redo').disabled,selected:document.getElementById('selected-name').textContent,count:document.getElementById('count').textContent,status:document.getElementById('status').textContent,projection:document.getElementById('projection').textContent}));
const canvasPng=()=>page.locator('#canvas').screenshot();
const idleRaf=async(ms=600)=>{const a=await page.evaluate(()=>window.__probe.raf);await page.waitForTimeout(ms);return (await page.evaluate(()=>window.__probe.raf))-a;};

try{
  await page.goto(origin+'/map-studio/',{waitUntil:'networkidle'});await page.waitForTimeout(500);
  const env=await environment(page);
  // One real edit so undo history is non-empty and must survive the walk unchanged.
  await page.fill('#point-height','14');await page.press('#point-height','Tab');
  await page.click('#view-3d');await page.waitForTimeout(300);await page.click('.point-row:nth-child(2)');await page.waitForTimeout(200);
  const beforeState=await editorState(),beforeJson=await exportJson(),beforeCanvas=await canvasPng(),baselineListeners=await page.evaluate(()=>window.__probe.listeners());

  await step('R01','Welt betreten: Spielerkamera, HUD, Editor inaktiv',async()=>{
    await page.click('#walk-enter');await waitState('playing');await page.waitForTimeout(300);await shot('w1-runtime-playing.png');
    const info=await page.evaluate(()=>({hud:!document.getElementById('runtime-hud').hidden,inert:[...document.querySelectorAll('.library,.inspector,.toolbar,.title-actions')].every(e=>e.inert),labels:getComputedStyle(document.querySelector('.labels')).visibility,focus:document.activeElement?.id,state:document.getElementById('runtime-state').textContent}));
    assert(info.hud&&info.inert,'HUD sichtbar und Editorbereiche inert');assert(info.labels==='hidden','Editorlabels ausgeblendet');assert(info.focus==='canvas',`Fokus ${info.focus}`);
    const looping=await idleRaf(400);assert(looping>10,`während playing nur ${looping} Frames`);
    return `${info.state}; Fokus auf Canvas; ${looping} Frames in 400 ms`;
  });

  await step('R02','Editortasten wirken im Begehmodus nicht',async()=>{
    await page.keyboard.press('Delete');await page.keyboard.press('Meta+z');await page.keyboard.press('ArrowUp');
    const s=await editorState();assert(s.count===beforeState.count,'Punkt gelöscht');return `Delete/⌘Z/Pfeil ohne Wirkung, ${s.count} Punkte`;
  });

  await step('R03','Escape pausiert; Fortsetzen per Tastatur',async()=>{
    await page.keyboard.press('Escape');await waitState('paused');
    const focus=await page.evaluate(()=>document.activeElement?.id);assert(focus==='runtime-resume',`Fokus ${focus}`);
    const frames=await idleRaf(400);assert(frames<=1,`${frames} Frames während Pause`);
    await page.keyboard.press('Enter');await waitState('playing');return `pausiert, ${frames} Frames in Pause, Enter setzt fort`;
  });

  await step('R04','Fokusverlust und Hintergrundtab pausieren',async()=>{
    await page.keyboard.down('KeyW');
    await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await waitState('paused');
    const reason=await page.locator('#runtime-pause-reason').textContent();await page.keyboard.up('KeyW');
    await page.click('#runtime-resume');await waitState('playing');
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
    await waitState('paused');const reason2=await page.locator('#runtime-pause-reason').textContent();
    await page.evaluate(()=>{delete document.hidden;});
    return `blur → „${reason}“; hidden → „${reason2}“`;
  });

  await step('R05','Zurück zum Editor stellt Kamera, Auswahl, Dokument und History wieder her',async()=>{
    await page.click('#runtime-exit');await waitState('editing');await page.waitForTimeout(300);
    const focus=await page.evaluate(()=>document.activeElement?.id);assert(focus==='walk-enter',`Fokus ${focus}`);
    const after=await editorState(),json=await exportJson(),canvas=await canvasPng();
    assert(JSON.stringify(after)===JSON.stringify(beforeState),`Editorzustand ${JSON.stringify(after)} ≠ ${JSON.stringify(beforeState)}`);
    assert(json===beforeJson,'Export nach Begehen weicht ab');
    assert(canvas.equals(beforeCanvas),'Canvas nach Rückkehr nicht pixelgleich');
    const idle=await idleRaf();assert(idle===0,`${idle} RAF-Aufrufe im Leerlauf`);
    return 'Export bytegleich, Canvas pixelgleich, Undo/Redo/Auswahl/Ansicht gleich, kein Loop im Leerlauf';
  });

  await step('R06','20× Betreten/Verlassen ohne Listener- oder Loop-Leck',async()=>{
    const start=await page.evaluate(()=>window.__probe.listeners());
    for(let i=0;i<20;i++){await page.click('#walk-enter');await waitState('playing');if(i%4===0){await page.keyboard.press('Escape');await waitState('paused');}await page.click('#runtime-exit');await waitState('editing');}
    // Leaving fullscreen resizes the canvas once (one legitimate redraw); measure the idle loop after that settles.
    await page.waitForFunction(()=>!document.fullscreenElement);await page.waitForTimeout(400);
    const end=await page.evaluate(()=>window.__probe.listeners()),idle=await idleRaf(),json=await exportJson();
    assert(end===start,`Listener ${start} → ${end}`);assert(idle===0,`${idle} RAF im Leerlauf`);assert(json===beforeJson,'Dokument verändert');
    return `Listener ${start} → ${end} (Seitenstart ${baselineListeners}), 0 RAF im Leerlauf, Dokument unverändert`;
  });

  await step('R07','Fehlgeschlagener Start lässt Editor und Export nutzbar',async()=>{
    await page.evaluate(()=>{globalThis.__MOTIONSPEC_RUNTIME_FAULT__='prepare';});
    const listeners=await page.evaluate(()=>window.__probe.listeners());
    await page.click('#walk-enter');await page.waitForFunction(()=>/konnte nicht betreten/.test(document.getElementById('notice').textContent));
    assert(await state()==='editing','nicht im Editor');const message=await page.locator('#notice').textContent();
    const inert=await page.evaluate(()=>[...document.querySelectorAll('.library,.inspector,.toolbar,.title-actions,.topbar .actions')].some(e=>e.inert));assert(!inert,'Editor blieb inert');
    const json=await exportJson();assert(json===beforeJson,'Export nach Fehler abweichend');
    assert(await page.evaluate(()=>window.__probe.listeners())===listeners,'Listener nach Fehlstart');
    await page.evaluate(()=>{delete globalThis.__MOTIONSPEC_RUNTIME_FAULT__;});
    await page.click('#walk-enter');await waitState('playing');await page.click('#runtime-exit');await waitState('editing');
    return `„${message}“; danach erneut betretbar`;
  });

  await step('R08','Alte v1-Datei öffnen, betreten, Export als v2',async()=>{
    const v1=JSON.parse(beforeJson);v1.schema='motionspec.map.v1';delete v1.runtime;for(const p of v1.points){delete p.solid;delete p.interactive;}
    await page.setInputFiles('#project-file',{name:'legacy.map.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(v1))});
    await page.waitForFunction(()=>/geöffnet/.test(document.getElementById('notice').textContent));
    await page.click('#walk-enter');await waitState('playing');await page.click('#runtime-exit');await waitState('editing');
    const out=JSON.parse(await exportJson());const ids=out.points.map(p=>p.id).join();
    assert(out.schema==='motionspec.map.v3','Schema');assert(ids===v1.points.map(p=>p.id).join(),'IDs');
    assert(out.points.every(p=>p.solid===(p.type!=='marker')&&p.interactive===true),'Defaults');
    return `${out.points.length} Punkte migriert, IDs gleich, Defaults gesetzt`;
  });

  await step('R10','Kategoriewechsel im Inspector zieht Kollisionsflag mit',async()=>{
    await page.click('.point-row:nth-child(1)');await page.selectOption('#point-type','marker');
    const out=JSON.parse(await exportJson()),p=out.points[0];
    assert(p.type==='marker'&&p.solid===false&&p.interactive===true,JSON.stringify({type:p.type,solid:p.solid}));
    await page.click('#undo');const back=JSON.parse(await exportJson()).points[0];assert(back.type==='building'&&back.solid===true,'Undo stellt Flag nicht her');
    return 'Gebäude → Datenpunkt: solid false; Undo: Gebäude, solid true';
  });

  await step('R09','Keine Konsolenfehler',async()=>{assert(!errors.length,errors.join(' | '));return 'keine';});
  await writeFile(path.join(artifactDir,'runtime-results.json'),JSON.stringify({date:new Date().toISOString(),environment:env,results},null,2));
}finally{await browser.close();await close();}
const failed=results.filter(r=>!r.ok).length;console.log(`${results.length-failed}/${results.length} runtime browser checks passed.`);process.exitCode=failed?1:0;
