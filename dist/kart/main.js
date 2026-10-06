// Kart mode: drives the arcade kart (kart.js) on a track (track.js) laid over real terrain and an aerial photo.
// The map is a data bundle (assets/<name>.json + height grid + photo), so further maps can be dropped in.
import * as THREE from '../worlds/vendor/three.module.js';
import {Track} from './track.js';
import {Kart,Race,isForwardOnTrack} from './kart.js';
import {Plane} from './plane.js';
import {Pedestrian,FOOT} from './pedestrian.js';
import {KartInsights} from './insights.js';
import {NetClient} from '../runtime/net/client.js';
import {EntityCuller,cullCpu,cameraFrom,LOD,CULLED} from '../runtime/gpu/cull.js';
import {registerPerfProbe} from '../runtime/perf-probes.js';
import {ChunkLod} from '../runtime/lod/chunk-lod.js';
import {InputRouter} from '../runtime/input.js';
import {FrameLoop} from '../runtime/frame-loop.js';
import {Hud} from '../runtime/hud.js';
import {AdaptiveResolution,shadowMapSize} from '../runtime/quality.js';
import {watchGpuContext} from '../runtime/gpu-context.js';
import {SimSnapshot} from '../runtime/sim/snapshot.js';
import {decodeHeightFile,assetUrl} from '../runtime/assets/codec.js';
import {terrainMaterial,skyDome,loadBuildings,loadTrees,loadLand,cameraBlocker,asphaltTexture,gravelTexture} from './scenery.js';

const STEP=1/120,MAX_CATCH_UP=.25,COUNTDOWN=3;
const $=id=>document.getElementById(id);
const ui={canvas:$('kart-canvas'),status:$('kart-status'),lap:$('kart-lap'),time:$('kart-time'),best:$('kart-best'),speed:$('kart-speed'),banner:$('kart-banner'),
  wrong:$('kart-wrong'),attribution:$('kart-attribution'),title:$('kart-title'),overlay:$('kart-overlay'),start:$('kart-start'),view:$('kart-view'),fly:$('kart-fly'),walk:$('kart-walk'),insights:$('kart-insights')};

const clamp1=v=>Math.max(-1,Math.min(1,v));
const fmt=t=>t==null?'–':`${Math.floor(t/60)}:${(t%60).toFixed(2).padStart(5,'0')}`;
const smoothstep=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};

// Map bundle (motionspec.kart.track.v1, packed by scripts/kart/pack-assets.mjs): height grid and the aerial photo's
// small preview load in parallel for the first frame; the full photo follows in the background (upgradePhoto).
// Files load as ?v=<content hash> (cached as immutable by the Worker); the JSON itself is always revalidated.
const ASSETS=new URL('./assets/',import.meta.url);
async function loadMap(name){
  const meta=await (await fetch(new URL(`${name}.json`,ASSETS))).json();
  if(meta.format!=='motionspec.kart.track.v1')throw new Error(`Unbekanntes Kartenformat: ${meta.format}`);
  const t=meta.terrain,first=meta.texture.preview??meta.texture;
  const [bytes,texture]=await Promise.all([fetch(assetUrl(ASSETS,t.file,t.hash)).then(r=>r.arrayBuffer()),
    new THREE.TextureLoader().loadAsync(assetUrl(ASSETS,first.file,first.hash).href)]);
  // The heights stay as uint16 centimetres (⚡ PERF-07): no 4-byte float copy, scaled on each lookup.
  const heights=await decodeHeightFile(new Uint8Array(bytes),t);
  return {meta,heights,texture};
}
// Swaps the preview for the full aerial photo in every material that shows it. A new texture object, because the
// GPU storage of the preview has the preview's size and cannot grow.
async function upgradePhoto(meta,scene,preview){
  if(!meta.texture.preview)return;
  const full=await new THREE.TextureLoader().loadAsync(assetUrl(ASSETS,meta.texture.file,meta.texture.hash).href);
  for(const key of ['colorSpace','anisotropy','wrapS','wrapT','magFilter','minFilter','generateMipmaps'])full[key]=preview[key];
  full.repeat.copy(preview.repeat);full.offset.copy(preview.offset);
  scene.traverse(o=>{for(const m of [o.material].flat())if(m?.map===preview)m.map=full;});
  preview.dispose();
}

// Bilinear terrain height in local metres (x east, z south, centred on the map).
function terrainSampler(heights,{width,depth,cell,scale}){
  return (x,z)=>{
    const gx=Math.min(width-1.001,Math.max(0,x/cell+width/2)),gz=Math.min(depth-1.001,Math.max(0,z/cell+depth/2));
    const i=Math.floor(gx),j=Math.floor(gz),u=gx-i,v=gz-j,h=(a,b)=>heights[b*width+a]*scale;
    return (h(i,j)*(1-u)+h(i+1,j)*u)*(1-v)+(h(i,j+1)*(1-u)+h(i+1,j+1)*u)*v;
  };
}

// Index of track samples in 10 m cells for the terrain carving.
function sampleGrid(track,cell=10){
  const grid=new Map(),key=(i,j)=>`${i},${j}`;
  track.samples.forEach((p,k)=>{const id=key(Math.floor(p.x/cell),Math.floor(p.z/cell));if(!grid.has(id))grid.set(id,[]);grid.get(id).push(k);});
  return (x,z,radius)=>{
    let best=null,bestD=radius;const ci=Math.floor(x/cell),cj=Math.floor(z/cell),r=Math.ceil(radius/cell);
    for(let i=ci-r;i<=ci+r;i++)for(let j=cj-r;j<=cj+r;j++)for(const k of grid.get(key(i,j))||[]){
      const p=track.samples[k],d=Math.hypot(p.x-x,p.z-z);if(d<bestD){bestD=d;best=p;}
    }
    return best&&{sample:best,dist:bestD};
  };
}

function buildTerrain(meta,ground,track,texture){
  // 1 m mesh where affordable (≤ 500 segments per side), the full height grid is 1 m.
  const {width,depth}=meta.terrain,seg=Math.min(500,Math.round(width/meta.terrain.cell));
  const geometry=new THREE.PlaneGeometry(width,depth,seg,seg);geometry.rotateX(-Math.PI/2);
  const nearest=sampleGrid(track),pos=geometry.attributes.position,blend=track.limit+7;
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),z=pos.getZ(i);let y=ground(x,z);
    const near=nearest(x,z,blend);
    // Level the ground under and beside the road so the terrain never cuts through it.
    if(near)y=THREE.MathUtils.lerp(near.sample.base-.08,y,smoothstep(track.limit+.5,blend,near.dist));
    pos.setY(i,y);
  }
  geometry.computeVertexNormals();
  texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=16;
  const mesh=new THREE.Mesh(geometry,terrainMaterial(texture,{rock:meta.style?.rock}));mesh.receiveShadow=true;
  return mesh;
}

