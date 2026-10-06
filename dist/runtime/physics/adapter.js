// Physics adapter (ADR 0002). The walkable map has a flat ground (top at Y = 0) and only vertical prisms as
// obstacles, so collision is a 2D problem in X/Z: the player is a circle (capsule radius) and every obstacle is
// a convex polygon (its exact footprint). Public boundary: createWorld(), overlaps(), move(), dispose() —
// shaped so that a real 3D engine (e.g. Rapier) can implement it later when ramps or vehicles need it.

export const PLAYER=Object.freeze({radius:.3,height:1.8,eye:1.6,walkSpeed:3});
// Longest distance one move() may cover (1 m per 1/60 s step = 60 m/s). Larger deltas are capped; each move is
// split into sub-steps of at most half the radius, so nothing thinner than the player can be crossed.
export const MAX_STEP_DISTANCE=1;
export const BOUNDS=Object.freeze({id:'bounds',name:'Kartenrand'});
const SKIN=1e-6,ITERATIONS=4,EPSILON=1e-9;
// Start search: fine grid near the wish, then at most SPAWN_SAMPLES candidates per collider or map edge.
export const SPAWN_GRID=.25,SPAWN_NEAR=30,SPAWN_SAMPLES=400;
const finite=(...values)=>values.every(Number.isFinite);

// Convex polygon with outward edge normals and a bounding box, prepared once per world.
function prepare({id,name,vertices}){
  const distinct=vertices.filter((v,i)=>finite(...v)&&Math.hypot(v[0]-vertices[(i+1)%vertices.length][0],v[1]-vertices[(i+1)%vertices.length][1])>EPSILON);
  if(distinct.length<3||distinct.length!==vertices.length)throw new Error(`Collider „${name}“ ist ungültig (mindestens drei verschiedene Ecken erforderlich).`);
  const cx=vertices.reduce((s,[x])=>s+x,0)/vertices.length,cz=vertices.reduce((s,[,z])=>s+z,0)/vertices.length;
  const edges=vertices.map((a,i)=>{
    const b=vertices[(i+1)%vertices.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    let nx=(b[1]-a[1])/length,nz=-(b[0]-a[0])/length;
    if(nx*(a[0]-cx)+nz*(a[1]-cz)<0){nx=-nx;nz=-nz;}
    return {a,b,nx,nz};
  });
  const xs=vertices.map(([x])=>x),zs=vertices.map(([,z])=>z);
  return {id,name,edges,minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs)};
}
// Penetration of a circle into a convex polygon: {depth, nx, nz} (push direction) or null.
function contact(p,r,c){
  if(p.x<c.minX-r||p.x>c.maxX+r||p.z<c.minZ-r||p.z>c.maxZ+r)return null;
  let best=null,separation=-Infinity;
  for(const edge of c.edges){const s=(p.x-edge.a[0])*edge.nx+(p.z-edge.a[1])*edge.nz;if(s>separation){separation=s;best=edge;}}
  if(separation>=r)return null;
  if(separation<=0)return {depth:r-separation,nx:best.nx,nz:best.nz};
  // Outside but closer than r: the exact closest boundary point decides (corners push diagonally).
  let distance=Infinity,qx=0,qz=0;
  for(const {a,b} of c.edges){
    const ex=b[0]-a[0],ez=b[1]-a[1],t=Math.max(0,Math.min(1,((p.x-a[0])*ex+(p.z-a[1])*ez)/(ex*ex+ez*ez)));
    const x=a[0]+t*ex,z=a[1]+t*ez,d=Math.hypot(p.x-x,p.z-z);
    if(d<distance){distance=d;qx=x;qz=z;}
  }
  if(distance>=r)return null;
  return {depth:r-distance,nx:(p.x-qx)/distance,nz:(p.z-qz)/distance};
}

