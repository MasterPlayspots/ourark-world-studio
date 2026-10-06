// Scan loader (ADR 0003): fetches a motionspec.scan.v1 bundle from the same origin (/scenes/<id>/), checks every
// file against its SHA-256 in the manifest and the id against the files, then builds the Three.js scene.
// No WASM: the GLB is quantized (KHR_mesh_quantization), which the vendored GLTFLoader reads natively.
import * as THREE from '../../worlds/vendor/three.module.js';
import {GLTFLoader} from '../../worlds/vendor/GLTFLoader.js';
import {SCAN_ID,checkManifest,bundleIdOf} from './adapter.js';

export const SCENES_BASE='/scenes/';
export const SCENES_INDEX='/api/scenes';

// Sample materials per semantic batch. office48 is a whitebox model: these are placeholders chosen from
// object names by worldscan, not reconstructed surfaces (HANDOFF §5 „Materialien“).
const PALETTE={
  floor:[0xa87650,.42],plaster:[0xebe5da,.92],ceiling:[0xf1ece3,.95],beam:[0x4b3222,.62],trim:[0xf3f0e9,.38],walnut:[0x6a4731,.48],
  ash:[0xbd9a6d,.55],leather:[0x7b3b25,.46],blackLeather:[0x2a2621,.5],brass:[0xc19a5b,.28,1],steel:[0x2d2f33,.34,.85],paint:[0x6d7a67,.5],
  rug:[0x7a2f2b,1],coir:[0x8a6c45,1],rattan:[0xa87d4b,.8],paper:[0xf4f1ea,.85],dark:[0x1d1d1f,.35],glassBottle:[0x2c5a3c,.12],wax:[0xeee4cf,.55],binder:[0xffffff,.5]
};
// Comparison mode (`?albedo=clay`): every surface in the aha-3d whitebox clay (albedo 0.72, fully diffuse), so the
// browser frame can be compared with a Cycles render of the same camera frame (W5 image check).
const CLAY=new URLSearchParams(globalThis.location?.search??'').get('albedo')==='clay';
// City tiles (worldscan profile city, ADR 0004): facades get a procedural Art-Deco front — storeys every 3.2 m,
// window bays every 2.6 m, pale cornice bands, larger shop windows on the ground floor — from world position and
// normal, anti-aliased with fwidth, so no textures are needed. Ground layers are stacked a few cm apart: drawn
// first without depth test, like the map's ground layer.
const FACADE_GLSL=`
  vec3 fn=normalize(vFacadeNormal);
  if(abs(fn.y)<.5){
    vec2 ft=normalize(vec2(-fn.z,fn.x));float fu=dot(vFacadePos.xz,ft),fy=vFacadePos.y;
    float level=floor(fy/3.2),py=fract(fy/3.2)*3.2,pu=fract(fu/2.6)*2.6;
    vec2 aa=vec2(fwidth(pu),fwidth(py))*1.5+1e-4;
    float band=level<.5?smoothstep(.25-aa.x,.25+aa.x,pu)*(1.-smoothstep(2.35-aa.x,2.35+aa.x,pu))*smoothstep(.35-aa.y,.35+aa.y,py)*(1.-smoothstep(2.75-aa.y,2.75+aa.y,py))
      :smoothstep(.6-aa.x,.6+aa.x,pu)*(1.-smoothstep(2.-aa.x,2.+aa.x,pu))*smoothstep(1.-aa.y,1.+aa.y,py)*(1.-smoothstep(2.45-aa.y,2.45+aa.y,py));
    float cornice=level>.5?1.-smoothstep(.22-aa.y,.22+aa.y,py):0.;
    // Art-Deco "eyebrow": a thin ledge above the windows of every upper storey, with its shadow below.
    float brow=level>.5?smoothstep(2.5-aa.y,2.5+aa.y,py)*(1.-smoothstep(2.62-aa.y,2.62+aa.y,py)):0.;
    float browShadow=level>.5?smoothstep(2.45-aa.y,2.45+aa.y,py)*(1.-smoothstep(2.5-aa.y,2.5+aa.y,py)):0.;
    // Shop awning band above the ground-floor windows, a colour of its own (teal) as on Ocean Drive.
    float awning=level<.5?smoothstep(2.8-aa.y,2.8+aa.y,py)*(1.-smoothstep(3.08-aa.y,3.08+aa.y,py)):0.;
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.10,.19,.24),band*.9);
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.97,.95,.9),max(cornice*.75,brow*.9));
    diffuseColor.rgb*=1.-browShadow*.35;
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.08,.55,.58),awning*.85);
  }`;
