// Camera rig (Welle W4, ADR 0003): the views a walk can be seen from, as pure logic (no DOM, no Three.js).
//   first  — the walker's eyes (walk-host default, renderer.placePlayer)
//   third  — behind and above the walker; a ray from the head pulls the camera in front of walls, colliders,
//            the room edge and the ceiling, so it never looks through geometry
//   fly    — free flight without collision, clamped to the room's box
//   source — the camera path from the video (camera.json), played in a loop
// Views are {position:[x,y,z], target:[x,y,z], up?:[x,y,z]} in world units.
export const CAMERA_MODES=Object.freeze(['first','third','fly','source']);
export const THIRD=Object.freeze({distance:2.2,height:.35,aim:.3,margin:.15,minDistance:.35});
export const FLY=Object.freeze({speed:2.2,pitchLimit:85});
const rad=d=>d*Math.PI/180;
const wrap=degrees=>{const d=((degrees+180)%360+360)%360-180;return d===-180?180:d;};
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
// Look direction of heading (clockwise from north, −Z) and pitch (up), both in degrees.
export function direction(heading,pitch=0){const h=rad(heading),p=rad(pitch);return [Math.sin(h)*Math.cos(p),Math.sin(p),-Math.cos(h)*Math.cos(p)];}

// Where the segment a→b (X/Z) first enters a convex polygon: t in [0,1], or null if it never does (Cyrus–Beck).
// A segment starting inside counts as entering at 0.
export function segmentEnters(a,b,vertices){
  let enter=0,exit=1;const dx=b[0]-a[0],dz=b[1]-a[1];
  const cx=vertices.reduce((s,[x])=>s+x,0)/vertices.length,cz=vertices.reduce((s,[,z])=>s+z,0)/vertices.length;
  for(let i=0;i<vertices.length;i++){
    const p=vertices[i],q=vertices[(i+1)%vertices.length];let nx=q[1]-p[1],nz=-(q[0]-p[0]);
    if(nx*(p[0]-cx)+nz*(p[1]-cz)<0){nx=-nx;nz=-nz;}// outward normal
    const num=nx*(a[0]-p[0])+nz*(a[1]-p[1]),den=nx*dx+nz*dz;
    if(Math.abs(den)<1e-12){if(num>0)return null;continue;}
    const t=-num/den;
    if(den<0)enter=Math.max(enter,t);else exit=Math.min(exit,t);
    if(enter>exit)return null;
  }
  return enter;
}
// Where the segment a→b (starting inside the convex area) leaves it: t in [0,1] (1 = stays inside).
export function segmentExits(a,b,vertices){
  let exit=1;const dx=b[0]-a[0],dz=b[1]-a[1];
  const cx=vertices.reduce((s,[x])=>s+x,0)/vertices.length,cz=vertices.reduce((s,[,z])=>s+z,0)/vertices.length;
  for(let i=0;i<vertices.length;i++){
    const p=vertices[i],q=vertices[(i+1)%vertices.length];let nx=q[1]-p[1],nz=-(q[0]-p[0]);
    if(nx*(p[0]-cx)+nz*(p[1]-cz)<0){nx=-nx;nz=-nz;}
    const num=nx*(a[0]-p[0])+nz*(a[1]-p[1]),den=nx*dx+nz*dz;
    if(den>1e-12)exit=Math.min(exit,Math.max(0,-num/den));
  }
  return exit;
}

// Third person: camera behind the walker's head, looking at the head. colliders: [{vertices}] in X/Z; area:
// the walkable outline; ceilingY: lowest ceiling above the walk (Infinity if none). scale: world units per metre.
export function thirdPersonView(pose,{eye,colliders=[],area=null,ceilingY=Infinity,scale=1}){
  const d=THIRD.distance*scale,back=direction(pose.heading,(pose.pitch??0)*.5),head=[pose.x,eye,pose.z];
  let t=1;const from=[pose.x,pose.z],to=[pose.x-back[0]*d,pose.z-back[2]*d];
  for(const {vertices} of colliders){const hit=segmentEnters(from,to,vertices);if(hit!==null&&hit>1e-6&&hit<t)t=hit;}
  if(area)t=Math.min(t,segmentExits(from,to,area));
  // Blocked: stop a margin in front of the hit; with too little room for that, halfway to it (never behind it).
  const hit=t*d,used=t>=1?d:Math.max(hit-THIRD.margin*scale,Math.min(THIRD.minDistance*scale,hit/2));
  const y=Math.min(eye+THIRD.height*scale-back[1]*used,ceilingY-THIRD.margin*scale);
  // Aim a little above the head, so the figure sits in the lower half and the room ahead stays visible.
  return {position:[pose.x-back[0]*used,y,pose.z-back[2]*used],target:[head[0],head[1]+THIRD.aim*scale,head[2]],distance:used};
}

