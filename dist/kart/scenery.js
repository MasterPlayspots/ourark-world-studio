// Kart scenery: procedural textures, terrain material with rock on steep slopes and close-up detail, sky dome,
// LoD2 buildings (KB01) in spatial chunks, trees from the canopy model (KT01) and a camera blocker.
// Everything is generated in the browser — no third-party images.
import * as THREE from '../worlds/vendor/three.module.js';
import {decodeHeightFile,decodeBinaryFile,assetUrl} from '../runtime/assets/codec.js';

// Small deterministic random generator so textures and trees look the same on every load.
function random(seed){let s=seed>>>0||1;return ()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296;};}
function canvas(size){const c=document.createElement('canvas');c.width=c.height=size;return [c,c.getContext('2d')];}
function grain(ctx,size,amount,rand){
  const img=ctx.getImageData(0,0,size,size),d=img.data;
  for(let i=0;i<d.length;i+=4){const n=(rand()-.5)*amount;d[i]+=n;d[i+1]+=n;d[i+2]+=n;}
  ctx.putImageData(img,0,0);
}
function texture(c,repeat=true){
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;
  if(repeat)t.wrapS=t.wrapT=THREE.RepeatWrapping;
  return t;
}

// Sandstone ashlar: 512 px = 4 m; courses 40 cm high, blocks 60–140 cm long, mortar joints, weathering.
export function sandstoneTexture(){
  const size=512,[c,ctx]=canvas(size);drawSandstone(ctx,size,4,random(7));return texture(c);
}
function drawSandstone(ctx,size,metres,rand){
  const px=size/metres;
  const tones=['#b58c60','#c39a6b','#a98058','#cba574','#b28659','#bd9568','#9f7a55'];
  ctx.fillStyle='#7d634a';ctx.fillRect(0,0,size,size);
  const course=.4*px;
  for(let row=0;row*course<size;row++){
    let x=-rand()*px;
    while(x<size){
      const len=(.6+rand()*.8)*px;
      ctx.fillStyle=tones[Math.floor(rand()*tones.length)];
      ctx.fillRect(x+1.5,row*course+1.5,len-3,course-3);
      // Weathering: darker lower edge, a few stains.
      ctx.fillStyle='rgba(60,40,25,.12)';ctx.fillRect(x+1.5,row*course+course*.7,len-3,course*.3-1.5);
      if(rand()<.25){ctx.fillStyle=`rgba(40,35,30,${.08+rand()*.12})`;ctx.beginPath();ctx.ellipse(x+len*rand(),row*course+course*rand(),6+rand()*14,4+rand()*8,0,0,7);ctx.fill();}
      x+=len;
    }
  }
  grain(ctx,size,26,rand);
}
// Facade: 512 px = 6 × 6 m, two storeys of 3 m with two windows each (stone surround, sill, mullions, dark glass)
// on sandstone ashlar or on light plaster (tinted per house by vertex colour).
export function facadeTexture(base){
  const size=512,px=size/6,[c,ctx]=canvas(size),rand=random(base==='sandstone'?29:31);
  if(base==='sandstone')drawSandstone(ctx,size,6,rand);
  else{ctx.fillStyle='#f3eee4';ctx.fillRect(0,0,size,size);grain(ctx,size,14,rand);
    ctx.fillStyle='rgba(120,110,95,.18)';ctx.fillRect(0,size-.25*px,size,.25*px);}   // plinth line per storey
  for(let floor=0;floor<2;floor++)for(let col=0;col<2;col++){
    const cx=(1.5+col*3)*px,bottom=size-(floor*3+.9)*px,w=1.1*px,h=1.45*px,x=cx-w/2,y=bottom-h;
    ctx.fillStyle=base==='sandstone'?'#d8c3a0':'#e2dacb';ctx.fillRect(x-.14*px,y-.14*px,w+.28*px,h+.22*px);     // surround
    ctx.fillStyle='#cfc4b0';ctx.fillRect(x-.2*px,bottom+.02*px,w+.4*px,.1*px);                               // sill
    const glass=ctx.createLinearGradient(x,y,x+w,y+h);glass.addColorStop(0,'#3d4c5a');glass.addColorStop(.45,'#6f8293');glass.addColorStop(.55,'#2c3844');glass.addColorStop(1,'#1f2830');
    ctx.fillStyle=glass;ctx.fillRect(x,y,w,h);
    ctx.fillStyle='#ece6da';ctx.fillRect(cx-.03*px,y,.06*px,h);ctx.fillRect(x,y+h*.38,w,.06*px);                // mullions
    ctx.strokeStyle='#ece6da';ctx.lineWidth=.05*px;ctx.strokeRect(x,y,w,h);
  }
  return texture(c);
}
export function asphaltTexture(){
  const size=256,[c,ctx]=canvas(size),rand=random(11);
  ctx.fillStyle='#55575b';ctx.fillRect(0,0,size,size);
  for(let i=0;i<2600;i++){const v=70+rand()*90;ctx.fillStyle=`rgb(${v},${v},${v+4})`;ctx.fillRect(rand()*size,rand()*size,1+rand()*1.5,1+rand()*1.5);}
  for(let i=0;i<14;i++){ctx.fillStyle=`rgba(20,20,22,${.05+rand()*.08})`;ctx.beginPath();ctx.ellipse(rand()*size,rand()*size,10+rand()*40,6+rand()*20,rand()*3,0,7);ctx.fill();}
  grain(ctx,size,18,rand);
  return texture(c);
}
export function gravelTexture(){
  const size=256,[c,ctx]=canvas(size),rand=random(13);
  ctx.fillStyle='#9a917f';ctx.fillRect(0,0,size,size);
  for(let i=0;i<3200;i++){const v=110+rand()*90,w=rand()*20;ctx.fillStyle=`rgb(${v+w},${v+w*.6},${v-10})`;ctx.beginPath();ctx.arc(rand()*size,rand()*size,.6+rand()*1.8,0,7);ctx.fill();}
  grain(ctx,size,20,rand);
  return texture(c);
}
// Grey value noise for close-up detail on the aerial photo (grass blades, gravel).
function detailTexture(){
  const size=256,[c,ctx]=canvas(size),rand=random(17);
  ctx.fillStyle='#808080';ctx.fillRect(0,0,size,size);
  for(let i=0;i<6000;i++){const v=60+rand()*140;ctx.fillStyle=`rgb(${v},${v},${v})`;ctx.fillRect(rand()*size,rand()*size,1,1+rand()*3);}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;return t;
}

