import {worlds,stopPositions} from '../worlds/data.js';
export const SCHEMA='motionspec.world.v1';
export const kinds=['landmark','box','sphere','ring','panel','text','beacon'];
export const clone=value=>structuredClone(value);
export const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
export const worldById=id=>worlds.find(w=>w.id===id);
export function createObject(kind,index=0) {
  const names={box:'Cube',sphere:'Sphere',ring:'Ring',panel:'Website panel',text:'Headline',beacon:'Destination'};
  return {id:globalThis.crypto?.randomUUID?.()||`object-${Date.now()}-${index}`,kind,name:names[kind]||'Object',sourceIndex:0,
    position:[0,1,2],rotation:[0,0,0],scale:[1,1,1],color:'#4ade80',visible:true,locked:false,animation:'none',
    page:{enabled:['panel','beacon'].includes(kind),title:kind==='text'?'Your next idea.':'A new destination.',body:'A space for your story. Edit this content in the inspector.'}};
}
export function createDocument(world) {
  const objects=world.stops.map((s,i)=>({...createObject('landmark',i),id:`${world.id}-landmark-${i}`,name:s.object,sourceIndex:i,
    position:[...stopPositions[i]],color:'',page:{enabled:true,title:s.heading,body:s.body}}));
  const panel={...createObject('panel'),id:`${world.id}-welcome-panel`,name:'Welcome panel',position:[0,3.6,1],rotation:[0,-12,0],animation:'float',page:{enabled:true,title:world.name,body:world.tag}};
  objects.push(panel);
  return {schema:SCHEMA,world:world.id,objects,settings:{landscape:true,grid:true,exposure:1.1},selected:objects[0].id};
}
export function validateDocument(input) {
  if(!input||input.schema!==SCHEMA||!worldById(input.world)||!Array.isArray(input.objects)||input.objects.length>100)throw new Error('Please choose a valid MotionSpec world file (maximum 100 objects).');
  const ids=new Set();
  const vector=(v,min,max)=>{if(!Array.isArray(v)||v.length!==3||v.some(n=>typeof n!=='number'||!Number.isFinite(n)||n<min||n>max))throw new Error('Invalid object coordinates.');return [...v];};
  const text=(s,max)=>typeof s==='string'?s.slice(0,max):'';
  const objects=input.objects.map(o=>{
    if(!o||typeof o.id!=='string'||o.id.length>100||ids.has(o.id)||!kinds.includes(o.kind))throw new Error('Invalid or duplicate object.');
    ids.add(o.id);
    if(o.kind==='landmark'&&(!Number.isInteger(o.sourceIndex)||o.sourceIndex<0||o.sourceIndex>3))throw new Error('Unknown landmark.');
    if(o.color!==''&&!/^#[0-9a-f]{6}$/i.test(o.color))throw new Error('Invalid material color.');
    return {id:o.id,kind:o.kind,name:text(o.name,60)||'Object',sourceIndex:o.sourceIndex||0,position:vector(o.position,-100,100),rotation:vector(o.rotation,-360,360),scale:vector(o.scale,.1,10),color:o.color,visible:o.visible!==false,locked:o.locked===true,
      animation:['none','spin','float'].includes(o.animation)?o.animation:'none',page:{enabled:o.page?.enabled===true,title:text(o.page?.title,120),body:text(o.page?.body,1200)}};
  });
  return {schema:SCHEMA,world:input.world,objects,settings:{landscape:input.settings?.landscape!==false,grid:input.settings?.grid!==false,exposure:clamp(Number(input.settings?.exposure)||1.1,.5,2)},selected:ids.has(input.selected)?input.selected:objects[0]?.id||null};
}
export class History {
  constructor(){this.past=[];this.future=[];}
  record(before,after){if(JSON.stringify(before)===JSON.stringify(after))return false;this.past.push(clone(before));if(this.past.length>60)this.past.shift();this.future=[];return true;}
  undo(current){if(!this.past.length)return null;this.future.push(clone(current));return this.past.pop();}
  redo(current){if(!this.future.length)return null;this.past.push(clone(current));return this.future.pop();}
}
