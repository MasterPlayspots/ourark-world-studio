// City layer (shared by the Map Studio and 3D Worlds): draws the points of a map document (motionspec.map.v1–v3)
// efficiently — thousands of buildings, footprints extruded — and keeps one invisible proxy group per point for
// picking and selection boxes.
import * as THREE from '../worlds/vendor/three.module.js';
import {isValidated} from './frozen.js';

// Unit shapes and their edges are shared by all points of a category (never disposed with a point).
const UNIT={};
function unit(type){
  if(!UNIT[type]){
    const geometry=type==='marker'?new THREE.CylinderGeometry(.5,.5,1,24):type==='station'?new THREE.CylinderGeometry(.5,.5,1,6):new THREE.BoxGeometry(1,1,1);
    const edges=new THREE.EdgesGeometry(geometry,20);geometry.userData.shared=edges.userData.shared=true;UNIT[type]={geometry,edges};
  }
  return UNIT[type];
}
export function makePoint(record) {
  const group=new THREE.Group();group.userData.id=record.id;
  const material=new THREE.MeshStandardMaterial({color:record.color,roughness:.64,metalness:.12});
  let geometry,edges,scale,y;
  if(record.footprint){
    // map.v3 footprint: the outline extruded to the height. Shape (x, −z) extruded along +z, then turned upright.
    const shape=new THREE.Shape(record.footprint.map(([x,z])=>new THREE.Vector2(x,-z)));
    geometry=new THREE.ExtrudeGeometry(shape,{depth:record.height,bevelEnabled:false});geometry.rotateX(-Math.PI/2);
    edges=new THREE.EdgesGeometry(geometry,20);scale=[1,1,1];y=0;
  }else{
    ({geometry,edges}=unit(record.type));
    scale=[record.width,record.height,record.depth];y=record.height/2;
  }
  const body=new THREE.Mesh(geometry,material);body.scale.set(...scale);body.position.y=y;group.add(body);
  const outline=new THREE.LineSegments(edges,new THREE.LineBasicMaterial({color:record.color,transparent:true,opacity:.55}));outline.scale.copy(body.scale);outline.position.copy(body.position);group.add(outline);
  group.position.set(record.x,0,record.z);group.rotation.y=THREE.MathUtils.degToRad(record.rotation);group.visible=record.visible;
  return group;
}
export function release(root) {root.traverse(o=>{if(!o.geometry?.userData.shared)o.geometry?.dispose();if(o.material)for(const m of [o.material].flat())m.dispose();});}