// Terrain material: the aerial photo, sandstone where the ground is steeper than ~45° (fortress walls in the
// terrain model), and fine detail noise that fades out with distance.
export function terrainMaterial(photo,{rock=null}={}){
  const material=new THREE.MeshLambertMaterial({map:photo});
  const rockMap=rock==='sandstone'?sandstoneTexture():null,detail=detailTexture();
  material.onBeforeCompile=shader=>{
    shader.uniforms.rockMap={value:rockMap};shader.uniforms.detailMap={value:detail};shader.uniforms.useRock={value:rockMap?1:0};
    shader.vertexShader=shader.vertexShader
      .replace('#include <common>','#include <common>\nvarying vec3 vWPos;varying vec3 vWNormal;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvWPos=(modelMatrix*vec4(transformed,1.)).xyz;vWNormal=normalize(mat3(modelMatrix)*objectNormal);');
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>','#include <common>\nvarying vec3 vWPos;varying vec3 vWNormal;uniform sampler2D rockMap;uniform sampler2D detailMap;uniform float useRock;')
      .replace('#include <map_fragment>',`#include <map_fragment>
        float near=1.-smoothstep(15.,70.,distance(cameraPosition,vWPos));
        float d=texture2D(detailMap,vWPos.xz*.7).r;
        diffuseColor.rgb*=mix(1.,.8+.4*d,near*.8);
        if(useRock>.5){
          vec3 n=normalize(vWNormal);float steep=smoothstep(.72,.5,n.y);
          vec2 ruv=(abs(n.x)>abs(n.z)?vWPos.zy:vWPos.xy)*.25;
          vec3 rockColor=texture2D(rockMap,ruv).rgb;
          diffuseColor.rgb=mix(diffuseColor.rgb,rockColor*.9,steep);
        }`);
  };
  return material;
}

