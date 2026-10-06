// City tile export (Stadt-Scan, Probe): one square tile of a Map Studio document (motionspec.map.v3) as a raw GLB for
// worldscan (`bake --profile city`). Buildings are extruded with the same code as the city layer, the ground is built
// by the ground layer and clipped to the tile, so the baked tile lies exactly where the map draws it.
//   node scripts/city-tile.mjs <map.json> --tile x0,z0,size -o <dir>   → tile.glb, camera.json, tile.json
// Node names (worldscan city profile): building/<id>/facade · building/<id>/roof · ground/<kind>
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import * as THREE from '../dist/worlds/vendor/three.module.js';
import {buildGround,GROUND_STYLE} from '../dist/runtime/ground-layer.js';

// --- minimal float GLB writer (positions, normals, indices; one mesh per node, identity transforms) ---
export function writeGlb(parts){
  const chunks=[],bufferViews=[],accessors=[],meshes=[],nodes=[];let offset=0;
  const view=(array,target)=>{const bytes=new Uint8Array(array.buffer,array.byteOffset,array.byteLength),pad=(4-offset%4)%4;if(pad){chunks.push(new Uint8Array(pad));offset+=pad;}
    bufferViews.push({buffer:0,byteOffset:offset,byteLength:bytes.byteLength,target});chunks.push(bytes);offset+=bytes.byteLength;return bufferViews.length-1;};
  for(const {name,positions,normals,indices} of parts){
    const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
    for(let i=0;i<positions.length;i++){const k=i%3;min[k]=Math.min(min[k],positions[i]);max[k]=Math.max(max[k],positions[i]);}
    const a=accessors.length,count=positions.length/3;
    accessors.push({bufferView:view(Float32Array.from(positions),34962),componentType:5126,count,type:'VEC3',min:min.map(Math.fround),max:max.map(Math.fround)},
      {bufferView:view(Float32Array.from(normals),34962),componentType:5126,count,type:'VEC3'},
      {bufferView:view(Uint32Array.from(indices),34963),componentType:5125,count:indices.length,type:'SCALAR'});
    meshes.push({name,primitives:[{attributes:{POSITION:a,NORMAL:a+1},indices:a+2,mode:4}]});nodes.push({name,mesh:meshes.length-1});
  }
  const bin=new Uint8Array(Math.ceil(offset/4)*4);let at=0;for(const c of chunks){bin.set(c,at);at+=c.byteLength;}
  const json={asset:{version:'2.0',generator:'motionspec city-tile'},scene:0,scenes:[{nodes:nodes.map((_,i)=>i)}],nodes,meshes,accessors,bufferViews,buffers:[{byteLength:bin.byteLength}]};
  const text=new TextEncoder().encode(JSON.stringify(json)),jl=Math.ceil(text.length/4)*4,total=12+8+jl+8+bin.byteLength,out=new Uint8Array(total),dv=new DataView(out.buffer);
  dv.setUint32(0,0x46546c67,true);dv.setUint32(4,2,true);dv.setUint32(8,total,true);dv.setUint32(12,jl,true);dv.setUint32(16,0x4e4f534a,true);out.set(text,20);out.fill(0x20,20+text.length,20+jl);
  dv.setUint32(20+jl,bin.byteLength,true);dv.setUint32(24+jl,0x004e4942,true);out.set(bin,28+jl);return out;
}

// Triangle clipped to an axis-aligned rectangle in X/Z (Sutherland–Hodgman) → convex polygon, [] if outside.
export function clipToRect(triangle,[x0,z0,x1,z1]){
  let poly=triangle;
  for(const [axis,limit,keepAbove] of [[0,x0,true],[0,x1,false],[1,z0,true],[1,z1,false]]){
    const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],ina=keepAbove?a[axis]>=limit:a[axis]<=limit,inb=keepAbove?b[axis]>=limit:b[axis]<=limit;
      if(ina)out.push(a);if(ina!==inb){const t=(limit-a[axis])/(b[axis]-a[axis]);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}}
    poly=out;if(poly.length<3)return [];
  }
  return poly;
}

