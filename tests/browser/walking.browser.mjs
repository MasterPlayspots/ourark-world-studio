// Welle-3 gate in a real browser: walking with collision, turning and looking, reset, inspecting points
// (data shown as text only), and the edited document stays untouched by a walk.
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {loadPlaywright,startServer,launch,recorder,assert,artifactDir} from './harness.mjs';

const playwright=loadPlaywright();
if(!playwright){console.log('SKIP: playwright-core not found (set PLAYWRIGHT_CORE).');process.exit(0);}
const {origin,close}=await startServer(),browser=await launch(playwright),{results,step}=recorder();
const context=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true});
const page=await context.newPage(),errors=[];
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('pageerror',e=>errors.push(e.message));
const shot=name=>page.screenshot({path:path.join(artifactDir,name)});
const waitState=s=>page.waitForFunction(s=>(document.body.dataset.runtime??'editing')===s,s,{timeout:5000});
// HUD readout "X 1.0 · Z 2.0 · 90°" → {x,z,heading}
const pose=async()=>{const [,x,z,h]=/X (-?[\d.]+) · Z (-?[\d.]+) · (\d+)°/.exec(await page.textContent('#runtime-position'));return {x:Number(x),z:Number(z),heading:Number(h)};};
const hold=async(code,ms)=>{await page.keyboard.down(code);await page.waitForTimeout(ms);await page.keyboard.up(code);await page.waitForTimeout(120);};
const exportJson=async()=>{const [d]=await Promise.all([page.waitForEvent('download'),page.click('#export')]);const f=path.join(artifactDir,`walk-${Date.now()}.json`);await d.saveAs(f);return readFile(f,'utf8');};

const point=(id,name,over={})=>({id,name,type:'building',x:0,z:0,width:10,depth:6,height:6,rotation:0,color:'#5eead4',visible:true,locked:false,data:{},...over});
const doc={schema:'motionspec.map.v2',name:'Laufstrecke',map:{width:80,depth:80,color:'#101f34',image:null},runtime:{spawn:{x:0,z:20,heading:0}},points:[
  point('wall','Wand',{width:30,depth:2,z:10}),
  point('kiosk','Kiosk',{type:'marker',x:12,z:20,width:2,depth:2,data:{Öffnungszeiten:'8–18 Uhr',Hinweis:'<img src=x onerror="window.__xss=1">',Plätze:12}})
]};

