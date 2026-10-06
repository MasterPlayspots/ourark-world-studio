// Footprint polygons ([[x, z], …], map.v3): validity, point-in-polygon, ear-clipping triangulation and a
// convex decomposition (Hertel–Mehlhorn) so that concave buildings collide exactly with convex physics shapes.
const EPS=1e-9;
const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);

// Shoelace area; the sign gives the orientation (positive = counter-clockwise in x/z maths coordinates).
export function signedArea(poly){let s=0;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];s+=a[0]*b[1]-b[0]*a[1];}return s/2;}

function segmentsTouch(a,b,c,d){
  const d1=cross(c,d,a),d2=cross(c,d,b),d3=cross(a,b,c),d4=cross(a,b,d);
  if(((d1>EPS&&d2<-EPS)||(d1<-EPS&&d2>EPS))&&((d3>EPS&&d4<-EPS)||(d3<-EPS&&d4>EPS)))return true;
  const on=(p,q,r)=>Math.abs(cross(p,q,r))<=EPS&&Math.min(p[0],q[0])-EPS<=r[0]&&r[0]<=Math.max(p[0],q[0])+EPS&&Math.min(p[1],q[1])-EPS<=r[1]&&r[1]<=Math.max(p[1],q[1])+EPS;
  return on(c,d,a)||on(c,d,b)||on(a,b,c)||on(a,b,d);
}
// At least three distinct finite vertices, non-zero area and no edge touching a non-adjacent edge.
// Edge pairs whose bounding boxes are apart are skipped before the exact test (most pairs in real outlines).
export function isSimple(poly){
  const n=poly?.length;
  if(!Array.isArray(poly)||n<3||!poly.every(p=>Array.isArray(p)&&p.length===2&&Number.isFinite(p[0])&&Number.isFinite(p[1])))return false;
  if(new Set(poly.map(p=>`${p[0]},${p[1]}`)).size!==n||Math.abs(signedArea(poly))<=EPS)return false;
  const box=poly.map((a,i)=>{const b=poly[(i+1)%n];return [Math.min(a[0],b[0])-EPS,Math.max(a[0],b[0])+EPS,Math.min(a[1],b[1])-EPS,Math.max(a[1],b[1])+EPS];});
  for(let i=0;i<n;i++){
    const bi=box[i];
    for(let j=i+2;j<n;j++){
      if(i===0&&j===n-1)continue;
      const bj=box[j];if(bi[1]<bj[0]||bj[1]<bi[0]||bi[3]<bj[2]||bj[3]<bi[2])continue;
      if(segmentsTouch(poly[i],poly[(i+1)%n],poly[j],poly[(j+1)%n]))return false;
    }
  }
  return true;
}
// Even–odd rule; works for concave polygons.
export function containsPoint(poly,{x,z}){
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,zi]=poly[i],[xj,zj]=poly[j];if((zi>z)!==(zj>z)&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)inside=!inside;}
  return inside;
}
export function isConvex(poly){let sign=0;for(let i=0;i<poly.length;i++){const c=cross(poly[i],poly[(i+1)%poly.length],poly[(i+2)%poly.length]);if(Math.abs(c)<=EPS)continue;const s=Math.sign(c);if(sign&&s!==sign)return false;sign=s;}return true;}

const ccw=poly=>signedArea(poly)<0?[...poly].reverse():poly;
// Ear clipping on a simple polygon → n − 2 triangles as index triples into the counter-clockwise polygon.
function earIndices(poly){
  const idx=poly.map((_,i)=>i),out=[];
  let guard=0,from=0;
  while(idx.length>3&&guard++<poly.length*poly.length){
    let clipped=false;
    // Resume near the last ear instead of at the start: most ears follow each other (near-linear for real outlines).
    for(let step=0;step<idx.length;step++){
      const k=(from+step)%idx.length;
      const i0=idx[(k+idx.length-1)%idx.length],i1=idx[k],i2=idx[(k+1)%idx.length],a=poly[i0],b=poly[i1],c=poly[i2];
      if(cross(a,b,c)<=EPS)continue;// reflex or collinear corner
      const blocked=idx.some(i=>i!==i0&&i!==i1&&i!==i2&&cross(a,b,poly[i])>=-EPS&&cross(b,c,poly[i])>=-EPS&&cross(c,a,poly[i])>=-EPS);
      if(blocked)continue;
      out.push([i0,i1,i2]);idx.splice(k,1);from=Math.max(0,k-1);clipped=true;break;
    }
    if(!clipped)break;
  }
  if(idx.length===3)out.push([...idx]);
  if(out.length!==poly.length-2)throw new Error('Grundriss konnte nicht zerlegt werden.');
  return out;
}
export function triangulate(poly){const p=ccw(poly);return earIndices(p).map(t=>t.map(i=>p[i]));}

// Hertel–Mehlhorn: start from the triangles and remove each diagonal once if the merged piece stays convex
// (at most 4× the optimal number of parts). Directed edges map to their current piece, so a pass is O(n²).
export function convexParts(poly){
  const p=ccw(poly);if(isConvex(p))return [p];
  const pieces=earIndices(p),owner=new Map(),key=(u,v)=>u*65536+v;
  pieces.forEach((piece,id)=>piece.forEach((u,k)=>owner.set(key(u,piece[(k+1)%piece.length]),id)));
  const n=p.length,isOuter=(u,v)=>(v===(u+1)%n)||(u===(v+1)%n);
  for(const edge of [...owner.keys()]){
    const u=Math.floor(edge/65536),v=edge%65536;
    if(isOuter(u,v)||u>v)continue;// every diagonal once (u < v), outline edges never
    const a=owner.get(edge),b=owner.get(key(v,u));if(a===undefined||b===undefined||a===b)continue;
    const A=pieces[a];
    const B=pieces[b],i=A.findIndex((w,k)=>w===u&&A[(k+1)%A.length]===v),j=B.findIndex((w,k)=>w===v&&B[(k+1)%B.length]===u);
    if(i<0||j<0)continue;
    // A: … u v …, B: … v u … → A from v around to u, then B after u up to before v.
    const union=[];for(let k=0;k<A.length;k++)union.push(A[(i+1+k)%A.length]);
    for(let k=2;k<B.length;k++)union.push(B[(j+k)%B.length]);
    if(!isConvex(union.map(q=>p[q])))continue;
    pieces[a]=union;pieces[b]=null;owner.delete(key(u,v));owner.delete(key(v,u));
    union.forEach((w,k)=>owner.set(key(w,union[(k+1)%union.length]),a));
  }
  return pieces.filter(Boolean).map(piece=>piece.map(i=>p[i]));
}

// Monotone chain; counter-clockwise, without collinear points.
export function convexHull(points){
  const sorted=[...points].sort((a,b)=>a[0]-b[0]||a[1]-b[1]),half=list=>{const h=[];for(const q of list){while(h.length>=2&&cross(h[h.length-2],h[h.length-1],q)<=0)h.pop();h.push(q);}h.pop();return h;};
  return [...half(sorted),...half([...sorted].reverse())];
}
