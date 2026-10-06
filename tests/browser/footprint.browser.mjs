// map.v3 in a real browser: a concave (L-shaped) building footprint is drawn extruded, kept on export,
// blocks the player exactly (walking into the notch ends in its inner corner) and can be inspected there.
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {loadPlaywright,startServer,launch,recorder,assert,artifactDir} from './harness.mjs';

const playwright=loadPlaywright();
if(!playwright){console.log('SKIP: playwright-core not found (set PLAYWRIGHT_CORE).');process.exit(0);}
const {origin,close}=await startServer(),browser=await launch(playwright),{results,step}=recorder();
const page=await (await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true})).newPage(),errors=[];
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('pageerror',e=>errors.push(e.message));
const shot=name=>page.screenshot({path:path.join(artifactDir,name)});
const waitState=s=>page.waitForFunction(s=>(document.body.dataset.runtime??'editing')===s,s,{timeout:5000});
const pose=async()=>{const [,x,z,h]=/X (-?[\d.]+) · Z (-?[\d.]+) · (\d+)°/.exec(await page.textContent('#runtime-position'));return {x:Number(x),z:Number(z),heading:Number(h)};};
const hold=async(code,ms)=>{await page.keyboard.down(code);await page.waitForTimeout(ms);await page.keyboard.up(code);await page.waitForTimeout(120);};
const exportJson=async()=>{const [d]=await Promise.all([page.waitForEvent('download'),page.click('#export')]);const f=path.join(artifactDir,`fp-${Date.now()}.json`);await d.saveAs(f);
  // Exports are project envelopes (contracts/map-project-v1.md); these checks are about the map payload.
  const file=JSON.parse(await readFile(f,'utf8'));if(file.schema!=='ourark.map-project.v1')throw new Error('Export ohne Projektumschlag');return file.payload;};

// L-shaped building around (10, 0); its notch is the quarter x 9…15, z −1…5. Start inside the notch.
const L=[[-5,-5],[5,-5],[5,-1],[-1,-1],[-1,5],[-5,5]];
const doc={schema:'motionspec.map.v3',name:'Grundriss',map:{width:80,depth:80,color:'#101f34',image:null},runtime:{spawn:{x:13,z:3,heading:315}},points:[
  {id:'haus',name:'Haus L',type:'building',x:10,z:0,width:10,depth:10,height:12,rotation:0,color:'#72a8ef',visible:true,locked:false,footprint:L,data:{Etagen:4}}
]};

try{
  await page.goto(origin+'/map-studio/',{waitUntil:'networkidle'});await page.waitForTimeout(400);
  await page.setInputFiles('#project-file',{name:'grundriss.map.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(doc))});
  await page.waitForFunction(()=>document.getElementById('title').textContent==='Grundriss');

  await step('FP01','Import v3: Grundriss bleibt erhalten, Maße = Umriss, Export als v3',async()=>{
    const out=await exportJson(),p=out.points[0];
    assert(out.schema==='motionspec.map.v3','Schema '+out.schema);assert(JSON.stringify(p.footprint)===JSON.stringify(L),'footprint');
    assert(await page.inputValue('#point-width')==='10'&&await page.inputValue('#point-depth')==='10','Breite/Tiefe');
    await page.click('#view-3d');await page.waitForTimeout(400);await shot('fp01-3d.png');await page.click('#view-2d');
    return `${out.schema}, ${p.footprint.length} Ecken, 10 × 10 m`;
  });

  await step('FP02','Diagonal in die Aussparung: stoppt in der Innenecke (9,3 · −0,7)',async()=>{
    await page.click('#walk-enter');await waitState('playing');await page.waitForTimeout(200);
    await hold('KeyW',4000);const b=await pose();
    assert(b.x>=9.2&&b.x<=9.5&&b.z>=-.8&&b.z<=-.5,`steht bei ${JSON.stringify(b)}`);await shot('fp02-corner.png');
    return `X ${b.x} · Z ${b.z}`;
  });

  await step('FP03','In der Ecke: Haus L untersuchbar',async()=>{
    await page.waitForFunction(()=>!document.getElementById('runtime-hint').hidden,null,{timeout:3000});
    await page.keyboard.press('Enter');await page.waitForTimeout(150);
    const title=await page.textContent('#runtime-info-name');assert(title==='Haus L',title);
    await page.keyboard.press('Enter');await page.click('#runtime-exit');await waitState('editing');await page.waitForTimeout(300);return title;
  });

  await step('FP04','Breite ändern skaliert den Umriss',async()=>{
    await page.fill('#point-width','20');await page.press('#point-width','Tab');await page.waitForTimeout(200);
    const debug=await page.evaluate(()=>({notice:document.getElementById('notice').textContent,value:document.getElementById('point-width').value,disabled:document.getElementById('point-width').disabled,inert:document.querySelector('.inspector').inert}));const p=(await exportJson()).points[0];assert(p.width===20&&p.footprint[1][0]===10,JSON.stringify(debug)+JSON.stringify(p.footprint));return JSON.stringify(p.footprint);
  });

  await step('FP05','Keine Konsolenfehler',async()=>{assert(!errors.length,errors.join(' | '));return 'none';});
}finally{await browser.close();await close();}
const failed=results.filter(r=>!r.ok).length;console.log(`${results.length-failed}/${results.length} footprint browser checks passed.`);process.exitCode=failed?1:0;
