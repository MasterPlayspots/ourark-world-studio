// Ground layer (shared by the Map Studio and 3D Worlds): the map's surfaces — land, parks, beach, water, parking
// as flat areas, roads and paths as ribbons of their width — merged into ONE mesh with vertex colours, so a whole
// city's ground costs a single draw call. The ground is flat and lies under everything, so it is drawn FIRST,
// without depth test, in a fixed order (land → green/beach/water → parking → roads → paths): no z-fighting at
// any distance, and buildings drawn afterwards cover it as usual.
import * as THREE from '../worlds/vendor/three.module.js';
import {triangulate,isSimple} from './geometry/polygon.js';

export const GROUND_STYLE={
  land:{color:'#27353b',y:0},park:{color:'#3d7a55',y:.02},beach:{color:'#e3cf9c',y:.02},water:{color:'#2a6f97',y:.03},
  parking:{color:'#3b4652',y:.035},road:{color:'#4b5563',y:.05},path:{color:'#8b93a0',y:.07}
};
// Offset polyline with mitred joins (capped at twice the half width, so sharp turns do not spike).
function ribbon(points,width){
  const half=width/2,left=[],right=[];
  for(let i=0;i<points.length;i++){
    const prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)];
    const segment=(a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1;return [-dz/l,dx/l];};
    const n1=i>0?segment(prev,points[i]):segment(points[i],next),n2=i<points.length-1?segment(points[i],next):n1;
    let nx=n1[0]+n2[0],nz=n1[1]+n2[1];const l=Math.hypot(nx,nz);
    if(l<1e-9){nx=n1[0];nz=n1[1];}else{nx/=l;nz/=l;}
    const scale=Math.min(2,1/Math.max(.5,nx*n1[0]+nz*n1[1]))*half,[x,z]=points[i];
    left.push([x+nx*scale,z+nz*scale]);right.push([x-nx*scale,z-nz*scale]);
  }
  const triangles=[];
  for(let i=0;i<points.length-1;i++)triangles.push([left[i],right[i],left[i+1]],[right[i],right[i+1],left[i+1]]);
  return triangles;
}
// → {geometry, skipped}: skipped counts areas that are not simple polygons (they cannot be triangulated).
export function buildGround(surfaces=[]){
  const position=[],color=[],c=new THREE.Color();let skipped=0;
  const order=Object.keys(GROUND_STYLE),sorted=[...surfaces].sort((a,b)=>order.indexOf(a.kind)-order.indexOf(b.kind));
  for(const surface of sorted){
    const style=GROUND_STYLE[surface.kind];if(!style)continue;
    let triangles;
    if(surface.width!==undefined)triangles=ribbon(surface.points,surface.width);
    else{if(!isSimple(surface.points)){skipped++;continue;}try{triangles=triangulate(surface.points);}catch{skipped++;continue;}}
    c.set(style.color);
    for(const triangle of triangles){
      // Upward-facing winding (counter-clockwise seen from above, i.e. in x/−z).
      const [a,b,d]=triangle,cross=(b[0]-a[0])*(d[1]-a[1])-(b[1]-a[1])*(d[0]-a[0]);
      for(const [x,z] of cross>0?[a,d,b]:[a,b,d]){position.push(x,style.y,z);color.push(c.r,c.g,c.b);}
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(position,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(color,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(new Float32Array(position.length).map((_,i)=>i%3===1?1:0),3));
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  return {geometry,skipped};
}
const groundMaterial=()=>new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,metalness:0,depthTest:false,depthWrite:false});
// Render order: the base plane (−2), then this layer (−1), then everything else (0).
export const GROUND_ORDER=-1,BASE_ORDER=-2;
// A mesh for the surfaces of a document (or null without surfaces); `key` detects when a rebuild is needed.
// FNV-1a over every kind, width and coordinate: a few ms for the largest documents.
export function groundKey(surfaces){
  if(!surfaces?.length)return '';
  let hash=0x811c9dc5;const mix=n=>{hash^=Math.round(n*100)|0;hash=Math.imul(hash,0x01000193)>>>0;};
  for(const s of surfaces){for(const ch of s.kind)mix(ch.charCodeAt(0));mix(s.width??-1);mix(s.points.length);for(const [x,z] of s.points){mix(x);mix(z);}}
  return `${surfaces.length}:${hash.toString(36)}`;
}
export function groundMesh(surfaces){
  if(!surfaces?.length)return null;
  const {geometry,skipped}=buildGround(surfaces),mesh=new THREE.Mesh(geometry,groundMaterial());
  mesh.userData.ground=true;mesh.userData.skipped=skipped;mesh.renderOrder=GROUND_ORDER;mesh.frustumCulled=false;return mesh;
}
