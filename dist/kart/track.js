// Kart track: a closed centre line with width, a smoothed road height profile and ramps. Pure logic, no DOM and
// no Three.js. Coordinates are metres: x = east, z = south (north is −Z, like the rest of the runtime), y = up.

export const SAMPLE_SPACING=1; // metres between centre-line samples

// Closed Catmull-Rom spline through the control points, resampled to (almost) equal arc length.
export function sampleClosedSpline(points,spacing=SAMPLE_SPACING){
  if(points.length<3)throw new Error('Track needs at least 3 control points');
  const dense=[],n=points.length,steps=24;
  for(let i=0;i<n;i++){
    const [p0,p1,p2,p3]=[points[(i-1+n)%n],points[i],points[(i+1)%n],points[(i+2)%n]];
    for(let k=0;k<steps;k++){
      const t=k/steps,t2=t*t,t3=t2*t;
      const f=(a,b,c,d)=>.5*(2*b+(-a+c)*t+(2*a-5*b+4*c-d)*t2+(-a+3*b-3*c+d)*t3);
      dense.push([f(p0[0],p1[0],p2[0],p3[0]),f(p0[1],p1[1],p2[1],p3[1])]);
    }
  }
  const cumulative=[0];
  for(let i=1;i<=dense.length;i++){const a=dense[i-1],b=dense[i%dense.length];cumulative.push(cumulative[i-1]+Math.hypot(b[0]-a[0],b[1]-a[1]));}
  const length=cumulative[dense.length],count=Math.max(8,Math.round(length/spacing)),out=[];
  let j=0;
  for(let i=0;i<count;i++){
    const s=i*length/count;
    while(cumulative[j+1]<s)j++;
    const a=dense[j],b=dense[(j+1)%dense.length],u=(s-cumulative[j])/((cumulative[j+1]-cumulative[j])||1);
    out.push({x:a[0]+(b[0]-a[0])*u,z:a[1]+(b[1]-a[1])*u,s});
  }
  return {samples:out,length};
}

// Circular moving average (window in samples) — removes wall steps and noise from a terrain profile.
export function smoothClosed(values,window){
  const n=values.length,half=Math.max(0,Math.floor(window/2)),out=new Array(n);
  if(!half)return values.slice();
  let sum=0;for(let k=-half;k<=half;k++)sum+=values[(k+n)%n];
  for(let i=0;i<n;i++){out[i]=sum/(2*half+1);sum+=values[(i+half+1)%n]-values[(i-half+n)%n];}
  return out;
}

// Ramp shapes along the track (s in metres from the start line). A kicker rises quadratically and ends in a
// lip (the kart takes off there); a hill is a smooth hump the kart can crest or hop over at speed.
export function featureHeight(feature,s,length){
  let u=(s-feature.s)/feature.length;
  if(u<0&&feature.s+feature.length>length)u=(s+length-feature.s)/feature.length; // wraps past the start line
  if(!(u>=0&&u<=1))return 0;
  if(feature.type==='kicker')return feature.height*u*u;
  return feature.height*Math.sin(Math.PI*u)**2; // hill
}

export class Track{
  // points: [[x,z],…] control points; width: road width; shoulder: drivable verge beyond the road;
  // groundAt(x,z): terrain height (optional); smoothing: profile window in metres; features: ramps.
  constructor({points,width=10,shoulder=3,groundAt=()=>0,smoothing=25,features=[],start=0}){
    const {samples,length}=sampleClosedSpline(points);
    this.length=length;this.width=width;this.shoulder=shoulder;this.features=[];
    const n=samples.length;
    // Rotate so that sample 0 is the start line.
    const offset=Math.round(((start%length)+length)%length/length*n)%n;
    const rotated=samples.slice(offset).concat(samples.slice(0,offset)).map((p,i)=>({x:p.x,z:p.z,s:i*length/n}));
    // Two passes (a triangular filter): removes wall steps and stairs and leaves no slope kinks that would
    // throw the kart into the air at speed.
    const window=Math.round(smoothing*.8/(length/n));
    const base=smoothClosed(smoothClosed(rotated.map(p=>groundAt(p.x,p.z)),window),window);
    this.samples=rotated.map((p,i)=>{
      const a=rotated[(i-1+n)%n],b=rotated[(i+1)%n],tx=b.x-a.x,tz=b.z-a.z,l=Math.hypot(tx,tz)||1;
      return {...p,tx:tx/l,tz:tz/l,base:base[i]};
    });
    this.spacing=length/n;
    // Features may be placed by map position (at: [x,z] = their middle) instead of arc length.
    this.features=features.map(f=>f.at?{...f,s:((this.project(f.at[0],f.at[1]).s-f.length/2)%length+length)%length}:f);
  }
  get halfWidth(){return this.width/2;}
  get limit(){return this.width/2+this.shoulder;} // barrier distance from the centre line
  // Road surface height at arc length s (ramps cover the full road width).
  heightAt(s){
    const n=this.samples.length,f=((s%this.length)+this.length)%this.length/this.spacing,i=Math.floor(f)%n,u=f-Math.floor(f);
    const y=this.samples[i].base*(1-u)+this.samples[(i+1)%n].base*u;
    let lift=0;for(const feature of this.features)lift+=featureHeight(feature,f*this.spacing,this.length);
    return y+lift;
  }
  sampleAt(s){const n=this.samples.length;return this.samples[((Math.round(s/this.spacing)%n)+n)%n];}
  // Nearest point on the centre line. hint: last sample index (searches ±window first, then everything).
  // out: object to fill (hot path, no allocation per call); without it a new one is returned.
  project(x,z,hint=null,window=40,out={}){
    let found=hint==null?false:this.scanNearest(x,z,hint-window,2*window+1);
    if(!found||Math.sqrt(this._best[4])>this.limit*1.5)this.scanNearest(x,z,0,this.samples.length);
    const b=this._best,i=b[0],u=b[1],px=b[2],pz=b[3],tx=b[5],tz=b[6];
    // Signed lateral offset: positive = right of the driving direction.
    out.index=i;out.s=(i+u)*this.spacing;out.d=(x-px)*(-tz)+(z-pz)*tx;out.px=px;out.pz=pz;out.tx=tx;out.tz=tz;
    return out;
  }
  // Scans `count` segments from `from` for the nearest point; result in this._best = [i,u,px,pz,dist²,tx,tz].
  // Squared distances keep the order of the distances, so the chosen segment is the same as with Math.hypot.
  scanNearest(x,z,from,count){
    const n=this.samples.length,best=this._best??=new Float64Array(7);let bestD=Infinity;
    for(let k=0;k<count;k++){
      const i=((from+k)%n+n)%n,a=this.samples[i],b=this.samples[(i+1)%n];
      const ex=b.x-a.x,ez=b.z-a.z,len2=ex*ex+ez*ez||1;
      const u=Math.min(1,Math.max(0,((x-a.x)*ex+(z-a.z)*ez)/len2));
      const px=a.x+ex*u,pz=a.z+ez*u,dx=x-px,dz=z-pz,d2=dx*dx+dz*dz;
      if(d2<bestD){bestD=d2;const l=Math.sqrt(len2);best[0]=i;best[1]=u;best[2]=px;best[3]=pz;best[4]=d2;best[5]=ex/l;best[6]=ez/l;}
    }
    return count>0;
  }
}