export function buildTile(doc,[x0,z0,size]){
  const rect=[x0,z0,x0+size,z0+size],parts=[],round=v=>Math.round(v*1e4)/1e4||0;// no −0
  // Buildings whose position lies in the tile (whole buildings: no cut facades at the tile edge).
  const buildings=doc.points.filter(p=>p.visible!==false&&p.footprint&&p.x>=rect[0]&&p.x<rect[2]&&p.z>=rect[1]&&p.z<rect[3]).sort((a,b)=>a.id<b.id?-1:1);
  for(const p of buildings){
    const shape=new THREE.Shape(p.footprint.map(([x,z])=>new THREE.Vector2(x,-z)));
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:p.height,bevelEnabled:false});geometry.rotateX(-Math.PI/2);
    geometry.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(p.x,0,p.z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),THREE.MathUtils.degToRad(p.rotation)),new THREE.Vector3(1,1,1)));
    // ExtrudeGeometry is already non-indexed: three vertices per triangle.
    const g=geometry,pos=g.attributes.position,nor=g.attributes.normal,facade={positions:[],normals:[]},roof={positions:[],normals:[]};
    for(let t=0;t<pos.count;t+=3){
      const ny=(nor.getY(t)+nor.getY(t+1)+nor.getY(t+2))/3;if(ny<-.5)continue;// the bottom cap is never seen
      const target=ny>.5?roof:facade;
      for(let k=0;k<3;k++){target.positions.push(round(pos.getX(t+k)),round(pos.getY(t+k)),round(pos.getZ(t+k)));target.normals.push(nor.getX(t+k),nor.getY(t+k),nor.getZ(t+k));}
    }
    for(const [kind,part] of [['facade',facade],['roof',roof]])if(part.positions.length)parts.push({name:`building/${p.id}/${kind}`,...part,indices:[...Array(part.positions.length/3).keys()]});
    geometry.dispose();
  }
  // Ground: every kind separately (worldscan colours it by kind), clipped to the tile; a base plane under all.
  const base={name:'ground/base',positions:[x0,-.02,z0,x0,-.02,z0+size,x0+size,-.02,z0+size,x0+size,-.02,z0],normals:[0,1,0,0,1,0,0,1,0,0,1,0],indices:[0,1,2,0,2,3]};parts.push(base);
  for(const kind of Object.keys(GROUND_STYLE)){
    const {geometry}=buildGround((doc.surfaces??[]).filter(s=>s.kind===kind)),pos=geometry.attributes.position,y=GROUND_STYLE[kind].y,part={name:`ground/${kind}`,positions:[],normals:[],indices:[]};
    for(let t=0;t<pos.count;t+=3){
      const poly=clipToRect([0,1,2].map(k=>[pos.getX(t+k),pos.getZ(t+k)]),rect);
      if(poly.length<3)continue;const first=part.positions.length/3;
      for(const [x,z] of poly){part.positions.push(round(x),y,round(z));part.normals.push(0,1,0);}
      for(let i=1;i<poly.length-1;i++)part.indices.push(first,first+i,first+i+1);
    }
    geometry.dispose();
    // Winding: the ground layer emits upward-facing triangles; clipping keeps their order.
    if(part.indices.length)parts.push(part);
  }
  return {parts,buildings:buildings.length,rect};
}

// Source camera: one slow orbit around the tile centre, 20 s at 30 fps, 45 m up, looking at the street level.
export function orbitCamera([x0,z0,size],{seconds=20,fps=30,height=45}={}){
  const cx=x0+size/2,cz=z0+size/2,r=size*.55,frames=[];
  for(let i=0;i<seconds*fps;i++){
    const a=i/(seconds*fps)*Math.PI*2,p=[cx+Math.cos(a)*r,height,cz+Math.sin(a)*r],t=[cx,4,cz],f=t.map((v,k)=>v-p[k]),l=Math.hypot(...f);
    frames.push([p.map(v=>Math.round(v*1e4)/1e4),f.map(v=>Math.round(v/l*1e4)/1e4),[0,1,0]]);
  }
  return {fps,fov:70,aspect:[1280,720],frames,lights:[]};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const [input,...rest]=process.argv.slice(2),arg=name=>rest[rest.indexOf(name)+1];
  if(!input||!rest.includes('--tile')||!rest.includes('-o')){console.error('node scripts/city-tile.mjs <map.json> --tile x0,z0,size -o <dir>');process.exit(2);}
  const doc=JSON.parse(await readFile(input,'utf8')),tile=arg('--tile').split(',').map(Number),out=arg('-o');
  if(!/^motionspec\.map\.v3$/.test(doc.schema))throw new Error('Erwartet motionspec.map.v3.');
  const {parts,buildings,rect}=buildTile(doc,tile);await mkdir(out,{recursive:true});
  await writeFile(path.join(out,'tile.glb'),writeGlb(parts));
  await writeFile(path.join(out,'camera.json'),JSON.stringify(orbitCamera(tile)));
  await writeFile(path.join(out,'tile.json'),JSON.stringify({format:'motionspec.city-tile.v1',source:doc.name,attribution:doc.attribution??null,rect,buildings,parts:parts.length}));
  const triangles=parts.reduce((s,p)=>s+p.indices.length/3,0);
  console.error(`✔ Kachel ${tile.join(',')} · ${buildings} Gebäude · ${parts.length} Teile · ${triangles} Dreiecke → ${out}`);
}
