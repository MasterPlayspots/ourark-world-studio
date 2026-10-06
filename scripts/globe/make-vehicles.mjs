#!/usr/bin/env node
// Builds the two globe vehicles as small binary glTF files from boxes: dist/globe/models/plane.glb and car.glb.
// glTF axes: forward +X, up +Y, left −Z (Cesium turns Y-up into Z-up, so forward = +X = east at heading −90°).
// Byte-identical on every run.
import {writeFile,mkdir} from 'node:fs/promises';

// [centre x,y,z], [size x,y,z], colour index
const COLORS=[[.96,.96,.95],[.95,.78,.14],[.13,.15,.18],[.42,.56,.66]];
const PLANE=[
  [[0,0,0],[6.6,1,1],0],[[-.6,0,0],[1.2,1.04,1.04],1],[[3.5,0,0],[.6,.7,.7],2],[[1.1,.42,0],[1.6,.55,.95],3],
  [[.9,.72,0],[1.5,.12,10.4],0],[[.9,.72,4.6],[1.52,.13,1.2],1],[[.9,.72,-4.6],[1.52,.13,1.2],1],
  [[-3.1,.15,0],[.95,.08,3.6],0],[[-3.2,.75,0],[1.05,1.35,.08],1],
  [[.6,-.8,.75],[.2,.5,.2],2],[[.6,-.8,-.75],[.2,.5,.2],2],[[-2.6,-.9,0],[.15,.3,.15],2],[[4.0,0,0],[.06,2,.12],2]
];
const CAR=[
  [[0,.55,0],[4.3,.7,1.8],1],[[-.25,1.15,0],[2.2,.6,1.62],3],[[-.25,1.48,0],[2,.06,1.5],1],
  [[1.4,.62,.92],[.8,.25,.02],2],[[1.4,.62,-.92],[.8,.25,.02],2],[[2.16,.6,0],[.04,.3,1.5],2],[[-2.16,.65,0],[.04,.3,1.6],2],
  ...[[1.35,.38,.85],[1.35,.38,-.85],[-1.3,.38,.85],[-1.3,.38,-.85]].map(c=>[c,[.72,.72,.28],2])
];

function boxes(parts){
  const byColor=COLORS.map((_,color)=>({color,pos:[],nor:[],idx:[]}));
  const faces=[[[1,0,0],[0,1,0],[0,0,1]],[[-1,0,0],[0,1,0],[0,0,-1]],[[0,1,0],[0,0,1],[1,0,0]],[[0,-1,0],[0,0,-1],[1,0,0]],[[0,0,1],[1,0,0],[0,1,0]],[[0,0,-1],[-1,0,0],[0,1,0]]];
  for(const [c,s,k] of parts){
    const g=byColor[k];
    for(const [n,u,v] of faces){
      const base=g.pos.length/3;
      for(const [a,b] of [[-1,-1],[1,-1],[1,1],[-1,1]]){
        for(let i=0;i<3;i++)g.pos.push(c[i]+(n[i]+a*u[i]+b*v[i])*s[i]/2);
        g.nor.push(...n);
      }
      g.idx.push(base,base+1,base+2,base,base+2,base+3);
    }
  }
  return byColor.filter(g=>g.idx.length);
}

function glb(parts){
  const groups=boxes(parts),chunks=[],views=[],accessors=[],primitives=[];let length=0;
  const push=(typed,target)=>{const bytes=Buffer.from(typed.buffer);views.push({buffer:0,byteOffset:length,byteLength:bytes.length,target});chunks.push(bytes);length+=bytes.length;return views.length-1;};
  groups.forEach((g,i)=>{
    const pos=new Float32Array(g.pos),min=[0,1,2].map(k=>Math.min(...g.pos.filter((_,j)=>j%3===k))),max=[0,1,2].map(k=>Math.max(...g.pos.filter((_,j)=>j%3===k)));
    accessors.push({bufferView:push(pos,34962),componentType:5126,count:pos.length/3,type:'VEC3',min,max});
    accessors.push({bufferView:push(new Float32Array(g.nor),34962),componentType:5126,count:pos.length/3,type:'VEC3'});
    accessors.push({bufferView:push(new Uint16Array(g.idx),34963),componentType:5123,count:g.idx.length,type:'SCALAR'});
    while(length%4){chunks.push(Buffer.alloc(1));length++;}
    primitives.push({attributes:{POSITION:accessors.length-3,NORMAL:accessors.length-2},indices:accessors.length-1,material:i});
  });
  const materials=groups.map(g=>({pbrMetallicRoughness:{baseColorFactor:[...COLORS[g.color],1],metallicFactor:.1,roughnessFactor:.55}}));
  const json={asset:{version:'2.0',generator:'ourark make-vehicles'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives}],materials,accessors,bufferViews:views,buffers:[{byteLength:length}]};
  let text=Buffer.from(JSON.stringify(json));text=Buffer.concat([text,Buffer.alloc((4-text.length%4)%4,0x20)]);
  const bin=Buffer.concat(chunks),header=Buffer.alloc(12);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+text.length+bin.length,8);
  const chunkHead=(n,t)=>{const b=Buffer.alloc(8);b.writeUInt32LE(n,0);b.writeUInt32LE(t,4);return b;};
  return Buffer.concat([header,chunkHead(text.length,0x4e4f534a),text,chunkHead(bin.length,0x004e4942),bin]);
}

const out=new URL('../../dist/globe/models/',import.meta.url);
await mkdir(out,{recursive:true});
for(const [name,parts] of [['plane',PLANE],['car',CAR]]){const data=glb(parts);await writeFile(new URL(`${name}.glb`,out),data);console.log(`${name}.glb ${data.length} B`);}
