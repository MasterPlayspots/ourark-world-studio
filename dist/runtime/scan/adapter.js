// Scan worlds (ADR 0003): a baked motionspec.scan.v1 bundle (worldscan) → the world object the shared walk host
// expects. Pure logic, no DOM and no Three.js. Scans are real rooms in metres, so the player uses the metre
// parameters of the physics adapter (like Map Studio), not the diorama scale of the World Studio.
import {createWorld,PLAYER} from '../physics/adapter.js';

export const SCAN_FORMAT='motionspec.scan.v1';
export const COLLIDERS_FORMAT='motionspec.scan.colliders.v1';
export const SCAN_ID=/^[0-9a-f]{64}$/;
// A scan is one room: anything beyond these limits is not a bundle this runtime should try to walk.
export const SHELL=/^(structure|architecture)\//,FLY_RADIUS=.15;
export const LIMITS=Object.freeze({colliders:5000,vertices:64,area:256,bundleBytes:64*1024*1024});

const finitePoint=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
function polygon(value,max,what){
  if(!Array.isArray(value)||value.length<3||value.length>max||!value.every(finitePoint))throw new Error(`${what}: ungültiges Polygon.`);
  return value.map(([x,z])=>[x,z]);
}

// colliders.json → {floorY, area, colliders:[{id,name,vertices}]} with every field checked.
export function readColliders(data){
  if(!data||data.format!==COLLIDERS_FORMAT)throw new Error('Die Kollisionsdaten des Scans haben ein unbekanntes Format.');
  if(!Number.isFinite(data.floorY))throw new Error('Die Bodenhöhe des Scans fehlt.');
  if(!Array.isArray(data.colliders)||data.colliders.length>LIMITS.colliders)throw new Error('Der Scan hat zu viele Kollisionskörper.');
  return {
    floorY:data.floorY,area:polygon(data.area,LIMITS.area,'Grundfläche'),
    colliders:data.colliders.map((c,i)=>({id:String(c.id??`collider-${i}`).slice(0,200),name:String(c.name??'').slice(0,200),vertices:polygon(c.polygon,LIMITS.vertices,`Kollider ${i+1}`)}))
  };
}

// Source camera frame [pos, forward, up] → walk pose: heading clockwise from north (−Z), pitch up, both degrees.
export function poseFromFrame([position,forward]){
  const [fx,fy,fz]=forward,heading=Math.atan2(fx,-fz)*180/Math.PI,pitch=Math.asin(Math.max(-1,Math.min(1,fy/Math.hypot(fx,fy,fz))))*180/Math.PI;
  return {x:position[0],z:position[2],heading:(heading+360)%360,pitch};
}

// Box for free flight (W4): the room outline in X/Z (a little inside), from just above the floor to below the
// lowest ceiling surface — under a sloped roof the box must not reach the ridge, or the camera ends up above the
// eaves, outside the room, where the one-sided walls are invisible. extent: {top, ceilingY} from the rendered
// scene (renderer.scanExtent); without it, 2.4 m of headroom.
export function flyBounds(area,floorY,{top=floorY+2.4,ceilingY=Infinity}={}){
  const xs=area.map(([x])=>x),zs=area.map(([,z])=>z),inset=.1,roof=Math.min(top,Number.isFinite(ceilingY)?ceilingY:Infinity)-.15;
  return {min:[Math.min(...xs)+inset,floorY+.2,Math.min(...zs)+inset],max:[Math.max(...xs)-inset,Math.max(floorY+.4,roof),Math.max(...zs)-inset]};
}

// → {start, physics, colliders, targets, groundY, eye, speed, modes, area, ceilingY, flyBounds, camera}: the start
// is the free place nearest to where the source camera begins, looking the way it looks.
export function prepareScanWalk({colliders:raw,camera,extent={}}){
  const {floorY,area,colliders}=readColliders(raw);
  const physics=createWorld({area,colliders,radius:PLAYER.radius});
  const wish=camera?.frames?.length?poseFromFrame(camera.frames[0]):null;
  const cx=area.reduce((s,[x])=>s+x,0)/area.length,cz=area.reduce((s,[,z])=>s+z,0)/area.length;
  const spot=physics.findSpawn(wish?{x:wish.x,z:wish.z}:{x:cx,z:cz});
  if(!spot){physics.dispose();throw new Error('In diesem Raum gibt es keinen freien Startplatz.');}
  physics.start={...spot};
  // A ceiling lower than the head of the third-person camera would be meaningless (sloped roofs): ignored then.
  const ceilingY=Number.isFinite(extent.ceilingY)&&extent.ceilingY>floorY+PLAYER.height?extent.ceilingY:Infinity;
  // Flight passes furniture but not the building shell (aha-3d names it structure/… and architecture/…).
  const flyPhysics=createWorld({area,colliders:colliders.filter(c=>SHELL.test(c.id)),radius:FLY_RADIUS});
  return {start:{...spot,heading:wish?.heading??0},physics,colliders,targets:[],groundY:floorY,eye:floorY+PLAYER.eye,speed:PLAYER.walkSpeed,
    targetOptions:{distance:0,footprint:()=>[],eligible:()=>false},
    modes:['first','third','fly','source'],area,ceilingY,flyBounds:flyBounds(area,floorY,extent),flyPhysics,camera:camera?.frames?.length?camera:null,scale:1};
}

// SHA-256 over the sorted "path sha256\n" lines of the payload files — the bundle id (worldscan bundle.mjs).
export async function bundleIdOf(files,digest){
  const lines=files.map(f=>f.path).sort().map(p=>`${p} ${files.find(f=>f.path===p).sha256}\n`).join('');
  return digest(new TextEncoder().encode(lines));
}
export function checkManifest(manifest,id){
  if(!manifest||manifest.format!==SCAN_FORMAT)throw new Error('Das ist kein Scan im Format motionspec.scan.v1.');
  if(manifest.id!==id)throw new Error('Die Szene passt nicht zu ihrer Adresse.');
  if(!Array.isArray(manifest.files)||!manifest.files.length)throw new Error('Die Szene listet keine Dateien.');
  let total=0;
  for(const f of manifest.files){
    if(typeof f.path!=='string'||!/^[a-z0-9_-]+(\.[a-z0-9]+)+$/i.test(f.path)||!SCAN_ID.test(f.sha256)||!Number.isInteger(f.bytes)||f.bytes<0)throw new Error('Die Dateiliste der Szene ist ungültig.');
    total+=f.bytes;
  }
  if(total>LIMITS.bundleBytes)throw new Error('Die Szene ist zu groß für den Browser.');
  for(const required of ['scene.glb','colliders.json'])if(!manifest.files.some(f=>f.path===required))throw new Error(`Der Szene fehlt ${required}.`);
  return manifest;
}
