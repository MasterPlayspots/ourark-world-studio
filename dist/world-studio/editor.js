import {worlds} from '../worlds/data.js';
import {createDocument,createObject,validateDocument,History,clone,clamp,worldById} from './model.js';
import {WorldEditorRenderer} from './renderer.js';
import {groundLevel,sceneColliders,prepareWorldWalk} from './walk.js';
import {createWalkMode,LABELS_EN} from '../runtime/walk-host.js';
import {validateDocument as validateMap} from '../map-studio/model.js';
import {prepareWalk} from '../runtime/map-adapter.js';
import {PLAYER} from '../runtime/physics/adapter.js';
import {loadCity,saveCity,removeCity} from './city-store.js';
import {listScans,loadScan} from '../runtime/scan/loader.js';
import {prepareScanWalk,SCAN_FORMAT,SCAN_ID} from '../runtime/scan/adapter.js';
import {CHECK,DEVICE_CHECK_FORMAT,summarize,deviceInfo,reportText} from '../runtime/device-check.js';

const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=name=>`<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const storageKey='motionspec-world-studio-v1';
const documents=new Map(worlds.map(w=>[w.id,createDocument(w)]));
const histories=new Map(worlds.map(w=>[w.id,new History()]));
const dirty=new Set(),saved=new Set();
const systemMotion=matchMedia('(prefers-reduced-motion: reduce)');
let active='alpine',engine=null,preview=false,playing=false,manualReduced=false,mode='translate',dragSnapshot=null,noticeTimer;
const doc=()=>documents.get(active);
// Uploaded world: a Map Studio project (motionspec.map.v1–v3) shown as a sixth world — view, select, walk.
const CITY='city',MAP_SCHEMA=/^motionspec\.map\.v\d+$/,CITY_LIST_LIMIT=300,MAX_UPLOAD=16*1024*1024;
const CITY_KINDS={building:'BUILDING',station:'STATION',marker:'DATA POINT'};
let city=null,citySelected=null,cityGeneration=0;
// A map image must decode to at most 8192 px per side (same rule as the Map Studio): no decompression bombs on the GPU.
function checkImage(doc){
  const image=doc.map.image;if(!image)return Promise.resolve(doc);
  return new Promise((resolve,reject)=>{const probe=new Image();probe.onload=()=>{if(!probe.naturalWidth||probe.naturalWidth>8192||probe.naturalHeight>8192)reject(new Error('The map image is larger than 8192 px per side.'));else resolve(doc);};probe.onerror=()=>reject(new Error('The map image is damaged or not supported.'));probe.src=image.dataUrl;});
}
const isCity=()=>active===CITY&&Boolean(city);
// Scan worlds (ADR 0003): rooms baked by worldscan, listed by /api/scenes and loaded from /scenes/<id>/. View,
// replay the source camera and walk — never edited here. Address: #scan:<sha256>.
const SCAN_PREFIX='scan:';let scans=[],scan=null,scanGeneration=0;
const isScan=()=>active.startsWith(SCAN_PREFIX)&&Boolean(scan)&&active===SCAN_PREFIX+scan.id;
const isExternal=()=>isCity()||active.startsWith(SCAN_PREFIX);
const selected=()=>doc().objects.find(o=>o.id===doc().selected);
const reduced=()=>systemMotion.matches||manualReduced;
function notify(message){$('#notice').textContent=message;$('#notice').classList.add('show');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('#notice').classList.remove('show'),4200);}
function setSaveStatus(){ $('#save-status').textContent=dirty.has(active)?'Unsaved changes':saved.has(active)?'Saved on this device':'Sample design · not saved'; }
function restoreSaved(){
  try{
    const value=localStorage.getItem(storageKey);if(!value)return;
    const bundle=JSON.parse(value);if(!Array.isArray(bundle.worlds)||bundle.worlds.length>5)throw new Error('Invalid saved draft.');
    const validated=bundle.worlds.map(validateDocument);
    for(const value of validated){documents.set(value.world,value);saved.add(value.world);}
  }catch(error){notify('Saved drafts could not be loaded. The sample worlds are ready; you can import an exported scene.');}
}
function renderLibrary(){
  const uploaded=city?`<button class="world-card" data-world="${CITY}" aria-pressed="${isCity()}" aria-label="Open uploaded world ${esc(city.name)}"><span class="city-thumb" aria-hidden="true">▦</span><span><strong>${esc(city.name)}</strong><small>06 / UPLOADED · ${city.points.length} buildings</small></span></button>`:'';
  const scanned=scans.map((s,i)=>`<button class="world-card" data-world="${SCAN_PREFIX}${s.id}" aria-pressed="${active===SCAN_PREFIX+s.id}" aria-label="Open scan world ${esc(s.name)}"><span class="city-thumb" aria-hidden="true">◳</span><span><strong>${esc(s.name)}</strong><small>${String(6+(city?1:0)+i).padStart(2,'0')} / SCAN · ${Number(s.stats.triangles)||0} triangles</small></span></button>`).join('');
  $('#world-library').innerHTML=worlds.map(w=>`<button class="world-card" data-world="${w.id}" aria-pressed="${w.id===active}" aria-label="Edit ${esc(w.name)}"><img src="/worlds/assets/${w.image}" alt="" width="120" height="90"><span><strong>${esc(w.name)}</strong><small>${w.number} / ${esc(w.category.split(' / ')[0])}</small></span></button>`).join('')+uploaded+scanned;
  document.querySelector('.navigator .small-count').textContent=String(5+(city?1:0)+scans.length).padStart(2,'0');
}
// --- Uploaded world panels: a building list (the first CITY_LIST_LIMIT), the selected building's data. ---
function renderCity(){
  const count=city.points.length;$('#object-count').textContent=String(count).padStart(2,'0');$('#pins').replaceChildren();$('#destinations').replaceChildren();
  const rows=city.points.slice(0,CITY_LIST_LIMIT).map(p=>`<div class="object-row ${p.id===citySelected?'selected':''}"><button data-select="${esc(p.id)}" aria-pressed="${p.id===citySelected}" aria-label="Select ${esc(p.name)}">${icon('cube')}<span>${esc(p.name)}</span></button></div>`).join('');
  $('#object-list').innerHTML=rows+(count>CITY_LIST_LIMIT?`<p class="more">… and ${count-CITY_LIST_LIMIT} more — select them in the scene.</p>`:'')||'<p class="field-note">This world has no buildings.</p>';
  $('#scene-status').textContent=`${count} buildings · ${city.map.width} × ${city.map.depth} m · View`;
  $('#city-summary').textContent=`${city.name}: ${count} buildings on ${city.map.width} × ${city.map.depth} m.${city.attribution?' '+city.attribution:''}`;
  renderBuilding();
}
function renderBuilding(){
  const building=city.points.find(p=>p.id===citySelected);
  $('#object-kind').textContent=building?CITY_KINDS[building.type]:'UPLOADED WORLD';
  $('#selection-status').textContent=building?`${building.name} selected`:'No building selected';
  $('#city-building-name').textContent=building?.name??'No building selected';
  $('#city-building-meta').textContent=building?`${CITY_KINDS[building.type].toLowerCase()} · ${building.height} m high · ${building.width} × ${building.depth} m${building.footprint?' · footprint':''}`:'Select a building in the list or the scene. Enter world walks it at real scale.';
  const list=$('#city-building-data');list.replaceChildren();
  for(const [key,value] of Object.entries(building?.data??{})){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=key;dd.textContent=typeof value==='string'?value:JSON.stringify(value);list.append(dt,dd);}
  $('#focus').disabled=!building||!engine?.available;
}
function selectBuilding(id){
  if(!city.points.some(p=>p.id===id))return;citySelected=id;engine?.select(id);
  document.querySelectorAll('#object-list [data-select]').forEach(b=>{const on=b.dataset.select===id;b.setAttribute('aria-pressed',String(on));b.parentElement.classList.toggle('selected',on);});
  renderBuilding();
}
function enterCity({writeUrl=true}={}){
  active=CITY;playing=false;dragSnapshot=null;preview=false;leaveScanUi();document.body.classList.remove('is-preview');document.body.classList.add('is-city');
  $('#world-title').textContent=city.name;document.title=city.name+' — 3D World Studio';$('#destination').hidden=true;$('#destinations').hidden=true;
  $('#city-info').hidden=false;$('#canvas-help').textContent='Drag to orbit · right drag to pan · scroll to zoom · click a building to inspect it';$('#scene-label').textContent='UPLOADED WORLD / REAL SCALE';
  $('#attribution').textContent=city.attribution??'';$('#attribution').hidden=!city.attribution;
  engine?.loadCity(city,true);if(citySelected)engine?.select(citySelected);renderLibrary();renderCity();syncMotion();
  if(writeUrl)history.replaceState(null,'',`#${CITY}`);
}
// --- Scan worlds ---
function leaveScanUi(){
  scanGeneration++;scan=null;document.body.classList.remove('is-scan');$('#scan-info').hidden=true;$('#walk-enter').disabled=false;
  const source=$('#camera-view option[value="source"]');source.hidden=true;if($('#camera-view').value==='source')$('#camera-view').value='perspective';
}
function renderScan(){
  const loaded=isScan(),listed=scans.find(s=>SCAN_PREFIX+s.id===active),stats=loaded?scan.stats:listed?.stats??{};
  $('#object-count').textContent=String(Number(stats.batches)||0);
  $('#object-list').innerHTML=loaded?[...new Set(scan.root.children.map(o=>o.userData.semantic??o.name).filter(name=>name!=='sky-dome'))].map(name=>`<div class="object-row"><button disabled aria-disabled="true">${icon('cube')}<span>${esc(name)}</span></button></div>`).join(''):'<p class="field-note">Loading the scan …</p>';
  $('#scan-name').textContent=loaded?scan.manifest.name??'Scan':listed?.name??'Scan';
  $('#scan-meta').textContent=loaded?`${stats.triangles} triangles · ${stats.drawCalls} draw calls · ${stats.colliders} colliders · floor at ${stats.floorY} m`:'Checking and loading the scene files …';
  const list=$('#scan-data');list.replaceChildren();
  if(loaded)for(const [key,value] of [['Scene id',scan.id.slice(0,16)+'…'],['Source objects',stats.sourceObjects],['Source camera',scan.camera?.frames?`${scan.camera.frames.length} frames at ${scan.camera.fps} fps`:'none'],['Light',scan.lightMap?`baked · Cycles ${scan.lighting.bake.samples} samples · ${scan.lighting.lightmap.size}² atlas`:'real-time sun and lamps']]){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=key;dd.textContent=String(value);list.append(dt,dd);}
  $('#object-kind').textContent='SCAN WORLD';$('#scene-status').textContent=loaded?`${stats.batches} material batches · view only`:'Loading …';$('#selection-status').textContent='Not editable · walk or replay';$('#save-status').textContent='Published scene · read only';
  $('#focus').disabled=true;$('#walk-enter').disabled=!loaded||!engine?.available;
}
async function enterScan(id,{writeUrl=true}={}){
  walk.session.exit();leaveScanUi();const generation=scanGeneration;
  active=SCAN_PREFIX+id;playing=false;dragSnapshot=null;preview=false;
  document.body.classList.remove('is-preview');document.body.classList.add('is-city','is-scan');$('#city-info').hidden=true;$('#scan-info').hidden=false;$('#attribution').hidden=true;
  $('#world-title').textContent=scans.find(s=>s.id===id)?.name??'Scan world';$('#scene-label').textContent='SCAN WORLD / REAL SCALE';
  $('#canvas-help').textContent='Drag to orbit · right drag to pan · scroll to zoom · Source camera replays the video path';
  if(writeUrl)history.replaceState(null,'',`#${active}`);renderLibrary();renderScan();syncMotion();
  try{
    const loaded=await loadScan(id);
    if(generation!==scanGeneration){loaded.root.traverse(o=>{o.geometry?.dispose();o.material?.dispose?.();});return;}
    scan=loaded;$('#world-title').textContent=loaded.manifest.name??'Scan world';document.title=$('#world-title').textContent+' — 3D World Studio';
    engine?.loadScan(loaded);$('#camera-view option[value="source"]').hidden=!loaded.camera?.frames?.length;
    // Map data credits travel with the bundle (e.g. OpenStreetMap, ODbL) and are shown like an uploaded city's.
    const credit=typeof loaded.manifest.attribution==='string'?loaded.manifest.attribution.slice(0,300):'';$('#attribution').textContent=credit;$('#attribution').hidden=!credit;renderScan();
  }catch(error){if(generation!==scanGeneration)return;notify(`The scan world could not be opened: ${error.message}`);setWorld('alpine');}
}
function renderObjects(){
  $('#object-count').textContent=String(doc().objects.length).padStart(2,'0');
  $('#object-list').innerHTML=doc().objects.length?doc().objects.map(o=>`<div class="object-row ${o.id===doc().selected?'selected':''} ${o.visible?'':'is-hidden'}"><button data-select="${esc(o.id)}" aria-pressed="${o.id===doc().selected}" aria-label="Select ${esc(o.name)}">${icon(o.kind==='panel'?'grid':o.kind==='text'?'select':'cube')}<span>${esc(o.name)}</span>${o.locked?'<svg class="object-lock" aria-label="Locked"><use href="#i-lock"/></svg>':''}</button><button class="icon-button" data-visible="${esc(o.id)}" aria-label="${o.visible?'Hide':'Show'} ${esc(o.name)}" aria-pressed="${o.visible}" ${preview?'disabled':''}>${icon('eye')}</button></div>`).join(''):'<p class="field-note">Your world is empty. Add an object to start.</p>';
  $('#scene-status').textContent=`${doc().objects.filter(o=>o.visible).length} of ${doc().objects.length} objects · ${preview?'Preview':'Editing'}`;
}
function setInputValue(id,value){const input=$('#'+id);if(input)input.value=value;}
function syncInspector(){
  const object=selected();$('#properties').hidden=!object;$('#empty-selection').hidden=!!object;
  $('#object-kind').textContent=object?.kind||'WORLD';$('#selection-status').textContent=object?object.name+(object.locked?' · locked':' selected'):'No object selected';
  if(object){
    $('#selected-name').textContent=object.name;setInputValue('object-name',object.name);
    for(const prop of ['position','rotation','scale'])for(let i=0;i<3;i++)setInputValue(`${prop}-${'xyz'[i]}`,Number(object[prop][i].toFixed(2)));
    $('#visible').checked=object.visible;$('#locked').checked=object.locked;$('#page-enabled').checked=object.page.enabled;
    setInputValue('object-color',object.color||worldById(active).accent);setInputValue('animation',object.animation);setInputValue('page-title',object.page.title);setInputValue('page-body',object.page.body);
    $('#lock-note').textContent=object.locked?'Unlock this object to change its design.':'Use the axis handles or enter exact values.';
    $('#properties').querySelectorAll('input,textarea,select').forEach(el=>el.disabled=preview||(object.locked&&!['locked','visible'].includes(el.id)));
    $('#duplicate').disabled=preview||doc().objects.length>=100;$('#delete').disabled=preview||object.locked;
    $('#original-color').disabled=preview||object.locked;$('#visit-destination').disabled=!object.visible||!object.page.enabled;
  }
  $('#landscape-toggle').checked=doc().settings.landscape;$('#grid-toggle').checked=doc().settings.grid;$('#exposure').value=doc().settings.exposure;$('#exposure-value').value=doc().settings.exposure.toFixed(1);
  for(const id of ['landscape-toggle','grid-toggle','exposure','reset-world','add-object'])$('#'+id).disabled=preview;
  $('#focus').disabled=!object||!object.visible||!engine?.available;
  $('#undo').disabled=preview||!histories.get(active).past.length;$('#redo').disabled=preview||!histories.get(active).future.length;
  document.querySelectorAll('[data-tool]').forEach(b=>b.disabled=preview||!engine?.available);
  $('#snap').disabled=preview||!engine?.available;
  $('#landscape').hidden=!doc().settings.landscape;setSaveStatus();
}
function renderPins(){
  const objects=doc().objects.filter(o=>o.visible&&o.page.enabled);
  $('#pins').innerHTML=objects.map((o,i)=>`<button class="pin" data-pin="${esc(o.id)}" aria-label="${preview?'Visit':'Select'} ${esc(o.name)}" aria-pressed="${o.id===doc().selected}" hidden>${String(i+1).padStart(2,'0')}<span class="pin-label">${esc(o.name)}</span></button>`).join('');
  $('#destinations').innerHTML=objects.map((o,i)=>`<button data-destination="${esc(o.id)}" aria-pressed="${o.id===doc().selected}">${String(i+1).padStart(2,'0')} · ${esc(o.name)}</button>`).join('');
  if(!objects.length)$('#destinations').textContent='No visible destinations. Enable “Website destination” on an object to add one.';
}
function render(){if(active.startsWith(SCAN_PREFIX)){renderScan();engine?.request();return;}if(isCity()){renderCity();engine?.request();return;}renderObjects();syncInspector();renderPins();engine?.request();}
function record(before){if(histories.get(active).record(before,doc()))dirty.add(active);setSaveStatus();}
function commit(action,{rebuild=false}={}){
  if(preview||isExternal())return;const before=clone(doc());action(doc());record(before);
  if(rebuild)engine?.load(doc());else{for(const object of doc().objects)engine?.applyObject(object);engine?.select(doc().selected);engine?.updateSettings();engine?.updateRoute();}
  render();
}
function changeObject(updates){const object=selected();if(!object||object.locked||preview)return;commit(()=>Object.assign(object,updates));}
function selectObject(id,{focus=false,visit=preview}={}){
  if(isCity()){selectBuilding(id);return;}
  if(isExternal())return;
  if(!doc().objects.some(o=>o.id===id))return;doc().selected=id;engine?.select(id);renderObjects();syncInspector();
  document.querySelectorAll('[data-pin],[data-destination]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.pin||b.dataset.destination)===id)));
  if(focus)engine?.focus(id);if(visit)showDestination();
}
function setWorld(id,{writeUrl=true}={}){
  if(id===CITY&&city){enterCity({writeUrl});return;}
  if(id?.startsWith(SCAN_PREFIX)&&SCAN_ID.test(id.slice(SCAN_PREFIX.length))){enterScan(id.slice(SCAN_PREFIX.length),{writeUrl});return;}
  leaveScanUi();document.body.classList.remove('is-city');$('#city-info').hidden=true;$('#attribution').hidden=true;if($('#scene-label').textContent.startsWith('UPLOADED'))$('#scene-label').textContent='PERSPECTIVE / WEBGL';
  if(!worldById(id))id='alpine';active=id;playing=false;dragSnapshot=null;preview=false;document.body.classList.remove('is-preview');
  const world=worldById(id);$('#world-title').textContent=world.name;document.title=world.name+' — 3D World Studio';
  $('#landscape').style.backgroundImage=`url('/worlds/assets/${world.image}')`;$('#destination').hidden=true;$('#destinations').hidden=true;
  $('#edit-mode').setAttribute('aria-pressed','true');$('#preview-mode').setAttribute('aria-pressed','false');$('#canvas-help').textContent='Drag an axis to edit · drag empty space to orbit · scroll to zoom';
  engine?.setPreview(false);engine?.load(doc(),true);engine?.setMode(mode);engine?.setSnap($('#snap').checked);renderLibrary();render();syncMotion();
  $('#camera-view').value='perspective';if(writeUrl)history.replaceState(null,'',`#${id}`);
}
function setPreview(value){
  if(isCity())return;
  preview=value;document.body.classList.toggle('is-preview',value);$('#edit-mode').setAttribute('aria-pressed',String(!value));$('#preview-mode').setAttribute('aria-pressed',String(value));
  $('#destinations').hidden=!value;$('#destination').hidden=true;$('#canvas-help').textContent=value?'Your edited world · select a destination to visit its page':'Drag an axis to edit · drag empty space to orbit · scroll to zoom';
  engine?.setPreview(value);render();
}
function showDestination(){
  if(isCity())return;
  const object=selected();if(!object||!object.page.enabled||!object.visible)return;
  $('#destination-kind').textContent=worldById(active).name+' / '+object.name;$('#destination-title').textContent=object.page.title||object.name;$('#destination-body').textContent=object.page.body;
  $('#destination').hidden=false;engine?.focus(object.id);
}
function nextDestination(direction){if(isExternal())return;const stops=doc().objects.filter(o=>o.visible&&o.page.enabled);if(!stops.length)return;const index=stops.findIndex(o=>o.id===doc().selected);selectObject(stops[(index+direction+stops.length)%stops.length].id,{visit:true});}
function setTool(value){if(preview)return;mode=value;engine?.setMode(value);document.querySelectorAll('[data-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tool===value)));}
function syncMotion(){if(reduced())playing=false;engine?.setMotion(playing,reduced());document.body.classList.toggle('reduced',reduced());$('#reduce-motion').checked=reduced();$('#play').disabled=reduced()||!engine?.available;$('#play').innerHTML=icon(playing?'pause':'play')+`<span>${playing?'Pause motion':'Play motion'}</span>`;$('#play').setAttribute('aria-pressed',String(playing));}
function undo(redo=false){if(preview||isExternal())return;const next=histories.get(active)[redo?'redo':'undo'](doc());if(!next)return;documents.set(active,next);dirty.add(active);engine?.load(doc());render();notify(redo?'Change restored.':'Change undone.');}
function duplicate(){if(isExternal())return;const object=selected();if(!object||preview||doc().objects.length>=100)return;commit(d=>{const copy=clone(object);copy.id=crypto.randomUUID();copy.name=(object.name+' copy').slice(0,60);copy.position[0]=clamp(copy.position[0]+1.5,-100,100);copy.locked=false;d.objects.push(copy);d.selected=copy.id;},{rebuild:true});notify('Object duplicated.');}
function remove(){if(isExternal())return;const object=selected();if(!object||object.locked||preview)return;commit(d=>{const index=d.objects.findIndex(o=>o.id===object.id);d.objects.splice(index,1);d.selected=d.objects[Math.min(index,d.objects.length-1)]?.id||null;},{rebuild:true});notify('Object removed. Undo is available.');}
function addObject(kind){
  if(isCity())return;
  if(preview||doc().objects.length>=100){notify('This scene supports up to 100 objects.');return;}
  commit(d=>{const object=createObject(kind,d.objects.length);object.position=[0,kind==='panel'?3:1,3];object.name+=` ${d.objects.filter(o=>o.kind===kind).length+1}`;d.objects.push(object);d.selected=object.id;},{rebuild:true});
  $('#add-dialog').close();notify('Object added. Use the handles or inspector to shape it.');
}
function save(){try{localStorage.setItem(storageKey,JSON.stringify({version:1,worlds:[...documents.values()]}));worlds.forEach(w=>saved.add(w.id));dirty.clear();setSaveStatus();notify('All five worlds saved on this device.');}catch(error){notify('Device storage is unavailable. Export your scene to keep your design.');}}
function exportScene(){if(isExternal())return;const blob=new Blob([JSON.stringify(doc(),null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`motionspec-${active}-scene.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Scene exported. Import it here to continue editing.');}
function unavailable(){playing=false;$('#fallback').hidden=false;$('#scene-label').textContent='3D UNAVAILABLE / PROPERTY EDITOR';syncMotion();syncInspector();}

restoreSaved();
try{
  engine=new WorldEditorRenderer($('#canvas'),{
    onSelect:id=>selectObject(id),onEditStart:()=>{dragSnapshot=clone(doc());},
    onTransform:(id,transform)=>{const object=doc().objects.find(o=>o.id===id);if(object&&!object.locked){Object.assign(object,transform);syncInspector();}},
    onEditEnd:()=>{if(dragSnapshot){record(dragSnapshot);dragSnapshot=null;render();}},
    onProject:points=>{const pins=new Map([...document.querySelectorAll('[data-pin]')].map(el=>[el.dataset.pin,el]));for(const p of points){const pin=pins.get(p.id);if(pin){pin.hidden=!p.visible;pin.style.left=p.x+'px';pin.style.top=p.y+'px';}}},
    onUnavailable:unavailable,onSourceStop:()=>{$('#camera-view').value='perspective';}
  });
}catch(error){console.warn('3D initialization unavailable:',error);unavailable();}

$('#world-library').addEventListener('click',e=>{const button=e.target.closest('[data-world]');if(button)setWorld(button.dataset.world);});
$('#object-list').addEventListener('click',e=>{const pick=e.target.closest('[data-select]'),visibility=e.target.closest('[data-visible]');if(pick)selectObject(pick.dataset.select);if(visibility&&!preview){const id=visibility.dataset.visible;commit(d=>{const object=d.objects.find(o=>o.id===id);object.visible=!object.visible;});document.querySelector(`[data-visible="${CSS.escape(id)}"]`)?.focus();}});
$('#pins').addEventListener('click',e=>{const button=e.target.closest('[data-pin]');if(button)selectObject(button.dataset.pin);});
$('#destinations').addEventListener('click',e=>{const button=e.target.closest('[data-destination]');if(button)selectObject(button.dataset.destination,{visit:true});});
document.querySelectorAll('[data-tool]').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool)));
$('#object-name').addEventListener('change',e=>changeObject({name:e.target.value.trim().slice(0,60)||'Object'}));
document.querySelectorAll('[data-vector]').forEach(input=>input.addEventListener('change',()=>{
  const object=selected();if(!object||object.locked||preview)return;const value=Number(input.value);
  if(!Number.isFinite(value)){syncInspector();notify('Enter a valid number.');return;}
  const property=input.dataset.vector,values=[...object[property]];values[Number(input.dataset.axis)]=clamp(value,Number(input.min),Number(input.max));changeObject({[property]:values});
}));
$('#visible').addEventListener('change',e=>commit(()=>{selected().visible=e.target.checked;}));
$('#locked').addEventListener('change',e=>commit(()=>{selected().locked=e.target.checked;}));
$('#object-color').addEventListener('change',e=>changeObject({color:e.target.value}));
$('#original-color').addEventListener('click',()=>changeObject({color:''}));
$('#animation').addEventListener('change',e=>changeObject({animation:e.target.value}));
for(const [id,key] of [['page-title','title'],['page-body','body'],['page-enabled','enabled']])$('#'+id).addEventListener('change',e=>{const object=selected();if(object)changeObject({page:{...object.page,[key]:key==='enabled'?e.target.checked:e.target.value}});});
$('#landscape-toggle').addEventListener('change',e=>commit(d=>{d.settings.landscape=e.target.checked;}));
$('#grid-toggle').addEventListener('change',e=>commit(d=>{d.settings.grid=e.target.checked;}));
$('#exposure').addEventListener('change',e=>commit(d=>{d.settings.exposure=Number(e.target.value);}));
$('#exposure').addEventListener('input',e=>{$('#exposure-value').value=Number(e.target.value).toFixed(1);if(engine){engine.renderer.toneMappingExposure=Number(e.target.value);engine.request();}});
$('#edit-mode').addEventListener('click',()=>setPreview(false));$('#preview-mode').addEventListener('click',()=>setPreview(true));
$('#visit-destination').addEventListener('click',()=>{setPreview(true);showDestination();});
$('#close-destination').addEventListener('click',()=>{$('#destination').hidden=true;});
$('#next-destination').addEventListener('click',()=>nextDestination(1));$('#previous-destination').addEventListener('click',()=>nextDestination(-1));
$('#overview').addEventListener('click',()=>{engine?.overview();$('#camera-view').value='perspective';});$('#focus').addEventListener('click',()=>{if(isCity())engine?.focus(citySelected);else if(!isExternal())engine?.focus(doc().selected);});
$('#camera-view').addEventListener('change',e=>{if(e.target.value==='perspective')engine?.overview();else engine?.cameraView(e.target.value);});
$('#snap').addEventListener('change',e=>engine?.setSnap(e.target.checked));
$('#play').addEventListener('click',()=>{playing=!playing;syncMotion();});$('#reduce-motion').addEventListener('change',e=>{manualReduced=e.target.checked;if(systemMotion.matches&&!manualReduced)notify('Your system’s reduced-motion preference is respected.');syncMotion();});
systemMotion.addEventListener('change',syncMotion);document.addEventListener('visibilitychange',()=>{if(document.hidden){playing=false;syncMotion();}});
$('#add-object').addEventListener('click',()=>$('#add-dialog').showModal());document.querySelectorAll('[data-add]').forEach(b=>b.addEventListener('click',()=>addObject(b.dataset.add)));
$('#help').addEventListener('click',()=>$('#help-dialog').showModal());document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
$('#reset-world').addEventListener('click',()=>$('#reset-dialog').showModal());$('#confirm-reset').addEventListener('click',()=>{const before=clone(doc());documents.set(active,createDocument(worldById(active)));record(before);engine?.load(doc(),true);render();$('#reset-dialog').close();notify('Original world restored. You can undo this.');});
$('#duplicate').addEventListener('click',duplicate);$('#delete').addEventListener('click',remove);$('#undo').addEventListener('click',()=>undo());$('#redo').addEventListener('click',()=>undo(true));
$('#save').addEventListener('click',save);$('#export').addEventListener('click',exportScene);$('#import').addEventListener('click',()=>$('#import-file').click());
// Import: a scene of one of the five worlds (≤ 1 MB), or a Map Studio project uploaded as a walkable world (≤ 16 MB).
async function uploadWorld(input){
  const next=await checkImage(validateMap(input));
  if(!next.points.length)throw new Error('This map has no buildings to walk between.');
  cityGeneration++;walk.session.exit();city=next;citySelected=null;setWorld(CITY);
  let stored=true;try{await saveCity(next);}catch{stored=false;}
  notify(`“${next.name}” uploaded: ${next.points.length} buildings on ${next.map.width} × ${next.map.depth} m. Enter world to walk it.${stored?'':' It could not be stored on this device and is gone after a reload.'}`);
}
$('#city-remove').addEventListener('click',async()=>{if(!city)return;cityGeneration++;city=null;citySelected=null;try{await removeCity();}catch{}setWorld('alpine');notify('Uploaded world removed from this device.');});
$('#import-file').addEventListener('change',async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;try{if(file.size>MAX_UPLOAD)throw new Error('Choose a file smaller than 16 MB.');const text=await file.text();
  // Only Map Studio projects may be larger than 1 MB: check before parsing (their schema comes first when exported).
  if(file.size>1024*1024&&!/"schema"\s*:\s*"motionspec\.map\.v\d+"/.test(text.slice(0,4096)))throw new Error('Choose a scene smaller than 1 MB, or a Map Studio project.');
  const input=JSON.parse(text);if(MAP_SCHEMA.test(input?.schema??'')){await uploadWorld(input);return;}if(file.size>1024*1024)throw new Error('Choose a scene smaller than 1 MB.');const imported=validateDocument(input);const before=clone(documents.get(imported.world));documents.set(imported.world,imported);histories.get(imported.world).record(before,imported);dirty.add(imported.world);setWorld(imported.world);notify('Scene imported. Undo restores the previous version.');}catch(error){notify(error.message||'This file could not be imported.');}});
document.addEventListener('keydown',e=>{
  if(document.body.dataset.runtime)return;// walk mode: the shared InputRouter owns the keyboard
  if(e.target.closest('input,textarea,select,[contenteditable=true]')||document.querySelector('dialog[open]'))return;
  const key=e.key.toLowerCase();
  if(isExternal()){if(isCity()&&key==='f'&&!e.ctrlKey&&!e.metaKey)engine?.focus(citySelected);return;}
  if(e.key==='Escape'){if(!$('#destination').hidden)$('#destination').hidden=true;else if(preview)setPreview(false);return;}
  if((e.ctrlKey||e.metaKey)&&key==='s'){e.preventDefault();save();return;}
  if((e.ctrlKey||e.metaKey)&&key==='z'){e.preventDefault();undo(e.shiftKey);return;}
  if((e.ctrlKey||e.metaKey)&&key==='d'){e.preventDefault();duplicate();return;}
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(key==='f'){engine?.focus(doc().selected);return;}
  if(preview)return;
  const tools={q:'select',w:'translate',e:'rotate',r:'scale'};if(tools[key]){setTool(tools[key]);return;}
  if((key==='delete'||key==='backspace')&&e.target===$('#canvas')){e.preventDefault();remove();return;}
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','PageUp','PageDown'].includes(e.key)&&e.target===$('#canvas')){
    const object=selected();if(!object||object.locked)return;e.preventDefault();const position=[...object.position],step=e.shiftKey?1:.25;
    const axis=e.key.startsWith('Page')?1:['ArrowLeft','ArrowRight'].includes(e.key)?0:2;
    const direction=['ArrowLeft','ArrowUp','PageDown'].includes(e.key)?-1:1;position[axis]=clamp(position[axis]+step*direction,-100,100);changeObject({position});
  }
});
addEventListener('hashchange',()=>{const id=location.hash.slice(1);if((worldById(id)||(id===CITY&&city)||(id.startsWith(SCAN_PREFIX)&&SCAN_ID.test(id.slice(SCAN_PREFIX.length))))&&id!==active){walk.session.exit();setWorld(id,{writeUrl:false});}});
addEventListener('beforeunload',e=>{if(dirty.size){e.preventDefault();e.returnValue='';}});
// Walk mode: the same runtime as the Map Studio (runtime/walk-host.js) on the 3D diorama. Colliders come from the
// scene as rendered; the document and history stay untouched (the session works on a frozen snapshot).
const walk=createWalkMode({
  // The engine is returned even after a lost WebGL context, so leaving the walk always restores it.
  $:id=>document.getElementById(id),getRenderer:()=>engine,getDocument:()=>isScan()?{schema:SCAN_FORMAT,id:scan.id,colliders:scan.colliders,camera:scan.camera}:isCity()?city:doc(),notice:notify,labels:LABELS_EN,
  editorRegions:()=>document.querySelectorAll('.topbar,.navigator,.inspector,.toolbar,.mode-switch,.destinations,.statusbar'),
  beforeEnter:()=>{$('#destination').hidden=true;return true;},
  prepare:snapshot=>{
    if(!engine?.available)throw new Error(LABELS_EN.unavailable);
    // Scan world: real scale (metres), colliders baked by worldscan, start where the source camera begins.
    if(snapshot.schema===SCAN_FORMAT){if(!isScan()||scan.id!==snapshot.id)throw new Error('The scan world is still loading.');return prepareScanWalk({...snapshot,extent:engine.scanExtent()});}
    // Uploaded world: real scale (metres), the same physics and start search as the Map Studio.
    if(MAP_SCHEMA.test(snapshot.schema)){const w=prepareWalk(snapshot);return {start:w.start,physics:w.world,colliders:w.colliders,targets:snapshot.points,groundY:0,eye:PLAYER.eye};}
    const groundY=groundLevel(engine.builtRoot),units=engine.walkUnits(),colliders=sceneColliders(units,{groundY});
    // Destinations can be inspected by their whole footprint, also floating panels (no height band).
    const pages=new Set(snapshot.objects.filter(o=>o.visible&&o.page.enabled).map(o=>o.id));
    const targets=sceneColliders(units.filter(u=>pages.has(u.id)),{groundY,height:1e3,step:-1e3}).map(t=>({...t,page:snapshot.objects.find(o=>o.id===t.id).page}));
    return prepareWorldWalk({worldId:snapshot.world,groundY,colliders,targets});
  },
  describe:target=>target.page?({type:'DESTINATION',name:target.page.title||target.name,entries:target.page.body?[[target.name,target.page.body]]:[]}):({type:CITY_KINDS[target.type],name:target.name,entries:Object.entries(target.data??{})}),
  onEditing:()=>render(),
  onFrame:(dt,scale)=>frameListener?.(dt,scale)
});
$('#scan-quality').addEventListener('change',e=>engine?.setQuality(e.target.value));
// --- Device check (W8, A2): the walk on the source camera path at adaptive resolution; `?checkSeconds=N` for tests.
let frameListener=null,checkRunning=false;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function deviceCheck(){
  if(!isScan()||checkRunning||!engine?.available)return;checkRunning=true;$('#scan-device-check').disabled=true;
  const seconds=Math.min(120,Math.max(2,Number(new URLSearchParams(location.search).get('checkSeconds'))||CHECK.seconds)),warmup=Math.round(seconds*CHECK.warmupShare*10)/10;
  const errors=[],onViolation=e=>errors.push(`CSP ${e.violatedDirective} ${e.blockedURI||''}`.trim().slice(0,200)),onError=e=>errors.push(String(e.message).slice(0,200));
  document.addEventListener('securitypolicyviolation',onViolation);addEventListener('error',onError);
  const frames=[],scales=[];let started=0;
  try{
    $('#walk-enter').click();
    for(let i=0;i<80&&document.body.dataset.runtime!=='playing';i++)await sleep(100);
    if(document.body.dataset.runtime!=='playing')throw new Error('The walk did not start.');
    walk.setView('source');started=performance.now();
    frameListener=(dt,scale)=>{scales.push(scale);if(performance.now()-started>=warmup*1000)frames.push(dt);};
    while(performance.now()-started<seconds*1000){await sleep(250);if(document.body.dataset.runtime!=='playing')throw new Error('The check was paused (tab hidden, focus lost or Escape) — please run it again without switching away.');}
  }catch(error){errors.push(error.message);}
  finally{frameListener=null;document.removeEventListener('securitypolicyviolation',onViolation);removeEventListener('error',onError);}
  const device=deviceInfo(document.getElementById('canvas'));walk.session.exit();
  const report={format:DEVICE_CHECK_FORMAT,time:new Date().toISOString(),scene:scan.id,revision:document.querySelector('meta[name="revision"]')?.content??null,seconds,warmup,device,result:summarize(frames,scales),errors};
  const text=reportText(report);
  $('#device-check-result').textContent=text;$('#device-check-verdict').textContent=report.result.a2?'✓ A2 passed: the adaptive resolution holds 60 fps on this device.':'✗ A2 not reached on this device (details below).';
  $('#device-check-stored').textContent='Storing the result …';$('#device-check-dialog').showModal();
  try{
    const response=await fetch('/api/device-check',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(report),credentials:'same-origin'});
    const answer=await response.json().catch(()=>({}));
    $('#device-check-stored').textContent=response.ok?(answer.stored?`Stored for the acceptance matrix (${answer.stored}).`:'Checked; this server does not store results.'):`Not stored (${response.status}). Copy the result instead.`;
  }catch{$('#device-check-stored').textContent='Not stored (offline). Copy the result instead.';}
  $('#device-check-copy').onclick=()=>navigator.clipboard?.writeText(text).then(()=>notify('Result copied.'),()=>notify('Copying is not allowed here; select the text instead.'));
  checkRunning=false;$('#scan-device-check').disabled=false;
}
$('#scan-device-check').addEventListener('click',deviceCheck);
setWorld(location.hash.slice(1)||'alpine',{writeUrl:false});
// Published scan worlds join the library when this server lists any (the live Worker does from W6 on).
listScans().then(list=>{scans=list;renderLibrary();}).catch(()=>{});
// The uploaded world comes back from device storage; opened directly when the address says #city.
// A stored world that no longer validates is removed and reported; an upload or removal meanwhile wins.
{const generation=cityGeneration;
loadCity().then(async saved=>{
  if(!saved||generation!==cityGeneration)return;
  let restored;try{restored=await checkImage(validateMap(saved));}catch(error){removeCity().catch(()=>{});notify(`The stored uploaded world could not be opened and was removed: ${error.message}`);return;}
  if(generation!==cityGeneration)return;city=restored;if(location.hash==='#'+CITY)setWorld(CITY,{writeUrl:false});else renderLibrary();
}).catch(()=>{});}
