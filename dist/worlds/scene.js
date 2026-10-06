import * as THREE from './vendor/three.module.js';
import {stopPositions} from './data.js';
const v=(a)=>new THREE.Vector3(...a);
const seeded=(i)=>{const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x)};
function material(color,opts={}){return new THREE.MeshStandardMaterial({color,roughness:.52,metalness:.18,...opts});}
function mesh(geometry,mat,parent,pos=[0,0,0],scale){const m=new THREE.Mesh(geometry,mat);m.position.set(...pos);if(scale)m.scale.set(...scale);parent.add(m);return m;}
function box(parent,mat,x,y,z,w,h,d){return mesh(new THREE.BoxGeometry(w,h,d),mat,parent,[x,y,z]);}
function cylinder(parent,mat,x,y,z,r,h,rt=r){return mesh(new THREE.CylinderGeometry(rt,r,h,48),mat,parent,[x,y,z]);}
function sphere(parent,mat,x,y,z,r){return mesh(new THREE.SphereGeometry(r,32,20),mat,parent,[x,y,z]);}
function torus(parent,mat,r,tube,pos,rotation=[0,0,0],arc=Math.PI*2){const m=mesh(new THREE.TorusGeometry(r,tube,12,80,arc),mat,parent,pos);m.rotation.set(...rotation);return m;}
function line(parent,points,color,r=.026){const curve=new THREE.CatmullRomCurve3(points.map(v));return mesh(new THREE.TubeGeometry(curve,Math.max(16,points.length*12),r,6,false),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.75}),parent);}
function windowRow(parent,mat,x,y,z,count=5){for(let i=0;i<count;i++)box(parent,mat,x+i*.38,y,z,.22,.45,.025);}
function lodge(parent,wood,glass,metal,scale=1){const g=new THREE.Group();parent.add(g);g.scale.setScalar(scale);box(g,wood,0,.6,0,2.8,1.2,1.55);box(g,metal,0,1.27,0,3.2,.17,1.95);box(g,wood,0,-.04,.5,3.4,.13,2.8);windowRow(g,glass,-1.08,.62,.79,6);box(g,glass,1.42,.6,.06,.035,.75,1.12);for(let i=0;i<8;i++)box(g,wood,-1.7+i*.49,.28,1.86,.04,.57,.04);box(g,metal,0,.58,1.86,3.5,.035,.035);return g;}
export function buildWorld(world){
 const root=new THREE.Group(),animated=[],targets=[],pickables=[];root.name=world.id;
 const colors={alpine:['#254439','#415844','#81b69c'],neon:['#102133','#1d4560','#79f6ff'],dune:['#915f43','#cba378','#fae0b7'],ocean:['#103c48','#205b68','#82f2e2'],orbital:['#202039','#555176','#c6b1fb']}[world.id];
 const base=material(colors[0],{roughness:.9}),earth=material(colors[1],{roughness:.95}),accent=material(colors[2],{emissive:colors[2],emissiveIntensity:.13,metalness:.4});
 const glass=material(world.id==='alpine'?'#b6e4ce':colors[2],{transparent:true,opacity:.55,metalness:.65,roughness:.12,emissive:colors[2],emissiveIntensity:.1});
 const dark=material('#111b24',{metalness:.7,roughness:.35}),ivory=material('#e6d8bd',{roughness:.65}),light=new THREE.MeshBasicMaterial({color:colors[2]});
 if(world.id!=='orbital'){
  const land=cylinder(root,base,0,-1.0,-1,10.8,1.5,10.4);land.scale.z=.65;
  const terrace=cylinder(root,earth,0,-.35,-1,10.4,.18);terrace.scale.z=.65;
  const rim=torus(root,accent,10.5,.035,[0,-.42,-1],[Math.PI/2,0,0]);rim.scale.y=.65;
  // Walk mode (world-studio/walk.js): the island itself is ground, never an obstacle.
  land.userData.ground=terrace.userData.ground=rim.userData.ground=true;
 }else{
  const platform=cylinder(root,base,0,-.65,-1,10.4,.35);platform.scale.z=.63;
  const edge=torus(root,light,10.4,.014,[0,-.42,-1],[Math.PI/2,0,0]);edge.scale.y=.63;
  platform.userData.ground=edge.userData.ground=true;
 }
 if(world.id==='alpine'){
  const water=mesh(new THREE.CylinderGeometry(2.5,2.5,.06,64),material('#4fafa0',{metalness:.65,roughness:.1,transparent:true,opacity:.8}),root,[.2,-.2,1.8]);water.scale.set(1.4,1,.8);
  for(let i=0;i<38;i++){const angle=seeded(i)*Math.PI*2,r=7.8+seeded(i+200)*1.5,x=Math.cos(angle)*r,z=Math.sin(angle)*r*.57-1,h=.6+seeded(i+89)*1.2;const pine=new THREE.Group();pine.position.set(x,-.25,z);root.add(pine);cylinder(pine,material('#584834'),0,h*.25,0,.05,h*.5);mesh(new THREE.ConeGeometry(.4*h,h,7),material(i%2?'#32684b':'#224c37'),pine,[0,h*.7,0]);}
 }else if(world.id==='neon'){
  for(let i=0;i<30;i++){const x=-8+seeded(i)*16,z=-6+seeded(i+80)*3,h=.5+seeded(i+54)*3.5;box(root,dark,x,h/2-.2,z,.35+seeded(i+200)*.5,h,.5);box(root,light,x,h,z,.04,.07,.5);}
  for(let i=0;i<6;i++)line(root,[[-8,-.18,-4+i*1.3],[-3,-.18,-4+i*1.3],[0,-.18,-3+i*1.3],[7,-.18,-3+i*1.3]],i%2?'#316889':'#5a989d',.016);
 }else if(world.id==='dune'){
  for(let i=0;i<12;i++){const a=i*.67,x=Math.cos(a)*7.8,z=Math.sin(a)*4.3-1;const hill=sphere(root,earth,x,-.7,z,1.8);hill.scale.set(1.7,.28,1);}
 }else if(world.id==='ocean'){
  for(let i=0;i<30;i++){const a=seeded(i)*Math.PI*2,r=7+seeded(i+3)*3,x=Math.cos(a)*r,z=Math.sin(a)*r*.6-1;const coral=new THREE.Group();coral.position.set(x,-.2,z);root.add(coral);const c=material(i%3===0?'#996783':i%3===1?'#4c8d82':'#668ca5',{roughness:.8});for(let j=0;j<3;j++){const m=mesh(new THREE.CapsuleGeometry(.07,.45+seeded(i+j)*.6,3,6),c,coral,[j*.2-.2,.4,0]);m.rotation.z=(j-1)*.45;}}
 }else{
  const positions=[];for(let i=0;i<230;i++)positions.push((seeded(i)-.5)*50,seeded(i+500)*25-3,(seeded(i+200)-.5)*35);const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));root.add(new THREE.Points(geo,new THREE.PointsMaterial({color:'#d3d0f4',size:.055,transparent:true,opacity:.75})));
 }
 for(let i=0;i<4;i++){
  const group=new THREE.Group();group.position.set(...stopPositions[i]);root.add(group);group.userData.stop=i;targets.push(group);
  const pad=cylinder(group,dark,0,-.04,0,1.8,.18);const ring=torus(group,light,1.84,.018,[0,.06,0],[Math.PI/2,0,0]);
  if(world.id==='alpine'){
   const wood=material('#906e4e',{roughness:.8});
   if(i===0)lodge(group,wood,glass,dark,1.05);
   if(i===1){const a=lodge(group,wood,glass,dark,.72);a.position.x=-.85;a.rotation.y=-.2;const b=lodge(group,wood,glass,dark,.62);b.position.set(1,.2,-.65);b.rotation.y=.2;}
   if(i===2){cylinder(group,wood,0,.15,0,1.35,.3);cylinder(group,glass,0,.85,0,1.15,1.2);cylinder(group,wood,0,1.52,0,1.38,.15);for(let k=0;k<8;k++){let a=k/8*Math.PI*2;box(group,wood,Math.cos(a)*1.16,.9,Math.sin(a)*1.16,.045,1.25,.045);}const pool=cylinder(group,glass,0,.26,1.1,.9,.05);}
   if(i===3){for(let x of [-1,1])for(let z of [-.8,.8])box(group,wood,x,.8,z,.1,1.6,.1);box(group,wood,0,1.65,0,2.5,.15,2.05);box(group,wood,0,.4,-.4,1.8,.13,.5);box(group,wood,0,.72,-.65,1.8,.5,.08);}
  }
  if(world.id==='neon'){
   if(i===0){for(let j=0;j<8;j++){const size=1.7-j*.13;box(group,dark,0,j*.43+.25,0,size,.42,size);box(group,light,0,j*.43+.44,0,size+.03,.025,size+.03);}mesh(new THREE.OctahedronGeometry(.32),light,group,[0,3.9,0]);}
   if(i===1){for(let x of [-1.3,1.3]){box(group,dark,x,1.2,0,.35,2.4,.65);box(group,light,x,1.2,.34,.035,2.4,.02);}line(group,[[-1.3,2.4,0],[-.8,1.4,0],[0,1.1,0],[.8,1.4,0],[1.3,2.4,0]],'#8ae5f3',.07);box(group,glass,0,.6,0,3.3,.12,.95);}
   if(i===2){sphere(group,glass,0,1.6,0,1.15);const a=torus(group,light,1.42,.045,[0,1.6,0],[.5,0,.3]);animated.push({object:a,axis:'y',speed:.22});cylinder(group,dark,0,.35,0,.7,.7);}
   if(i===3){cylinder(group,dark,0,1,0,.22,2);const m=mesh(new THREE.OctahedronGeometry(.82),accent,group,[0,2.6,0]);animated.push({object:m,axis:'y',speed:.25});for(let k=0;k<3;k++)torus(group,light,1+k*.2,.017,[0,1.1+k*.55,0],[Math.PI/2,0,0]);}
  }
  if(world.id==='dune'){
   if(i===0){torus(group,ivory,1.3,.28,[0,1.1,0],[0,0,0],Math.PI);box(group,ivory,-1.3,.6,0,.55,1.2,.55);box(group,ivory,1.3,.6,0,.55,1.2,.55);}
   if(i===1){for(let j=0;j<3;j++){const x=(j-1)*1.12;cylinder(group,ivory,x,.4,0,.47,.8);if(j===0){const m=torus(group,accent,.42,.15,[x,1.3,0],[.4,.3,0]);animated.push({object:m,axis:'y',speed:.15});}if(j===1){const pts=[new THREE.Vector2(.22,0),new THREE.Vector2(.35,.25),new THREE.Vector2(.28,.5),new THREE.Vector2(.16,.67)];mesh(new THREE.LatheGeometry(pts,32),ivory,group,[x,.83,0]);}if(j===2){torus(group,accent,.38,.035,[x,1.35,0]);box(group,dark,x,.95,0,.05,.3,.05);}}}
   if(i===2){const slab=box(group,ivory,0,1.8,0,1.3,3.6,.5);slab.rotation.y=-.3;box(group,accent,.72,1.8,.1,.08,3.6,.52);}
   if(i===3){for(const x of [-1.1,1.1])for(const z of [-.75,.75])cylinder(group,ivory,x,.85,z,.1,1.7);box(group,ivory,0,1.75,0,2.9,.15,2.15);box(group,ivory,0,.45,0,1.4,.2,.65);}
  }
  if(world.id==='ocean'){
   if(i===0){for(let j=0;j<9;j++){const a=j*.8,h=.5+seeded(j)*1.2;const cor=material(j%2?'#b17e97':'#62a2a1');const c=mesh(new THREE.CapsuleGeometry(.16,h,4,8),cor,group,[Math.cos(a)*.8,h*.4,Math.sin(a)*.8]);c.rotation.z=Math.cos(a)*.45;sphere(group,cor,Math.cos(a)*.8,h+.2,Math.sin(a)*.8,.28);}}
   if(i===1){cylinder(group,ivory,0,.15,0,1.55,.3);const dome=mesh(new THREE.SphereGeometry(1.5,40,24,0,Math.PI*2,0,Math.PI/2),glass,group,[0,.3,0]);for(let j=0;j<3;j++)torus(group,light,1.51,.02,[0,.3,0],[0,j*Math.PI/3,0],Math.PI);torus(group,light,1.52,.03,[0,.31,0],[Math.PI/2,0,0]);box(group,ivory,0,.65,1.43,.55,.7,.3);}
   if(i===2){const hull=sphere(group,ivory,0,1,0,.65);hull.scale.set(1.7,.7,.7);sphere(group,glass,.8,1,.1,.42);for(let z of [-.55,.55])cylinder(group,dark,-.25,.9,z,.16,1.7).rotation.z=Math.PI/2;torus(group,accent,.3,.06,[-1.2,1,0],[0,Math.PI/2,0]);box(group,light,.7,.7,.28,.17,.12,.15);}
   if(i===3){cylinder(group,ivory,0,.8,0,.25,1.6);const globe=sphere(group,glass,0,2.05,0,.72);const a=torus(group,light,.94,.03,[0,2.05,0],[.4,.2,0]);animated.push({object:a,axis:'y',speed:.2});}
  }
  if(world.id==='orbital'){
   if(i===0){const planet=sphere(group,material('#8e85ba',{roughness:.82}),0,1.7,0,1.2);const ring=mesh(new THREE.RingGeometry(1.55,2.13,90),material('#aa99c3',{side:THREE.DoubleSide,roughness:.4,transparent:true,opacity:.85}),group,[0,1.7,0]);ring.rotation.set(1.13,.15,.25);animated.push({object:planet,axis:'y',speed:.13});}
   if(i===1){box(group,ivory,0,.5,0,2.8,.25,1.85);for(let x of [-1.1,0,1.1]){box(group,dark,x,1.4,-.6,.07,1.8,.1);box(group,accent,x,1.4,-.54,.75,1.1,.05);}box(group,ivory,0,2.4,0,3.2,.12,2.1);}
   if(i===2){sphere(group,light,0,1.55,0,.28);for(let j=0;j<3;j++){const ring=torus(group,accent,1+j*.17,.025,[0,1.55,0],[j*.7,j*.6,.4]);animated.push({object:ring,axis:j%2?'z':'y',speed:.15+j*.05});}}
   if(i===3){const portal=torus(group,accent,1.35,.16,[0,1.55,0]);torus(group,light,1.1,.025,[0,1.55,0]);cylinder(group,dark,0,.14,0,1.5,.28);for(let j=0;j<6;j++){let a=j/6*Math.PI*2;sphere(group,light,Math.cos(a)*1.35,1.55+Math.sin(a)*1.35,0,.055);}}
  }
  group.traverse(obj=>{if(obj.isMesh){obj.userData.stop=i;pickables.push(obj);}});
  group.userData.labelHeight=world.id==='neon'&&i===0?4.5:world.id==='dune'&&i===2?4.1:3.1;
 }
 const route=stopPositions.map(p=>[p[0],.13,p[2]]);line(root,route,colors[2],.025);
 return {root,targets,pickables,animated};
}
export class WorldScene{
 constructor(canvas,{onSelect,onProject,onStatus}){this.canvas=canvas;this.onSelect=onSelect;this.onProject=onProject;this.onStatus=onStatus;this.enabled=true;this.paused=true;this.reduced=false;this.frame=0;this.angle=0;this.flight=null;this.time=0;this.drag=null;this.camera=new THREE.PerspectiveCamera(38,1,.1,150);this.camera.position.set(17,12,27);this.lookAt=new THREE.Vector3(0,0,-1);this.scene=new THREE.Scene();this.scene.add(new THREE.HemisphereLight('#d9edec','#20303e',2.4));const sun=new THREE.DirectionalLight('#fff1d7',3);sun.position.set(-8,20,12);this.scene.add(sun);this.rim=new THREE.DirectionalLight('#8fc9f0',2);this.rim.position.set(9,8,-10);this.scene.add(this.rim);this.raycaster=new THREE.Raycaster();
  try{this.renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.1;}catch(error){this.enabled=false;onStatus(false);return;}
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.enabled=false;cancelAnimationFrame(this.frame);onStatus(false);});
  this.resize();addEventListener('resize',()=>this.resize());document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(this.frame);this.frame=0;}else this.request();});
  canvas.addEventListener('pointerdown',e=>{if(!this.enabled||e.button!==0)return;this.drag={x:e.clientX,y:e.clientY,angle:this.angle,moved:false};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!this.drag||!this.enabled)return;const dx=e.clientX-this.drag.x;if(Math.abs(dx)>5||Math.abs(e.clientY-this.drag.y)>5)this.drag.moved=true;if(this.drag.moved){this.angle=this.drag.angle+dx*.004;this.flight=null;this.overview(true);}});
  canvas.addEventListener('pointerup',e=>{if(this.drag&&!this.drag.moved&&this.enabled&&this.built){const rect=canvas.getBoundingClientRect();this.raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),this.camera);const hit=this.raycaster.intersectObjects(this.built.pickables,false)[0];if(hit)this.onSelect(hit.object.userData.stop);}this.drag=null;});canvas.addEventListener('pointercancel',()=>{this.drag=null;});onStatus(true);
 }
 resize(){if(!this.renderer)return;this.width=document.body.clientWidth;this.height=document.body.offsetHeight;this.renderer.setSize(this.width,this.height,false);this.camera.aspect=this.width/this.height;this.camera.updateProjectionMatrix();this.camera.projectionMatrix.elements[8]=this.width<650?-.02:-.45;this.camera.projectionMatrix.elements[9]=this.width<650?.18:.02;this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();this.overview(true);}
 setWorld(world){if(!this.enabled)return;if(this.built){this.scene.remove(this.built.root);const geometries=new Set(),materials=new Set();this.built.root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}this.built=buildWorld(world);this.scene.add(this.built.root);this.rim.color.set(world.accent);this.angle=0;this.overview(true);}
 cameraScale(){return this.width<650?2.3:this.width<950?1.5:1;}
 overview(immediate=false){const scale=this.cameraScale();const pos=new THREE.Vector3(Math.sin(.55+this.angle)*32*scale,12*scale,Math.cos(.55+this.angle)*32*scale);this.moveTo(pos,new THREE.Vector3(0,.4,-1),immediate);}
 select(index,immediate=false){if(!this.enabled||!this.built)return;const target=this.built.targets[index].position.clone();target.y=1;const scale=this.width<650?1.8:1;const pos=target.clone().add(new THREE.Vector3(7*scale,5.3*scale,10.5*scale));this.moveTo(pos,target,immediate||this.paused||this.reduced);}
 moveTo(pos,target,immediate){if(immediate){this.camera.position.copy(pos);this.lookAt.copy(target);this.flight=null;}else{this.flight={start:performance.now(),from:this.camera.position.clone(),to:pos,lookFrom:this.lookAt.clone(),lookTo:target};}this.request();}
 setMotion(paused,reduced=false){this.paused=paused;this.reduced=reduced;if(paused&&this.flight)this.flight=null;this.request();}
 setEnabled(value){this.active=value;this.canvas.style.display=value?'':'none';if(value)this.request();else{cancelAnimationFrame(this.frame);this.frame=0;}}
 request(){if(!this.enabled||this.active===false||document.hidden||this.frame)return;this.frame=requestAnimationFrame(t=>this.render(t));}
 render(now){this.frame=0;if(!this.enabled||this.active===false||!this.built)return;const dt=Math.min((now-(this.time||now))/1000,.05);this.time=now;let moving=false;if(this.flight&&!this.paused&&!this.reduced){const t=Math.min(1,(now-this.flight.start)/1800),e=t*t*(3-2*t);this.camera.position.lerpVectors(this.flight.from,this.flight.to,e);this.lookAt.lerpVectors(this.flight.lookFrom,this.flight.lookTo,e);if(t===1)this.flight=null;else moving=true;}
  if(!this.paused&&!this.reduced){for(const a of this.built.animated)a.object.rotation[a.axis]+=dt*a.speed;moving=moving||this.built.animated.length>0;}
  this.camera.lookAt(this.lookAt);this.camera.updateMatrixWorld();this.renderer.render(this.scene,this.camera);
  this.onProject(this.built.targets.map((g,i)=>{const p=g.position.clone();p.y+=g.userData.labelHeight;p.project(this.camera);return {i,x:(p.x*.5+.5)*this.width,y:(-p.y*.5+.5)*this.height,visible:p.z<1&&p.z>-1&&p.x>-.95&&p.x<.95&&p.y>-.95&&p.y<.9};}));if(moving)this.request();
 }
}
