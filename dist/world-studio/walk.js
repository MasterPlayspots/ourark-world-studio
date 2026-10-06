// World Studio walk mode (built on the Map Studio runtime): colliders from the 3D diorama, the island as walkable
// area and a checked start. Scale: the dioramas are miniatures, 1 unit ≈ 5 m, so the player is scaled down.
import * as THREE from '../worlds/vendor/three.module.js';
import {createWorld} from '../runtime/physics/adapter.js';

export const WORLD_METRES=5;
// Radius 0.3 m, height 1.8 m, eye 1.6 m, 3 m/s, reach 2.5 m — in world units.
export const WALKER={radius:.3/WORLD_METRES,height:1.8/WORLD_METRES,eye:1.6/WORLD_METRES,speed:3/WORLD_METRES,reach:2.5/WORLD_METRES};
// Anything lower than this above the ground can be walked over (paths, lines, flat hills, water): 0.5 m.
export const STEP_HEIGHT=.5/WORLD_METRES;

// Convex hull of [x,z] points (Andrew's monotone chain), counter-clockwise, without collinear points.
export function convexHull(points){
  // Rounded keys merge points closer than 0.1 mm; `${-0}` is "0", unlike toFixed ("-0.0000").
  const p=[...new Map(points.map(([x,z])=>[`${Math.round(x*1e4)},${Math.round(z*1e4)}`,[x,z]])).values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  if(p.length<3)return p;
  const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),lower=[],upper=[];
  for(const q of p){while(lower.length>=2&&cross(lower.at(-2),lower.at(-1),q)<=0)lower.pop();lower.push(q);}
  for(const q of [...p].reverse()){while(upper.length>=2&&cross(upper.at(-2),upper.at(-1),q)<=0)upper.pop();upper.push(q);}
  return [...lower.slice(0,-1),...upper.slice(0,-1)];
}
// The island (terrace) outline, slightly inside the rim: an ellipse around z = -1 (orbital: a flatter platform).
export function walkableArea(worldId,segments=64){
  const rx=10.2,rz=10.2*(worldId==='orbital'?.63:.65);
  return Array.from({length:segments},(_,i)=>{const a=i/segments*Math.PI*2;return [Math.cos(a)*rx,-1+Math.sin(a)*rz];});
}
// Top of the meshes marked as ground (worlds/scene.js).
export function groundLevel(root){
  root.updateMatrixWorld(true);let y=-Infinity;
  root.traverse(o=>{if(o.isMesh&&o.userData.ground){const box=new THREE.Box3().setFromObject(o);if(box.max.y>y)y=box.max.y;}});
  return Number.isFinite(y)?y:0;
}
// One convex footprint per unit (an editable object or a piece of scenery): the hull of every mesh that reaches
// into the body height of the player. Floating objects above the head and low ground detail are left out.
export function sceneColliders(units,{groundY,height=WALKER.height,step=STEP_HEIGHT}){
  const low=groundY+step,high=groundY+height,colliders=[],v=new THREE.Vector3();
  for(const {id,name,object} of units){
    if(!object?.visible)continue;
    object.updateMatrixWorld(true);const points=[];
    object.traverseVisible(o=>{// hidden groups hide their children too
      if(!o.isMesh||o.userData.ground||!o.geometry?.attributes?.position)return;
      if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();
      const box=o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
      if(box.max.y<=low||box.min.y>=high)return;
      const position=o.geometry.attributes.position,stride=Math.max(1,Math.floor(position.count/2000));
      for(let i=0;i<position.count;i+=stride){v.fromBufferAttribute(position,i).applyMatrix4(o.matrixWorld);points.push([v.x,v.z]);}
    });
    const hull=convexHull(points);
    if(hull.length>=3)colliders.push({id,name,vertices:hull});
  }
  return colliders;
}
// → the world object the shared walk host expects (runtime/walk-host.js).
export function prepareWorldWalk({worldId,groundY,colliders,targets}){
  const physics=createWorld({area:walkableArea(worldId),colliders,radius:WALKER.radius});
  const front=-1+10.2*(worldId==='orbital'?.63:.65)*.7,spot=physics.findSpawn({x:0,z:front});
  if(!spot)throw new Error('There is no free place to start on this island.');
  physics.start={...spot};
  return {start:{...spot,heading:0},physics,colliders,targets,groundY,eye:groundY+WALKER.eye,speed:WALKER.speed,
    targetOptions:{distance:WALKER.reach,footprint:target=>target.vertices,eligible:()=>true}};
}