// Free flight: through furniture, clamped to bounds {min:[x,y,z], max:[x,y,z]}; optional physics (a world with only
// the building shell) keeps X/Z inside the walls, sliding along them. Same step/look/interpolate shape as Walker.
export class FlyController{
  constructor({bounds,speed=FLY.speed,physics=null}){this.bounds=bounds;this.speed=speed;this.physics=physics;this.pose={x:0,y:0,z:0,heading:0,pitch:0};this.previous={...this.pose};}
  place({x,y,z,heading=0,pitch=0}){
    let p=this.clamped({x,y,z,heading:wrap(heading),pitch:clamp(pitch,-FLY.pitchLimit,FLY.pitchLimit)});
    if(this.physics?.overlaps(p)){const spot=this.physics.findSpawn({x:p.x,z:p.z});if(spot)p={...p,x:spot.x,z:spot.z};}
    this.pose=p;this.previous={...this.pose};
  }
  clamped(p){const {min,max}=this.bounds;return {...p,x:clamp(p.x,min[0],max[0]),y:clamp(p.y,min[1],max[1]),z:clamp(p.z,min[2],max[2])};}
  // intent: x = right, z = forward (along the view, including pitch), up = world up; turn = clockwise; each −1…1.
  step(dt,{x=0,z=0,up=0,turn=0}){
    this.previous={...this.pose};
    const heading=wrap(this.pose.heading+turn*120*dt),f=direction(heading,this.pose.pitch),r=direction(heading+90,0);
    let mx=f[0]*z+r[0]*x,my=f[1]*z+up,mz=f[2]*z+r[2]*x;const length=Math.hypot(mx,my,mz);if(length>1){mx/=length;my/=length;mz/=length;}
    const s=this.speed*dt;let nx=this.pose.x+mx*s,nz=this.pose.z+mz*s;
    if(this.physics){const moved=this.physics.move({x:this.pose.x,z:this.pose.z},{x:mx*s,z:mz*s});nx=moved.reset?this.pose.x:moved.x;nz=moved.reset?this.pose.z:moved.z;}
    this.pose=this.clamped({...this.pose,heading,x:nx,y:this.pose.y+my*s,z:nz});
  }
  look(dx,dy,perPixel=.25){
    const heading=wrap(this.pose.heading+dx*perPixel),pitch=clamp(this.pose.pitch-dy*perPixel,-FLY.pitchLimit,FLY.pitchLimit);
    this.pose={...this.pose,heading,pitch};this.previous={...this.previous,heading,pitch};
  }
  interpolated(alpha){
    const a=this.previous,b=this.pose,turn=wrap(b.heading-a.heading),mix=k=>a[k]+(b[k]-a[k])*alpha;
    return {x:mix('x'),y:mix('y'),z:mix('z'),heading:wrap(a.heading+turn*alpha),pitch:mix('pitch')};
  }
  view(pose=this.pose){const f=direction(pose.heading,pose.pitch);return {position:[pose.x,pose.y,pose.z],target:[pose.x+f[0],pose.y+f[1],pose.z+f[2]]};}
}

// Source camera at time t (seconds, looping): frames [[pos],[forward],[up]] at camera.fps, linearly interpolated.
export function sourceView(camera,time){
  const {frames,fps=30}=camera,count=frames.length,f=((time*fps)%count+count)%count,i=Math.floor(f),t=f-i,a=frames[i],b=frames[(i+1)%count];
  const lerp=(u,v)=>u.map((x,k)=>x+(v[k]-x)*t),position=lerp(a[0],b[0]),forward=lerp(a[1],b[1]);
  return {position,target:position.map((x,k)=>x+forward[k]),up:lerp(a[2],b[2])};
}