// A ribbon along the track between lateral offsets a and b (metres, + = right), with optional skirts.
// map: texture tiled every 4 m (u across, v along the track).
function ribbon(track,a,b,yOf,{color=null,colors=null,skirt=0,skip=null,map=null}={}){
  const n=track.samples.length,positions=[],vertexColors=[],index=[],uvs=[];
  const push=(x,y,z,c,u=0,v=0)=>{positions.push(x,y,z);uvs.push(u,v);if(c)vertexColors.push(c.r,c.g,c.b);};
  track.samples.forEach((p,i)=>{
    const rx=-p.tz,rz=p.tx,y=yOf(p),c=colors?.(p,i);
    push(p.x+rx*a,y,p.z+rz*a,c,a/4,p.s/4);push(p.x+rx*b,y,p.z+rz*b,c,b/4,p.s/4);
    if(skirt){push(p.x+rx*a,p.base-skirt,p.z+rz*a,c,a/4,p.s/4);push(p.x+rx*b,p.base-skirt,p.z+rz*b,c,b/4,p.s/4);}
  });
  const stride=skirt?4:2;
  for(let i=0;i<n;i++){
    if(skip?.(i))continue;
    const o=i*stride,q=((i+1)%n)*stride;
    index.push(o,q,o+1,o+1,q,q+1);
    if(skirt)index.push(o+2,q+2,o,o,q+2,q, o+1,q+1,o+3,o+3,q+1,q+3);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  if(colors)g.setAttribute('color',new THREE.Float32BufferAttribute(vertexColors,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  g.setIndex(index);g.computeVertexNormals();
  const mesh=new THREE.Mesh(g,new THREE.MeshLambertMaterial({color:colors?0xffffff:(color??0xffffff),vertexColors:Boolean(colors),map,side:THREE.DoubleSide}));
  mesh.receiveShadow=true;return mesh;
}

// Where another part of the track passes (a crossing), the barrier must open: true = leave the wall out.
export function crossingGaps(track,offset){
  const n=track.samples.length,gaps=new Array(n).fill(false),reach=track.limit+1.5,minApart=3*track.limit+10;
  const cell=10,grid=new Map(),key=(x,z)=>`${Math.floor(x/cell)},${Math.floor(z/cell)}`;
  track.samples.forEach((p,k)=>{const id=key(p.x,p.z);if(!grid.has(id))grid.set(id,[]);grid.get(id).push(k);});
  track.samples.forEach((p,i)=>{
    const x=p.x+(-p.tz)*offset,z=p.z+p.tx*offset,ci=Math.floor(x/cell),cj=Math.floor(z/cell);
    for(let a=ci-1;a<=ci+1&&!gaps[i];a++)for(let b=cj-1;b<=cj+1&&!gaps[i];b++)for(const k of grid.get(`${a},${b}`)||[]){
      const apart=Math.min(Math.abs(k-i),n-Math.abs(k-i))*track.spacing;
      if(apart>minApart&&Math.hypot(track.samples[k].x-x,track.samples[k].z-z)<reach){gaps[i]=true;break;}
    }
  });
  // Open one extra sample on each side so the gap is wide enough.
  return gaps.map((g,i)=>g||gaps[(i+1)%n]||gaps[(i-1+n)%n]);
}

function buildCourse(track){
  const group=new THREE.Group(),h=track.halfWidth,l=track.limit;
  const surface=p=>track.heightAt(p.s);
  const asphalt=new THREE.Color(0xffffff),ramp=new THREE.Color(0xe8c690),road=asphaltTexture(),gravel=gravelTexture();
  // Road: asphalt, ramps and hills in a sandy colour so they stand out.
  group.add(ribbon(track,-h,h,p=>surface(p)+.04,{skirt:.4,map:road,colors:p=>surface(p)-p.base>.05?ramp:asphalt}));
  // Verge: gravel beside the road.
  group.add(ribbon(track,-l,-h,p=>surface(p)+.02,{map:gravel,skirt:.4}));group.add(ribbon(track,h,l,p=>surface(p)+.02,{map:gravel,skirt:.4}));
  // Kerbs: alternating white/blue every 2 m on both road edges.
  const kerb=(p,i)=>new THREE.Color(Math.floor(p.s/2)%2?0xf2f2f2:0x2f6fd6);
  group.add(ribbon(track,-h-.5,-h,p=>surface(p)+.06,{colors:kerb}));group.add(ribbon(track,h,h+.5,p=>surface(p)+.06,{colors:kerb}));
  // Barriers: low walls at the edge of the verge (where the kart stops).
  const wall=(p,i)=>new THREE.Color(Math.floor(p.s/4)%2?0xf2f2f2:0x30343a);
  for(const side of [-1,1]){
    const gap=crossingGaps(track,side*(l+.2));
    const g=ribbon(track,side*l,side*(l+.35),p=>surface(p)+.8,{colors:wall,skirt:.2,skip:i=>gap[i]});
    group.add(g);
  }
  // Start/finish line: checkered strip across the road at s = 0.
  const start=track.samples[0],cells=12,size=track.width/cells;
  const check=new THREE.Group();
  for(let i=0;i<cells;i++)for(let j=0;j<2;j++){
    const m=new THREE.Mesh(new THREE.PlaneGeometry(size,size),new THREE.MeshBasicMaterial({color:(i+j)%2?0x111111:0xffffff}));
    m.rotation.x=-Math.PI/2;m.position.set((i-cells/2+.5)*size,0,(j-.5)*size);check.add(m);
  }
  check.position.set(start.x,surface(start)+.07,start.z);check.rotation.y=Math.atan2(-start.tx,-start.tz);
  group.add(check);
  // Start arch.
  const post=new THREE.MeshLambertMaterial({color:0x22262b}),banner=new THREE.MeshLambertMaterial({color:0xf2f2f2});
  const arch=new THREE.Group();
  for(const side of [-1,1]){const m=new THREE.Mesh(new THREE.BoxGeometry(.35,5.6,.35),post);m.position.set(side*(l+.6),2.8,0);arch.add(m);}
  const top=new THREE.Mesh(new THREE.BoxGeometry(2*l+1.6,.9,.3),banner);top.position.y=5.6;arch.add(top);
  arch.position.copy(check.position);arch.rotation.y=check.rotation.y;group.add(arch);
  return group;
}

function buildKart(){
  const g=new THREE.Group(),body=new THREE.Group();g.add(body);
  const paint=new THREE.MeshStandardMaterial({color:0xf3c623,roughness:.4,metalness:.2}),dark=new THREE.MeshStandardMaterial({color:0x1d2024,roughness:.8});
  const add=(geo,mat,x,y,z,parent=body)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;};
  add(new THREE.BoxGeometry(1.15,.22,1.9),paint,0,.3,0);           // chassis (forward = −Z)
  add(new THREE.BoxGeometry(.9,.25,.5),paint,0,.45,-.75);          // nose
  add(new THREE.BoxGeometry(.6,.45,.5),dark,0,.62,.25);            // seat
  add(new THREE.SphereGeometry(.24,16,12),new THREE.MeshStandardMaterial({color:0xf2f2f2,roughness:.3}),0,1.05,.15); // helmet
  add(new THREE.BoxGeometry(1.2,.12,.25),dark,0,.42,.95);          // rear bumper
  const wheels=[];
  for(const [x,z] of [[-.62,-.62],[.62,-.62],[-.62,.66],[.62,.66]]){
    const w=add(new THREE.CylinderGeometry(.24,.24,.22,16),dark,x,.24,z,g);w.rotation.z=Math.PI/2;wheels.push(w);
  }
  return {group:g,body,wheels};
}

// Small high-wing aeroplane (forward = −Z), white with the kart's yellow.
function buildPlane(){
  const g=new THREE.Group(),body=new THREE.Group();g.add(body);
  const white=new THREE.MeshStandardMaterial({color:0xf4f4f2,roughness:.45,metalness:.1}),yellow=new THREE.MeshStandardMaterial({color:0xf3c623,roughness:.4,metalness:.15});
  const dark=new THREE.MeshStandardMaterial({color:0x22272d,roughness:.6}),glass=new THREE.MeshStandardMaterial({color:0x6d8fa8,roughness:.1,metalness:.6,transparent:true,opacity:.85});
  const add=(geo,mat,x,y,z,parent=body)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;};
  const fuselage=add(new THREE.CylinderGeometry(.55,.22,6.6,14),white,0,0,0);fuselage.rotation.x=Math.PI/2;      // nose at −Z
  add(new THREE.CylinderGeometry(.57,.57,1.2,14),yellow,0,0,-.6).rotation.x=Math.PI/2;                             // stripe
  const nose=add(new THREE.ConeGeometry(.5,.8,14),dark,0,0,-3.6);nose.rotation.x=-Math.PI/2;
  const cockpit=add(new THREE.SphereGeometry(.62,16,10),glass,0,.35,-1.1);cockpit.scale.set(.9,.7,1.5);
  add(new THREE.BoxGeometry(10.4,.12,1.5),white,0,.72,-.9);                                                       // wing
  for(const x of [-4.6,4.6])add(new THREE.BoxGeometry(1.2,.13,1.52),yellow,x,.72,-.9);                           // wing tips
  for(const x of [-1.6,1.6]){const strut=add(new THREE.BoxGeometry(.07,1.25,.12),dark,x*1.15,.12,-.9);strut.rotation.z=x>0?-.85:.85;}
  add(new THREE.BoxGeometry(3.6,.08,.95),white,0,.15,3.1);                                                       // tailplane
  add(new THREE.BoxGeometry(.08,1.35,1.05),yellow,0,.75,3.2);                                                    // fin
  for(const x of [-.75,.75]){add(new THREE.CylinderGeometry(.04,.04,.75,6),dark,x,-.62,-.6);const w=add(new THREE.CylinderGeometry(.22,.22,.14,12),dark,x,-1,-.6);w.rotation.z=Math.PI/2;}
  add(new THREE.CylinderGeometry(.13,.13,.12,10),dark,0,-.95,2.6).rotation.z=Math.PI/2;                           // tail wheel
  const prop=new THREE.Group();prop.position.set(0,0,-4);body.add(prop);
  add(new THREE.BoxGeometry(.12,2,.06),dark,0,0,0,prop);
  return {group:g,body,prop};
}

// Simple walker figure for the follow camera (feet at the origin, facing −Z).
function buildWalker(){
  const g=new THREE.Group(),jacket=new THREE.MeshStandardMaterial({color:0xf3c623,roughness:.6}),dark=new THREE.MeshStandardMaterial({color:0x22272d,roughness:.8});
  const add=(geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;g.add(m);return m;};
  for(const x of [-.12,.12])add(new THREE.CylinderGeometry(.08,.08,.85,8),dark,x,.43,0);
  add(new THREE.CylinderGeometry(.22,.2,.65,12),jacket,0,1.18,0);
  add(new THREE.SphereGeometry(.15,14,10),new THREE.MeshStandardMaterial({color:0xe9c9a8,roughness:.7}),0,1.68,0);
  return g;
}

async function main(){
  const params=new URLSearchParams(location.search),name=params.get('map')||'rosenberg';
  ui.status.textContent='Lade Gelände und Luftbild …';
  const loadMarks=[],markLoad=label=>loadMarks.push({name:label,ms:Math.round(performance.now())});
  const {meta,heights,texture}=await loadMap(name);markLoad('Gelände + Luftbild');
  const ground=terrainSampler(heights,meta.terrain),tr=meta.track;
  const track=new Track({points:tr.points,width:tr.width,shoulder:tr.shoulder,smoothing:tr.smoothing,features:tr.features,groundAt:ground});
  ui.title.textContent=meta.name;ui.attribution.textContent=meta.attribution;
  if(tr.title)$('kart-heading').textContent=tr.title;if(tr.description)$('kart-intro').textContent=tr.description;
  document.title=`${tr.title||meta.name} — Kart`;
  for(const link of document.querySelectorAll('[data-map]'))link.toggleAttribute('aria-current',link.dataset.map===name);
  const cam={distance:7,height:3.2,...tr.camera};

  const renderer=new THREE.WebGLRenderer({canvas:ui.canvas,antialias:true});
  // Phones and tablets: fewer pixels and a smaller shadow map keep the frame rate up. Below that ceiling the
  // resolution adapts to the frame budget (runtime/quality.js), and the shadow map follows the resolution.
  const mobile=matchMedia('(pointer:coarse)').matches,maxShadow=mobile?1024:2048;
  const adaptive=new AdaptiveResolution({max:Math.min(mobile?1.5:2,devicePixelRatio)});
  renderer.setPixelRatio(adaptive.scale);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  // Sun from the south-east, high — matches the shadows in the summer aerial photos.
  const sunDir=new THREE.Vector3(.55,.75,.45).normalize();
  const scene=new THREE.Scene();scene.fog=new THREE.Fog(0xdce8f1,meta.land?400:180,meta.land?3200:900);
  const sky=skyDome(sunDir);scene.add(sky);
  const camera=new THREE.PerspectiveCamera(62,1,.1,5000);
  scene.add(new THREE.HemisphereLight(0xdcebff,0x5a6448,1.35));
  const sun=new THREE.DirectionalLight(0xfff1dc,2.6);sun.castShadow=true;{const size=shadowMapSize(adaptive.scale,maxShadow);sun.shadow.mapSize.set(size,size);}sun.shadow.bias=-.0004;sun.shadow.normalBias=.04;
  Object.assign(sun.shadow.camera,{left:-45,right:45,top:45,bottom:-45,near:1,far:220});scene.add(sun,sun.target);
  // Forest floor beyond the map edge, hidden in the fog.
  const lowest=heights.reduce((a,b)=>Math.min(a,b),Infinity)*meta.terrain.scale,lowestGround=lowest;
  const outer=new THREE.Mesh(new THREE.PlaneGeometry(4000,4000),new THREE.MeshLambertMaterial({color:0x3d5230}));outer.rotation.x=-Math.PI/2;outer.position.y=meta.land?lowest-60:lowest-.5;scene.add(outer);
  scene.add(buildTerrain(meta,ground,track,texture),buildCourse(track));
  let landHeight=null,landHalf=0,landCentre=[0,0];
  // Ground for flying: the detailed map where it exists, the surrounding landscape beyond.
  const flightGround=(x,z)=>Math.abs(x)<meta.terrain.width/2-1&&Math.abs(z)<meta.terrain.depth/2-1?ground(x,z):landHeight?landHeight(x,z):lowestGround;
  const blockers=[];let chunkLod=null;
  if(meta.buildings){
    ui.status.textContent='Lade Gebäude …';
    const houses=await loadBuildings(assetUrl(ASSETS,meta.buildings.file,meta.buildings.hash),meta.terrain,texture,{walls:meta.buildings.walls,track,packing:meta.buildings.packing});
    scene.add(houses);blockers.push(...houses.children);markLoad('Gebäude');
    // Layer 5, static world: chunk LOD (shadows near, hidden beyond the fog) and a VRAM budget (?vram=MB).
    chunkLod=new ChunkLod(houses.children,{shadowDistance:260,viewDistance:scene.fog.far,budgetBytes:(Number(params.get('vram'))||96)*1e6});
  }
  // Everything not needed for the first frame (full aerial photo, surrounding landscape, trees) streams in after it.
  async function loadRest(){
    const jobs=[upgradePhoto(meta,scene,texture).then(()=>insights.mark('Luftbild voll'))];
    if(meta.land)jobs.push(loadLand(meta.land,meta).then(land=>{scene.add(land);({heightAt:landHeight,half:landHalf,centre:landCentre}=land.userData);insights.mark('Umland');}));
    if(meta.trees)jobs.push(loadTrees(assetUrl(ASSETS,meta.trees.file,meta.trees.hash),track).then(trees=>{scene.add(trees);insights.mark('Bäume');}));
    const results=await Promise.allSettled(jobs);
    for(const r of results)if(r.status==='rejected')console.warn('Nachladen:',r.reason);
    insights.mark('Alles geladen');
  }
  const blockCamera=cameraBlocker(blockers);
  const kartMesh=buildKart();scene.add(kartMesh.group);
  const planeMesh=buildPlane();planeMesh.group.visible=false;scene.add(planeMesh.group);
  const walkerMesh=buildWalker();walkerMesh.visible=false;scene.add(walkerMesh);

  // HUD: only changed values reach the DOM, live values (speed, time, height) at 10 Hz (runtime/hud.js).
  const hud=new Hud({speed:ui.speed,lap:ui.lap,time:ui.time,best:ui.best,banner:ui.banner,wrong:ui.wrong});
  const kart=new Kart({track,start:6}),race=new Race({length:track.length,laps:tr.laps||3});
  let phase='ready',countdown=0,accumulator=0,paused=false,view=0,mode='kart',crashTimer=0;
  const plane=new Plane({ground:flightGround}),planeRay=new THREE.Raycaster(),planeFrom=new THREE.Vector3(),planeDir=new THREE.Vector3();
  const power={up:false,down:false};
  // On foot: walls are the LoD2 meshes (knee and chest height rays per step), ground as for flying.
  const footRay=new THREE.Raycaster(),footFrom=new THREE.Vector3(),footDir=new THREE.Vector3();
  const blockedOnFoot=(a,b)=>{
    if(!blockers.length)return false;
    footDir.set(b.x-a.x,0,b.z-a.z);const len=footDir.length();if(len<1e-6)return false;footDir.normalize();
    for(const h of [.4,1.3]){footFrom.set(a.x,a.y+h,a.z);footRay.set(footFrom,footDir);footRay.far=len+FOOT.radius;if(footRay.intersectObjects(blockers,false).length)return true;}
    return false;
  };
  const walker=new Pedestrian({ground:flightGround,blocked:blockedOnFoot});
  const foot={run:false,jump:false,turnLeft:false,turnRight:false};
  const touch={x:0,z:0};
  const input=new InputRouter({onCommand:command=>{
    if(command==='pause'){paused=!paused;hud.text('banner',paused?'Pause – Esc zum Weiterfahren':'');hud.show('banner',paused);}
    else if(command==='reset')mode==='plane'?relaunch():mode==='walk'?(walker.place({x:kart.state.x,z:kart.state.z,heading:kart.state.heading}),teleportNext=true):respawn();
    else if(command==='interact'){if(mode==='kart')startRace();}
    else if(command==='view1'||command==='view2'){view=command==='view1'?0:1;}
  },onFocusLoss:()=>{}});
  input.activate();

  function respawn(){const s=kart.state.s;kart.reset(s,0);teleportNext=true;}
  function startRace(){
    if(phase==='countdown'||phase==='racing')return;
    teleportNext=true;
    kart.reset(6,0);race.reset();phase='countdown';countdown=COUNTDOWN;ui.overlay.hidden=true;hud.show('banner',true);
    ui.canvas.focus();
  }
  ui.start.addEventListener('click',startRace);
  // Aeroplane: F (or the button) switches between kart and plane; Shift = more power, Space = less.
  function relaunch(){teleportNext=true;const s=plane.state??kart.state;plane.launch({x:s.x,z:s.z,heading:s.heading,height:70});crashTimer=0;hud.show('banner',false);}
  // Three ways to explore the same map: kart, aeroplane, on foot. Switching keeps the current position.
  function setMode(next){
    if(next===mode)next='kart';
    const from=mode==='plane'?plane.state:mode==='walk'?walker.state:kart.state;
    planeMesh.group.visible=false;walkerMesh.visible=false;
    ui.fly.textContent='Flugzeug';ui.walk.textContent='Zu Fuß';
    if(meta.land){scene.fog.near=400;scene.fog.far=3200;}
    mode=next;power.up=power.down=false;Object.assign(foot,{run:false,jump:false,turnLeft:false,turnRight:false});
    if(next==='plane'){
      phase='flying';plane.launch({x:from.x,z:from.z,heading:from.heading,height:70});crashTimer=0;
      planeMesh.group.visible=true;ui.overlay.hidden=true;hud.show('banner',false);ui.fly.textContent='Zurück ins Kart';
      // Thicker haze from the air hides the edge of the 3 km landscape.
      if(meta.land){scene.fog.near=250;scene.fog.far=1500;}
    }else if(next==='walk'){
      // Step out two metres to the right of the vehicle and look the same way.
      phase='walking';
      walker.place({x:from.x+Math.cos(from.heading)*2,z:from.z+Math.sin(from.heading)*2,heading:from.heading});
      ui.overlay.hidden=true;hud.show('banner',false);ui.walk.textContent='Zurück ins Kart';
    }else{
      phase='ready';kart.reset(6,0);race.reset();ui.overlay.hidden=false;hud.show('banner',false);
    }
    camReady=false;teleportNext=true;ui.canvas.focus();
  }
  const toggleFlight=()=>setMode('plane');
  ui.walk.addEventListener('click',()=>setMode('walk'));
  ui.fly.addEventListener('click',toggleFlight);
  const flightKeys=(event,down)=>{
    if(event.target?.closest?.('input,textarea,select')||event.ctrlKey||event.metaKey||event.altKey)return;
    if(down&&event.code==='KeyF'&&!event.repeat){toggleFlight();return;}
    if(down&&event.code==='KeyL'&&!event.repeat){setMode('walk');return;}
    if(mode==='walk'){
      if(event.code==='ShiftLeft'||event.code==='ShiftRight')foot.run=down;
      if(event.code==='Space'){if(down&&!event.repeat)foot.jump=true;event.preventDefault();}
      // Arrow keys turn on foot (A/D step sideways); InputRouter maps both to left/right.
      if(event.code==='ArrowLeft')foot.turnLeft=down;
      if(event.code==='ArrowRight')foot.turnRight=down;
      return;
    }
    if(mode!=='plane')return;
    if(event.code==='ShiftLeft'||event.code==='ShiftRight')power.up=down;
    if(event.code==='Space'){power.down=down;event.preventDefault();}
  };
  addEventListener('keydown',e=>flightKeys(e,true));addEventListener('keyup',e=>flightKeys(e,false));
  addEventListener('blur',()=>{power.up=power.down=false;Object.assign(foot,{run:false,turnLeft:false,turnRight:false});});
  // Looking around on foot: drag with mouse, pen or finger on the 3D view.
  let lookPointer=null;
  ui.canvas.addEventListener('pointerdown',e=>{if(mode!=='walk')return;lookPointer={id:e.pointerId,x:e.clientX,y:e.clientY};ui.canvas.setPointerCapture(e.pointerId);});
  ui.canvas.addEventListener('pointermove',e=>{
    if(!lookPointer||e.pointerId!==lookPointer.id)return;
    walker.look((e.clientX-lookPointer.x)*.0045,-(e.clientY-lookPointer.y)*.0045);lookPointer.x=e.clientX;lookPointer.y=e.clientY;
  });
  for(const ev of ['pointerup','pointercancel'])ui.canvas.addEventListener(ev,e=>{if(lookPointer?.id===e.pointerId)lookPointer=null;});
  ui.view.addEventListener('click',()=>{view=(view+1)%2;});

  // Touch buttons: pointer down/up set a virtual axis.
  for(const button of document.querySelectorAll('[data-touch]')){
    const [axis,value]=button.dataset.touch.split(':');
    const set=v=>e=>{e.preventDefault();touch[axis]=v;button.classList.toggle('pressed',v!==0);};
    button.addEventListener('pointerdown',set(Number(value)));
    for(const ev of ['pointerup','pointercancel','pointerleave'])button.addEventListener(ev,set(0));
  }

  function resize(){const w=ui.canvas.clientWidth,h=ui.canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  addEventListener('resize',resize);resize();

  // Live insights (insights.js): position, speed, real frame cost per place, anonymous telemetry, all-session view.
  // State flags for others (protocol FLAG): BRAKING when the kart loses speed, CRASHED for a crashed plane.
  let lastKartSpeed=0;
  const current=()=>{
    const s=mode==='plane'?plane.state:mode==='walk'?walker.state:kart.state;
    let flags=0;
    if(mode==='kart'){if(s.speed>1&&s.speed<lastKartSpeed-.15)flags|=2;lastKartSpeed=s.speed;}
    if(mode==='plane'&&s.crashed)flags|=4;
    return {mode,x:s.x,y:s.y,z:s.z,speed:s.speed,heading:s.heading,flags};
  };
  const insights=new KartInsights({meta,mapName:name,renderer,image:texture.image,blockers,track,button:ui.insights,state:current});
  // Realtime (protocol v1 over /api/realtime): other players on this map, drawn 100 ms behind their snapshots.
  // ?net=0 plays offline. Every deliberate jump (reset, mode switch, race start) carries the teleport flag once.
  let teleportNext=true;
  const net=params.get('net')==='0'?null:new NetClient({url:`${location.protocol==='https:'?'wss':'ws'}://${location.host}/api/realtime?map=${encodeURIComponent(name)}`,
    state:()=>{const out={...current(),teleport:teleportNext};teleportNext=false;return out;},
    // The server refused a pose (lag spike, a jump it found implausible): announce the current place as a teleport.
    onCorrection:()=>{teleportNext=true;}});
  net?.connect();insights.net=net;
  insights.lod=()=>({backend:culler?.backend??'lädt',ms:culler?.lastMs??0,counts:[...lodCount],chunks:chunkLod?.stats()??null});
  const remoteMeshes=new Map();
  // Procedural mutation (layer 4): the base meshes stay as they are; protocol flags drive two uniforms that the
  // vertex shader turns into a crumpled wreck (CRASHED) or a nose dip (BRAKING).
  const mutate=obj=>{
    const u={uDamage:{value:0},uBrake:{value:0}};
    obj.traverse(o=>{
      if(!o.isMesh)return;o.material=o.material.clone();
      o.material.onBeforeCompile=shader=>{
        Object.assign(shader.uniforms,u);
        shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uDamage;\nuniform float uBrake;')
          .replace('#include <begin_vertex>',`#include <begin_vertex>
  transformed.y*=1.0-0.35*uDamage;
  transformed.x+=sin(position.z*4.0+position.y*3.0)*0.12*uDamage;
  transformed.y-=uBrake*0.06;`);
      };
      o.material.customProgramCacheKey=()=>'ourark-mutation';
    });
    return u;
  };
  const remoteMesh=kind=>{
    const obj=kind==='plane'?buildPlane().group:kind==='walk'?buildWalker():buildKart().group;
    const uniforms=mutate(obj);
    // Other players' karts are blue, so they never look like your own.
    if(kind!=='plane'&&kind!=='walk')obj.traverse(o=>{if(o.material?.color?.getHex?.()===0xf3c623)o.material.color.setHex(0x3b82f6);});
    return {obj,uniforms};
  };
  // buildKart/buildPlane/buildWalker create fresh geometries and materials per call, so both can be freed.
  // Layer 2 + 5 for remote players: the EntityStore's 64-byte records go to a WebGPU compute shader (CPU fallback,
  // ?gpu=0 forces it) for facing, frustum and distance LOD. NEAR = full model, MID/FAR = one instanced draw call each.
  let culler=null,lodCodes=null,cullPending=false;const lodCount=[0,0,0,0];
  // ⚡ PERF-01: for at most 64 remotes the CPU reference runs synchronously in the frame (same codes, no second GPU
  // device, no frame of lag from the readback); the WebGPU compute path stays available with ?gpu=1.
  EntityCuller.create({capacity:64,preferGpu:params.get('gpu')==='1'}).then(c=>{culler=c;});
  // W3: culling backend + timings (GPU incl. upload and readback), quality and network clamping in every perf sample.
  registerPerfProbe('cull',()=>culler?{requested:params.get('gpu')==='1'?'webgpu':'cpu',...(culler.lastStats??{backend:culler.backend}),gpuError:culler.gpuError}:null);
  registerPerfProbe('quality',()=>({pixelRatio:renderer.getPixelRatio(),shadowMap:sun.shadow.mapSize.x}));
  if(net)registerPerfProbe('net',()=>{const s=net.stats();return {connected:s.connected,rttMs:s.rttMs,inBytesPerS:s.inBytesPerS,outBytesPerS:s.outBytesPerS,clampedPoses:s.clampedPoses};});
  const instanced=(geometry,color)=>{const m=new THREE.InstancedMesh(geometry,new THREE.MeshLambertMaterial({color}),64);m.count=0;m.frustumCulled=false;scene.add(m);return m;};
  const midMesh=instanced(new THREE.BoxGeometry(1.6,1.3,2.6),0x3b82f6),farMesh=instanced(new THREE.OctahedronGeometry(1.6),0x93c5fd);
  const lodMatrix=new THREE.Matrix4(),lodQuat=new THREE.Quaternion(),lodScale=new THREE.Vector3(1,1,1),lodPos=new THREE.Vector3(),camForward=new THREE.Vector3(),viewProj=new THREE.Matrix4(),yAxis=new THREE.Vector3(0,1,0);
  function cullRemotes(){
    if(!culler||cullPending||!net)return;cullPending=true;
    camera.getWorldDirection(camForward);viewProj.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
    const cam=cameraFrom({position:[camera.position.x,camera.position.y,camera.position.z],forward:[camForward.x,camForward.y,camForward.z],viewProj:viewProj.elements,lod:[40,110,600],radius:3});// matches the server's interest windows (kart ±160 m, plane ±288 m)
    if(culler.backend==='cpu'){
      const t0=performance.now(),st=net.store;lodCodes=cullCpu(st.f32,st.u32,st.capacity,cam,lodCodes??new Uint8Array(st.capacity));
      culler.note('cpu',st.capacity,performance.now()-t0);cullPending=false;return;
    }
    culler.cull(new Uint8Array(net.store.buffer),net.store.capacity,cam).then(codes=>{lodCodes=codes;cullPending=false;},()=>{cullPending=false;});
  }
  const dropRemote=e=>{scene.remove(e.obj);e.obj.traverse(o=>{o.geometry?.dispose();for(const m of [o.material].flat())m?.dispose?.();});};
  function updateRemotes(){
    if(chunkLod){chunkLod.viewDistance=scene.fog.far;chunkLod.update(camera.position);}
    if(!net)return;const seen=new Set();
    midMesh.count=0;farMesh.count=0;lodCount.fill(0);
    // Records first, then the LOD codes for exactly these positions (CPU path: same frame), then the meshes.
    const remotes=net.render();cullRemotes();
    for(const r of remotes){
      seen.add(r.id);let e=remoteMeshes.get(r.id);
      if(!e||e.mode!==r.mode){if(e)dropRemote(e);e={mode:r.mode,...remoteMesh(r.mode)};scene.add(e.obj);remoteMeshes.set(r.id,e);}
      e.obj.position.set(r.pos[0],r.pos[1],r.pos[2]);e.obj.rotation.set(0,-r.heading,0,'YXZ');
      const ease=(uniform,target)=>{uniform.value+=(target-uniform.value)*.12;};
      ease(e.uniforms.uDamage,r.flags&4?1:0);ease(e.uniforms.uBrake,r.flags&2?1:0);
      const slot=net.store.slot(r.id),code=lodCodes&&slot>=0?lodCodes[slot]:LOD.NEAR;
      lodCount[code===CULLED?3:code]++;
      e.obj.visible=code===LOD.NEAR;
      if(code===LOD.MID||code===LOD.FAR){
        const target=code===LOD.MID?midMesh:farMesh;
        lodPos.set(r.pos[0],r.pos[1]+.7,r.pos[2]);lodQuat.setFromAxisAngle(yAxis,-r.heading);lodMatrix.compose(lodPos,lodQuat,lodScale);
        target.setMatrixAt(target.count++,lodMatrix);
      }
    }
    for(const [id,e] of remoteMeshes)if(!seen.has(id)){dropRemote(e);remoteMeshes.delete(id);}
    midMesh.instanceMatrix.needsUpdate=true;farMesh.instanceMatrix.needsUpdate=true;
  }
  insights.marks.push(...loadMarks);let firstFrame=true;

  // Scratch objects reused every frame and step (no allocation in the loop, ADR 0006 Welle P2).
  const camPos=new THREE.Vector3(),look=new THREE.Vector3(),pivot=new THREE.Vector3(),want=new THREE.Vector3(),raceProj={};let camReady=false;
  // One fixed simulation step of the current mode. control(state) → input replaces keyboard/touch (browser checks).
  function simulateStep(control=null){
    if(paused)return;
    if(mode==='walk'){
      // Keys: W/S walk, A/D step sideways, Q/E or ←/→ turn. Touch: Gas/Bremse walk, ◀/▶ turn.
      const keys=input.axes(),arrows=(foot.turnRight?1:0)-(foot.turnLeft?1:0);
      const qe=(input.isDown('turnRight')?1:0)-(input.isDown('turnLeft')?1:0);
      const strafe=arrows?0:keys.x;
      const manual={forward:clamp1(keys.z+touch.z),strafe,turn:clamp1(qe+arrows+touch.x),run:foot.run,jump:foot.jump};
      walker.step(STEP,control?control(walker.state):manual);foot.jump=false;
      return;
    }
    if(mode==='plane'){
      const down=a=>input.isDown(a)?1:0;
      const manual={pitch:Math.max(-1,Math.min(1,down('forward')-down('back')+touch.z)),roll:Math.max(-1,Math.min(1,down('right')-down('left')+touch.x)),
        yaw:down('turnRight')-down('turnLeft'),throttle:(power.up?1:0)-(power.down?1:0)};
      plane.step(STEP,control?control(plane.state):manual);
      hitBuildings();
      if(plane.state.crashed&&(crashTimer+=STEP)>2)relaunch();
      return;
    }
    const keys=input.axes(),drive=phase==='racing'||phase==='finished'||phase==='ready';
    const throttle=drive&&phase!=='finished'?Math.max(-1,Math.min(1,keys.z+touch.z)):phase==='finished'?-.4:0;
    const manual={throttle,steer:Math.max(-1,Math.min(1,keys.x+touch.x))};
    kart.step(STEP,control?{...control(kart.state),...(phase==='countdown'?{throttle:0}:{})}:manual);
    if(phase==='countdown'){countdown-=STEP;if(countdown<=0){phase='racing';hud.text('banner','LOS!');setTimeout(()=>{if(phase==='racing')hud.show('banner',false);},900);}}
    if(phase==='racing'){
      const st=kart.state,p=track.project(st.x,st.z,st.hint,undefined,raceProj);
      const forward=isForwardOnTrack(st,p);
      race.update(STEP,st.s,forward);
      if(race.finished){phase='finished';showResult();}
    }
  }
  // Deterministic stepping for the browser checks (works in hidden tabs too).
  function advance(dt,control=null){accumulator+=dt;while(accumulator>=STEP){accumulator-=STEP;simulateStep(control);}}
  // Adaptive resolution: every real frame interval feeds the controller; the shadow map follows the scale.
  // The first second after start (or a context restore) is not fed: shader compilation and texture upload
  // make those frames slow once, and the controller would otherwise start the session at a lower resolution.
  const WARM_UP_MS=1000;let lastFrameAt=0,warmUntil=Infinity;
  function adapt(now){
    // Test hook (perf checks): extra CPU time per frame, scaled with the pixel count like real GPU load.
    const load=(Number(globalThis.__MOTIONSPEC_FRAME_LOAD_MS__)||0)*(renderer.getPixelRatio()/2)**2;
    if(load>0){const until=performance.now()+load;while(performance.now()<until);}
    if(warmUntil===Infinity)warmUntil=now+WARM_UP_MS;
    if(lastFrameAt&&now>=warmUntil){
      const scale=adaptive.feed(now-lastFrameAt,now);
      if(scale!==renderer.getPixelRatio()){
        renderer.setPixelRatio(scale);resize();
        const size=shadowMapSize(scale,maxShadow);
        if(size!==sun.shadow.mapSize.x){sun.shadow.mapSize.set(size,size);sun.shadow.map?.dispose();sun.shadow.map=null;}
      }
    }
    lastFrameAt=now;
  }
  const loop=new FrameLoop({step:STEP,maxFrame:MAX_CATCH_UP,simulate:()=>simulateStep(),render:(dt,alpha,now)=>{
    adapt(now);draw(dt);
    if(firstFrame){firstFrame=false;insights.mark('Erstes Bild');loadRest();}
    insights.frame(now);
  }});
  // Lost GPU context (driver reset, phone reclaiming memory): pause, wait for the restore, continue.
  watchGpuContext(ui.canvas,{
    onLost:()=>{loop.pause();ui.status.textContent='Grafik unterbrochen – wird wiederhergestellt …';insights.mark('Grafik verloren');},
    onRestored:()=>{ui.status.textContent='';lastFrameAt=0;warmUntil=Infinity;adaptive.reset();loop.resume();insights.mark('Grafik zurück');}
  });
  // Buildings are solid: a crash when the flight path of this step passes through one (checked every step,
  // so thin walls cannot be skipped between frames). The ray reaches 3 m ahead for the wings and nose.
  function hitBuildings(){
    const s=plane.state,prev=plane.previous;if(s.crashed||!blockers.length)return;
    planeFrom.set(prev.x,prev.y,prev.z);planeDir.set(s.x-prev.x,s.y-prev.y,s.z-prev.z);const len=planeDir.length();
    if(len<1e-4)return;planeRay.set(planeFrom,planeDir.normalize());planeRay.far=len+3;
    if(planeRay.intersectObjects(blockers,false).length)plane.crash();
  }
  function drawPlane(dt){
    const s=plane.state;
    planeMesh.group.position.set(s.x,s.y,s.z);planeMesh.group.rotation.set(s.pitch,-s.heading,-s.roll,'YXZ');
    planeMesh.prop.rotation.z+=(8+s.throttle*40)*dt;
    const fx=Math.sin(s.heading),fz=-Math.cos(s.heading),back=view===0?16:42,up=view===0?4.5:16;
    want.set(s.x-fx*back,s.y+up,s.z-fz*back);
    camPos.lerp(want,camReady?1-Math.exp(-dt*4):1);camReady=true;
    const floor=flightGround(camPos.x,camPos.z)+2;if(camPos.y<floor)camPos.y=floor;
    const [ox,oy,oz]=plane.forward();
    camera.position.copy(camPos);sky.position.copy(camPos);look.set(s.x+ox*25,s.y+oy*25+1.5,s.z+oz*25);camera.lookAt(look);
    sun.position.set(s.x+sunDir.x*120,s.y+sunDir.y*120,s.z+sunDir.z*120);sun.target.position.set(s.x,s.y,s.z);
    hud.live('speed',`${Math.round(s.speed*3.6)} km/h`);
    hud.text('lap',s.crashed?'Absturz!':s.onGround?'Am Boden':'Flug');
    hud.live('time',`Höhe ${Math.max(0,Math.round(plane.height()-1.1))} m`);
    hud.live('best',`Gas ${Math.round(s.throttle*100)} %`);
    const outside=landHalf&&Math.max(Math.abs(s.x-landCentre[0]),Math.abs(s.z-landCentre[1]))>landHalf-60;
    const message=s.crashed?'Absturz! Neustart …':s.stalled?'Überzogen – Nase runter, Gas geben!':outside?'Rand der Karte – bitte umdrehen':'';
    hud.text('banner',message);hud.show('banner',Boolean(message));hud.show('wrong',false);
    renderer.render(scene,camera);
  }
  function drawWalk(dt){
    const s=walker.state,fx=Math.sin(s.heading),fz=-Math.cos(s.heading);
    if(view===0){
      const e=walker.eye(),[lx,ly,lz]=walker.forward();
      camera.position.set(e.x,e.y,e.z);look.set(e.x+lx*10,e.y+ly*10,e.z+lz*10);camera.lookAt(look);walkerMesh.visible=false;
    }else{
      walkerMesh.visible=true;walkerMesh.position.set(s.x,s.y,s.z);walkerMesh.rotation.set(0,-s.heading,0);
      want.set(s.x-fx*4.5,s.y+2.4,s.z-fz*4.5);
      camPos.lerp(want,camReady?1-Math.exp(-dt*8):1);camReady=true;
      const floor=flightGround(camPos.x,camPos.z)+.6;if(camPos.y<floor)camPos.y=floor;
      camera.position.copy(blockCamera(pivot.set(s.x,s.y+1.5,s.z),camPos));look.set(s.x+fx*3,s.y+1.4+Math.sin(s.pitch)*3,s.z+fz*3);camera.lookAt(look);
    }
    sky.position.copy(camera.position);
    sun.position.set(s.x+sunDir.x*120,s.y+sunDir.y*120,s.z+sunDir.z*120);sun.target.position.set(s.x,s.y,s.z);
    hud.live('speed',`${(s.speed*3.6).toFixed(1).replace('.',',')} km/h`);
    hud.text('lap',s.onGround?(foot.run?'Rennen':'Zu Fuß'):'Sprung');
    hud.live('time',`${Math.round(s.y+meta.terrain.offset)} m ü. NN`);
    hud.text('best',view===0?'Ich-Sicht':'Verfolger');
    hud.show('banner',false);hud.show('wrong',false);
    renderer.render(scene,camera);
  }
  function draw(dt){
    updateRemotes();
    if(mode==='plane')return drawPlane(dt);
    if(mode==='walk')return drawWalk(dt);
    // Kart pose.
    const st=kart.state;
    kartMesh.group.position.set(st.x,st.y,st.z);
    kartMesh.group.rotation.set(0,-st.heading,0,'YXZ');kartMesh.body.rotation.x=st.pitch;
    for(const w of kartMesh.wheels)w.rotation.x+=st.speed*dt/.24;
    // Chase camera (or a high overview).
    const fx=Math.sin(st.heading),fz=-Math.cos(st.heading);
    if(view===0)want.set(st.x-fx*cam.distance,st.y+cam.height,st.z-fz*cam.distance);else want.set(st.x-fx*30,st.y+28,st.z-fz*30);
    const k=camReady?1-Math.exp(-dt*(view===0?6:3)):1;camReady=true;
    camPos.lerp(want,k);
    const floor=ground(camPos.x,camPos.z)+1.2;if(camPos.y<floor)camPos.y=floor;
    // Never behind a house wall: pull the camera in front of the first building between kart and camera.
    const eye=view===0?blockCamera(pivot.set(st.x,st.y+1.4,st.z),camPos):camPos;
    camera.position.copy(eye);sky.position.copy(eye);look.set(st.x+fx*4,st.y+1,st.z+fz*4);camera.lookAt(look);
    sun.position.set(st.x+sunDir.x*120,st.y+sunDir.y*120,st.z+sunDir.z*120);sun.target.position.set(st.x,st.y,st.z);
    // HUD.
    hud.live('speed',`${Math.round(Math.abs(st.speed)*3.6)} km/h`);
    hud.text('lap',`Runde ${Math.min(race.lap,race.laps)}/${race.laps}`);
    hud.live('time',phase==='racing'||phase==='finished'?fmt(race.time):fmt(0));
    hud.text('best',`Beste ${fmt(race.best)}`);
    hud.show('wrong',phase==='racing'&&race.wrongWay);
    if(phase==='countdown')hud.text('banner',String(Math.ceil(countdown)));
    renderer.render(scene,camera);
  }
  function showResult(){
    hud.show('banner',false);hud.live('time',fmt(race.time));hud.flush();
    $('kart-heading').textContent=`Ziel! ${fmt(race.time)}`;
    $('kart-intro').textContent=`Runden: ${race.lapTimes.map(fmt).join(' · ')} — beste ${fmt(race.best)}`;
    ui.start.textContent='Nochmal fahren';ui.overlay.hidden=false;
  }
  ui.status.textContent='';ui.overlay.hidden=false;hud.show('banner',false);
  loop.start();
  // For browser checks: the simulation, and a way to advance it deterministically (works in hidden tabs too).
  // The whole simulation as one flat block (rollback for client-side prediction): kart, race, plane, pedestrian.
  const sim=new SimSnapshot([kart,race,plane,walker]);
  window.__kart={kart,race,track,scene,plane,walker,insights,net,remoteMeshes,toggleFlight,setMode,loop,hud,adaptive,renderer,sim,
    get quality(){return {scale:renderer.getPixelRatio(),shadow:sun.shadow.mapSize.x};},get mode(){return mode;},get phase(){return phase;},start:startRace,
    tick(seconds,control=null){for(let t=0;t<seconds;t+=STEP)advance(STEP,control);camReady=false;draw(1/60);return mode==='plane'?{...plane.state,mode,height:plane.height()}:mode==='walk'?{...walker.state,mode}:{...kart.state,phase,lap:race.lap,time:race.time};}};
}

main().catch(error=>{ui.status.textContent=`Fehler: ${error.message}`;console.error(error);});
