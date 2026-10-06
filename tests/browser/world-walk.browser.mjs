// World Studio walk mode in a real browser: enter the 3D diorama, walk at eye level, bump into a landmark,
// inspect a destination, return with an unchanged document, and enter all five worlds.
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {loadPlaywright,startServer,launch,recorder,assert,artifactDir} from './harness.mjs';
import {worlds} from '../../dist/worlds/data.js';

const playwright=loadPlaywright();
if(!playwright){console.log('SKIP: playwright-core not found (set PLAYWRIGHT_CORE).');process.exit(0);}
const {origin,close}=await startServer(),browser=await launch(playwright),{results,step}=recorder();
const page=await (await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true})).newPage(),errors=[];
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('pageerror',e=>errors.push(e.message));
const shot=name=>page.screenshot({path:path.join(artifactDir,name)});
const state=()=>page.evaluate(()=>document.body.dataset.runtime??'editing');
const waitState=s=>page.waitForFunction(s=>(document.body.dataset.runtime??'editing')===s,s,{timeout:8000});
const pose=async()=>{const [,x,z,h]=/X (-?[\d.]+) · Z (-?[\d.]+) · (\d+)°/.exec(await page.textContent('#runtime-position'));return {x:Number(x),z:Number(z),heading:Number(h)};};
const hold=async(code,ms)=>{await page.keyboard.down(code);await page.waitForTimeout(ms);await page.keyboard.up(code);await page.waitForTimeout(150);};
const exportJson=async()=>{const [d]=await Promise.all([page.waitForEvent('download'),page.click('#export')]);const f=path.join(artifactDir,`world-${Date.now()}.json`);await d.saveAs(f);return readFile(f,'utf8');};

try{
  await page.goto(origin+'/world-studio/#alpine',{waitUntil:'networkidle'});await page.waitForTimeout(600);
  const before=await exportJson();

  await step('WW01','Enter world: eye-level camera, HUD with fps, editor inert, editor overlays hidden',async()=>{
    await page.click('#walk-enter');await waitState('playing');
    await page.waitForFunction(()=>/fps/.test(document.getElementById('runtime-perf').textContent),null,{timeout:8000});
    const info=await page.evaluate(()=>({inert:[...document.querySelectorAll('.navigator,.inspector,.toolbar')].every(e=>e.inert),pins:getComputedStyle(document.getElementById('pins')).visibility,help:getComputedStyle(document.getElementById('canvas-help')).visibility,focus:document.activeElement?.id}));
    assert(info.inert,'editor regions inert');assert(info.pins==='hidden'&&info.help==='hidden','overlays hidden');assert(info.focus==='canvas',`focus ${info.focus}`);
    await shot('ww01-enter.png');return `${await page.textContent('#runtime-perf')} · ${await page.textContent('#runtime-position')}`;
  });

  await step('WW02','W walks north at 0.6 units/s (3 m/s at 1 unit = 5 m)',async()=>{
    const a=await pose();await hold('KeyW',2000);const b=await pose();const walked=a.z-b.z;
    assert(walked>.9&&walked<1.5,`${walked.toFixed(2)} units in 2 s`);return `${walked.toFixed(2)} units in 2 s`;
  });

  await step('WW03','Turning west and walking into the lakeside lodge stops the player in front of it',async()=>{
    await hold('KeyQ',750);const turned=(await pose()).heading;assert(turned>250&&turned<290,`facing west: ${turned}°`);
    await hold('KeyW',12000);const a=await pose();await hold('KeyW',1500);const b=await pose();
    // Blocked westwards; a heading a few degrees off 270° may slide slowly along the wall (z), which is correct.
    assert(Math.abs(a.x-b.x)<.05,`still moving west: ${JSON.stringify(a)} → ${JSON.stringify(b)}`);
    assert(b.x>-4.6&&b.x<-2,`stopped in front of the lodge (x ≈ -4.3): ${b.x}`);await shot('ww03-blocked.png');return `stopped at X ${b.x}`;
  });

  await step('WW04','Turn and walk towards the cabins until a destination is in reach; inspect it (text only)',async()=>{
    await page.keyboard.press('KeyR');await page.waitForTimeout(200);const start=await pose();
    // Turn towards the cabins (landmark 2 at x -1.8, z -1.8) by dragging, then walk until the hint appears.
    const heading=Math.atan2(-1.8-start.x,-(-1.8-start.z))*180/Math.PI,box=await page.locator('#canvas').boundingBox(),cx=box.x+box.width/2,cy=box.y+box.height/2;
    await page.mouse.move(cx,cy);await page.mouse.down();await page.mouse.move(cx+heading/.25,cy,{steps:8});await page.mouse.up();
    await page.keyboard.down('KeyW');
    await page.waitForFunction(()=>!document.getElementById('runtime-hint').hidden,null,{timeout:20000}).finally(()=>page.keyboard.up('KeyW'));
    const hint=await page.textContent('#runtime-hint');await page.keyboard.press('Enter');await page.waitForTimeout(150);
    const panel=await page.evaluate(()=>({open:!document.getElementById('runtime-info').hidden,type:document.getElementById('runtime-info-type').textContent,title:document.getElementById('runtime-info-name').textContent,body:document.getElementById('runtime-info-data').textContent}));
    assert(panel.open&&panel.type==='DESTINATION'&&panel.title.length>3&&panel.body.length>20,JSON.stringify(panel));
    await shot('ww04-inspect.png');await page.keyboard.press('Enter');return `${hint} → „${panel.title}“`;
  });

  await step('WW05','Back to the editor: document unchanged, editor usable again',async()=>{
    await page.click('#runtime-exit');await waitState('editing');await page.waitForTimeout(300);
    const after=await exportJson(),usable=await page.evaluate(()=>!document.querySelector('.inspector').inert&&getComputedStyle(document.getElementById('pins')).visibility==='visible');
    assert(after===before,'document changed');assert(usable,'editor usable');return 'export identical, editor active';
  });

  await step('WW06','All five worlds can be entered and left',async()=>{
    const seen=[];
    for(const world of worlds){
      await page.goto(`${origin}/world-studio/#${world.id}`,{waitUntil:'networkidle'});await page.waitForTimeout(300);
      await page.click('#walk-enter');await waitState('playing');await hold('KeyW',600);const p=await pose();
      await shot(`ww06-${world.id}.png`);await page.click('#runtime-exit');await waitState('editing');seen.push(`${world.id} Z ${p.z}`);
    }
    return seen.join(', ');
  });

  await step('WW07','No console errors',async()=>{assert(!errors.length,errors.join(' | '));return 'none';});
}finally{await browser.close();await close();}
const failed=results.filter(r=>!r.ok).length;console.log(`${results.length-failed}/${results.length} world walk browser checks passed.`);process.exitCode=failed?1:0;
