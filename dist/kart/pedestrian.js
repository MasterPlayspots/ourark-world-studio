// On foot: walk/run with mouse or key look, jump, follow the terrain, slide along walls, no climbing of cliffs.
// Pure logic, fixed steps. heading: radians clockwise from north (−Z); pitch: radians, + = looking up.
import {StateLayout,saveOptional,loadOptional} from '../runtime/sim/snapshot.js';

export const FOOT=Object.freeze({
  walk:1.6,        // m/s
  run:4.2,         // m/s with Shift
  turnRate:2.2,    // rad/s for Q/E or the touch arrows
  maxPitch:1.3,    // rad
  eye:1.7,         // m above the ground
  radius:.35,      // m: body radius for wall checks
  jump:4.6,        // m/s initial upward speed (~1.1 m high)
  gravity:9.81,
  maxStep:.45,     // m: highest step (kerb, stairs) taken without jumping
  maxSlope:1.2     // rise per metre that is still walkable (≈ 50°); steeper ground blocks like a wall
});

const PROBE=.5;   // m ahead for the slope check
// Flat state layout (runtime/sim/snapshot.js).
export const FOOT_STATE=new StateLayout([['x'],['z'],['y'],['heading'],['pitch'],['vy'],['onGround','bool'],['speed']]);

const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const wrap=a=>{const t=Math.PI*2;return ((a+Math.PI)%t+t)%t-Math.PI;};

export class Pedestrian{
  // ground(x,z) → terrain height; blocked(from,to) → true when a wall lies between two foot points
  // ({x,y,z}, y = feet). Both in metres of the map frame.
  constructor({ground,blocked=()=>false,params=FOOT}){Object.assign(this,{ground,blocked,p:params});this.state=null;this.previous={};}
  get stateSize(){return 1+FOOT_STATE.size;}
  saveState(buf,offset){return saveOptional(FOOT_STATE,this.state,buf,offset);}
  loadState(buf,offset){const [state,next]=loadOptional(FOOT_STATE,buf,offset,this.state);this.state=state;return next;}
  place({x,z,heading=0}){
    this.state={x,z,y:this.ground(x,z),heading,pitch:-.08,vy:0,onGround:true,speed:0};
    this.previous={...this.state};return this.state;
  }
  // input: forward −1…1, strafe −1…1 (+ = right), turn −1…1 (+ = right), run, jump (true on the step it is pressed).
  step(dt,{forward=0,strafe=0,turn=0,run=false,jump=false}={}){
    const p=this.p,s=this.state;Object.assign(this.previous,s);
    s.heading=wrap(s.heading+turn*p.turnRate*dt);
    let mx=Math.sin(s.heading)*forward+Math.cos(s.heading)*strafe,mz=-Math.cos(s.heading)*forward+Math.sin(s.heading)*strafe;
    const len=Math.hypot(mx,mz);if(len>1){mx/=len;mz/=len;}
    const speed=run?p.run:p.walk,dx=mx*speed*dt,dz=mz*speed*dt;
    // Try the full move, then each axis alone: walls stop the blocked component and the walker slides along them.
    let moved=false;
    for(const [ax,az] of [[dx,dz],[dx,0],[0,dz]]){
      if(!ax&&!az)continue;
      if(this.canMove(s.x+ax,s.z+az)){s.x+=ax;s.z+=az;moved=true;break;}
    }
    s.speed=moved?Math.hypot(s.x-this.previous.x,s.z-this.previous.z)/dt:0;
    // Vertical: gravity in the air, snap to the ground when it is within one step below.
    const floor=this.ground(s.x,s.z);
    if(s.onGround&&jump){s.vy=p.jump;s.onGround=false;}
    if(s.onGround){
      if(s.y-floor>p.maxStep){s.onGround=false;s.vy=0;}   // walked off an edge: fall
      else s.y=floor;
    }
    if(!s.onGround){
      s.vy-=p.gravity*dt;s.y+=s.vy*dt;
      if(s.y<=floor){s.y=floor;s.vy=0;s.onGround=true;}
    }
    return s;
  }
  canMove(x,z){
    const p=this.p,s=this.state,run=Math.hypot(x-s.x,z-s.z)||1e-6;
    // Each step is only centimetres long, so the slope is measured PROBE metres ahead in the walking direction:
    // steeper than walkable blocks (cliffs, embankments), unless the walker is in the air above it.
    const ux=(x-s.x)/run,uz=(z-s.z)/run,here=this.ground(s.x,s.z),ahead=this.ground(s.x+ux*PROBE,s.z+uz*PROBE);
    if(s.onGround&&(ahead-here)/PROBE>p.maxSlope)return false;
    // A ledge higher than one step right at the next position needs a jump.
    if(s.onGround&&this.ground(x,z)-s.y>p.maxStep)return false;
    if(!s.onGround&&s.y<this.ground(x,z)-.05)return false;
    return !this.blocked({x:s.x,y:s.y,z:s.z},{x,y:s.y,z});
  }
  // Mouse or touch look, applied immediately.
  look(dHeading,dPitch){const s=this.state;s.heading=wrap(s.heading+dHeading);s.pitch=clamp(s.pitch+dPitch,-this.p.maxPitch,this.p.maxPitch);}
  eye(){const s=this.state;return {x:s.x,y:s.y+this.p.eye,z:s.z};}
  forward(){const s=this.state,c=Math.cos(s.pitch);return [Math.sin(s.heading)*c,Math.sin(s.pitch),-Math.cos(s.heading)*c];}
}
