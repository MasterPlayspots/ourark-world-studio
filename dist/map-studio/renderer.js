import * as THREE from '../worlds/vendor/three.module.js';
import {OrbitControls} from '../worlds/vendor/OrbitControls.js';
import {TransformControls} from '../worlds/vendor/TransformControls.js';
import {movePoint} from './model.js';
import {makePoint,release,CityLayer} from '../runtime/city-layer.js';
import {groundMesh,groundKey,BASE_ORDER} from '../runtime/ground-layer.js';
import {isValidated} from '../runtime/frozen.js';
const GROUND_KEYS=new WeakMap();
const groundKeyOf=surfaces=>{if(!isValidated(surfaces))return groundKey(surfaces);let key=GROUND_KEYS.get(surfaces);if(key===undefined){key=groundKey(surfaces);GROUND_KEYS.set(surfaces,key);}return key;};

export {makePoint,release};

// Test and development aid: `?stats` publishes draw calls and triangles of the last frame.
const STATS=new URLSearchParams(globalThis.location?.search??'').has('stats');
export function createCameras(){
  const top=new THREE.OrthographicCamera(-70,70,50,-50,.1,10000);top.position.set(0,200,0);top.up.set(0,0,-1);top.lookAt(0,0,0);
  const spatial=new THREE.PerspectiveCamera(42,1,.1,15000);spatial.position.set(110,100,120);spatial.lookAt(0,0,0);
  const player=new THREE.PerspectiveCamera(70,1,.05,5000);player.rotation.order='YXZ';
  return {top,spatial,player};
}
export class MapRenderer {
  constructor(canvas,callbacks={}) {
    this.canvas=canvas;this.callbacks=callbacks;this.mode='2d';this.selected=null;this.snap=true;this.placing=false;this.frame=0;this.imageVersion=0;this.imageKey=null;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#131313');this.city=new CityLayer(this.scene);
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});this.editorPixelRatio=Math.min(devicePixelRatio||1,2);this.renderScale=this.editorPixelRatio;this.renderer.setPixelRatio(this.editorPixelRatio);this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.NoToneMapping;
    this.cameras=createCameras();this.camera=this.cameras.top;
    this.scene.add(new THREE.HemisphereLight('#f6f6f6','#232323',2.5));const light=new THREE.DirectionalLight('#fff4e4',2.4);light.position.set(-40,100,50);this.scene.add(light);
    this.ground=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:'#1c1c1c'}));this.ground.rotation.x=-Math.PI/2;this.ground.position.y=-.04;this.ground.renderOrder=BASE_ORDER;this.scene.add(this.ground);
    this.grid=new THREE.GridHelper(1,24,'#404040','#2e2e2e');this.grid.position.y=.015;this.grid.material.transparent=true;this.grid.material.opacity=.48;this.scene.add(this.grid);
    this.border=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.5,0,-.5),new THREE.Vector3(.5,0,-.5),new THREE.Vector3(.5,0,.5),new THREE.Vector3(-.5,0,.5)]),new THREE.LineBasicMaterial({color:'#4ade80',transparent:true,opacity:.5}));this.scene.add(this.border);
    this.selectionBox=new THREE.Box3Helper(new THREE.Box3(),'#f2f2f2');this.selectionBox.material.depthTest=false;this.selectionBox.renderOrder=10;this.selectionBox.visible=false;this.scene.add(this.selectionBox);
    this.connectOrbit();
    this.transform=new TransformControls(this.camera,canvas);this.transform.setMode('translate');this.transform.setSize(.8);this.transform.showY=false;this.scene.add(this.transform.getHelper());
    this.transform.addEventListener('change',()=>this.request());
    this.transform.addEventListener('dragging-changed',e=>{this.orbit.enabled=!e.value;if(e.value)this.callbacks.start?.();else this.callbacks.end?.();});
    this.transform.addEventListener('objectChange',()=>{const item=this.transform.object;if(!item)return;const p=this.doc.points.find(p=>p.id===item.userData.id);if(!p)return;const next=movePoint(p,item.position.x,item.position.z,this.doc.map,this.snap);item.position.set(next.x,0,next.z);this.callbacks.move?.(p.id,next.x,next.z);this.selectionBox.box.setFromObject(item);this.request();});
    this.ray=new THREE.Raycaster();this.plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
    this.bindCanvas();
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas.parentElement);
    this.visibilityHandler=()=>{if(!document.hidden)this.request();};document.addEventListener('visibilitychange',this.visibilityHandler);
  }
  // Named handlers so dispose() can remove them (Welle-0 observation O2).
  bindCanvas(){
    this.handlers={pointerdown:e=>this.down(e),pointermove:e=>this.move(e),pointerup:e=>this.up(e),pointercancel:()=>this.cancelDrag(),lostpointercapture:()=>this.cancelDrag(),
      webglcontextlost:e=>{e.preventDefault();this.callbacks.error?.('Die Grafikverbindung wurde unterbrochen. Bitte Projekt exportieren und die Seite neu laden.');}};
    for(const [type,fn] of Object.entries(this.handlers))this.canvas.addEventListener(type,fn);
  }
  unbindCanvas(){for(const [type,fn] of Object.entries(this.handlers??{}))this.canvas.removeEventListener(type,fn);this.handlers=null;}
  // Walk mode (ADR 0001): editor helpers off, player camera on; the editor camera pose and selection are restored on exit.
  enterRuntime(start,eye=1.6){
    if(this.runtime)return;
    this.cancelDrag();
    this.saved={mode:this.mode,selected:this.selected,camera:this.camera,position:this.camera.position.clone(),quaternion:this.camera.quaternion.clone(),zoom:this.camera.zoom,target:this.orbit.target.clone()};
    this.runtime=true;this.transform.detach();this.transform.enabled=false;this.orbit.enabled=false;this.selectionBox.visible=false;
    this.placePlayer(start,eye);this.camera=this.cameras.player;this.resize();this.request();
  }
  // heading: degrees clockwise from north (−Z) seen from above, so 90° looks east (+X).
  placePlayer({x,z,heading=0,pitch=0},eye=1.6){const player=this.cameras.player;player.position.set(x,eye,z);player.rotation.set(THREE.MathUtils.degToRad(pitch),THREE.MathUtils.degToRad(-heading),0);player.updateMatrixWorld(true);}
  // Development aid: collider footprints as lines just above the ground (edges exactly as the physics sees them).
  showColliders(colliders){
    this.clearColliders();this.colliderDebug=new THREE.Group();
    for(const {vertices} of colliders)this.colliderDebug.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(vertices.map(([x,z])=>new THREE.Vector3(x,.06,z))),new THREE.LineBasicMaterial({color:'#aeaeae',depthTest:false})));
    this.colliderDebug.renderOrder=20;this.scene.add(this.colliderDebug);this.request();
  }
  clearColliders(){if(!this.colliderDebug)return;this.scene.remove(this.colliderDebug);release(this.colliderDebug);this.colliderDebug=null;}
  // Render resolution in device pixels per CSS pixel; the walk mode adapts it to hold 60 fps (runtime/quality.js).
  setRenderScale(scale){if(scale===this.renderScale)return;this.renderScale=scale;this.renderer.setPixelRatio(scale);this.resize();}
  exitRuntime(){
    if(!this.runtime)return;
    if(this.editorPixelRatio)this.setRenderScale(this.editorPixelRatio);
    this.clearColliders();
    const saved=this.saved;this.saved=null;this.runtime=false;
    this.camera=saved.camera;this.camera.position.copy(saved.position);this.camera.quaternion.copy(saved.quaternion);this.camera.zoom=saved.zoom;this.camera.updateProjectionMatrix();
    this.orbit.target.copy(saved.target);this.orbit.enabled=true;this.transform.enabled=true;this.transform.camera=this.camera;
    this.select(saved.selected);this.resize();
  }
  connectOrbit(){
    this.orbit?.dispose();this.orbit=new OrbitControls(this.camera,this.canvas);this.orbit.enableDamping=false;this.orbit.enableRotate=this.mode==='3d';this.orbit.minPolarAngle=this.mode==='2d'?Math.PI/2:0;this.orbit.maxPolarAngle=this.mode==='2d'?Math.PI/2:Math.PI*.485;this.orbit.minDistance=8;this.orbit.maxDistance=6000;this.orbit.minZoom=.2;this.orbit.maxZoom=20;this.orbit.mouseButtons.LEFT=this.mode==='2d'?THREE.MOUSE.PAN:THREE.MOUSE.ROTATE;this.orbit.addEventListener('change',()=>this.request());
  }
  pointer(e) {const r=this.canvas.getBoundingClientRect();this.ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),this.camera);}
  groundHit(e){this.pointer(e);return this.ray.ray.intersectPlane(this.plane,new THREE.Vector3());}
  pick(e){this.pointer(e);const hits=this.ray.intersectObjects([...this.items.values()].filter(o=>o.visible),true);let object=hits[0]?.object;while(object&&!object.userData.id)object=object.parent;return object;}
  down(e){
    if(this.runtime||e.button!==0)return;this.canvas.focus({preventScroll:true});this.startPointer={x:e.clientX,y:e.clientY,gizmo:this.mode==='3d'&&this.transform.axis!==null};
    if(this.placing){this.orbit.enabled=false;return;}
    if(this.mode==='2d'){
      const obj=this.pick(e);if(!obj)return;this.callbacks.select?.(obj.userData.id);
      const p=this.doc.points.find(p=>p.id===obj.userData.id),hit=this.groundHit(e);
      if(p&&!p.locked&&hit){this.orbit.enabled=false;this.drag={id:p.id,pointer:e.pointerId,offsetX:p.x-hit.x,offsetZ:p.z-hit.z};this.callbacks.start?.();this.canvas.setPointerCapture(e.pointerId);}
    }
  }
  move(e){if(this.runtime||!this.drag)return;const hit=this.groundHit(e);if(!hit)return;const p=this.doc.points.find(p=>p.id===this.drag.id);if(!p)return;const next=movePoint(p,hit.x+this.drag.offsetX,hit.z+this.drag.offsetZ,this.doc.map,this.snap);this.items.get(p.id).position.set(next.x,0,next.z);this.callbacks.move?.(p.id,next.x,next.z);this.selectionBox.box.setFromObject(this.items.get(p.id));this.request();}
  up(e){
    if(this.runtime)return;
    const start=this.startPointer;this.startPointer=null;
    if(this.drag){this.cancelDrag();return;}
    this.orbit.enabled=true;
    if(!start||Math.hypot(e.clientX-start.x,e.clientY-start.y)>6||start.gizmo)return;
    if(this.placing){const p=this.groundHit(e);if(p&&Math.abs(p.x)<=this.doc.map.width/2&&Math.abs(p.z)<=this.doc.map.depth/2)this.callbacks.place?.(p.x,p.z);return;}
    this.callbacks.select?.(this.pick(e)?.userData.id??null);
  }
  cancelDrag(){if(!this.drag)return;const pointer=this.drag.pointer;this.drag=null;this.orbit.enabled=true;if(this.canvas.hasPointerCapture(pointer))this.canvas.releasePointerCapture(pointer);this.callbacks.end?.();}
  // During a drag: the document positions labels and focus read, without re-syncing the scene.
  follow(doc){this.doc=doc;}
  sync(doc,selection){
    this.doc=doc;this.transform.detach();this.city.sync(doc,selection);
    // Ground surfaces (roads, beach, water …) are rebuilt only when they change.
    // The key hashes every surface coordinate: computed once per validated (unchanging) surface list.
    const key=groundKeyOf(doc.surfaces);
    if(key!==this.groundKey){this.groundKey=key;if(this.surfaces){this.scene.remove(this.surfaces);release(this.surfaces);}this.surfaces=groundMesh(doc.surfaces);if(this.surfaces)this.scene.add(this.surfaces);}
    const {width,depth,color,image}=doc.map;this.ground.scale.set(width,depth,1);this.grid.scale.set(width,1,depth);this.border.scale.set(width,1,depth);this.ground.material.color.set(image?'#ffffff':color);this.grid.visible=!image&&!doc.surfaces?.length;
    if(this.imageKey!==image?.dataUrl){
      this.imageKey=image?.dataUrl;const version=++this.imageVersion;this.ground.material.map?.dispose();this.ground.material.map=null;this.ground.material.needsUpdate=true;
      if(image){new THREE.TextureLoader().load(image.dataUrl,texture=>{if(version!==this.imageVersion){texture.dispose();return;}texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(4,this.renderer.capabilities.getMaxAnisotropy());this.ground.material.map=texture;this.ground.material.needsUpdate=true;this.request();},undefined,()=>{if(version===this.imageVersion)this.callbacks.error?.('Das Kartenbild konnte nicht dargestellt werden.');});}
    }
    this.select(selection);this.request();
  }
  get items(){return this.city.items;}
  select(id){this.selected=id;this.city.setLive(id);if(this.runtime)return;const item=this.items.get(id),point=this.doc?.points.find(p=>p.id===id);this.transform.detach();this.selectionBox.visible=Boolean(item?.visible);if(item){this.selectionBox.box.setFromObject(item);if(this.mode==='3d'&&point.visible&&!point.locked&&!this.placing)this.transform.attach(item);}this.request();}
  setSnap(value){this.snap=value;this.transform.setTranslationSnap(value?1:null);}
  setPlacing(value){this.placing=value;this.canvas.style.cursor=value?'crosshair':'';this.select(this.selected);}
  setMode(mode){if(this.mode===mode)return;this.cancelDrag();this.mode=mode;this.camera=mode==='2d'?this.cameras.top:this.cameras.spatial;this.connectOrbit();this.transform.camera=this.camera;this.overview();this.select(this.selected);this.resize();}
  overview(){if(!this.doc||this.runtime)return;const bounds=this.canvas.parentElement.getBoundingClientRect(),aspect=Math.max(.2,bounds.width/bounds.height),span=Math.max(this.doc.map.width,this.doc.map.depth)/Math.min(1,aspect);this.orbit.target.set(0,0,0);if(this.mode==='2d'){this.camera.position.set(0,Math.max(200,span*2),0);this.camera.zoom=1;}else this.camera.position.set(span*.78,span*.83,span*.9);this.resize();this.orbit.update();this.request();}
  focus(){if(this.runtime)return;const p=this.doc?.points.find(p=>p.id===this.selected);if(!p)return;const target=new THREE.Vector3(p.x,0,p.z),size=Math.max(p.width,p.depth,p.height,8);this.orbit.target.copy(target);if(this.mode==='2d'){this.camera.position.set(p.x,Math.max(200,this.doc.map.width*2),p.z);this.camera.zoom=clampZoom(Math.min(this.doc.map.width,this.doc.map.depth)/(size*3));}else this.camera.position.copy(target).add(new THREE.Vector3(size*2,size*2,size*2));this.camera.updateProjectionMatrix();this.orbit.update();this.request();}
  resize(){const {width,height}=this.canvas.parentElement.getBoundingClientRect();if(!width||!height||!this.doc)return;this.renderer.setSize(width,height,false);const aspect=width/height,half=Math.max(this.doc.map.depth/2,this.doc.map.width/2/aspect)*1.18;this.cameras.top.left=-half*aspect;this.cameras.top.right=half*aspect;this.cameras.top.top=half;this.cameras.top.bottom=-half;this.cameras.top.updateProjectionMatrix();this.cameras.spatial.aspect=aspect;this.cameras.spatial.updateProjectionMatrix();this.cameras.player.aspect=aspect;this.cameras.player.updateProjectionMatrix();this.request();}
  request(){if(this.frame||document.hidden)return;this.frame=requestAnimationFrame(()=>{this.frame=0;this.draw();});}
  // Synchronous render; the runtime loop calls this directly so there is only one RAF owner while walking.
  draw(){this.scene.updateMatrixWorld(true);this.camera.updateMatrixWorld(true);this.renderer.render(this.scene,this.camera);if(STATS)globalThis.__MOTIONSPEC_RENDER_STATS__={calls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles};if(!this.runtime)this.callbacks.labels?.(this.projectLabels());}
  projectLabels(){if(!this.doc)return [];return this.doc.points.filter(p=>p.visible).map(p=>{const pos=new THREE.Vector3(p.x,p.height+2,p.z).project(this.camera);return {id:p.id,x:(pos.x+1)*50,y:(1-pos.y)*50,visible:pos.z>=-1&&pos.z<=1&&Math.abs(pos.x)<.94&&Math.abs(pos.y)<.91};});}
  dispose(){cancelAnimationFrame(this.frame);this.city.dispose();this.unbindCanvas();this.imageVersion++;this.resizeObserver.disconnect();document.removeEventListener('visibilitychange',this.visibilityHandler);this.transform.dispose();this.orbit.dispose();this.ground.material.map?.dispose();release(this.scene);this.renderer.dispose();}
}
const clampZoom=n=>Math.max(.2,Math.min(n,12));
