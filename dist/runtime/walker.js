// Walker (Welle 3): the player's pose on top of the Welle-2 physics. Pure logic, no DOM and no Three.js.
// heading: degrees clockwise from north (−Z), like runtime.spawn and MapRenderer.placePlayer; pitch: degrees up.
import {PLAYER} from './physics/adapter.js';
import {shapeVertices} from './map-adapter.js';
import {containsPoint} from './geometry/polygon.js';

export const TURN_SPEED=120;             // degrees per second for Q/E
export const LOOK_DEGREES_PER_PIXEL=.25; // pointer drag
export const PITCH_LIMIT=75;
export const INTERACT_DISTANCE=2.5;      // metres from the player to the point's footprint
export const INTERACT_ANGLE=60;          // degrees either side of the view direction

const wrap=degrees=>{const d=((degrees+180)%360+360)%360-180;return d===-180?180:d;};
const rad=degrees=>degrees*Math.PI/180;

export class Walker{
  // speed: units per second (PLAYER.walkSpeed = 3 m/s on the map; scaled worlds pass their own value).
  constructor({physics,start,speed=PLAYER.walkSpeed}){
    this.physics=physics;this.speed=speed;this.start={x:start.x,z:start.z,heading:start.heading??0};this.contacts=[];
    this.reset();
  }
  reset(){this.pose={...this.start,pitch:0};this.previous={...this.pose};}
  // Puts the walker at a known free place (e.g. landing after free flight); no interpolation from the old pose.
  place({x,z,heading=this.pose.heading,pitch=0}){this.pose={x,z,heading,pitch};this.previous={...this.pose};this.contacts=[];}
  // intent: x = right, z = forward, turn = clockwise (each −1…1); one fixed simulation step of dt seconds.
  step(dt,{x=0,z=0,turn=0}){
    this.previous={...this.pose};
    const heading=wrap(this.pose.heading+turn*TURN_SPEED*dt),h=rad(heading);
    let mx=Math.sin(h)*z+Math.cos(h)*x,mz=-Math.cos(h)*z+Math.sin(h)*x;
    const length=Math.hypot(mx,mz);if(length>1){mx/=length;mz/=length;}
    const result=this.physics.move({x:this.pose.x,z:this.pose.z},{x:mx*this.speed*dt,z:mz*this.speed*dt});
    this.contacts=result.contacts;
    if(result.reset){this.reset();return result;}
    this.pose={...this.pose,x:result.x,z:result.z,heading};
    return result;
  }
  // Pointer look applies immediately (also to the interpolation base), so the view does not lag behind the hand.
  look(dx,dy){
    const heading=wrap(this.pose.heading+dx*LOOK_DEGREES_PER_PIXEL),pitch=Math.max(-PITCH_LIMIT,Math.min(PITCH_LIMIT,this.pose.pitch-dy*LOOK_DEGREES_PER_PIXEL));
    this.pose={...this.pose,heading,pitch};this.previous={...this.previous,heading,pitch};
  }
  // Pose between the last two steps for rendering (alpha 0 = previous, 1 = current), heading the short way round.
  interpolated(alpha){
    const a=this.previous,b=this.pose,turn=wrap(b.heading-a.heading);
    return {x:a.x+(b.x-a.x)*alpha,z:a.z+(b.z-a.z)*alpha,heading:wrap(a.heading+turn*alpha),pitch:a.pitch+(b.pitch-a.pitch)*alpha};
  }
}

// Closest point of a convex footprint to p (p itself if inside). Convex only: rectangle, 6-gon and 24-gon are.
// Inside means p is strictly on the same side of every edge; on an edge counts as outside with distance 0.
// Nearest point of a footprint (convex or concave); standing on it counts as distance 0.
function closest(p,vertices){
  let best={x:NaN,z:NaN,distance:Infinity},valid=false;
  for(let i=0;i<vertices.length;i++){
    const a=vertices[i],b=vertices[(i+1)%vertices.length],ex=b[0]-a[0],ez=b[1]-a[1];
    if(!(ex*ex+ez*ez>1e-12))continue;// zero-length edge: a degenerate footprint has no inside and no distance
    const t=Math.max(0,Math.min(1,((p.x-a[0])*ex+(p.z-a[1])*ez)/(ex*ex+ez*ez))),x=a[0]+t*ex,z=a[1]+t*ez,d=Math.hypot(p.x-x,p.z-z);
    valid=true;if(d<best.distance)best={x,z,distance:d};
  }
  return valid&&containsPoint(vertices,p)?{x:p.x,z:p.z,distance:0}:best;
}
// The nearest eligible item whose footprint is within reach and in front of the player, or null.
// Defaults fit map points (interactive + visible, footprint as drawn); scaled worlds pass distance and footprint.
export function interactionTarget(items,pose,{distance=INTERACT_DISTANCE,footprint=shapeVertices,eligible=item=>item.interactive&&item.visible}={}){
  const fx=Math.sin(rad(pose.heading)),fz=-Math.cos(rad(pose.heading));let best=null;
  for(const point of items){
    if(!eligible(point))continue;
    const q=closest(pose,footprint(point));if(!(q.distance<=distance))continue;// also drops NaN
    // Standing on the footprint (walkable areas) makes it the target whichever way the player looks.
    if(q.distance>1e-6){const dx=q.x-pose.x,dz=q.z-pose.z;if((dx*fx+dz*fz)/q.distance<Math.cos(rad(INTERACT_ANGLE)))continue;}
    if(!best||q.distance<best.distance)best={point,distance:q.distance};
  }
  return best?.point??null;
}
