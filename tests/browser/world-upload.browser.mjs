// Uploading a Map Studio project into 3D Worlds: the city becomes a sixth world next to the dioramas — drawn in
// the 3D Worlds look, buildings can be selected and inspected, "Enter world" walks it at real scale (metres) at
// 60 fps, it survives a reload, and the dioramas keep working.
import path from 'node:path';
import {loadPlaywright,startServer,launch,recorder,assert,artifactDir} from './harness.mjs';

const playwright=loadPlaywright();
if(!playwright){console.log('SKIP: playwright-core not found (set PLAYWRIGHT_CORE).');process.exit(0);}
const {origin,close}=await startServer(),browser=await launch(playwright),{results,step}=recorder();
const page=await (await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:2})).newPage(),errors=[];
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('pageerror',e=>errors.push(e.message));
const shot=name=>page.screenshot({path:path.join(artifactDir,name)});
const BUDGET=1000/60;
const measure=ms=>page.evaluate(ms=>new Promise(res=>{const t=[];let last=0;const end=performance.now()+ms;function f(now){if(last)t.push(now-last);last=now;if(now<end)requestAnimationFrame(f);else{t.sort((a,b)=>a-b);res({fps:t.length/(ms/1000),p95:t[Math.floor(t.length*.95)]});}}requestAnimationFrame(f);}),ms);
const stats=()=>page.evaluate(()=>({...globalThis.__MOTIONSPEC_RENDER_STATS__}));
const waitState=s=>page.waitForFunction(s=>(document.body.dataset.runtime??'editing')===s,s,{timeout:8000});
const pose=async()=>{const [,x,z,h]=/X (-?[\d.]+) · Z (-?[\d.]+) · (\d+)°/.exec(await page.textContent('#runtime-position'));return {x:Number(x),z:Number(z),heading:Number(h)};};
const hold=async(code,ms)=>{await page.keyboard.down(code);await page.waitForTimeout(ms);await page.keyboard.up(code);await page.waitForTimeout(120);};

// The same test city as the Map Studio gate: 2000 footprint buildings with data.
const shapes=[[[-8,-8],[8,-8],[8,-2],[-2,-2],[-2,8],[-8,8]],[[-9,-6],[9,-6],[9,6],[-9,6]],[[-8,-8],[8,-8],[8,8],[3,8],[3,0],[-3,0],[-3,8],[-8,8]]];
const colors=['#5eead4','#72a8ef','#f3c969','#d5b5ff','#eaf1fb'];
const points=Array.from({length:2000},(_,i)=>({id:`b${i}`,name:`Block ${i}`,type:'building',x:(i%45)*40-880,z:Math.floor(i/45)*40-880,width:1,depth:1,height:6+(i*7)%40,rotation:(i*15)%90,color:colors[i%5],visible:true,locked:false,footprint:shapes[i%3],data:{Nummer:i,Etagen:2+(i*7)%13}}));
const city={schema:'motionspec.map.v3',name:'Teststadt 2000',map:{width:1900,depth:1900,color:'#101f34',image:null},runtime:{spawn:{x:-900,z:0,heading:90}},points};