function facadeMaterial(){
  const m=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8,metalness:0});
  m.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vFacadePos;varying vec3 vFacadeNormal;')
      .replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvFacadePos=(modelMatrix*vec4(transformed,1.)).xyz;vFacadeNormal=normalize(mat3(modelMatrix)*objectNormal);');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vFacadePos;varying vec3 vFacadeNormal;')
      .replace('#include <color_fragment>','#include <color_fragment>'+FACADE_GLSL);
  };
  m.customProgramCacheKey=()=>'motionspec-facade-v2';
  return m;
}
export function scanMaterial(semantic){
  if(semantic==='facade'&&!CLAY)return facadeMaterial();
  if(semantic==='roof'&&!CLAY)return new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9,metalness:0});
  if(semantic==='ground'&&!CLAY)return new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,metalness:0,depthTest:false,depthWrite:false});
  if(CLAY)return new THREE.MeshStandardMaterial({color:new THREE.Color().setRGB(.72,.72,.72,THREE.LinearSRGBColorSpace),roughness:1,metalness:0});
  if(semantic==='glass')return new THREE.MeshStandardMaterial({color:0xdfeef6,roughness:.03,transparent:true,opacity:.1,depthWrite:false});
  if(semantic==='sky')return new THREE.MeshBasicMaterial({color:new THREE.Color(1.15,1.45,1.9)});
  if(semantic==='flame')return new THREE.MeshBasicMaterial({color:new THREE.Color(6,3.2,1.1)});
  const [color,roughness,metalness=0]=PALETTE[semantic]??PALETTE.trim;
  return new THREE.MeshStandardMaterial({color,roughness,metalness,vertexColors:true});
}

const hex=buffer=>[...new Uint8Array(buffer)].map(b=>b.toString(16).padStart(2,'0')).join('');
const digest=async bytes=>hex(await crypto.subtle.digest('SHA-256',bytes));

async function fetchOk(url,fetcher,signal){
  const response=await fetcher(url,{signal,credentials:'same-origin'});
  if(!response.ok)throw new Error(`Szene nicht erreichbar (${response.status}).`);
  return response;
}

// Published scenes: [{id,name,stats}] or [] when this server has none (e.g. no /api/scenes route yet).
export async function listScans({fetcher=globalThis.fetch,signal}={}){
  try{
    const response=await fetcher(SCENES_INDEX,{signal,credentials:'same-origin'});
    if(!response.ok)return [];
    const data=await response.json();
    return (Array.isArray(data?.scenes)?data.scenes:[]).filter(s=>SCAN_ID.test(s?.id)).map(s=>({id:s.id,name:String(s.name??'Scan').slice(0,80),stats:s.stats??{}}));
  }catch(error){if(error.name==='AbortError')throw error;return [];}
}

