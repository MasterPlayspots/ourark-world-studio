import * as THREE from '../worlds/vendor/three.module.js';
import {OrbitControls} from '../worlds/vendor/OrbitControls.js';
import {TransformControls} from '../worlds/vendor/TransformControls.js';
import {buildWorld} from '../worlds/scene.js';
import {clamp,worldById} from './model.js';
import {CityLayer} from '../runtime/city-layer.js';
import {groundMesh,BASE_ORDER} from '../runtime/ground-layer.js';
import {sourceView} from '../runtime/camera-rig.js';

// Test and development aid: `?stats` publishes draw calls and triangles of the last frame.
const STATS=new URLSearchParams(globalThis.location?.search??'').has('stats');
// Test aid: `?frame=N` holds the source camera on frame N (0-based) instead of playing the path (W5 image check).
const HOLD_FRAME=(v=>v!==null&&Number.isInteger(Number(v))?Number(v):null)(new URLSearchParams(globalThis.location?.search??'').get('frame'));
// Camera reach for the dioramas (units ≈ 5 m) and for uploaded cities (metres, up to 5 km).
const DIORAMA={far:250,maxDistance:90,minDistance:3};
// Scan worlds are single rooms in metres; AgX with Exposure −0.15 EV like the Blender scene (HANDOFF §3.7).
const SCAN={far:80,maxDistance:18,minDistance:.3},SCAN_EXPOSURE=2**-.15;

function disposeTree(root) {
  if(!root)return;
  const geometries=new Set(),materials=new Set(),textures=new Set();
  root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m){materials.add(m);if(m.map)textures.add(m.map);}});
  textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());
}
function wrappedText(ctx,text,x,y,maxWidth,lineHeight,maxLines) {
  const words=text.split(/\s+/);let line='',count=0;
  for(let word of words){
    while(ctx.measureText(word).width>maxWidth&&word.length>1){
      if(line){ctx.fillText(line,x,y);y+=lineHeight;count++;line='';if(count>=maxLines)return;}
      let chunk='';while(word.length&&ctx.measureText(chunk+word[0]).width<=maxWidth){chunk+=word[0];word=word.slice(1);}
      ctx.fillText(chunk,x,y);y+=lineHeight;count++;if(count>=maxLines)return;
    }
    const next=line?`${line} ${word}`:word;
    if(ctx.measureText(next).width>maxWidth&&line){ctx.fillText(line,x,y);y+=lineHeight;count++;line=word;if(count>=maxLines)return;}else line=next;
  }
  if(line&&count<maxLines)ctx.fillText(line,x,y);
}
function panelTexture(record) {
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=600;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#1b1b1b';ctx.fillRect(0,0,1024,600);
  const gradient=ctx.createLinearGradient(0,0,1024,600);gradient.addColorStop(0,'#222222');gradient.addColorStop(1,'#171717');ctx.fillStyle=gradient;ctx.fillRect(0,0,1024,600);
  ctx.strokeStyle=record.color||'#4ade80';ctx.lineWidth=4;ctx.strokeRect(3,3,1018,594);
  ctx.fillStyle=record.color||'#4ade80';ctx.font='600 22px system-ui';ctx.fillText('Ourark World Studio / Your World',50,63);
  ctx.strokeStyle='#333333';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,96);ctx.lineTo(1024,96);ctx.stroke();
  ctx.fillStyle='#f2f2f2';ctx.font='600 60px system-ui';wrappedText(ctx,record.page.title||record.name,50,180,920,70,3);
  ctx.fillStyle='#bababa';ctx.font='29px system-ui';wrappedText(ctx,record.page.body,50,427,920,42,3);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
