// Free-driving car for the globe: throttle, brake/reverse, bicycle-model steering, follows the terrain with its
// slope, short airtime over crests, slows down on steep climbs. Pure logic, fixed steps, any ground function.
// heading: radians clockwise from north (−Z); pitch: radians nose up.

export const CAR=Object.freeze({
  maxSpeed:55,        // m/s (~200 km/h)
  maxReverse:8,       // m/s
  accel:7,            // m/s² at full throttle
  brake:14,           // m/s² at full brake
  drag:.0021,         // speed²·drag m/s² air resistance: (accel − rolling)/maxSpeed² → top speed ≈ maxSpeed
  rolling:.6,         // m/s² rolling resistance
  wheelbase:2.7,      // m
  maxSteer:.6,        // rad front wheel angle at standstill
  steerFade:.035,     // steering angle shrinks with speed: max/(1+fade·v)
  gravity:9.81,
  rideHeight:.0,      // m: the car's origin sits on the ground
  snap:.6,            // m: within this height above ground the car stays glued to it
  maxGrade:.7         // rise per metre (~35°) the car can still climb; steeper stops it
});

const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const wrap=a=>{const t=Math.PI*2;return ((a+Math.PI)%t+t)%t-Math.PI;};
const PROBE=2;   // m ahead/behind for the slope
const REVERSE_HOLD=.6;   // s at a standstill before the brake pedal reverses

export class Car{
  constructor({ground,params=CAR}){Object.assign(this,{ground,p:params});this.resets=0;}
  place({x,z,heading=0}){
    this.state={x,z,y:this.ground(x,z),heading,pitch:0,speed:0,vy:0,onGround:true,steer:0};
    this.previous={...this.state};this.state.pitch=this.slope();return this.state;
  }
  // Slope along the heading (radians, + = nose up).
  slope(){const s=this.state,fx=Math.sin(s.heading),fz=-Math.cos(s.heading);
    return Math.atan2(this.ground(s.x+fx*PROBE,s.z+fz*PROBE)-this.ground(s.x-fx*PROBE,s.z-fz*PROBE),2*PROBE);}
  // input: throttle −1…1 (+ forward, − brake then reverse), steer −1…1 (+ right), handbrake.
  step(dt,{throttle=0,steer=0,handbrake=false}={}){
    const p=this.p,s=this.state;this.previous={...s};
    if(s.onGround){
      // Longitudinal: throttle, brakes (opposite sign), resistances, gravity along the slope.
      let a=0;
      if(throttle>0)a=s.speed>=0?throttle*p.accel:throttle*p.brake;
      else if(throttle<0)a=s.speed>.5?throttle*p.brake:throttle*p.accel*.6;
      a-=Math.sign(s.speed)*(p.rolling+p.drag*s.speed*s.speed);
      a-=p.gravity*Math.sin(s.pitch);
      if(handbrake)a-=Math.sign(s.speed)*p.brake*1.2;
      // Braking ends at a standstill; reversing (or driving off after reversing) needs the pedal held for REVERSE_HOLD s.
      const pushingBack=throttle<0&&s.speed<=0,pushingFwd=throttle>0&&s.speed>=0;
      if(s.speed===0&&(pushingBack||pushingFwd)){this.hold=(this.hold??0)+dt;if(this.hold<REVERSE_HOLD&&this.wasStopped)a=0;}
      else this.hold=0;
      const before=s.speed;s.speed=clamp(s.speed+a*dt,-p.maxReverse,p.maxSpeed);
      // Friction and brakes stop the car instead of flipping its direction.
      if(before!==0&&Math.sign(before)!==Math.sign(s.speed)){s.speed=0;this.wasStopped=throttle!==0&&Math.sign(throttle)!==Math.sign(before);this.hold=0;}
      if(s.speed!==0&&before===0)this.wasStopped=false;
      if(Math.abs(s.speed)<.05&&throttle===0)s.speed=0;
      // Bicycle model: yaw rate from speed and front wheel angle, the angle shrinks with speed.
      s.steer=steer*p.maxSteer/(1+p.steerFade*Math.abs(s.speed));
      s.heading=wrap(s.heading+s.speed/p.wheelbase*Math.tan(s.steer)*dt);
    }
    const fx=Math.sin(s.heading),fz=-Math.cos(s.heading),nx=s.x+fx*s.speed*dt,nz=s.z+fz*s.speed*dt;
    // A wall of rock steeper than the car can climb stops it.
    const grade=(this.ground(nx+fx*PROBE*Math.sign(s.speed||1),nz+fz*PROBE*Math.sign(s.speed||1))-this.ground(nx,nz))/PROBE;
    if(s.onGround&&grade>p.maxGrade&&Math.abs(s.speed)>.1){s.speed=0;return s;}
    s.x=nx;s.z=nz;
    const floor=this.ground(s.x,s.z)+p.rideHeight;
    if(s.onGround){
      // Following the ground needs vertical speed (floor−y)/dt. Over a crest that would take a downward
      // acceleration stronger than gravity: the car leaves the ground with the vertical speed it has.
      const follow=(floor-s.y)/dt,needed=(follow-s.vy)/dt;
      if(needed<-p.gravity||s.y-floor>p.snap){s.onGround=false;}
      else{s.y=floor;s.vy=follow;s.pitch=this.slope();}
    }
    if(!s.onGround){
      s.vy-=p.gravity*dt;s.y+=s.vy*dt;
      if(s.y<=floor){s.y=floor;s.vy=0;s.onGround=true;s.pitch=this.slope();}
    }
    return s;
  }
}