try{
  await page.goto(origin+'/map-studio/',{waitUntil:'networkidle'});await page.waitForTimeout(400);
  await page.setInputFiles('#project-file',{name:'lauf.map.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(doc))});
  await page.waitForFunction(()=>document.getElementById('title').textContent==='Laufstrecke');
  const before=await exportJson();
  await page.click('#walk-enter');await waitState('playing');await page.waitForTimeout(200);

  await step('W01','W geht nach Norden, etwa 3 m/s',async()=>{
    const a=await pose();await hold('KeyW',1000);const b=await pose();
    assert(a.x===0&&a.z===20&&a.heading===0,`Start ${JSON.stringify(a)}`);
    const walked=a.z-b.z;assert(walked>2.4&&walked<3.8&&Math.abs(b.x)<.05,`${walked.toFixed(2)} m nach Norden, X ${b.x}`);
    return `Start X 0 · Z 20, nach 1 s W: Z ${b.z} (${walked.toFixed(1)} m)`;
  });

  await step('W02','Die Wand hält: Spieler bleibt 0,3 m vor ihrer Südseite',async()=>{
    await hold('KeyW',2500);const b=await pose();assert(Math.abs(b.z-11.3)<.15,`Z ${b.z}`);await shot('w3-wall.png');
    return `steht bei Z ${b.z} (Wandsüdseite 11, Radius 0,3)`;
  });

  await step('W03','Q/E drehen, Ziehen schaut umher',async()=>{
    await hold('KeyE',500);const turned=(await pose()).heading;assert(turned>45&&turned<75,`E: ${turned}°`);
    await hold('KeyQ',500);const back=(await pose()).heading;assert(back<15||back>345,`Q: ${back}°`);
    const box=await page.locator('#canvas').boundingBox(),cx=box.x+box.width/2,cy=box.y+box.height/2;
    await page.mouse.move(cx,cy);await page.mouse.down();await page.mouse.move(cx+120,cy,{steps:6});await page.mouse.up();await page.waitForTimeout(120);
    const dragged=(await pose()).heading;assert(Math.abs(((dragged-back+540)%360)-180-30)<3,`Ziehen 120 px: ${back}° → ${dragged}°`);
    return `E ${turned}°, Q ${back}°, 120 px Ziehen ${dragged}°`;
  });

  await step('W04','R setzt auf den Start zurück',async()=>{
    await page.keyboard.press('KeyR');await page.waitForTimeout(150);const b=await pose();
    assert(b.x===0&&b.z===20&&b.heading===0,JSON.stringify(b));return 'X 0 · Z 20 · 0°';
  });

  await step('W05','Untersuchen: Hinweis, Infopanel mit Daten als Text, Schließen beim Weggehen',async()=>{
    await hold('KeyE',750);await page.waitForTimeout(100);
    const east=(await pose()).heading;assert(east>70&&east<110,`nach Osten gedreht: ${east}°`);
    await hold('KeyW',3100);
    const hint=await page.textContent('#runtime-hint');assert(/„Kiosk“ untersuchen/.test(hint)&&!(await page.isHidden('#runtime-hint')),`Hinweis: ${hint}`);
    await page.keyboard.press('Enter');await page.waitForTimeout(100);
    const info=await page.evaluate(()=>({open:!document.getElementById('runtime-info').hidden,name:document.getElementById('runtime-info-name').textContent,text:document.getElementById('runtime-info-data').textContent,imgs:document.querySelectorAll('#runtime-info img').length,xss:window.__xss??0}));
    assert(info.open&&info.name==='Kiosk',JSON.stringify(info));assert(info.text.includes('8–18 Uhr')&&info.text.includes('12'),info.text);
    assert(info.imgs===0&&info.xss===0&&info.text.includes('<img'),'HTML aus Daten wird als Text gezeigt');
    await shot('w3-info.png');
    await hold('KeyS',1500);assert(await page.isHidden('#runtime-info'),'Panel schließt beim Weggehen');
    return 'Hinweis „Kiosk“, Panel mit Öffnungszeiten, <img> nur als Text, schließt nach Rückschritt';
  });

  await step('W08','Ziehen über eine Pause hinweg dreht die Ansicht nicht weiter',async()=>{
    const before=(await pose()).heading,box=await page.locator('#canvas').boundingBox(),cx=box.x+box.width/2,cy=box.y+box.height/2;
    await page.mouse.move(cx,cy);await page.mouse.down();await page.keyboard.press('Escape');await waitState('paused');
    await page.mouse.move(cx+200,cy,{steps:5});await page.mouse.up();
    await page.click('#runtime-resume');await waitState('playing');await page.waitForTimeout(150);
    const after=(await pose()).heading;assert(after===before,`${before}° → ${after}°`);return `${before}° bleibt ${after}°`;
  });

  await step('W06','Nach dem Laufen ist das Dokument unverändert',async()=>{
    await page.click('#runtime-exit');await waitState('editing');const after=await exportJson();
    assert(after===before,'Export unterscheidet sich');return 'Export bytegleich';
  });

  await step('W07','Keine Konsolenfehler',async()=>{assert(!errors.length,errors.join(' | '));return 'keine';});
}finally{
  await browser.close();await close();
}
const failed=results.filter(r=>!r.ok).length;console.log(`${results.length-failed}/${results.length} walking browser checks passed.`);process.exitCode=failed?1:0;