function textTexture(record) {
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=320;
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,1024,320);ctx.fillStyle=record.color||'#f2f2f2';ctx.font='600 72px system-ui';wrappedText(ctx,record.page.title||record.name,20,100,980,90,3);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
export class WorldEditorRenderer {
  constructor(canvas,callbacks={}) {
    this.canvas=canvas;this.callbacks=callbacks;this.frame=0;this.playing=false;this.reduced=false;this.preview=false;this.mode='translate';this.motionTime=0;this.items=new Map();this.available=true;
    this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(42,1,.1,250);this.camera.position.set(20,16,25);
    this.scene.add(new THREE.HemisphereLight('#d9ede0','#272727',2.6));
    const light=new THREE.DirectionalLight('#fff1de',3.2);light.position.set(-8,18,12);this.scene.add(light);
    this.rim=new THREE.DirectionalLight('#4ade80',2);this.rim.position.set(12,8,-10);this.scene.add(this.rim);
    this.raycaster=new THREE.Raycaster();
    this.renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
    this.editorPixelRatio=Math.min(window.devicePixelRatio||1,1.5);this.renderScale=this.editorPixelRatio;this.renderer.setPixelRatio(this.editorPixelRatio);this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.1;
    this.orbit=new OrbitControls(this.camera,canvas);this.orbit.target.set(0,1,-1);this.orbit.minDistance=3;this.orbit.maxDistance=90;this.orbit.maxPolarAngle=Math.PI*.49;this.orbit.enableDamping=false;
    this.orbit.addEventListener('change',()=>this.request());
    // Any pointer or wheel input on the canvas hands the camera back from the source path to the orbit.
    for(const type of ['pointerdown','wheel'])canvas.addEventListener(type,()=>{if(this.source){this.stopSource();this.callbacks.onSourceStop?.();}},{passive:true});
    this.transform=new TransformControls(this.camera,canvas);this.transform.setSize(.8);this.transform.setSpace('world');
    this.scene.add(this.transform.getHelper());
    this.transform.addEventListener('change',()=>this.request());
    this.transform.addEventListener('dragging-changed',e=>{this.orbit.enabled=!e.value;if(e.value)this.callbacks.onEditStart?.();else this.callbacks.onEditEnd?.();});
    this.transform.addEventListener('objectChange',()=>{
      const group=this.transform.object;if(!group)return;
      group.position.clampScalar(-100,100);group.scale.clampScalar(.1,10);
      this.callbacks.onTransform?.(group.userData.id,{position:group.position.toArray(),rotation:[group.rotation.x,group.rotation.y,group.rotation.z].map(n=>THREE.MathUtils.radToDeg(n)%360),scale:group.scale.toArray()});
      this.updateSelectionBox();this.updateRoute();this.request();
    });
    this.grid=new THREE.GridHelper(26,52,'#4ade80','#3f3f3f');this.grid.position.set(0,-.13,-1);this.grid.material.transparent=true;this.grid.material.opacity=.23;this.scene.add(this.grid);
    this.selectionBox=new THREE.Box3Helper(new THREE.Box3(),'#4ade80');this.selectionBox.material.depthTest=false;this.selectionBox.material.transparent=true;this.selectionBox.material.opacity=.75;this.selectionBox.renderOrder=20;this.selectionBox.visible=false;this.scene.add(this.selectionBox);
    canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;this.pointerStart={x:e.clientX,y:e.clientY,gizmo:this.transform.axis!==null};});
    canvas.addEventListener('pointerup',e=>{
      const start=this.pointerStart;this.pointerStart=null;
      if(this.runtime||!start||start.gizmo||Math.hypot(e.clientX-start.x,e.clientY-start.y)>5||!this.available)return;
      const rect=canvas.getBoundingClientRect();this.raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),this.camera);
      const roots=this.city?this.city.pickables():[...this.items.values()].map(item=>item.group).filter(g=>g.visible);
      const hit=this.raycaster.intersectObjects(roots,true).find(h=>h.object.isMesh);
      if(hit){let obj=hit.object;while(obj&&!obj.userData.id)obj=obj.parent;if(obj)this.callbacks.onSelect?.(obj.userData.id);}
      canvas.focus({preventScroll:true});
    });
    canvas.addEventListener('pointercancel',()=>{this.pointerStart=null;});
    canvas.addEventListener('dblclick',()=>{if(!this.preview&&!this.runtime)this.focus(this.selected);});
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.available=false;cancelAnimationFrame(this.frame);this.frame=0;this.callbacks.onUnavailable?.();});
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas.parentElement);
    document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(this.frame);this.frame=0;}else{this.lastTime=0;this.request();}});
    this.orbit.update();this.resize();
  }
  createItem(record,sources) {
    const group=new THREE.Group();group.userData.id=record.id;
    const visual=new THREE.Group();group.add(visual);
    if(record.kind==='landmark') {
      const source=sources[record.sourceIndex].clone(true);source.position.set(0,0,0);visual.add(source);
      source.traverse(o=>{if(o.isMesh)o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();});
    }else{
      const mat=new THREE.MeshStandardMaterial({color:record.color||'#4ade80',metalness:.25,roughness:.35});let geometry;
      if(record.kind==='box')geometry=new THREE.BoxGeometry(1.5,1.5,1.5);
      if(record.kind==='sphere')geometry=new THREE.SphereGeometry(.9,40,24);
      if(record.kind==='ring')geometry=new THREE.TorusGeometry(1,.15,18,64);
      if(record.kind==='panel'||record.kind==='text'){
        mat.dispose();const texture=record.kind==='panel'?panelTexture(record):textTexture(record);
        const face=new THREE.Mesh(new THREE.PlaneGeometry(3.6,record.kind==='panel'?2.1:1.125),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,transparent:record.kind==='text',alphaTest:record.kind==='text'?.01:0}));
        visual.add(face);
        if(record.kind==='panel'){const back=new THREE.Mesh(new THREE.BoxGeometry(3.64,2.14,.08),new THREE.MeshStandardMaterial({color:'#222222',metalness:.45,roughness:.25}));back.position.z=-.05;visual.add(back);}
      }else if(record.kind==='beacon'){
        const stem=new THREE.Mesh(new THREE.CylinderGeometry(.12,.22,1.7,24),mat);stem.position.y=.5;visual.add(stem);
        const ring=new THREE.Mesh(new THREE.TorusGeometry(.7,.11,16,48),mat);ring.position.y=1.7;visual.add(ring);
        const cap=new THREE.Mesh(new THREE.OctahedronGeometry(.32),mat);cap.position.y=1.7;visual.add(cap);
      }else if(geometry)visual.add(new THREE.Mesh(geometry,mat));
    }
    const originalMaterials=new Map();visual.traverse(o=>{if(o.isMesh){const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats)if(m.color&&!originalMaterials.has(m))originalMaterials.set(m,m.color.clone());}});
    this.content.add(group);this.items.set(record.id,{group,visual,originalMaterials,record,textureKey:record.page.title+'\n'+record.page.body+'\n'+record.color});
    this.applyObject(record);
  }
  load(doc,resetCamera=false) {
    this.transform.detach();this.selectionBox.visible=false;this.leaveCity();this.leaveScan();this.setReach(DIORAMA);
    if(this.content){this.scene.remove(this.content);disposeTree(this.content);}
    this.items.clear();this.doc=doc;this.content=new THREE.Group();this.scene.add(this.content);
    const world=worldById(doc.world),built=buildWorld(world);this.content.add(built.root);this.builtRoot=built.root;
    const sources=built.targets;
    for(const source of sources)built.root.remove(source);
    const oldRoute=built.root.children.at(-1);if(oldRoute?.geometry?.type==='TubeGeometry'){built.root.remove(oldRoute);disposeTree(oldRoute);}
    for(const record of doc.objects)this.createItem(record,sources);
    // Source templates share geometry with their clones; release only unused materials.
    const sourceMaterials=new Set();for(const source of sources)source.traverse(o=>{if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>sourceMaterials.add(m));});
    const usedMaterials=new Set();built.root.traverse(o=>{if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>usedMaterials.add(m));});
    for(const material of sourceMaterials)if(!usedMaterials.has(material))material.dispose();
    const usedGeometry=new Set(),sourceGeometry=new Set();this.content.traverse(o=>{if(o.geometry)usedGeometry.add(o.geometry);});
    for(const source of sources)source.traverse(o=>{if(o.geometry)sourceGeometry.add(o.geometry);});
    for(const geometry of sourceGeometry)if(!usedGeometry.has(geometry))geometry.dispose();
    this.rim.color.set(world.accent);this.updateSettings();this.updateRoute();this.select(doc.selected);if(resetCamera)this.overview();this.request();
  }
  // --- Uploaded worlds (a Map Studio project, metres): ground plane plus the city layer; view, select, walk. ---
  setReach({far,maxDistance,minDistance}){this.camera.far=far;this.camera.updateProjectionMatrix();this.orbit.maxDistance=maxDistance;this.orbit.minDistance=minDistance;}
  leaveCity(){if(!this.city)return;this.city.dispose();this.city=null;this.cityDoc=null;}
  loadCity(doc,resetCamera=false) {
    this.transform.detach();this.selectionBox.visible=false;this.leaveCity();this.leaveScan();
    if(this.content){this.scene.remove(this.content);disposeTree(this.content);}
    this.items.clear();this.doc=null;this.builtRoot=null;this.updateRoute();
    this.content=new THREE.Group();this.scene.add(this.content);this.cityDoc=doc;
    const {width,depth,color,image}=doc.map,span=Math.max(width,depth);
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(width,depth),new THREE.MeshStandardMaterial({color:image?'#ffffff':color,roughness:.95,metalness:0}));
    ground.rotation.x=-Math.PI/2;ground.position.y=-.02;ground.userData.ground=true;ground.renderOrder=BASE_ORDER;this.content.add(ground);
    if(image)new THREE.TextureLoader().load(image.dataUrl,texture=>{if(this.cityDoc!==doc){texture.dispose();return;}texture.colorSpace=THREE.SRGBColorSpace;ground.material.map=texture;ground.material.needsUpdate=true;this.request();});
    const surfaces=groundMesh(doc.surfaces);if(surfaces)this.content.add(surfaces);
    this.city=new CityLayer(this.content);this.city.sync(doc,null);
    this.grid.visible=false;this.rim.color.set('#4ade80');this.renderer.toneMappingExposure=1.1;
    this.setReach({far:Math.max(DIORAMA.far,span*6),maxDistance:Math.max(DIORAMA.maxDistance,span*2.5),minDistance:5});
    this.selected=null;if(resetCamera)this.overview();this.request();
  }
  // --- Scan worlds (runtime/scan/loader.js, metres): the baked room, its own light and the source camera path. ---
  leaveScan(){
    if(!this.scan)return;this.stopSource();this.scan.lightMap?.dispose();this.scan=null;
    for(const light of this.editorLights)light.visible=true;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.shadowMap.enabled=false;this.scene.background=null;
    this.setQuality('medium');
  }
  // Quality tiers for scan worlds (W5): medium = 1× pixels, high = the full device resolution (up to 2×).
  setQuality(tier) {
    this.quality=tier==='high'?'high':'medium';
    this.editorPixelRatio=this.quality==='high'?Math.min(window.devicePixelRatio||1,2):Math.min(window.devicePixelRatio||1,this.scan?1:1.5);
    if(!this.runtime){this.renderScale=0;this.setRenderScale(this.editorPixelRatio);}
  }
  loadScan(scan) {
    this.transform.detach();this.selectionBox.visible=false;this.leaveCity();this.leaveScan();
    if(this.content){this.scene.remove(this.content);disposeTree(this.content);}
    this.items.clear();this.doc=null;this.builtRoot=null;this.updateRoute();
    this.content=new THREE.Group();this.scene.add(this.content);this.scan=scan;this.content.add(scan.root);
    this.editorLights??=this.scene.children.filter(o=>o.isLight);
    // Reach from the scene's size: a room is a few metres, a city tile hundreds (the sky dome is not counted).
    const extent=new THREE.Box3();scan.root.traverse(o=>{if(o.isMesh&&o.userData.semantic!=='sky-dome'&&o.name!=='sky')extent.expandByObject(o);});
    const span=extent.isEmpty()?10:extent.getSize(new THREE.Vector3()).length();
    this.scanReach={far:Math.max(SCAN.far,span*6+4000*!!scan.lighting?.sky),maxDistance:Math.max(SCAN.maxDistance,span*1.5),minDistance:SCAN.minDistance};
    if(scan.lightMap){
      // Baked light only: no real-time lights, no shadow map (the atlas holds light and shadows).
      for(const light of this.editorLights)light.visible=false;
      // The view transform the lightmap was baked for (lighting.json): AgX for rooms, Khronos PBR Neutral for city tiles.
      this.renderer.toneMapping=scan.lighting?.tonemapping?.view==='Khronos PBR Neutral'?THREE.NeutralToneMapping:THREE.AgXToneMapping;this.renderer.toneMappingExposure=2**(scan.lighting?.tonemapping?.exposure??-.15);this.scene.background=new THREE.Color('#131313');
      this.grid.visible=false;this.rim.color.set('#4ade80');this.setReach(this.scanReach);this.selected=null;this.setQuality(this.quality);this.overview();this.request();return;
    }
    // Without a lightmap: one sun through the windows with a 1024² shadow map, soft fill from the room lights.
    const box=new THREE.Box3().setFromObject(scan.root),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
    const sun=new THREE.DirectionalLight('#fff1dc',3.4);sun.position.set(center.x-5.5,box.max.y+4,center.z-3.8);sun.target.position.copy(center);
    sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);const r=Math.max(size.x,size.z)*.75;Object.assign(sun.shadow.camera,{left:-r,right:r,top:r,bottom:-r,near:.5,far:30});sun.shadow.bias=-.0003;sun.shadow.normalBias=.025;
    this.content.add(sun,sun.target);
    for(const light of (scan.camera?.lights??[]).slice(0,4)){const lamp=new THREE.PointLight(new THREE.Color(...light.color),Math.min(light.energy*.02,8),8,2);lamp.position.fromArray(light.pos);this.content.add(lamp);}
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.toneMapping=THREE.AgXToneMapping;this.renderer.toneMappingExposure=SCAN_EXPOSURE;this.scene.background=new THREE.Color('#131313');
    this.grid.visible=false;this.rim.color.set('#4ade80');this.setReach(this.scanReach);this.selected=null;this.setQuality(this.quality);this.overview();this.request();
  }
  // Source camera: the path from the video, played in a loop at its own frame rate (orbit input stops it).
  applySourceFrame(time) {
    const {position,target,up}=sourceView(this.scan.camera,time);
    this.camera.position.fromArray(position);this.camera.up.fromArray(up);this.camera.lookAt(...target);
  }
  // Height of the room for the walk (metres): top of everything but the sky, and the lowest ceiling surface.
  scanExtent() {
    if(!this.scan)return {};let top=-Infinity,ceilingY=Infinity;const box=new THREE.Box3();
    this.scan.root.traverse(o=>{if(!o.isMesh)return;const semantic=o.userData.semantic??o.name;if(semantic==='sky'||semantic==='sky-dome')return;box.setFromObject(o);top=Math.max(top,box.max.y);if(semantic==='ceiling')ceilingY=Math.min(ceilingY,box.min.y);});
    return {top:Number.isFinite(top)?top:undefined,ceilingY};
  }
  playSource() {
    if(!this.scan?.camera?.frames?.length||this.runtime)return false;
    // camera.json gives the horizontal field of view; Three.js cameras take the vertical one.
    const aspect=this.camera.aspect>0?this.camera.aspect:16/9,horizontal=THREE.MathUtils.degToRad(this.scan.camera.fov??70);
    this.sourceSaved??={fov:this.camera.fov,target:this.orbit.target.clone()};this.camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(horizontal/2)/aspect));this.camera.updateProjectionMatrix();
    this.orbit.enabled=false;this.sourceTime=0;this.source=true;this.lastTime=0;this.request();return true;
  }
  stopSource() {
    if(!this.source)return;this.source=false;const saved=this.sourceSaved;this.sourceSaved=null;
    this.camera.up.set(0,1,0);this.camera.fov=saved.fov;this.camera.updateProjectionMatrix();
    const direction=new THREE.Vector3();this.camera.getWorldDirection(direction);this.orbit.target.copy(this.camera.position).addScaledVector(direction,2);
    this.orbit.enabled=!this.runtime;this.orbit.update();this.request();
  }
  applyObject(record) {
    const item=this.items.get(record.id);if(!item)return;item.record=record;
    const {group,visual,originalMaterials}=item;group.position.fromArray(record.position);group.rotation.set(...record.rotation.map(THREE.MathUtils.degToRad));group.scale.fromArray(record.scale);group.visible=record.visible;group.name=record.name;
    for(const [material,original] of originalMaterials){
      if(record.kind==='panel'||record.kind==='text')material.color.copy(original);
      else if(record.color)material.color.set(record.color);
      else if(record.kind==='landmark')material.color.copy(original);
      else material.color.set('#4ade80');
    }
    const key=record.page.title+'\n'+record.page.body+'\n'+record.color;
    if(['panel','text'].includes(record.kind)&&item.textureKey!==key){const face=visual.children[0];face.material.map.dispose();face.material.map=record.kind==='panel'?panelTexture(record):textTexture(record);face.material.needsUpdate=true;item.textureKey=key;}
    if(record.animation==='none'){visual.rotation.set(0,0,0);visual.position.set(0,0,0);}
    this.updateSelectionBox();this.request();
  }
  updateSettings() {
    if(!this.doc)return;this.grid.visible=this.doc.settings.grid&&!this.preview;this.renderer.toneMappingExposure=this.doc.settings.exposure;this.request();
  }
  updateRoute() {
    if(this.route){this.scene.remove(this.route);disposeTree(this.route);this.route=null;}
    if(!this.doc)return;
    const points=this.doc.objects.filter(o=>o.visible&&o.page.enabled).map(o=>new THREE.Vector3(o.position[0],o.position[1]+.1,o.position[2]));
    if(points.length>1){this.route=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineDashedMaterial({color:'#4ade80',dashSize:.18,gapSize:.15,transparent:true,opacity:.4}));this.route.computeLineDistances();this.route.visible=!this.preview;this.scene.add(this.route);}
  }
  updateSelectionBox() {
    if(this.city){const proxy=this.city.items.get(this.selected);this.selectionBox.visible=Boolean(proxy?.visible&&!this.runtime);if(this.selectionBox.visible)this.selectionBox.box.setFromObject(proxy);return;}
    const item=this.items.get(this.selected);this.selectionBox.visible=!!(item&&item.record.visible&&!this.preview&&!this.runtime);
    if(this.selectionBox.visible){item.group.updateWorldMatrix(true,true);this.selectionBox.box.setFromObject(item.group);}
  }
  select(id) {
    if(this.city){this.selected=id;this.city.setLive(id);this.transform.detach();this.updateSelectionBox();this.request();return;}
    this.selected=id;const item=this.items.get(id);
    if(item&&item.record.visible&&!item.record.locked&&!this.preview&&this.mode!=='select')this.transform.attach(item.group);else this.transform.detach();
    this.updateSelectionBox();this.request();
  }
  setMode(mode) {this.mode=mode;if(mode!=='select')this.transform.setMode(mode);this.select(this.selected);}
  setSnap(value) {this.transform.setTranslationSnap(value ? .5 : null);this.transform.setRotationSnap(value ? Math.PI/12 : null);this.transform.setScaleSnap(value ? .1 : null);}
  setPreview(value) {this.preview=value;this.updateSettings();if(this.route)this.route.visible=!value;this.select(this.selected);}
  setMotion(playing,reduced) {this.playing=playing&&!reduced;this.reduced=reduced;this.lastTime=0;this.request();}
  overview() {
    if(this.scan){
      this.stopSource();const box=new THREE.Box3().setFromObject(this.scan.root),center=box.getCenter(new THREE.Vector3());
      const frame=this.scan.camera?.frames?.[0];
      if(frame){const [p,f]=frame;this.camera.position.fromArray(p);this.orbit.target.set(p[0]+f[0]*2,p[1]+f[1]*2,p[2]+f[2]*2);}
      else{this.orbit.target.copy(center);this.camera.position.copy(center).add(new THREE.Vector3(1.5,1.2,2.5));}
      this.orbit.update();this.request();return;
    }
    if(this.cityDoc){
      // Whole map in view: distance from its circumradius and the narrower of the two field-of-view angles.
      const {width,depth}=this.cityDoc.map,radius=Math.hypot(width,depth)/2,vertical=THREE.MathUtils.degToRad(this.camera.fov);
      const aspect=this.camera.aspect>0&&Number.isFinite(this.camera.aspect)?this.camera.aspect:1;// hidden canvas
      const horizontal=2*Math.atan(Math.tan(vertical/2)*aspect),distance=radius/Math.sin(Math.min(vertical,horizontal)/2)*.9;
      // Portrait views of big maps need more room than the default reach.
      if(distance*1.2>this.orbit.maxDistance){this.orbit.maxDistance=distance*1.2;this.camera.far=Math.max(this.camera.far,distance*3);this.camera.updateProjectionMatrix();}
      this.orbit.target.set(0,0,0);this.camera.position.set(0,0,0).add(new THREE.Vector3(.65,.62,.85).normalize().multiplyScalar(distance));this.orbit.update();this.request();return;
    }
    const target=new THREE.Vector3(0,1,-1),aspect=this.camera.aspect;
    const distance=clamp(26/Math.min(aspect,1.5),20,62);
    this.camera.position.copy(target).add(new THREE.Vector3(.65,.52,.85).normalize().multiplyScalar(distance));this.orbit.target.copy(target);this.orbit.update();this.request();
  }
  focus(id) {
    const proxy=this.city?.items.get(id),item=this.items.get(id);if(proxy?proxy.visible===false:!item||!item.record.visible)return;
    const box=new THREE.Box3().setFromObject(proxy??item.group),size=box.getSize(new THREE.Vector3()).length(),target=box.getCenter(new THREE.Vector3());
    const direction=this.camera.position.clone().sub(this.orbit.target).normalize();
    this.camera.position.copy(target).addScaledVector(direction,clamp(size*1.7,5,65));this.orbit.target.copy(target);this.orbit.update();this.request();
  }
  cameraView(view) {
    if(view==='source'){this.playSource();return;}
    this.stopSource();
    const target=this.orbit.target.clone(),distance=this.camera.position.distanceTo(target);
    const offset=view==='top'?new THREE.Vector3(0,distance,.001):view==='front'?new THREE.Vector3(0,2,distance):new THREE.Vector3(distance,2,0);
    this.camera.position.copy(target).add(offset);this.orbit.update();this.request();
  }
  resize() {
    if(!this.available)return;const rect=this.canvas.parentElement.getBoundingClientRect();const width=Math.max(1,rect.width),height=Math.max(1,rect.height);
    this.renderer.setSize(width,height,false);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();this.request();
  }
  request() {if(this.runtime||!this.available||document.hidden||this.frame)return;this.frame=requestAnimationFrame(time=>this.render(time));}
  render(now) {
    this.frame=0;if(!this.available)return;
    const dt=this.lastTime?Math.min((now-this.lastTime)/1000,.05):0;this.lastTime=now;
    let animated=false;
    // Walk mode freezes animations, so what the player sees matches the colliders built on entry.
    if(this.playing&&!this.reduced&&!this.transform.dragging&&!this.runtime){
      this.motionTime+=dt;
      for(const item of this.items.values())if(item.record.visible){
        if(item.record.animation==='spin'){item.visual.rotation.y=this.motionTime*.35;animated=true;}
        if(item.record.animation==='float'){item.visual.position.y=Math.sin(this.motionTime*1.2)*.15;animated=true;}
      }
      if(animated)this.updateSelectionBox();
    }
    if(this.source&&!this.runtime){if(HOLD_FRAME===null){this.sourceTime+=dt;animated=true;}else this.sourceTime=HOLD_FRAME/(this.scan.camera.fps||30);this.applySourceFrame(this.sourceTime);}
    // With `?stats`, GPU time of exactly this render call (EXT_disjoint_timer_query_webgl2) is collected for tests.
    const query=STATS?this.gpuBegin():null;
    this.renderer.render(this.scene,this.camera);
    if(STATS){this.gpuEnd(query);globalThis.__MOTIONSPEC_RENDER_STATS__={calls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,width:this.canvas.width,height:this.canvas.height,camera:this.camera.position.toArray(),avatar:this.avatar?.visible?this.avatar.position.toArray():null};}
    if(this.runtime)return;
    const rect=this.canvas.getBoundingClientRect();this.scene.updateMatrixWorld(true);this.camera.updateMatrixWorld();
    const pins=[...this.items.values()].filter(item=>item.record.visible&&item.record.page.enabled).map(item=>{
      const box=new THREE.Box3().setFromObject(item.group),p=box.getCenter(new THREE.Vector3());p.y=box.max.y+.5;p.project(this.camera);
      return {id:item.record.id,x:(p.x*.5+.5)*rect.width,y:(-.5*p.y+.5)*rect.height,visible:p.z>-1&&p.z<1&&Math.abs(p.x)<.96&&Math.abs(p.y)<.91};
    });this.callbacks.onProject?.(pins);if(animated)this.request();
  }
  gpuBegin() {
    const gl=this.renderer.getContext();this.timer??=gl.getExtension('EXT_disjoint_timer_query_webgl2')||false;if(!this.timer)return null;
    this.gpuPending??=[];const query=gl.createQuery();gl.beginQuery(this.timer.TIME_ELAPSED_EXT,query);return query;
  }
  gpuEnd(query) {
    if(!query)return;const gl=this.renderer.getContext();gl.endQuery(this.timer.TIME_ELAPSED_EXT);this.gpuPending.push(query);
    const samples=globalThis.__MOTIONSPEC_GPU_MS__??=[];
    while(this.gpuPending.length&&gl.getQueryParameter(this.gpuPending[0],gl.QUERY_RESULT_AVAILABLE)){
      const done=this.gpuPending.shift();if(!gl.getParameter(this.timer.GPU_DISJOINT_EXT))samples.push(gl.getQueryParameter(done,gl.QUERY_RESULT)/1e6);gl.deleteQuery(done);
    }
    if(samples.length>2000)samples.splice(0,samples.length-2000);
  }
  // --- Walk mode (runtime/walk-host.js drives the loop; the editor state is saved and restored exactly) ---
  // Units for colliders: every visible editable object and every piece of scenery that is not the island itself.
  walkUnits() {
    const units=[...this.items.values()].filter(item=>item.record.visible).map(item=>({id:item.record.id,name:item.record.name,object:item.group}));
    for(const child of this.builtRoot?.children??[])if(!child.userData.ground)units.push({id:`scenery-${child.id}`,name:'',object:child});
    return units;
  }
  enterRuntime(start,eye) {
    if(this.runtime)return;
    this.stopSource();cancelAnimationFrame(this.frame);this.frame=0;
    this.saved={camera:this.camera,position:this.camera.position.clone(),quaternion:this.camera.quaternion.clone(),target:this.orbit.target.clone()};
    this.runtime=true;this.transform.detach();this.transform.enabled=false;this.orbit.enabled=false;this.selectionBox.visible=false;this.grid.visible=false;if(this.route)this.route.visible=false;
    this.player??=new THREE.PerspectiveCamera(70,1,.01,400);this.player.rotation.order='YXZ';
    // Cities are walked in metres and seen far into the street; dioramas are miniatures.
    this.player.near=this.city||this.scan?.05:.01;this.player.far=this.city?Math.max(400,this.camera.far):this.scan?this.scanReach.far:400;this.player.updateProjectionMatrix();
    this.camera=this.player;this.placePlayer(start,eye);this.resize();
  }
  // heading: degrees clockwise from north (−Z) seen from above; pitch: degrees up.
  // Free views of the walk (camera-rig.js: third person, fly, source path); avatar = the walker's pose to show.
  placeView({position,target,up=[0,1,0],avatar=null}) {
    this.player.position.fromArray(position);this.player.up.fromArray(up);this.player.lookAt(...target);this.player.updateMatrixWorld(true);
    if(!avatar){if(this.avatar)this.avatar.visible=false;return;}
    const body=this.avatarFor(avatar.eye-avatar.groundY);body.visible=true;
    // Baked scans have no real-time lights, and the figure has no lightmap: it lights itself there.
    body.userData.material.emissiveIntensity=this.scan?.lightMap?.85:0;body.position.set(avatar.x,avatar.groundY,avatar.z);body.rotation.set(0,THREE.MathUtils.degToRad(-avatar.heading),0);
  }
  // Placeholder figure (a capsule with a head and a nose towards −Z) until the character contract (roadmap phase 5).
  avatarFor(eyeHeight) {
    if(this.avatar&&this.avatarEye===eyeHeight)return this.avatar;
    if(this.avatar){this.scene.remove(this.avatar);disposeTree(this.avatar);}
    const k=eyeHeight/1.6,material=new THREE.MeshStandardMaterial({color:'#4ade80',emissive:'#4ade80',emissiveIntensity:0,roughness:.55,metalness:.05}),group=new THREE.Group();group.userData.material=material;
    const torso=new THREE.Mesh(new THREE.CylinderGeometry(.22*k,.26*k,1.15*k,18),material);torso.position.y=.85*k;
    const head=new THREE.Mesh(new THREE.SphereGeometry(.16*k,20,14),material);head.position.y=1.6*k;
    const nose=new THREE.Mesh(new THREE.BoxGeometry(.08*k,.06*k,.14*k),new THREE.MeshStandardMaterial({color:'#131313'}));nose.position.set(0,1.6*k,-.16*k);
    for(const part of [torso,head,nose]){part.castShadow=true;group.add(part);}
    group.name='walk-avatar';this.scene.add(group);this.avatar=group;this.avatarEye=eyeHeight;return group;
  }
  placePlayer({x,z,heading=0,pitch=0},eye) {if(this.avatar)this.avatar.visible=false;this.player.up.set(0,1,0);this.player.position.set(x,eye,z);this.player.rotation.set(THREE.MathUtils.degToRad(pitch),THREE.MathUtils.degToRad(-heading),0);this.player.updateMatrixWorld(true);}
  draw() {this.render(performance.now());}
  setRenderScale(scale) {if(scale===this.renderScale)return;this.renderScale=scale;this.renderer.setPixelRatio(scale);this.resize();}
  showColliders(colliders,y=0) {
    this.clearColliders();this.colliderDebug=new THREE.Group();
    for(const {vertices} of colliders)this.colliderDebug.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(vertices.map(([x,z])=>new THREE.Vector3(x,y+.01,z))),new THREE.LineBasicMaterial({color:'#aeaeae',depthTest:false})));
    this.colliderDebug.renderOrder=20;this.scene.add(this.colliderDebug);
  }
  clearColliders() {if(!this.colliderDebug)return;this.scene.remove(this.colliderDebug);disposeTree(this.colliderDebug);this.colliderDebug=null;}
  exitRuntime() {
    if(!this.runtime)return;
    const saved=this.saved;this.saved=null;this.clearColliders();this.runtime=false;this.setRenderScale(this.editorPixelRatio);
    if(this.avatar){this.scene.remove(this.avatar);disposeTree(this.avatar);this.avatar=null;this.avatarEye=null;}
    this.camera=saved.camera;this.camera.position.copy(saved.position);this.camera.quaternion.copy(saved.quaternion);this.orbit.target.copy(saved.target);
    this.orbit.enabled=true;this.transform.enabled=true;this.updateSettings();if(this.route)this.route.visible=!this.preview;
    this.select(this.selected);this.resize();
  }
}
