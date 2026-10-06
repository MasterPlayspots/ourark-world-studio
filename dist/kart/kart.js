// Simple arcade kart on a Track: throttle/brake/steer on the ground, ballistic flight after ramp lips, barriers at
// the edge of the verge, lap timing over ordered sectors. Pure logic (no DOM, no Three.js), fixed time steps.
// heading: radians clockwise from north (−Z), so the forward vector is (sin h, −cos h) in x/z.
import {StateLayout,saveOptional,loadOptional} from '../runtime/sim/snapshot.js';

export const KART=Object.freeze({
  maxSpeed:20,        // m/s on the road (72 km/h)
  verge:9,            // m/s cap on the verge beside the road
  reverse:5,          // m/s backwards
  accel:9,            // m/s² at standstill, fades towards maxSpeed
  brake:20,           // m/s²
  rolling:.6,         // m/s² coasting deceleration
  drag:.012,          // per (m/s) quadratic air drag
  wheelbase:1.2,      // m
  steer:.5,           // rad maximum wheel angle at low speed
  steerHighSpeed:.18, // rad maximum wheel angle at maxSpeed
  steerRate:4,        // 1/s how quickly the wheel follows the input
  gravity:9.81,
  wallKeep:.55,       // speed kept after scraping a barrier
  radius:.7,          // m half width of the kart against the barrier
  stick:2.5           // m/s: how much faster the road may fall away within one step before the kart flies
});

// Flat state layout (runtime/sim/snapshot.js): snapshot, rollback and replay of the kart and the race.
export const KART_STATE=new StateLayout([['x'],['z'],['y'],['heading'],['speed'],['vy'],['steer'],['grounded','bool'],['pitch'],['hint'],
  ['offRoad','bool'],['hit','bool'],['airTime'],['s']]);
const RACE_STATE=new StateLayout([['lap'],['sector'],['time'],['lapStart'],['best','nullable'],['finished','bool'],['lastSector'],['wrongWay','bool']]);
export const MAX_LAPS=16;

const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const wrap=a=>{const t=Math.PI*2;return ((a+Math.PI)%t+t)%t-Math.PI;};