try{
  await page.goto(origin+'/world-studio/?stats#alpine',{waitUntil:'networkidle'});await page.waitForTimeout(500);

  await step('U01','Import nimmt ein Map-Studio-Projekt an: sechste Welt „Teststadt 2000“',async()=>{
    await page.setInputFiles('#import-file',{name:'teststadt.map.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(city))});
    await page.waitForFunction(()=>document.getElementById('world-title').textContent==='Teststadt 2000',null,{timeout:15000});
    const info=await page.evaluate(()=>({pins:document.querySelectorAll('#pins [data-pin]').length,cards:document.querySelectorAll('[data-world]:not([data-world^="scan:"])').length,active:document.querySelector('[data-world="city"]')?.getAttribute('aria-pressed'),hash:location.hash,count:document.getElementById('object-count').textContent,notice:document.getElementById('notice').textContent}));
    await page.waitForTimeout(400);await shot('u01-city.png');
    assert(info.cards===6&&info.active==='true',JSON.stringify(info));assert(info.hash==='#city',info.hash);assert(info.pins===0,`${info.pins} Diorama-Pins über der Stadt`);assert(/2[.,]?000/.test(info.count),info.count);
    return `${info.cards} Welten, ${info.count} Gebäude · „${info.notice}“`;
  });

  await step('U02','Ansicht: höchstens 120 Draw-Calls, Drehen ≥ 58 fps',async()=>{
    const box=await page.locator('#canvas').boundingBox(),cx=box.x+box.width/2,cy=box.y+box.height/2;
    await page.mouse.move(cx,cy);await page.mouse.down();
    const moving=(async()=>{for(let i=0;i<60;i++){await page.mouse.move(cx+i*4,cy+Math.sin(i/6)*20);await page.waitForTimeout(16);}})();
    const m=await measure(1500);await moving;await page.mouse.up();const s=await stats();
    assert(s.calls>0&&s.calls<=120,`${s.calls} Draw-Calls`);assert(m.fps>=58,`${m.fps.toFixed(1)} fps`);
    return `${s.calls} Draw-Calls, ${m.fps.toFixed(0)} fps, p95 ${m.p95.toFixed(1)} ms`;
  });

  await step('U03','Gebäude aus der Liste wählen: Inspector zeigt Name und Daten; Klick in die Szene wählt ein Gebäude',async()=>{
    await page.click('[data-select="b2"]');
    const panel=await page.evaluate(()=>({name:document.getElementById('city-building-name').textContent,data:document.getElementById('city-building-data').textContent}));
    assert(panel.name==='Block 2'&&/Nummer/.test(panel.data)&&/Etagen/.test(panel.data),JSON.stringify(panel));
    await page.click('#focus');await page.waitForTimeout(300);
    const box=await page.locator('#canvas').boundingBox();await page.mouse.click(box.x+box.width/2,box.y+box.height/2);await page.waitForTimeout(200);
    const picked=await page.textContent('#city-building-name');assert(/^Block \d+$/.test(picked),picked);
    await shot('u03-selected.png');return `Liste: ${panel.name}; Szene: ${picked}`;
  });

  await step('U04','Enter world: Echtmaß (3 m/s), ≤ 120 Draw-Calls, ≥ 58 fps bei 2×',async()=>{
    await page.click('#walk-enter');await waitState('playing');
    await page.waitForFunction(()=>/fps/.test(document.getElementById('runtime-perf').textContent),null,{timeout:8000});
    const a=await pose();assert(a.x===-900&&a.z===0&&a.heading===90,`Start ${JSON.stringify(a)}`);
    await hold('KeyW',1000);const b=await pose();const walked=b.x-a.x;assert(walked>2.4&&walked<3.8,`${walked.toFixed(2)} m in 1 s`);
    await page.keyboard.down('KeyW');await page.keyboard.down('KeyE');const m=await measure(3000);await page.keyboard.up('KeyW');await page.keyboard.up('KeyE');
    const s=await stats(),perf=await page.textContent('#runtime-perf');await shot('u04-walk.png');
    assert(s.calls<=120,`${s.calls} Draw-Calls`);assert(m.fps>=58,`${m.fps.toFixed(1)} fps`);assert(m.p95<=BUDGET*1.25,`p95 ${m.p95.toFixed(1)} ms`);assert(/·\s*2×/.test(perf),perf);
    await page.click('#runtime-exit');await waitState('editing');
    return `${walked.toFixed(1)} m in 1 s · ${s.calls} Draw-Calls · ${m.fps.toFixed(0)} fps · ${perf}`;
  });

  await step('U05','Beim Begehen untersuchbar: vor einem Gebäude zeigt Enter seine Daten',async()=>{
    // Block 990 stands at (-880, 0), straight east of the start (-900, 0, facing east); its west wall is at x −888.
    await page.click('#walk-enter');await waitState('playing');
    await hold('KeyW',5000);const stop=await pose();assert(stop.x>-889&&stop.x<-888,`vor der Wand: ${JSON.stringify(stop)}`);
    await page.waitForFunction(()=>!document.getElementById('runtime-hint').hidden,null,{timeout:4000});
    await page.keyboard.press('Enter');await page.waitForTimeout(150);
    const info=await page.evaluate(()=>({type:document.getElementById('runtime-info-type').textContent,name:document.getElementById('runtime-info-name').textContent,data:document.getElementById('runtime-info-data').textContent}));
    await page.keyboard.press('Enter');await page.click('#runtime-exit');await waitState('editing');
    assert(info.type==='BUILDING'&&info.name==='Block 990'&&/Nummer/.test(info.data),JSON.stringify(info));return `steht bei X ${stop.x}, ${info.type} „${info.name}“`;
  });

  await step('U06','Dioramen bleiben: Alpine öffnen und zurück zur Stadt',async()=>{
    await page.click('[data-world="alpine"]');await page.waitForFunction(()=>document.getElementById('world-title').textContent==='Alpine Retreat');
    const alpine=await page.evaluate(()=>({count:document.getElementById('object-count').textContent,edit:!document.querySelector('[data-tool="translate"]').disabled}));
    await page.click('[data-world="city"]');await page.waitForFunction(()=>document.getElementById('world-title').textContent==='Teststadt 2000');
    assert(alpine.count==='05'&&alpine.edit,JSON.stringify(alpine));return 'Alpine editierbar, Stadt wieder da';
  });

  await step('U07','Nach dem Neuladen ist die hochgeladene Welt noch da',async()=>{
    await page.reload({waitUntil:'networkidle'});
    await page.waitForFunction(()=>document.getElementById('world-title').textContent==='Teststadt 2000',null,{timeout:15000});
    return 'wiederhergestellt';
  });

  await step('U08','Szenen-Import (Diorama-JSON) funktioniert weiter',async()=>{
    await page.click('[data-world="neon"]');await page.waitForFunction(()=>document.getElementById('world-title').textContent==='Neon Nexus');
    const scene=await page.evaluate(()=>JSON.stringify({schema:'motionspec.world.v1',world:'neon',objects:[{id:'x1',kind:'box',name:'Kiste',sourceIndex:0,position:[0,1,0],rotation:[0,0,0],scale:[1,1,1],color:'#ff0000',visible:true,locked:false,animation:'none',page:{enabled:false,title:'',body:''}}],settings:{landscape:true,grid:true,exposure:1.1},selected:'x1'}));
    await page.setInputFiles('#import-file',{name:'neon.json',mimeType:'application/json',buffer:Buffer.from(scene)});
    await page.waitForFunction(()=>document.getElementById('object-count').textContent==='01');return 'Neon-Szene mit 1 Objekt';
  });

  await step('U10','Abgelehnt mit Meldung: Kartenbild über 8192 px, große Nicht-Karten-Datei; die Stadt bleibt',async()=>{
    await page.click('[data-world="city"]');await page.waitForFunction(()=>document.getElementById('world-title').textContent==='Teststadt 2000');
    const dataUrl=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=8300;c.height=8;return c.toDataURL('image/png');});
    const bomb={...city,name:'Bildbombe',points:city.points.slice(0,3),map:{...city.map,image:{name:'riesig.png',dataUrl}}};
    await page.setInputFiles('#import-file',{name:'bombe.map.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bomb))});
    await page.waitForFunction(()=>/8192/.test(document.getElementById('notice').textContent),null,{timeout:8000});
    const big=Buffer.from(JSON.stringify({schema:'motionspec.world.v1',padding:'x'.repeat(1.2*1024*1024)}));
    await page.setInputFiles('#import-file',{name:'gross.json',mimeType:'application/json',buffer:big});
    await page.waitForFunction(()=>/smaller than 1 MB/.test(document.getElementById('notice').textContent),null,{timeout:8000});
    const title=await page.textContent('#world-title');assert(title==='Teststadt 2000',title);
    return 'beide abgelehnt, Stadt unverändert';
  });

  await step('U11','OSM-Welt: Quellenhinweis (ODbL) sichtbar in 3D Worlds, beim Begehen und im Map Studio',async()=>{
    const {convertOsm}=await import('../../dist/worldport/osm.mjs');
    const ring=(lat,lon)=>[{lat,lon},{lat,lon:lon+.0003},{lat:lat+.0002,lon:lon+.0003},{lat:lat+.0002,lon},{lat,lon}];
    const osm=convertOsm({elements:[{type:'way',id:1,geometry:ring(25.78,-80.13),tags:{building:'hotel',name:'Hotel Pastel',height:'18 m'}},{type:'way',id:2,geometry:ring(25.781,-80.131),tags:{building:'yes'}}]},{name:'Mini Vice'}).document;
    const buffer=Buffer.from(JSON.stringify(osm)),visible=()=>page.evaluate(()=>{const el=document.getElementById('attribution');return el&&!el.hidden&&getComputedStyle(el).display!=='none'?el.textContent:'';});
    await page.setInputFiles('#import-file',{name:'mini-vice.map.json',mimeType:'application/json',buffer});
    await page.waitForFunction(()=>document.getElementById('world-title').textContent==='Mini Vice');
    const editor=await visible();
    await page.click('#walk-enter');await waitState('playing');const walking=await visible();await page.click('#runtime-exit');await waitState('editing');
    await page.click('[data-world="alpine"]');await page.waitForFunction(()=>document.getElementById('world-title').textContent==='Alpine Retreat');const diorama=await visible();
    await page.goto(origin+'/map-studio/',{waitUntil:'networkidle'});await page.waitForTimeout(300);
    await page.setInputFiles('#project-file',{name:'mini-vice.map.json',mimeType:'application/json',buffer});
    await page.waitForFunction(()=>document.getElementById('title').textContent==='Mini Vice');const map=await visible();
    for(const [where,text] of [['3D Worlds',editor],['Begehen',walking],['Map Studio',map]])assert(/OpenStreetMap/.test(text)&&/ODbL/.test(text),`${where}: „${text}“`);
    assert(diorama==='','Diorama ohne OSM-Hinweis');return editor;
  });

  await step('U12','OSM-Boden (Straßen, Strand, Land/Meer) wird gezeichnet — ein zusätzlicher Draw-Call, Welt bleibt flüssig',async()=>{
    const {convertOsm}=await import('../../dist/worldport/osm.mjs');
    const ring=(lat,lon,dLat,dLon)=>[{lat,lon},{lat,lon:lon+dLon},{lat:lat+dLat,lon:lon+dLon},{lat:lat+dLat,lon},{lat,lon}];
    const buildings={elements:[{type:'way',id:1,geometry:ring(25.7800,-80.1320,.0002,.0003),tags:{building:'hotel'}},{type:'way',id:2,geometry:ring(25.7830,-80.1290,.0002,.0003),tags:{building:'yes'}}]};
    const ground={elements:[{type:'way',id:10,geometry:[{lat:25.7805,lon:-80.1330},{lat:25.7805,lon:-80.1270}],tags:{highway:'primary'}},{type:'way',id:12,geometry:ring(25.7815,-80.1289,.0003,.0003),tags:{natural:'beach'}},{type:'way',id:16,geometry:[{lat:25.7770,lon:-80.1285},{lat:25.7860,lon:-80.1285}],tags:{natural:'coastline'}}]};
    const upload=async(doc,title)=>{await page.goto(origin+'/world-studio/?stats#alpine',{waitUntil:'networkidle'});await page.setInputFiles('#import-file',{name:'g.map.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...doc,name:title}))});await page.waitForFunction(t=>document.getElementById('world-title').textContent===t,title);await page.waitForTimeout(300);return stats();};
    const without=await upload(convertOsm(buildings,{name:'x'}).document,'Ohne Boden'),withGround=await upload(convertOsm(buildings,{name:'x',ground}).document,'Mit Boden');
    await page.screenshot({path:path.join(artifactDir,'u12-ground.png')});
    assert(without.calls>=3,`Gebäude im Bild der Übersicht: ${without.calls} Draw-Calls`);assert(withGround.triangles>without.triangles,`Dreiecke ${without.triangles} → ${withGround.triangles}`);assert(withGround.calls-without.calls===1,`Draw-Calls ${without.calls} → ${withGround.calls}`);
    return `Draw-Calls ${without.calls} → ${withGround.calls}, Dreiecke ${without.triangles} → ${withGround.triangles}`;
  });

  await step('U09','Keine Konsolenfehler',async()=>{assert(!errors.length,errors.join(' | '));return 'none';});
}finally{await browser.close();await close();}
const failed=results.filter(r=>!r.ok).length;console.log(`${results.length-failed}/${results.length} world upload browser checks passed.`);process.exitCode=failed?1:0;