// --- Batching (PR D): cities with thousands of points. Points are grouped into at most TILE_AXIS² square tiles;
// each tile draws all its points as one mesh and one set of edges (vertex colours), so a view costs a few dozen
// draw calls instead of two per point, and tiles outside the view are culled. The per-point groups stay as
// invisible proxies for picking and the selection box; only the selected point is drawn on its own (it can be
// dragged). A change rebuilds only the tiles whose points changed.
export const TILE_AXIS=6,TILE_MIN=250;
const RENDER_KEYS=['type','x','z','width','depth','height','rotation','color','visible','footprint'];
const signature=point=>JSON.stringify(RENDER_KEYS.map(key=>point[key]));
const batchMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.64,metalness:.12});
const batchLines=new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.55});
// Merge the meshes (or line segments) of the given objects into one non-indexed geometry in world space.
function mergeInto(parts,withNormals){
  let count=0;const prepared=parts.map(({object,color})=>{const g=object.geometry.index?object.geometry.toNonIndexed():object.geometry;count+=g.attributes.position.count;return {g,object,color,own:g!==object.geometry};});
  const position=new Float32Array(count*3),normal=withNormals?new Float32Array(count*3):null,colors=new Float32Array(count*3);
  const v=new THREE.Vector3(),n=new THREE.Matrix3();let offset=0;
  for(const {g,object,color,own} of prepared){
    const pos=g.attributes.position,nor=g.attributes.normal;if(withNormals)n.getNormalMatrix(object.matrixWorld);
    for(let i=0;i<pos.count;i++){
      const o=(offset+i)*3;
      v.fromBufferAttribute(pos,i).applyMatrix4(object.matrixWorld);position[o]=v.x;position[o+1]=v.y;position[o+2]=v.z;
      if(withNormals){v.fromBufferAttribute(nor,i).applyMatrix3(n).normalize();normal[o]=v.x;normal[o+1]=v.y;normal[o+2]=v.z;}
      colors[o]=color.r;colors[o+1]=color.g;colors[o+2]=color.b;
    }
    offset+=pos.count;if(own)g.dispose();
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(position,3));if(withNormals)geometry.setAttribute('normal',new THREE.BufferAttribute(normal,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  geometry.computeBoundingSphere();return geometry;
}
export class CityLayer {
  // parent: the Object3D (at the world origin) the tiles and the selected point are added to.
  constructor(parent){this.parent=parent;this.items=new Map();this.signatures=new Map();this.records=new Map();this.tiles=new Map();this.tileOf=new Map();this.live=null;this.tileSize=0;this.doc=null;}
  // Brings the tiles and proxies up to date with the document; `selection` is drawn on its own.
  sync(doc,selection){
    this.doc=doc;
    const tileSize=Math.max(TILE_MIN,Math.max(doc.map.width,doc.map.depth)/TILE_AXIS);
    const dirty=new Set(),seen=new Set();
    // Resized map: re-tile everything. Every old tile is dirty too: a key string may now cover a different area, and
    // the selected point (exempt below) can be the only one mapping to it.
    if(tileSize!==this.tileSize){this.tileSize=tileSize;for(const id of this.tileOf.keys())this.tileOf.set(id,null);for(const key of this.tiles.keys())dirty.add(key);}
    const tileKey=p=>`${Math.floor(p.x/tileSize)},${Math.floor(p.z/tileSize)}`;
    for(const record of doc.points){
      // The same frozen record as last time cannot have changed: skip its signature (M04: ~2.4 ms per edit at 5000).
      const same=this.records.get(record.id)===record&&isValidated(record);this.records.set(record.id,record);
      seen.add(record.id);const sig=same?this.signatures.get(record.id):signature(record),key=tileKey(record),old=this.tileOf.get(record.id);
      // The selected point is not part of any tile while it stays selected: editing or moving it rebuilds only its own
      // proxy, not the tile it sits in (M04: one tile of ~300 points was rebuilt per edit at 5000 points).
      const outside=record.id===this.live&&selection===this.live;
      const changed=this.signatures.get(record.id)!==sig;
      if(changed){
        const previous=this.items.get(record.id);if(previous){if(previous.parent)this.parent.remove(previous);release(previous);}
        const item=makePoint(record);item.updateMatrixWorld(true);this.items.set(record.id,item);if(record.id===this.live)this.parent.add(item);this.signatures.set(record.id,sig);
      }
      if((changed||old!==key)&&!outside){dirty.add(key);if(old)dirty.add(old);}
      this.tileOf.set(record.id,key);
    }
    for(const [id,item] of this.items)if(!seen.has(id)){if(item.parent)this.parent.remove(item);release(item);dirty.add(this.tileOf.get(id));this.items.delete(id);this.signatures.delete(id);this.records.delete(id);this.tileOf.delete(id);if(this.live===id)this.live=null;}
    // Tiles not referenced any more (e.g. after re-tiling) are removed as well.
    const used=new Set(this.tileOf.values());for(const key of this.tiles.keys())if(!used.has(key))dirty.add(key);
    // The new selection is taken out of its tile now, so select() below does not rebuild the tiles a second time.
    const live=this.items.has(selection)?selection:null;
    if(live!==this.live){
      const before=this.items.get(this.live);if(before?.parent)this.parent.remove(before);
      dirty.add(this.tileOf.get(this.live));dirty.add(this.tileOf.get(live));this.live=live;
    }
    if(this.live&&!this.items.get(this.live).parent)this.parent.add(this.items.get(this.live));
    dirty.delete(undefined);dirty.delete(null);this.rebuildTiles(dirty);
  }
  // The selected point is drawn on its own (so it can be dragged); every other point is part of its tile.
  setLive(id){
    if(this.live===id)return;const before=this.live;this.live=this.items.has(id)?id:null;
    if(before&&this.items.get(before)?.parent)this.parent.remove(this.items.get(before));
    if(this.live)this.parent.add(this.items.get(this.live));
    this.rebuildTiles(new Set([this.tileOf.get(before),this.tileOf.get(this.live)].filter(Boolean)));
  }
  rebuildTiles(keys){
    if(!keys.size||!this.doc)return;
    const byTile=new Map([...keys].map(key=>[key,[]]));
    for(const point of this.doc.points){const key=this.tileOf.get(point.id);if(byTile.has(key)&&point.visible&&point.id!==this.live)byTile.get(key).push(point);}
    for(const [key,points] of byTile){
      const old=this.tiles.get(key);if(old){this.parent.remove(old);old.traverse(o=>o.geometry?.dispose());this.tiles.delete(key);}
      if(!points.length)continue;
      const bodies=[],lines=[];
      for(const point of points){const item=this.items.get(point.id),color=new THREE.Color(point.color);bodies.push({object:item.children[0],color});lines.push({object:item.children[1],color});}
      const tile=new THREE.Group();tile.userData.tile=key;
      tile.add(new THREE.Mesh(mergeInto(bodies,true),batchMaterial),new THREE.LineSegments(mergeInto(lines,false),batchLines));
      this.tiles.set(key,tile);this.parent.add(tile);
    }
  }
  // Proxies that can be hit by a raycast (visible points).
  pickables(){return [...this.items.values()].filter(item=>item.visible);}
  // Removes everything from the parent and frees the GPU resources (shared unit shapes stay).
  dispose(){
    for(const item of this.items.values()){if(item.parent)this.parent.remove(item);release(item);}
    for(const tile of this.tiles.values()){this.parent.remove(tile);tile.traverse(o=>o.geometry?.dispose());}
    this.items.clear();this.signatures.clear();this.records.clear();this.tiles.clear();this.tileOf.clear();this.live=null;this.doc=null;this.tileSize=0;
  }
}