// Broadphase: from this many colliders on, a grid pays off. Cells hold collider indices (ascending); a collider
// covering more than GRID_MAX_SPAN cells (a lake, a park) goes to a short list checked on every query.
// When the colliders do not spread out (all in one spot, long streets crossing everything), a query would still
// see most of them: then the grid is not built and every collider is checked, which is faster in that case.
export const BROADPHASE_MIN=32;
const GRID_MAX_AXIS=2**20,GRID_MAX_SPAN=64,GRID_MIN_GAIN=4;
function grid(shapes,radius){
  let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
  for(const s of shapes){minX=Math.min(minX,s.minX);maxX=Math.max(maxX,s.maxX);minZ=Math.min(minZ,s.minZ);maxZ=Math.max(maxZ,s.maxZ);}
  // Cell ≈ twice the median collider size (robust against a few giants), at least 4 player radii.
  const sizes=shapes.map(s=>Math.max(s.maxX-s.minX,s.maxZ-s.minZ)).sort((a,b)=>a-b),median=sizes[sizes.length>>1];
  const cell=Math.max(4*radius,2*median,(maxX-minX)/GRID_MAX_AXIS,(maxZ-minZ)/GRID_MAX_AXIS,1e-6);
  if(!Number.isFinite(cell))return null;
  const nx=Math.max(1,Math.ceil((maxX-minX)/cell)),nz=Math.max(1,Math.ceil((maxZ-minZ)/cell));
  const ix=x=>Math.min(nx-1,Math.max(0,Math.floor((x-minX)/cell))),iz=z=>Math.min(nz-1,Math.max(0,Math.floor((z-minZ)/cell)));
  const cells=new Map(),large=[],key=(x,z)=>x*GRID_MAX_AXIS*2+z;
  shapes.forEach((s,i)=>{
    const x0=ix(s.minX),x1=ix(s.maxX),z0=iz(s.minZ),z1=iz(s.maxZ);
    if((x1-x0+1)*(z1-z0+1)>GRID_MAX_SPAN){large.push(i);return;}
    for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){let list=cells.get(key(x,z));if(!list)cells.set(key(x,z),list=[]);list.push(i);}
  });
  // Expected candidates for a query next to a collider: Σ(list²)/Σ(list) plus the large list.
  let entries=0,squares=0;for(const list of cells.values()){entries+=list.length;squares+=list.length**2;}
  if(large.length+(entries?squares/entries:0)>shapes.length/GRID_MIN_GAIN)return null;
  const seen=new Uint32Array(shapes.length);let stamp=0;
  return p=>{
    const x0=ix(p.x-radius),x1=ix(p.x+radius),z0=iz(p.z-radius),z1=iz(p.z+radius);
    // Common case: the circle lies in one cell and there are no large colliders — that list is already ordered.
    if(!large.length&&x0===x1&&z0===z1){const list=cells.get(key(x0,z0));return list?list.map(i=>shapes[i]):[];}
    if(++stamp===0xffffffff){seen.fill(0);stamp=1;}
    const found=[];
    for(const i of large){seen[i]=stamp;found.push(i);}
    for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){const list=cells.get(key(x,z));if(list)for(const i of list)if(seen[i]!==stamp){seen[i]=stamp;found.push(i);}}
    if(found.length>1)found.sort((a,b)=>a-b);
    return found.map(i=>shapes[i]);
  };
}