// Sky dome with a vertical gradient and a soft sun glow; follows the camera.
export function skyDome(sunDirection,{zenith=0x5f93cf,horizon=0xdce8f1}={}){
  const material=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,
    uniforms:{zenith:{value:new THREE.Color(zenith)},horizon:{value:new THREE.Color(horizon)},sun:{value:sunDirection.clone().normalize()}},
    vertexShader:'varying vec3 vDir;void main(){vDir=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform vec3 zenith;uniform vec3 horizon;uniform vec3 sun;varying vec3 vDir;
      void main(){float h=max(vDir.y,0.);vec3 c=mix(horizon,zenith,pow(h,.55));
        float s=max(dot(normalize(vDir),sun),0.);c+=vec3(1.,.95,.85)*(pow(s,350.)*1.2+pow(s,12.)*.12);
        if(vDir.y<0.)c=horizon*.92;gl_FragColor=vec4(c,1.);}`});
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(1500,32,16),material);mesh.renderOrder=-1;mesh.frustumCulled=false;
  return mesh;
}

// LoD2 buildings: roofs get the aerial photo (planar UV), walls sandstone ashlar or old-town plaster tones.
// Triangles are grouped into 120 m chunks: few draw calls, still cheap frustum culling and camera ray tests.
export async function loadBuildings(url,{width,depth},photo,{walls='plaster',track=null,packing=null}={}){
  const bytes=await decodeBinaryFile(new Uint8Array(await (await fetch(url)).arrayBuffer()),packing);
  const buffer=bytes.byteOffset===0&&bytes.byteLength===bytes.buffer.byteLength?bytes.buffer:bytes.slice().buffer;
  if(new TextDecoder().decode(new Uint8Array(buffer,0,4))!=='KB01')throw new Error('Unbekanntes Gebäudeformat');
  const [roofCount,wallCount]=new Uint32Array(buffer.slice(4,12)),raw=new Int16Array(buffer,12,(roofCount+wallCount)*3);
  const group=new THREE.Group(),CHUNK=120;
  const roofMaterial=new THREE.MeshLambertMaterial({map:photo,side:THREE.DoubleSide});
  const stone=walls==='sandstone',facade=facadeTexture(stone?'sandstone':'plaster');
  const wallMaterial=new THREE.MeshLambertMaterial({map:facade,vertexColors:!stone,side:THREE.DoubleSide});
  const palette=[0xeee4cf,0xe9d7a8,0xd9c3a0,0xe6e1d8,0xe8cfc4].map(c=>new THREE.Color(c));
  const chunks=new Map();
  const add=(kind,t)=>{
    const o=t*9,cx=(raw[o]+raw[o+3]+raw[o+6])*.05/3,cz=(raw[o+2]+raw[o+5]+raw[o+8])*.05/3;
    const key=`${kind}:${Math.floor(cx/CHUNK)},${Math.floor(cz/CHUNK)}`;if(!chunks.has(key))chunks.set(key,{kind,tris:[]});chunks.get(key).tris.push(t);
  };
  // Parts of buildings that reach into the driving corridor (walls crossing the route) are left out. Track samples
  // are 1 m apart and indexed in 10 m cells, so the test stays cheap even for a whole old town.
  const CELL=10,cells=new Map(),reach=track?track.halfWidth*.8:0;   // inner road only: facades beside narrow lanes stay
  if(track)track.samples.forEach(p=>{const key=`${Math.floor(p.x/CELL)},${Math.floor(p.z/CELL)}`;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(p);});
  const near=(x,z)=>{const ci=Math.floor(x/CELL),cj=Math.floor(z/CELL);
    for(let i=ci-1;i<=ci+1;i++)for(let j=cj-1;j<=cj+1;j++)for(const p of cells.get(`${i},${j}`)||[])if(Math.hypot(p.x-x,p.z-z)<reach+.5)return true;
    return false;};
  const inCorridor=t=>{
    if(!track)return false;const o=t*9,v=[0,3,6].map(j=>[raw[o+j]*.05,raw[o+j+2]*.05]);
    for(let e=0;e<3;e++){const [a,b]=[v[e],v[(e+1)%3]],steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])));
      for(let k=0;k<=steps;k++)if(near(a[0]+(b[0]-a[0])*k/steps,a[1]+(b[1]-a[1])*k/steps))return true;}
    return false;
  };
  let dropped=0;
  for(let t=0;t<(roofCount+wallCount)/3;t++){if(inCorridor(t)){dropped++;continue;}add(t<roofCount/3?'roof':'wall',t);}
  group.userData.dropped=dropped;
  for(const {kind,tris} of chunks.values()){
    const pos=new Float32Array(tris.length*9),uv=new Float32Array(tris.length*6),col=new Float32Array(tris.length*9);
    tris.forEach((t,k)=>{
      for(let j=0;j<9;j++)pos[k*9+j]=raw[t*9+j]*.05;
      const p=i=>[pos[k*9+i*3],pos[k*9+i*3+1],pos[k*9+i*3+2]];
      if(kind==='roof'){for(let i=0;i<3;i++){const [x,,z]=p(i);uv[k*6+i*2]=x/width+.5;uv[k*6+i*2+1]=.5-z/depth;}}
      else{
        // Wall UV: along the wall horizontally, height vertically; one facade tile = 6 × 6 m (two storeys).
        const [a,b,c]=[p(0),p(1),p(2)],e1=[b[0]-a[0],b[2]-a[2]],e2=[c[0]-a[0],c[2]-a[2]];
        let tx=e1[0],tz=e1[1];if(Math.hypot(tx,tz)<1e-3){tx=e2[0];tz=e2[1];}const l=Math.hypot(tx,tz)||1;tx/=l;tz/=l;
        const floor=Math.min(a[1],b[1],c[1]);   // storeys start at the foot of the wall
        for(let i=0;i<3;i++){const [x,y,z]=p(i);uv[k*6+i*2]=(x*tx+z*tz)/6;uv[k*6+i*2+1]=(y-floor)/6;}
        const hash=Math.abs(Math.sin(Math.floor(a[0]/8)*127.1+Math.floor(a[2]/8)*311.7)*43758.5453)%1,cc=palette[Math.floor(hash*palette.length)];
        for(let i=0;i<3;i++)col.set([cc.r,cc.g,cc.b],k*9+i*3);
      }
    });
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('uv',new THREE.BufferAttribute(uv,2));
    if(kind==='wall'&&!stone)g.setAttribute('color',new THREE.BufferAttribute(col,3));
    g.computeVertexNormals();g.computeBoundingSphere();
    const mesh=new THREE.Mesh(g,kind==='roof'?roofMaterial:wallMaterial);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
  }
  return group;
}


// Geometry helpers for trees. Crowns carry a vertex colour that darkens towards the bottom (self-shadowing).
function merge(parts){
  const all=parts.map(g=>g.index?g.toNonIndexed():g),count=all.reduce((n,g)=>n+g.attributes.position.count,0);
  const pos=new Float32Array(count*3);let o=0;for(const g of all){pos.set(g.attributes.position.array,o);o+=g.attributes.position.array.length;}
  const out=new THREE.BufferGeometry();out.setAttribute('position',new THREE.BufferAttribute(pos,3));return out;
}
function shade(geo,centre=new THREE.Vector3()){
  const p=geo.attributes.position,n=new Float32Array(p.count*3),col=new Float32Array(p.count*3),v=new THREE.Vector3();
  for(let i=0;i<p.count;i++){
    // Normals point outwards from the crown centre: soft, rounded light like a real canopy.
    v.set(p.getX(i),p.getY(i),p.getZ(i)).sub(centre).normalize();n.set([v.x,v.y,v.z],i*3);
    const k=.62+.38*Math.min(1,Math.max(0,(p.getY(i)+1)/2));col.set([k,k,k],i*3);
  }
  geo.setAttribute('normal',new THREE.BufferAttribute(n,3));geo.setAttribute('color',new THREE.BufferAttribute(col,3));return geo;
}
// Broadleaf crown in a unit box (x,z ±1, y ±1): one main ball and four smaller ones, lumpy surfaces.
function crownGeometry(rand){
  const parts=[[0,.1,0,.82],[.45,-.25,.2,.6],[-.4,-.2,.35,.58],[.1,-.3,-.48,.6],[-.25,.35,-.2,.55]].map(([x,y,z,s])=>{
    const g=new THREE.IcosahedronGeometry(1,2),p=g.attributes.position;
    for(let i=0;i<p.count;i++){const k=s*(.88+rand()*.24);p.setXYZ(i,p.getX(i)*k+x,p.getY(i)*k+y,p.getZ(i)*k+z);}
    return g;
  });
  return shade(merge(parts));
}
// Conifer: three stacked cones in a unit box from y 0 (base) to 1 (tip).
function coniferGeometry(){
  const parts=[[.38,.55,.36],[.62,.42,.62],[.84,.3,.84]].map(([y,r,h])=>{const g=new THREE.ConeGeometry(r*2,h,10);g.translate(0,y,0);return g;});
  const g=merge(parts);g.translate(0,0,0);return shade(g,new THREE.Vector3(0,.4,0));
}
function trunkGeometry(){const g=new THREE.CylinderGeometry(.6,1,1,7);g.translate(0,.5,0);return g;}

// Trees (KT01) as instanced trunks and crowns; crown colour from the aerial photo, dark narrow crowns as conifers.
// Trees standing on the road corridor are left out.
export async function loadTrees(url,track){
  const buffer=await (await fetch(url)).arrayBuffer(),view=new DataView(buffer);
  if(new TextDecoder().decode(new Uint8Array(buffer,0,4))!=='KT01')throw new Error('Unbekanntes Baumformat');
  const count=view.getUint32(4,true),trees=[];
  for(let i=0;i<count;i++){
    const o=8+i*12,x=view.getInt16(o,true)*.05,z=view.getInt16(o+2,true)*.05,y=view.getInt16(o+4,true)*.05;
    const h=view.getUint8(o+6)*.25,r=view.getUint8(o+7)*.1,color=[view.getUint8(o+8),view.getUint8(o+9),view.getUint8(o+10)];
    if(Math.abs(track.project(x,z).d)<track.limit+1)continue;
    trees.push({x,y,z,h,r,color});
  }
  const rand=random(23),group=new THREE.Group();
  const crownMat=new THREE.MeshLambertMaterial({vertexColors:true}),trunkMat=new THREE.MeshLambertMaterial({color:0x4b3b2d});
  const isConifer=t=>{const [r,g,b]=t.color,sum=r+g+b||1;return sum/3<80&&g/sum<.4&&t.r<3.2;};
  const conifers=trees.filter(isConifer),broadleaf=trees.filter(t=>!isConifer(t));
  const m=new THREE.Matrix4(),q=new THREE.Quaternion(),c=new THREE.Color(),hsl={};
  const instanced=(geo,mat,list,place,colour)=>{
    const mesh=new THREE.InstancedMesh(geo,mat,Math.max(1,list.length));mesh.count=list.length;mesh.castShadow=true;mesh.receiveShadow=true;
    // Own shadow depth material: three.js shares one depth material across all shadow casters, and switching it
    // between instanced and plain meshes (and with/without instance colours) rebuilds the program key on every
    // switch — the largest allocation source of the frame (heap profile 2026-10-01). Same packing as three's own.
    mesh.customDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
    list.forEach((t,i)=>{const [p,s]=place(t);q.setFromAxisAngle(new THREE.Vector3(0,1,0),rand()*6.28);m.compose(p,q,s);mesh.setMatrixAt(i,m);
      if(colour){
        // Photo colours of crowns are dark (seen from above, partly in shadow): lift and saturate a little.
        const [r,g,b]=t.color;c.setRGB(r/255,g/255,b/255,THREE.SRGBColorSpace).getHSL(hsl);
        c.setHSL(hsl.h,Math.min(1,hsl.s*1.25+.05),Math.min(.55,hsl.l*1.45+.04+rand()*.04));mesh.setColorAt(i,c);
      }});
    group.add(mesh);return mesh;
  };
  const broad=t=>{const r=Math.max(t.r,Math.min(7.5,.27*t.h+.9)),ch=Math.max(3,t.h*.62);return {r,ch};};
  instanced(trunkGeometry(),trunkMat,trees,t=>{const top=isConifer(t)?t.h*.5:t.h-broad(t).ch*.85;return [new THREE.Vector3(t.x,t.y,t.z),new THREE.Vector3(.14+t.h*.009,Math.max(1.5,top),.14+t.h*.009)];});
  instanced(crownGeometry(rand),crownMat,broadleaf,t=>{const {r,ch}=broad(t);return [new THREE.Vector3(t.x,t.y+t.h-ch/2,t.z),new THREE.Vector3(r,ch/2,r)];},true);
  instanced(coniferGeometry(),crownMat,conifers,t=>{const r=Math.max(t.r,.16*t.h+.8);return [new THREE.Vector3(t.x,t.y+t.h*.22,t.z),new THREE.Vector3(r,t.h*.8,r)];},true);
  group.userData.count=trees.length;
  return group;
}

// Keeps the chase camera in front of buildings: a ray from the kart to the wanted camera position.
export function cameraBlocker(objects){
  const ray=new THREE.Raycaster(),dir=new THREE.Vector3();
  return (target,wanted)=>{
    dir.subVectors(wanted,target);const length=dir.length();if(length<1e-3||!objects.length)return wanted;
    ray.set(target,dir.normalize());ray.far=length;
    const hit=ray.intersectObjects(objects,true)[0];
    return hit?target.clone().addScaledVector(dir,Math.max(1.2,hit.distance-.4)):wanted;
  };
}

// Surrounding landscape (motionspec.kart.land.v1): a coarse 10 m terrain with an aerial photo around the map.
// Under the detailed map area it is lowered so the detailed terrain always wins.
export async function loadLand(name,mapMeta){
  const base=new URL('./assets/',import.meta.url),meta=await (await fetch(new URL(`${name}.json`,base))).json();
  if(meta.format!=='motionspec.kart.land.v1')throw new Error(`Unbekanntes Umlandformat: ${meta.format}`);
  const g=meta.grid;
  const [bytes,photo]=await Promise.all([fetch(assetUrl(base,g.file,g.hash)).then(r=>r.arrayBuffer()),
    new THREE.TextureLoader().loadAsync(assetUrl(base,meta.texture.file,meta.texture.hash).href)]);
  const raw=await decodeHeightFile(new Uint8Array(bytes),g);photo.colorSpace=THREE.SRGBColorSpace;photo.anisotropy=16;
  const size=g.width*g.cell,geometry=new THREE.PlaneGeometry(size,size,g.width-1,g.depth-1);geometry.rotateX(-Math.PI/2);
  // Land centre relative to the map origin (local x east, z south).
  const cx=meta.west+size/2-mapMeta.origin.east,cz=mapMeta.origin.north-(meta.north-size/2);
  const halfW=mapMeta.terrain.width/2,halfD=mapMeta.terrain.depth/2,pos=geometry.attributes.position;
  for(let j=0;j<g.depth;j++)for(let i=0;i<g.width;i++){
    const k=j*g.width+i,y=raw[k]*g.scale+g.offset-mapMeta.terrain.offset,x=pos.getX(k)+cx,z=pos.getZ(k)+cz;
    const inside=Math.max(Math.abs(x)/halfW,Math.abs(z)/halfD);
    pos.setY(k,y-(inside<.98?6:inside<1.03?1.2:.3));
  }
  geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({map:photo}));mesh.position.set(cx,0,cz);mesh.receiveShadow=true;
  mesh.userData.attribution=meta.attribution;
  // Real (not lowered) land height in map coordinates, for flying beyond the detailed map.
  mesh.userData.heightAt=(x,z)=>{
    const gx=Math.min(g.width-1.001,Math.max(0,(x-cx)/g.cell+(g.width-1)/2)),gz=Math.min(g.depth-1.001,Math.max(0,(z-cz)/g.cell+(g.depth-1)/2));
    const i=Math.floor(gx),j=Math.floor(gz),u=gx-i,v=gz-j,h=(a,b)=>raw[b*g.width+a]*g.scale+g.offset-mapMeta.terrain.offset;
    return (h(i,j)*(1-u)+h(i+1,j)*u)*(1-v)+(h(i,j+1)*(1-u)+h(i+1,j+1)*u)*v;
  };
  mesh.userData.half=size/2;mesh.userData.centre=[cx,cz];
  return mesh;
}
