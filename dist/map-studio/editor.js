import {demoDocument,validateDocument,newPoint,copy,editableShell,History,categories,MAX_POINTS,MAX_MAP_METRES,resizePoint,MAX_IMAGE_BYTES,MAX_UPLOAD_BYTES,movePoint,withType,enhanceTarget,enhancedName} from './model.js';
import {loadLocal,saveLocal,listLocal,loadProject,SaveConflict} from './storage.js';
import {readProject,serializeProject,projectBytes,checkEditBudget,newWorldId,MAX_PROJECT_BYTES,budgetText,mb} from './project.js';
import {prepareWalk} from '../runtime/map-adapter.js';
import {mapFitsNetwork,ROOM_BOUND} from '../runtime/net/protocol.js';
import {isValidated} from '../runtime/frozen.js';
import {createWalkMode,LABELS_DE} from '../runtime/walk-host.js';

const $=id=>document.getElementById(id);
// meta: project identity around the map payload (worldId, revision, …; contracts/map-project-v1.md).
let dragPoints=null,dragIndex=-1;
let doc=demoDocument(),meta={worldId:newWorldId(),revision:0},docBytes=projectBytes(doc,meta),selected=doc.points[0].id,mode='2d',renderer=null,dirty=false,revision=0,placing=false,dragBefore=null,noticeTimer,importing=false;
const history=new History(),labelPool=[],rows=new Map();
// Large maps (PR D): at most MAX_LABELS name labels are shown — those nearest to the middle of the view — from a
// fixed pool of buttons; the point list only updates rows that changed.
const MAX_LABELS=60;let pointById=new Map(),rowOrder='',pressedRow=null;
const current=()=>pointById.get(selected)??doc.points.find(p=>p.id===selected);
function notice(message){$('notice').textContent=message;$('notice').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').hidden=true,5000);}
function setStatus(message){$('status').textContent=message;}
function networkHint(map){const fit=mapFitsNetwork(map);return fit.ok?`Multiplayer-Reichweite: ±${ROOM_BOUND.toLocaleString('de-DE')} m um die Kartenmitte – passt.`:`Diese Karte reicht ±${fit.reach.toLocaleString('de-DE')} m weit, Multiplayer-Positionen nur ±${fit.limit.toLocaleString('de-DE')} m. Für gemeinsames Begehen ist sie zu groß; Bearbeiten und Begehen allein funktionieren.`;}
function historyControls(){$('undo').disabled=!history.past.length;$('redo').disabled=!history.future.length;}
function markChanged(){dirty=true;revision++;setStatus('Ungespeicherte Änderungen');historyControls();}
const editing=()=>session.state==='editing';
// Async imports can resolve after „Welt betreten“; they are discarded instead of changing the walked document.
function assertEditing(){if(!editing())throw new Error('Import verworfen: Der Begehmodus wurde währenddessen gestartet. Bitte nach der Rückkehr erneut importieren.');}
// While a point is dragged the document is the drag's own: other edits, Undo/Redo and replacing the document wait until
// it is dropped (otherwise History records states out of order, or the drop records over a replaced document).
const dragging=()=>dragBefore!==null;
const DRAG_BUSY='Bitte zuerst den gezogenen Punkt ablegen.';
function mutate(action,message){
  if(!editing())return;
  if(dragging()){notice(DRAG_BUSY);return;}
  // Only the shell is copied: actions replace points, they never change one in place (points are frozen).
  const before=doc,draft=editableShell(doc);
  try{action(draft);const next=validateDocument(draft),bytes=projectBytes(next,meta);checkEditBudget(docBytes,bytes);if(history.record(before,next)){doc=next;docBytes=bytes;markChanged();}render();if(message)notice(message);}
  catch(error){notice(error.message);render();}
}
function editPoint(key,value){if(!current())return;if(current().locked&&key!=='locked'){notice('Punkt zuerst entsperren.');renderInspector();return;}mutate(d=>{const i=d.points.findIndex(p=>p.id===selected);d.points[i]=key==='type'?withType(d.points[i],value):key==='width'||key==='depth'?resizePoint(d.points[i],key,value):{...d.points[i],[key]:value};});}
function select(id){selected=pointById.has(id)?id:null;renderer?.select(selected);renderList();renderInspector();updateLabelSelection();}
function renderList(){
  $('count').textContent=String(doc.points.length).padStart(2,'0');
  const ids=new Set();
  for(const p of doc.points){
    ids.add(p.id);let entry=rows.get(p.id);
    // Unchanged (frozen, same object) points skip the row comparison entirely.
    if(entry&&entry.point===p&&isValidated(p))continue;
    const key=[p.name,p.type,p.height,p.locked,p.visible,p.color].join('\u0000');
    if(!entry){const row=document.createElement('button');row.className='point-row';row.dataset.id=p.id;row.setAttribute('aria-pressed','false');row.onclick=()=>select(row.dataset.id);entry={row,key:null,point:null};rows.set(p.id,entry);}
    entry.point=p;
    if(entry.key!==key){
      const row=entry.row;entry.key=key;row.style.setProperty('--point-color',p.color);row.title=`${p.name} · ${categories[p.type]}${p.locked?' · Gesperrt':''}${!p.visible?' · Ausgeblendet':''}`;
      const dot=document.createElement('span');dot.className='dot';dot.setAttribute('aria-hidden','true');const content=document.createElement('span'),name=document.createElement('strong'),detail=document.createElement('small'),flags=document.createElement('span');name.textContent=p.name;detail.textContent=`${categories[p.type]} · ${p.height} m`;flags.className='row-flags';flags.textContent=p.locked?'LOCK':!p.visible?'AUS':'';content.append(name,detail);row.replaceChildren(dot,content,flags);
    }
  }
  for(const [id] of rows)if(!ids.has(id))rows.delete(id);
  const order=doc.points.map(p=>p.id).join('\u0000');
  if(order!==rowOrder){rowOrder=order;$('point-list').replaceChildren(...doc.points.map(p=>rows.get(p.id).row));pressedRow=null;
    if(!doc.points.length){const empty=document.createElement('p');empty.className='hint';empty.textContent='Noch keine Punkte. Mit + einen Punkt in der Mitte hinzufügen.';$('point-list').append(empty);}}
  const pressed=rows.get(selected)?.row??null;
  if(pressed!==pressedRow){for(const row of $('point-list').querySelectorAll('.point-row[aria-pressed=true]'))row.setAttribute('aria-pressed','false');pressed?.setAttribute('aria-pressed','true');pressedRow=pressed;}
  $('add').disabled=doc.points.length>=MAX_POINTS;$('place').disabled=!renderer||doc.points.length>=MAX_POINTS;
}
function renderInspector(){
  const p=current();$('properties').hidden=!p;$('no-selection').hidden=Boolean(p);$('type-badge').textContent=p?categories[p.type].toUpperCase():'—';$('focus').disabled=!p||!renderer||!p.visible;
  $('selection-info').textContent=p?`${p.name}${p.locked?' · gesperrt':!p.visible?' · ausgeblendet':' ausgewählt'}`:'Keine Auswahl';
  if(!p)return;
  $('selected-name').textContent=p.name;$('point-id').textContent=p.id;
  for(const key of ['name','type','x','z','width','depth','height','rotation','color']){$(`point-${key}`).value=p[key];$(`point-${key}`).disabled=p.locked;}
  $('point-visible').checked=p.visible;$('point-visible').disabled=p.locked;$('point-locked').checked=p.locked;
  for(const key of ['solid','interactive']){$(`point-${key}`).checked=p[key];$(`point-${key}`).disabled=p.locked;}
  $('geometry').disabled=p.locked;$('point-data').value=JSON.stringify(p.data,null,2);$('point-data').disabled=p.locked;$('data-apply').disabled=p.locked;$('delete').disabled=p.locked;$('duplicate').disabled=doc.points.length>=MAX_POINTS;$('data-error').hidden=true;
  document.querySelectorAll('[data-color]').forEach(b=>b.disabled=p.locked);
}
function renderLabels(){
  while(labelPool.length<Math.min(MAX_LABELS,doc.points.length)){const button=document.createElement('button');button.className='map-label';button.hidden=true;button.onclick=()=>select(button.dataset.id);labelPool.push(button);$('labels').append(button);}
  while(labelPool.length>Math.min(MAX_LABELS,doc.points.length))labelPool.pop().remove();
  for(const button of labelPool)button.hidden=true;
}
// Called by the renderer after each frame with the projected position of every visible point.
function placeLabels(positions){
  let shown=positions.filter(p=>p.visible);
  // Nearest to the middle first (the selection always): each distance is computed once, not in every comparison.
  if(shown.length>labelPool.length){const d=new Map(shown.map(p=>[p,(p.id===selected?-1e6:0)+Math.hypot(p.x-50,p.y-50)]));shown=shown.sort((a,b)=>d.get(a)-d.get(b)).slice(0,labelPool.length);}
  labelPool.forEach((button,i)=>{
    const p=shown[i];if(!p){if(!button.hidden)button.hidden=true;return;}
    const point=pointById.get(p.id),name=point?.name??'';
    if(button.dataset.id!==p.id){button.dataset.id=p.id;button.setAttribute('aria-pressed',String(p.id===selected));}
    if(button.textContent!==name){button.textContent=name;button.title=name;button.setAttribute('aria-label',`${name} auswählen`);}
    button.hidden=false;button.style.left=`${p.x}%`;button.style.top=`${p.y}%`;
  });
}
function updateLabelSelection(){for(const button of labelPool)button.setAttribute('aria-pressed',String(button.dataset.id===selected));}
function render(){
  pointById=new Map(doc.points.map(p=>[p.id,p]));
  if(!pointById.has(selected))selected=doc.points[0]?.id??null;
  $('project-name').value=doc.name;$('title').textContent=doc.name;$('map-width').value=doc.map.width;$('map-depth').value=doc.map.depth;$('map-color').value=doc.map.color;$('map-name').textContent=doc.map.image?.name??'Leere Kartenfläche';$('map-detail').textContent=`${doc.map.width} × ${doc.map.depth} m${mapFitsNetwork(doc.map).ok?'':' · größer als die Multiplayer-Reichweite'}`;$('map-detail').title=networkHint(doc.map);$('image-remove').hidden=!doc.map.image;$('image-enhance').hidden=!doc.map.image;$('map-color').disabled=Boolean(doc.map.image);
  $('attribution').textContent=doc.attribution??'';$('attribution').hidden=!doc.attribution;
  renderList();renderInspector();renderLabels();renderer?.sync(doc,selected);historyControls();
}
function add(x=0,z=0){
  if(doc.points.length>=MAX_POINTS){notice(`Maximal ${MAX_POINTS.toLocaleString('de-DE')} Infrastrukturpunkte.`);return;}
  const p=movePoint(newPoint(doc.points.length+1),x,z,doc.map,$('snap').checked);selected=p.id;mutate(d=>d.points.push(p));setPlacing(false);renderer?.select(selected);
}
function setPlacing(value){placing=value;$('place').setAttribute('aria-pressed',String(value));renderer?.setPlacing(value);$('controls').textContent=value?'Auf die Karte klicken, um einen Punkt zu setzen · Escape beendet':mode==='2d'?'Punkt ziehen · freie Fläche verschieben · Scrollen zum Zoomen':'Achsen ziehen · freie Fläche drehen · Rechtsklick verschieben · Scrollen zum Zoomen';}
function setMode(value){mode=value;setPlacing(false);$('view-2d').setAttribute('aria-pressed',String(value==='2d'));$('view-3d').setAttribute('aria-pressed',String(value==='3d'));$('projection').textContent=value==='2d'?'ORTHOGRAFISCH / 2D':'PERSPEKTIVE / 3D';document.querySelector('.compass').hidden=value==='3d';renderer?.setMode(value);}
function stepHistory(direction){if(!editing())return;if(dragging()){notice(DRAG_BUSY);return;}setPlacing(false);const next=history[direction](doc);if(!next)return;doc=next;docBytes=projectBytes(doc,meta);markChanged();render();renderer?.resize();}
// A file of the same world (or an old file without world id) replaces the document as one undoable step and keeps
// the local revision, so the next save is not refused. Another world opens separately: with a fresh history (Undo
// must not carry its content into the other key) and only when nothing unsaved would be lost. → opened?
function openProject(next,nextMeta,message,{saved=false}={}){
  if(dragging()){notice(DRAG_BUSY);return false;}
  if(nextMeta.worldId!==meta.worldId){
    if(dirty){notice('Ungespeicherte Änderungen: bitte zuerst lokal speichern oder exportieren, dann das andere Projekt öffnen.');return false;}
    history.past=[];history.future=[];history.release();doc=next;meta=nextMeta;selected=doc.points[0]?.id??null;
    if(saved){dirty=false;revision++;setStatus(`Lokales Kartenprojekt geöffnet · Revision ${meta.revision}`);}else markChanged();
  }else{
    meta={...nextMeta,revision:meta.revision};
    if(history.record(doc,next)){doc=next;selected=doc.points[0]?.id??null;markChanged();}
  }
  docBytes=projectBytes(doc,meta);render();renderer?.overview();
  notice(docBytes>MAX_PROJECT_BYTES?`${message} Achtung: ${mb(docBytes)} MB, über ${budgetText()} – bitte verkleinern; bis dahin nur als Sicherung exportierbar.`:message);
  return true;
}
async function showLocalProjects(){
  let list=[];try{list=(await listLocal()).filter(p=>p.worldId!==meta.worldId);}catch{}
  $('local-projects').hidden=!list.length;
  $('local-list').replaceChildren(...list.map(p=>{
    const button=document.createElement('button'),name=document.createElement('strong'),detail=document.createElement('span');
    button.className='import-choice';name.textContent=p.name;detail.textContent=`Revision ${p.revision} · Welt ${p.worldId.slice(0,8)}`;button.append(name,detail);
    button.onclick=async()=>{
      $('import-dialog').close();if(!editing())return;
      try{const stored=await loadProject(p.worldId);if(!stored)throw new Error('Projekt nicht mehr vorhanden.');if(stored.doc.map.image)await decodeImage(stored.doc.map.image.dataUrl);assertEditing();
        openProject(stored.doc,stored.meta,`„${stored.doc.name}“ geöffnet.`,{saved:true});}
      catch(error){notice(error.message);}
    };
    return button;
  }));
}
function fileData(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Datei konnte nicht gelesen werden.'));reader.readAsDataURL(file);});}
async function decodeImage(dataUrl){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{if(image.naturalWidth>8192||image.naturalHeight>8192||!image.naturalWidth||!image.naturalHeight){reject(new Error('Bild: maximal 8.192 Pixel pro Seite.'));return;}resolve({width:image.naturalWidth,height:image.naturalHeight});};image.onerror=()=>reject(new Error('Das Kartenbild ist beschädigt oder wird nicht unterstützt.'));image.src=dataUrl;});}
async function withImport(input,action){
  const file=input.files[0];input.value='';if(!file)return;if(importing){notice('Ein Import wird bereits verarbeitet.');return;}importing=true;
  try{await action(file);}catch(error){notice(error.message);}finally{importing=false;}
}

