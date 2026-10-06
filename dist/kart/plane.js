// Small arcade aeroplane: pitch/roll/rudder/throttle, coordinated turns from bank angle, speed traded against
// height, stall below a minimum speed, landing on gentle ground contact, crash otherwise. Pure logic, fixed steps.
// heading: radians clockwise from north (−Z); pitch: radians nose up; roll: radians right wing down.
import {StateLayout,saveOptional,loadOptional} from '../runtime/sim/snapshot.js';

export const PLANE=Object.freeze({
  cruise:38,          // m/s with the throttle at its default (~137 km/h)
  minThrottle:0,maxThrottle:1,defaultThrottle:.55,
  maxSpeed:75,        // m/s
  stall:16,           // m/s: below this the nose drops and the plane sinks
  takeoff:20,         // m/s needed to lift off from the ground
  thrustAccel:7,      // m/s² towards the throttle's target speed
  pitchRate:.9,       // rad/s at full elevator
  rollRate:1.8,       // rad/s towards the commanded bank
  maxBank:1.05,       // rad (60°)
  maxPitch:1.05,      // rad
  yawRate:.35,        // rad/s at full rudder
  gravity:9.81,
  wheelHeight:1.1,    // m: the fuselage centre above the ground when standing
  landingSink:4,      // m/s: softest vertical speed that still counts as a landing
  landingBank:.3,     // rad
  groundFriction:4    // m/s² rolling on the ground without throttle
});

// Flat state layout (runtime/sim/snapshot.js); the crash counter follows the optional state.
export const PLANE_STATE=new StateLayout([['x'],['z'],['y'],['heading'],['pitch'],['roll'],['speed'],['throttle'],['onGround','bool'],
  ['crashed','bool'],['vy'],['stalled','bool']]);

const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const wrap=a=>{const t=Math.PI*2;return ((a+Math.PI)%t+t)%t-Math.PI;};

export class Plane{
  // ground(x,z) → terrain height in the same units as y.
  constructor({ground,params=PLANE}){this.ground=ground;this.p=params;this.crashes=0;this.state=null;this.previous={};}
  get stateSize(){return 2+PLANE_STATE.size;}
  saveState(buf,offset){const o=saveOptional(PLANE_STATE,this.state,buf,offset);buf[o]=this.crashes;return o+1;}
  loadState(buf,offset){const [state,o]=loadOptional(PLANE_STATE,buf,offset,this.state);this.state=state;this.crashes=buf[o];return o+1;}
  // Starts in the air: at (x,z), `height` metres above the ground, flying `heading` at cruise speed.
  launch({x,z,heading=0,height=80}){
    const p=this.p;
    this.state={x,z,y:this.ground(x,z)+height,heading,pitch:0,roll:0,speed:p.cruise,throttle:p.defaultThrottle,onGround:false,crashed:false,vy:0,stalled:false};
    this.previous={...this.state};return this.state;
  }
  forward(){const s=this.state,c=Math.cos(s.pitch);return [Math.sin(s.heading)*c,Math.sin(s.pitch),-Math.cos(s.heading)*c];}
  // input: pitch −1…1 (+ = nose up), roll −1…1 (+ = bank right), yaw −1…1 (+ = right), throttle change −1…1.
  step(dt,{pitch=0,roll=0,yaw=0,throttle=0}={}){
    const p=this.p,s=this.state;Object.assign(this.previous,s);
    if(s.crashed)return s;
    s.throttle=clamp(s.throttle+throttle*.5*dt,p.minThrottle,p.maxThrottle);
    // In the air idle still keeps some speed (gliding); on the ground no throttle means rolling to a stop.
    const target=s.onGround?s.throttle*p.maxSpeed:p.maxSpeed*.18+s.throttle*(p.maxSpeed*.82),authority=clamp(s.speed/p.cruise,.25,1.2);
    // Speed: throttle pulls towards its target speed, climbing costs speed, diving gains it.
    s.speed+=clamp(target-s.speed,-p.thrustAccel,p.thrustAccel)*dt-p.gravity*Math.sin(s.pitch)*dt;
    if(s.onGround)s.speed-=Math.sign(s.speed)*Math.min(Math.abs(s.speed),p.groundFriction*(1-s.throttle)*dt);
    s.speed=clamp(s.speed,0,p.maxSpeed);
    s.stalled=!s.onGround&&s.speed<p.stall;
    if(s.onGround){
      // Taxiing: steer with roll/rudder input, lift off above take-off speed with the nose up.
      s.roll+=clamp(-s.roll,-p.rollRate*dt,p.rollRate*dt);
      s.heading=wrap(s.heading+(roll+yaw)*.6*dt*Math.min(1,s.speed/8));
      s.pitch=pitch>0&&s.speed>=p.takeoff?Math.min(.25,s.pitch+p.pitchRate*.5*dt):Math.max(0,s.pitch-p.pitchRate*dt);
    }else{
      s.roll+=clamp(roll*p.maxBank-s.roll,-p.rollRate*dt,p.rollRate*dt);
      // Elevator pitches in the plane's own frame: when banked part of it turns instead of climbing.
      s.pitch=clamp(s.pitch+pitch*p.pitchRate*authority*Math.cos(s.roll)*dt,-p.maxPitch,p.maxPitch);
      // Coordinated turn from bank angle, plus rudder.
      s.heading=wrap(s.heading+(p.gravity*Math.tan(s.roll)/Math.max(s.speed,p.stall)+yaw*p.yawRate)*dt);
      // Stall: the nose drops until there is speed again.
      if(s.stalled)s.pitch=Math.max(-p.maxPitch,s.pitch-(p.stall-s.speed)*.08*dt*4);
    }
    const [fx,fy,fz]=this.forward();
    // Below stall speed the wings lose lift: extra sink.
    const sink=s.stalled?(p.stall-s.speed)*.6:0;
    s.x+=fx*s.speed*dt;s.z+=fz*s.speed*dt;s.vy=fy*s.speed-sink;s.y+=s.vy*dt;
    const floor=this.ground(s.x,s.z)+p.wheelHeight;
    if(s.y<=floor){
      // A landing comes down onto the ground; meeting a slope or cliff higher than the plane was is a crash.
      const gentle=s.vy>-p.landingSink&&Math.abs(s.roll)<p.landingBank&&s.pitch>-.2&&floor-this.previous.y<1.5;
      if(s.onGround||gentle){s.y=floor;s.onGround=true;s.vy=0;s.pitch=Math.max(0,s.pitch);}
      else{s.y=floor;s.crashed=true;this.crashes++;}
    }else if(s.onGround&&(s.vy>.5&&s.speed>=p.takeoff||s.y>floor+.3))s.onGround=false;   // lift-off, or rolled off an edge
    else if(s.onGround)s.y=floor;
    return s;
  }
  crash(){if(!this.state.crashed){this.state.crashed=true;this.crashes++;}}
  height(){return this.state.y-this.ground(this.state.x,this.state.z);}
}