export class Kart{
  constructor({track,start=0,lane=0,params=KART}){
    this.track=track;this.p=params;this.proj={};this.reset(start,lane);
  }
  // Places the kart on the centre line at arc length s, facing the driving direction.
  reset(s=0,lane=0){
    const t=this.track,sample=t.sampleAt(s);
    const x=sample.x+(-sample.tz)*lane,z=sample.z+sample.tx*lane;
    this.state={x,z,y:t.heightAt(sample.s),heading:Math.atan2(sample.tx,-sample.tz),speed:0,vy:0,steer:0,grounded:true,pitch:0,hint:Math.round(sample.s/t.spacing),offRoad:false,hit:false,airTime:0};
    this.state.s=sample.s;this.previous={...this.state};
  }
  get stateSize(){return 1+KART_STATE.size;}
  saveState(buf,offset){return saveOptional(KART_STATE,this.state,buf,offset);}
  loadState(buf,offset){const [state,next]=loadOptional(KART_STATE,buf,offset,this.state);this.state=state;return next;}
  // input: throttle −1…1 (negative = brake/reverse), steer −1…1 (positive = right).
  step(dt,{throttle=0,steer=0}={}){
    const p=this.p,s=this.state,t=this.track;Object.assign(this.previous,s);
    s.steer+=clamp(steer-s.steer,-p.steerRate*dt,p.steerRate*dt);
    s.hit=false;
    if(s.grounded){
      const cap=s.offRoad?p.verge:p.maxSpeed;
      if(throttle>0){
        if(s.speed<-.2)s.speed=Math.min(0,s.speed+p.brake*throttle*dt);
        else s.speed+=p.accel*throttle*Math.max(0,1-s.speed/cap)*dt;
      }else if(throttle<0){
        if(s.speed>.2)s.speed=Math.max(0,s.speed+p.brake*throttle*dt);
        else s.speed=Math.max(-p.reverse,s.speed+p.accel*.6*throttle*dt);
      }else s.speed-=Math.sign(s.speed)*Math.min(Math.abs(s.speed),p.rolling*dt);
      s.speed-=Math.sign(s.speed)*p.drag*s.speed*s.speed*dt;
      if(s.speed>cap)s.speed=Math.max(cap,s.speed-p.brake*.5*dt); // verge slows the kart down
      s.speed-=p.gravity*Math.sin(s.pitch)*dt;                   // uphill slows, downhill speeds up
      const authority=p.steer+(p.steerHighSpeed-p.steer)*clamp(Math.abs(s.speed)/p.maxSpeed,0,1);
      s.heading=wrap(s.heading+s.speed/p.wheelbase*Math.tan(s.steer*authority)*dt);
    }
    s.x+=Math.sin(s.heading)*s.speed*dt;s.z+=-Math.cos(s.heading)*s.speed*dt;
    // Barrier: keep the kart within the verge, losing speed on contact.
    let proj=t.project(s.x,s.z,s.hint,undefined,this.proj);
    const limit=t.limit-p.radius;
    if(Math.abs(proj.d)>limit){
      const back=Math.abs(proj.d)-limit,sign=Math.sign(proj.d);
      s.x-=(-proj.tz)*sign*back;s.z-=proj.tx*sign*back;
      // Remove the velocity component into the wall by turning the heading along the barrier.
      const along=Math.sin(s.heading)*proj.tx+(-Math.cos(s.heading))*proj.tz;
      s.heading=wrap(Math.atan2(proj.tx*Math.sign(along||1),-proj.tz*Math.sign(along||1)));
      s.speed*=p.wallKeep+(1-p.wallKeep)*Math.abs(along);
      s.hit=true;proj=t.project(s.x,s.z,proj.index,undefined,this.proj);
    }
    s.hint=proj.index;s.s=proj.s;s.offRoad=Math.abs(proj.d)>t.halfWidth;
    // Vertical: follow the road, or fly when the road falls away faster than gravity (ramp lip, crest).
    const ground=t.heightAt(proj.s);
    if(s.grounded){
      const follow=(ground-s.y)/dt;
      if(follow<s.vy-p.gravity*dt-p.stick){s.grounded=false;s.vy-=p.gravity*dt;s.y+=s.vy*dt;}
      else{s.vy=follow;s.y=ground;}
    }else{s.vy-=p.gravity*dt;s.y+=s.vy*dt;}
    if(!s.grounded){
      s.airTime+=dt;
      if(s.y<=ground){s.y=ground;s.grounded=true;s.vy=0;s.airTime=0;}
    }
    // Pitch from the road slope in the driving direction (used for gravity and for drawing).
    const ahead=t.heightAt(proj.s+1.5),behind=t.heightAt(proj.s-1.5);
    const dir=Math.sign(Math.sin(s.heading)*proj.tx-Math.cos(s.heading)*proj.tz)||1;
    s.pitch=s.grounded?Math.atan2((ahead-behind)*dir,3):s.pitch*.98;
    return s;
  }
}

// Lap timing: the track is split into equal sectors that must be passed in order before the start line counts.
export class Race{
  constructor({length,sectors=4,laps=3}){Object.assign(this,{length,sectors,laps});this.reset();}
  reset(){this.lap=1;this.sector=0;this.time=0;this.lapStart=0;this.lapTimes=[];this.best=null;this.finished=false;this.lastSector=0;this.wrongWay=false;}
  // Lap times are kept in fixed slots (MAX_LAPS) after the scalar fields: count, then the times (NaN = empty).
  get stateSize(){return RACE_STATE.size+1+MAX_LAPS;}
  saveState(buf,offset){
    let o=RACE_STATE.write(this,buf,offset);const n=Math.min(MAX_LAPS,this.lapTimes.length);buf[o]=n;
    for(let i=0;i<MAX_LAPS;i++)buf[o+1+i]=i<n?this.lapTimes[i]:NaN;
    return o+1+MAX_LAPS;
  }
  loadState(buf,offset){
    const o=RACE_STATE.read(buf,offset,this),n=buf[o];this.lapTimes.length=n;
    for(let i=0;i<n;i++)this.lapTimes[i]=buf[o+1+i];
    return o+1+MAX_LAPS;
  }
  // s: arc length now; forward: whether the kart moves in driving direction.
  update(dt,s,forward=true){
    if(this.finished)return this;
    this.time+=dt;
    const current=Math.floor(s/this.length*this.sectors)%this.sectors;
    if(current!==this.lastSector){
      const next=(this.sector+1)%this.sectors;
      if(current===next){
        this.sector=next;
        if(next===0){
          const lapTime=this.time-this.lapStart;this.lapTimes.push(lapTime);this.lapStart=this.time;
          this.best=this.best==null?lapTime:Math.min(this.best,lapTime);
          if(this.lap>=this.laps)this.finished=true;else this.lap++;
        }
      }
      this.lastSector=current;
    }
    this.wrongWay=!forward;
    return this;
  }
}