// → {id, manifest, root, colliders, camera, stats}
export async function loadScan(id,{fetcher=globalThis.fetch,signal,base=SCENES_BASE}={}){
  if(!SCAN_ID.test(id))throw new Error('Ungültige Szenen-Adresse.');
  if(!globalThis.crypto?.subtle)throw new Error('Die Szene kann hier nicht geprüft werden (kein sicherer Kontext).');
  const url=path=>`${base}${id}/${path}`;
  const manifest=checkManifest(await (await fetchOk(url('manifest.json'),fetcher,signal)).json(),id);
  const files={};
  await Promise.all(manifest.files.map(async f=>{
    const bytes=await (await fetchOk(url(f.path),fetcher,signal)).arrayBuffer();
    if(bytes.byteLength!==f.bytes||await digest(bytes)!==f.sha256)throw new Error(`Die Datei ${f.path} der Szene ist beschädigt.`);
    files[f.path]=bytes;
  }));
  if(await bundleIdOf(manifest.files,digest)!==id)throw new Error('Die Szene passt nicht zu ihrer Adresse.');
  const json=path=>files[path]?JSON.parse(new TextDecoder().decode(files[path])):null;
  const gltf=await new GLTFLoader().parseAsync(files['scene.glb'],'');
  // Baked light (W5): lighting.json + lightmap.webp, both verified above. Decoded without colour conversion or
  // premultiplication, sampled as sRGB on TEXCOORD_0; intensity π × scale turns it back into irradiance.
  const lighting=json('lighting.json');let lightMap=null;
  if(lighting){
    const spec=lighting.lightmap;
    if(lighting.format!=='motionspec.scan.lighting.v1'||spec?.encoding!=='srgb-scaled'||!(spec.scale>0)||!files[spec.path])throw new Error('Die Lichtdaten der Szene sind ungültig.');
    const bitmap=await createImageBitmap(new Blob([files[spec.path]],{type:'image/webp'}),{imageOrientation:'none',premultiplyAlpha:'none',colorSpaceConversion:'none'});
    lightMap=new THREE.Texture(bitmap);lightMap.flipY=false;lightMap.colorSpace=THREE.SRGBColorSpace;lightMap.channel=0;lightMap.generateMipmaps=true;lightMap.minFilter=THREE.LinearMipmapLinearFilter;lightMap.needsUpdate=true;
    lightMap.userData.intensity=Math.PI*spec.scale;
  }
  const root=new THREE.Group();root.name=`scan-${id.slice(0,12)}`;
  // Outdoor scenes (lighting.json sky, city tiles): a sky dome with the golden-hour gradient, drawn behind all.
  if(lighting?.sky){
    const dome=new THREE.SphereGeometry(4000,32,16),colors=[],pos=dome.attributes.position,c=new THREE.Color(),top=new THREE.Color(.28,.48,.86),horizon=new THREE.Color(1,.72,.48),below=new THREE.Color(.16,.42,.58);
    for(let i=0;i<pos.count;i++){const h=pos.getY(i)/4000;c.copy(h>=0?horizon:below).lerp(h>=0?top:below,h>=0?Math.pow(h,.55):1);colors.push(c.r,c.g,c.b);}
    dome.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    const sky=new THREE.Mesh(dome,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,depthTest:false,depthWrite:false,fog:false}));
    sky.name='sky';sky.renderOrder=-3;sky.frustumCulled=false;sky.userData.semantic='sky-dome';root.add(sky);
  }
  for(const node of [...gltf.scene.children]){
    node.traverse(o=>{
      if(!o.isMesh)return;
      const semantic=o.userData.semantic??o.name;if(semantic==='sky-dome')return;o.material?.dispose?.();o.material=scanMaterial(semantic);
      const lit=CLAY||!['sky','flame','glass'].includes(semantic);
      if(lightMap&&o.geometry.attributes.uv&&lit){
        // Baked: light and shadows come from the atlas. Metals need an environment map for their colour; without
        // one they would render black, so they stay mostly diffuse here (sample materials, HANDOFF §5).
        o.material.lightMap=lightMap;o.material.lightMapIntensity=lightMap.userData.intensity;o.material.metalness=Math.min(o.material.metalness,.2);
        o.castShadow=false;o.receiveShadow=false;
      }else{o.castShadow=lit;o.receiveShadow=lit;}
      if(semantic==='glass'&&!CLAY)o.renderOrder=2;
      if(semantic==='ground'){o.renderOrder=-1;o.frustumCulled=false;}
    });
    root.add(node);
  }
  return {id,manifest,root,lightMap,lighting,colliders:json('colliders.json'),camera:json('camera.json'),stats:manifest.stats??{}};
}