// The walkable area is a convex polygon: a rectangle for the map ({bounds:{width,depth}}) or any convex outline,
// e.g. an elliptical island ({area:[[x,z],…]}). The player must stay fully inside it.
// Worlds with many colliders (a city: thousands of buildings) use a uniform grid broadphase: a query only
// tests the colliders whose bounding boxes share a cell with the player's circle. Candidates are visited in
// the original collider order, so results are identical to testing every collider. `broadphase:false`
// forces the plain loop (used by the tests to compare both).
export function createWorld({bounds,area,colliders=[],start={x:0,z:0},radius=PLAYER.radius,broadphase=true}){
  const outline=area??[[-bounds.width/2,-bounds.depth/2],[bounds.width/2,-bounds.depth/2],[bounds.width/2,bounds.depth/2],[-bounds.width/2,bounds.depth/2]];
  const shapes=colliders.map(prepare),region=prepare({id:BOUNDS.id,name:'Begehbare Fläche',vertices:outline});
  let disposed=false;
  const alive=()=>{if(disposed)throw new Error('Physics world disposed.');};
  const near=broadphase&&shapes.length>=BROADPHASE_MIN?grid(shapes,radius):null,nearby=p=>near?near(p):shapes;
  const deepest=p=>{let hit=null;for(const shape of nearby(p)){const c=contact(p,radius,shape);if(c&&(!hit||c.depth>hit.depth))hit={...c,id:shape.id};}return hit;};
  // Deepest violation of "circle inside the area": signed distance to an edge (outward normal) plus the radius.
  const outside=p=>{let worst=null;for(const edge of region.edges){const s=(p.x-edge.a[0])*edge.nx+(p.z-edge.a[1])*edge.nz+radius;if(s>EPSILON&&(!worst||s>worst.s))worst={s,edge};}return worst;};
  const clamp=(p,contacts)=>{let q=p;for(let k=0;k<ITERATIONS;k++){const w=outside(q);if(!w)break;q={x:q.x-w.edge.nx*w.s,z:q.z-w.edge.nz*w.s};contacts?.add(BOUNDS.id);}return q;};
  const free=p=>!world.overlaps(p),distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  const world={
    start:{...start},colliders:shapes,radius,broadphase:Boolean(near),
    // The first obstacle the player would overlap at p (a collider or BOUNDS), or null if the spot is free.
    overlaps(p){
      alive();
      if(!finite(p.x,p.z)||outside(p))return BOUNDS;
      for(const shape of nearby(p)){const c=contact(p,radius,shape);if(c&&c.depth>EPSILON)return shape;}
      return null;
    },
    // Moves the body by delta (metres, one simulation step) with sliding; never ends inside an obstacle.
    move(body,delta){
      alive();
      if(!finite(body.x,body.z,delta.x,delta.z))return {...world.start,contacts:[],reset:true};
      let dx=delta.x,dz=delta.z;const length=Math.hypot(dx,dz);
      if(length>MAX_STEP_DISTANCE){dx*=MAX_STEP_DISTANCE/length;dz*=MAX_STEP_DISTANCE/length;}
      const steps=Math.max(1,Math.ceil(Math.min(length,MAX_STEP_DISTANCE)/(radius/2))),contacts=new Set();
      let p={x:body.x,z:body.z};
      for(let i=0;i<steps;i++){
        const previous=p;p=clamp({x:p.x+dx/steps,z:p.z+dz/steps},contacts);
        for(let k=0;k<ITERATIONS;k++){const hit=deepest(p);if(!hit)break;contacts.add(hit.id);p=clamp({x:p.x+hit.nx*(hit.depth+SKIN),z:p.z+hit.nz*(hit.depth+SKIN)},contacts);}
        if(deepest(p)?.depth>EPSILON){p=previous;break;}
      }
      return {x:p.x,z:p.z,contacts:[...contacts],reset:false};
    },
    // Nearest free spot to `preferred`, or null if the map is fully blocked. Two stages:
    // 1. fine rings (SPAWN_GRID) up to SPAWN_NEAR metres around the wish, nearest first;
    // 2. candidates just outside every collider edge and just inside the map edge — every free region touches
    //    one of them, so narrow corridors anywhere on the map are found without a map-wide fine raster.
    findSpawn(preferred){
      alive();
      if(free(preferred))return {x:preferred.x,z:preferred.z};
      for(let k=1;k<=Math.ceil(SPAWN_NEAR/SPAWN_GRID);k++){
        const ring=[];
        for(let i=-k;i<=k;i++)ring.push([i,-k],[i,k]);
        for(let i=-k+1;i<k;i++)ring.push([-k,i],[k,i]);
        const hit=ring.map(([x,z])=>({x:preferred.x+x*SPAWN_GRID,z:preferred.z+z*SPAWN_GRID})).sort((a,b)=>distance(a,preferred)-distance(b,preferred)).find(free);
        if(hit)return hit;
      }
      const candidates=[],offset=radius+.01,line=(ax,az,bx,bz,nx,nz)=>{
        const length=Math.hypot(bx-ax,bz-az),n=Math.max(1,Math.ceil(length/Math.max(SPAWN_GRID,length/SPAWN_SAMPLES)));
        for(let i=0;i<=n;i++)candidates.push({x:ax+(bx-ax)*i/n+nx*offset,z:az+(bz-az)*i/n+nz*offset});
      };
      for(const {edges} of shapes)for(const {a,b,nx,nz} of edges)line(a[0],a[1],b[0],b[1],nx,nz);
      for(const {a,b,nx,nz} of region.edges)line(a[0],a[1],b[0],b[1],-nx,-nz);
      return candidates.sort((a,b)=>distance(a,preferred)-distance(b,preferred)).find(free)??null;
    },
    dispose(){disposed=true;shapes.length=0;}
  };
  return world;
}