$('project-name').onchange=e=>mutate(d=>d.name=e.target.value);
for(const key of ['width','depth'])$(`map-${key}`).onchange=e=>{const value=Number(e.target.value);mutate(d=>d.map[key]=value);renderer?.overview();};
$('map-color').onchange=e=>mutate(d=>d.map.color=e.target.value);
// Kartenbild verbessern: renderboost via /api/enhance (Worker, same login; locally the dev proxy). The result
// replaces the image through mutate(), so Undo restores the original; nothing is sent without a click.
let enhancing=false;
const decimal=n=>n.toLocaleString('de-DE',{maximumFractionDigits:1});
$('image-enhance').onclick=async()=>{
  const image=doc.map.image,button=$('image-enhance');if(!image||enhancing||!editing())return;
  enhancing=true;button.disabled=true;button.textContent='Wird verbessert …';setStatus('Kartenbild wird verbessert …');
  try{
    const size=await decodeImage(image.dataUrl),target=enhanceTarget(size);
    const response=await fetch('/api/enhance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({inputBase64:image.dataUrl.slice(image.dataUrl.indexOf(',')+1),targetWidth:target.width,targetHeight:target.height,format:'webp',quality:90})});
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error([404,405,503].includes(response.status)&&!result.error?'Die Bildverbesserung ist hier nicht verfügbar.':result.error||`Fehler ${response.status}.`);
    if(!/^image\/(webp|png|jpeg)$/.test(result.contentType)||typeof result.outputBase64!=='string')throw new Error('Unerwartete Antwort der Bildverbesserung.');
    const dataUrl=`data:${result.contentType};base64,${result.outputBase64}`;
    if(dataUrl.length>MAX_IMAGE_BYTES*1.4)throw new Error('Das verbesserte Bild ist größer als 8 MB.');
    const out=await decodeImage(dataUrl);assertEditing();
    if(doc.map.image?.dataUrl!==image.dataUrl)throw new Error('Das Kartenbild wurde währenddessen geändert. Bitte erneut verbessern.');
    const cpu=result.compute?.cpuTotalMs>=0?` · ${decimal(result.compute.cpuTotalMs/1000)} CPU-s`:'',cached=response.headers.get('x-rb-cache')==='hit'?' · aus dem Cache':'';
    mutate(d=>{d.map.image={name:enhancedName(image.name,result.contentType),dataUrl};},`Kartenbild verbessert: ${size.width} × ${size.height} → ${out.width} × ${out.height} px${cpu}${cached}. Rückgängig mit Undo.`);
  }catch(error){notice(`Bildverbesserung nicht möglich: ${error.message}`);setStatus(dirty?'Ungespeicherte Änderungen':'Bereit');}
  finally{enhancing=false;button.disabled=false;button.textContent='Kartenbild verbessern (4K)';}
};
$('image-remove').onclick=()=>mutate(d=>d.map.image=null,'Kartenbild entfernt. Die Punkte bleiben erhalten.');
for(const key of ['name','type','x','z','width','depth','height','rotation','color'])$(`point-${key}`).onchange=e=>editPoint(key,['x','z','width','depth','height','rotation'].includes(key)?Number(e.target.value):e.target.value);
for(const key of ['visible','locked','solid','interactive'])$(`point-${key}`).onchange=e=>editPoint(key,e.target.checked);
document.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{if(current())editPoint('color',b.dataset.color);});
$('data-apply').onclick=()=>{try{const data=JSON.parse($('point-data').value);if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Bitte ein JSON-Objekt eingeben, zum Beispiel {"Status":"bereit"}.');editPoint('data',data);}catch(error){$('data-error').textContent=error.message;$('data-error').hidden=false;$('point-data').focus();}};
$('add').onclick=()=>add();$('place').onclick=()=>setPlacing(!placing);$('view-2d').onclick=()=>setMode('2d');$('view-3d').onclick=()=>setMode('3d');$('overview').onclick=()=>renderer?.overview();$('focus').onclick=()=>renderer?.focus();$('snap').onchange=e=>renderer?.setSnap(e.target.checked);
$('undo').onclick=()=>stepHistory('undo');$('redo').onclick=()=>stepHistory('redo');
$('delete').onclick=()=>{if(!current()||current().locked)return;mutate(d=>d.points=d.points.filter(p=>p.id!==selected),'Punkt entfernt. Rückgängig ist verfügbar.');};
$('duplicate').onclick=()=>{const source=current();if(!source||doc.points.length>=MAX_POINTS)return;const p={...copy(source),id:crypto.randomUUID(),name:`${source.name.slice(0,70)} Kopie`,locked:false,x:Math.min(source.x+3,MAX_MAP_METRES/2),z:Math.min(source.z+3,MAX_MAP_METRES/2)};selected=p.id;mutate(d=>d.points.push(p));};
$('save').onclick=async()=>{
  const snapshot=copy(doc),savedMeta={...meta},savedRevision=revision;$('save').disabled=true;
  try{
    const stored=await saveLocal(snapshot,savedMeta);
    // Meanwhile another project may have been opened: its revision is not this save's.
    if(meta.worldId===savedMeta.worldId){meta={...meta,revision:stored};docBytes=projectBytes(doc,meta);}
    if(revision===savedRevision){dirty=false;setStatus(`In diesem Browser gespeichert · Revision ${stored}`);}notice('Kartenprojekt lokal gespeichert.');
  }catch(error){notice(error instanceof SaveConflict?error.message:'Lokales Speichern fehlgeschlagen. Bitte das Projekt als Datei exportieren.');}
  finally{$('save').disabled=false;}
};
// Export always writes the complete project (also when older data is over budget: a lossless backup), but says
// clearly when this file is too large for the import below.
$('export').onclick=()=>{
  const json=serializeProject(doc,meta),blob=new Blob([json],{type:'application/json'}),oversize=blob.size>MAX_PROJECT_BYTES,url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=`${doc.name.toLowerCase().replace(/[^a-z0-9-]+/g,'-').slice(0,70)||'karte'}${oversize?'.sicherung':''}.map.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  notice(oversize?`Sicherung exportiert (${mb(blob.size)} MB). Achtung: über ${budgetText()} – diese Datei lässt sich hier nicht wieder importieren.`:'Kartenprojekt mit Bild, Punktdaten und Projekt-ID exportiert.');
};
$('import').onclick=()=>{$('import-dialog').showModal();showLocalProjects();};$('help').onclick=()=>$('help-dialog').showModal();document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
const choose=kind=>{$('import-dialog').close();$(`${kind}-file`).click();};$('image-import').onclick=()=>choose('image');$('choose-image').onclick=()=>choose('image');$('choose-points').onclick=()=>choose('points');$('choose-project').onclick=()=>choose('project');
$('image-file').onchange=e=>withImport(e.target,async file=>{
  if(file.size>MAX_UPLOAD_BYTES||!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Bitte PNG, JPEG oder WebP bis 4 MB wählen.');
  const dataUrl=await fileData(file),size=await decodeImage(dataUrl);assertEditing();
  mutate(d=>{d.map.image={name:file.name.slice(0,160),dataUrl};d.map.depth=Math.max(10,Math.min(MAX_MAP_METRES,Math.round(d.map.width*size.height/size.width*10)/10));},'Kartenbild geladen. Breite und Tiefe links in Metern einstellen.');renderer?.overview();
});
$('project-file').onchange=e=>withImport(e.target,async file=>{
  if(file.size>MAX_PROJECT_BYTES)throw new Error(`Kartenprojekt: maximal ${budgetText()} (diese Datei hat ${mb(file.size)} MB).`);
  const read=readProject(JSON.parse(await file.text())),next=read.doc,nextMeta=read.hasWorldId?read.meta:{...read.meta,worldId:meta.worldId};
  if(next.map.image)await decodeImage(next.map.image.dataUrl);assertEditing();
  openProject(next,nextMeta,nextMeta.worldId===meta.worldId?'Kartenprojekt geöffnet.':'Kartenprojekt geöffnet. Es wird getrennt von anderen Projekten in diesem Browser gespeichert (Import → „In diesem Browser gespeichert“).');
});
$('points-file').onchange=e=>withImport(e.target,async file=>{
  if(file.size>2*1024*1024)throw new Error('Punktdatei: maximal 2 MB.');const points=JSON.parse(await file.text());assertEditing();if(!Array.isArray(points))throw new Error('Die Punktdatei muss eine JSON-Liste enthalten.');
  if(doc.points.length+points.length>MAX_POINTS)throw new Error(`Zusammen sind maximal ${MAX_POINTS.toLocaleString('de-DE')} Punkte möglich.`);
  const additions=points.map((p,i)=>{if(!p||typeof p!=='object'||Array.isArray(p))throw new Error('Ungültiger Punkt.');return {...newPoint(doc.points.length+i+1),...p};});
  const next=validateDocument({...doc,points:[...doc.points,...additions]}),bytes=projectBytes(next,meta);checkEditBudget(docBytes,bytes);if(history.record(doc,next)){doc=next;docBytes=bytes;selected=additions[0]?.id??selected;markChanged();render();}notice(`${additions.length} Infrastrukturpunkte ergänzt.`);
});
window.addEventListener('keydown',e=>{
  if(!editing())return;
  if(document.querySelector('dialog[open]')||e.target.closest('input,textarea,select,[contenteditable=true]'))return;
  if(e.key==='Escape'){setPlacing(false);return;}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();stepHistory(e.shiftKey?'redo':'undo');return;}
  if(e.target!==$('canvas'))return;
  if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();$('delete').click();return;}
  if(e.key.toLowerCase()==='f'){renderer?.focus();return;}
  const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},delta=directions[e.key],p=current();
  if(delta&&p&&!p.locked){e.preventDefault();const step=e.shiftKey?5:1;mutate(d=>{const index=d.points.findIndex(p=>p.id===selected);d.points[index]=movePoint(p,p.x+delta[0]*step,p.z+delta[1]*step,d.map,$('snap').checked);});}
});
// --- Begehmodus (ADR 0001): the runtime works on a frozen snapshot; the document and history stay untouched.
// The wiring (session, input, fullscreen, adaptive resolution, HUD, inspect panel) lives in runtime/walk-host.js.
const {session}=createWalkMode({
  $,getRenderer:()=>renderer,getDocument:()=>doc,notice,labels:LABELS_DE,
  editorRegions:()=>document.querySelectorAll('.library,.inspector,.toolbar,.title-actions,.topbar .actions,.topbar nav'),
  beforeEnter:()=>{if(importing){notice('Bitte warten, bis der Import abgeschlossen ist.');return false;}setPlacing(false);return true;},
  // Colliders and a checked start (Welle 2, ADR 0002); throws a user-facing message if no safe start exists.
  prepare:snapshot=>{const walk=prepareWalk(snapshot);return {start:walk.start,source:walk.source,physics:walk.world,colliders:walk.colliders,targets:snapshot.points};},
  describe:point=>({type:categories[point.type].toUpperCase(),name:point.name,entries:Object.entries(point.data??{})}),
  onEditing:()=>{renderList();renderInspector();renderLabels();}
});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
render();
try{
  const {MapRenderer}=await import('./renderer.js');
  renderer=new MapRenderer($('canvas'),{
    select,
    // The untouched document stays as `before`. Each move makes a new document (nothing is changed in place) on one
    // copied point list per drag; the renderer follows it for labels and focus. On drop the result is validated like
    // any edit and recorded as one step; nothing else can change the document meanwhile (see dragging()).
    start:()=>{dragBefore=doc;dragPoints=null;},
    move:(id,x,z)=>{
      if(!dragPoints){dragPoints=[...doc.points];dragIndex=dragPoints.findIndex(p=>p.id===id);}
      if(dragIndex<0||dragPoints[dragIndex].id!==id)return;
      dragPoints[dragIndex]={...dragPoints[dragIndex],x,z};doc={...dragBefore,points:dragPoints};pointById.set(id,dragPoints[dragIndex]);renderer?.follow(doc);
      if(id===selected){$('point-x').value=x;$('point-z').value=z;}
    },
    end:()=>{
      if(dragBefore){
        try{const next=validateDocument(doc),bytes=projectBytes(next,meta);checkEditBudget(docBytes,bytes);
          if(history.record(dragBefore,next)){doc=next;docBytes=bytes;markChanged();}else doc=dragBefore;}
        catch(error){doc=dragBefore;notice(error.message);}
      }
      dragBefore=null;dragPoints=null;render();
    },
    place:add,
    labels:placeLabels,
    error:message=>{$('fallback-text').textContent=message;$('fallback').hidden=false;}
  });renderer.setSnap($('snap').checked);render();renderer.overview();
}catch(error){$('fallback').hidden=false;for(const id of ['view-2d','view-3d','place','overview','focus','walk-enter'])$(id).disabled=true;notice('Grafik nicht verfügbar. Eigenschaften und Export sind weiterhin nutzbar.');}
const restoreRevision=0;
try{const saved=await loadLocal();if(saved&&revision===restoreRevision&&editing()&&!dragging()){const restored=saved.doc;if(restored.map.image)await decodeImage(restored.map.image.dataUrl);if(revision===restoreRevision&&editing()&&!dragging()){doc=restored;meta=saved.meta;docBytes=projectBytes(doc,meta);selected=doc.points[0]?.id??null;render();renderer?.overview();setStatus(`Lokales Kartenprojekt geöffnet · Revision ${meta.revision}`);if(saved.migrated)notice('Lokales Projekt in das neue Projektformat übernommen; der alte Eintrag bleibt unverändert erhalten.');}}}catch{notice('Lokales Projekt konnte nicht geladen werden. Der Beispieldatensatz ist geöffnet.');}
