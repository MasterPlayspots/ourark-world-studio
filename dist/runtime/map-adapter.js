// Map adapter (Welle 2): turns the frozen map snapshot into a physics world and a checked start position.
// Reads only the snapshot (motionspec.map.v2), never the editor document.
import {createWorld,BOUNDS} from './physics/adapter.js';
import {convexParts,convexHull,signedArea} from './geometry/polygon.js';

// Water blocks the player (worldport surfaces): a thin wall along every shore edge — on the sea side of `land`
// polygons (whatever is not land is sea) and on the inside of `water` areas (ponds, canals). Many small convex
// walls instead of huge water polygons keep the broadphase fast. Edges along the map border need no wall.
export const WATER=Object.freeze({id:'water',name:'Wasser'});
const WALL=1;
export function waterColliders(snapshot){
  const surfaces=snapshot.surfaces??[];if(!surfaces.length)return [];
  const hw=snapshot.map.width/2,hd=snapshot.map.depth/2,onBorder=([x,z])=>Math.abs(Math.abs(x)-hw)<1e-6||Math.abs(Math.abs(z)-hd)<1e-6;
  const walls=[];
  for(const surface of surfaces){
    if(surface.kind!=='land'&&surface.kind!=='water')continue;
    const poly=surface.points,outward=signedArea(poly)>0?1:-1,side=surface.kind==='land'?outward:-outward;
    for(let i=0;i<poly.length;i++){
      const a=poly[i],b=poly[(i+1)%poly.length],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
      if(length<.05||(onBorder(a)&&onBorder(b)&&onBorder([(a[0]+b[0])/2,(a[1]+b[1])/2])))continue;
      // (dz, −dx) is the right-hand normal; it points outward for a counter-clockwise (positive area) polygon.
      const ox=dz/length*WALL*side,oz=-dx/length*WALL*side;
      walls.push({...WATER,vertices:[a,b,[b[0]+ox,b[1]+oz],[a[0]+ox,a[1]+oz]]});
    }
  }
  return walls;
}

// Footprint corners exactly as map-studio/renderer.js draws the point: its polygon footprint (map.v3), else a
// unit box or a unit cylinder (6 segments = station, 24 = marker) scaled by width (X) and depth (Z); rotated
// like Object3D.rotation.y.
const SEGMENTS={station:6,marker:24};
export function shapeVertices(point){
  const {width:w,depth:d}=point,n=SEGMENTS[point.type];
  const local=point.footprint?point.footprint:n?Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2;return [.5*w*Math.sin(a),.5*d*Math.cos(a)];}):[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]];
  const angle=point.rotation*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
  return local.map(([x,z])=>[point.x+x*c+z*s,point.z-x*s+z*c]);
}
// Only `solid` points collide (ADR 0001: independent of `visible` and `locked`). Concave footprints become
// several convex colliders with the same id and name.
export function collidersFromSnapshot(snapshot){
  return [...waterColliders(snapshot),...snapshot.points.filter(point=>point.solid).flatMap(point=>{
    const outline=shapeVertices(point);
    return (point.footprint?solidParts(outline):[outline]).map(vertices=>({id:point.id,name:point.name,vertices}));
  })];
}
// A validated footprint always decomposes; should floating point ever defeat it (a near-degenerate outline far
// from the origin), the building blocks with its convex hull instead of making the whole map unwalkable.
function solidParts(outline){try{return convexParts(outline);}catch{return [convexHull(outline)];}}
// → {world, start:{x,z,heading}, source:'stored'|'auto', colliders}. Throws a message for the user if no safe start exists.
export function prepareWalk(snapshot){
  const colliders=collidersFromSnapshot(snapshot),world=createWorld({bounds:{width:snapshot.map.width,depth:snapshot.map.depth},colliders});
  const stored=snapshot.runtime?.spawn;let start,source;
  if(stored){
    const hit=world.overlaps(stored);
    if(hit===BOUNDS)throw new Error('Der gespeicherte Startpunkt liegt zu nah am Kartenrand oder außerhalb der Karte.');
    if(hit)throw new Error(`Der gespeicherte Startpunkt liegt in „${hit.name}“. Bitte den Punkt verschieben oder dort „Blockiert Bewegung“ ausschalten.`);
    start={x:stored.x,z:stored.z,heading:stored.heading};source='stored';
  }else{
    // Default: near the south edge looking north; if that is blocked, the nearest free spot.
    const found=world.findSpawn({x:0,z:Math.max(0,snapshot.map.depth/2-2)});
    if(!found)throw new Error('Die Karte bietet keinen freien Platz für den Spieler (Durchmesser 0,6 m). Bitte Hindernisse verkleinern oder bei einem Punkt „Blockiert Bewegung“ ausschalten.');
    start={...found,heading:0};source='auto';
  }
  world.start={x:start.x,z:start.z};
  return {world,start,source,colliders};
}
