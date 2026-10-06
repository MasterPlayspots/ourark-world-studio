// worldport P2b — OpenStreetMap ground → map.v3 surfaces: roads and paths as ribbons (width by class), beach,
// parks, water and parking as areas, and the land from the coastline (OSM: land lies LEFT of a coastline way);
// everything else inside the map is sea. All geometry is clipped to the map rectangle. Pure, no network.
import {signedArea,isSimple} from '../runtime/geometry/polygon.js';

export const validCoordinate=g=>typeof g?.lat==='number'&&typeof g?.lon==='number'&&Math.abs(g.lat)<=90&&Math.abs(g.lon)<=180;
const same=(a,b)=>a.lat===b.lat&&a.lon===b.lon;
const closedRing=g=>g.length>=4&&same(g[0],g.at(-1));
const MAX_PIECES=5000;
// Outer rings of a multipolygon: closed member ways as they are, open pieces joined end to end (either direction).
// Inner rings (courtyards, islands in lakes) are not cut out. → {rings, open} (open: pieces that never closed).
export function outerRings(members=[]){
  const outer=(Array.isArray(members)?members:[]).filter(m=>m?.role==='outer'&&Array.isArray(m.geometry)&&m.geometry.every(validCoordinate)).slice(0,MAX_PIECES);
  const rings=outer.filter(m=>closedRing(m.geometry)).map(m=>m.geometry),pieces=outer.filter(m=>!closedRing(m.geometry)&&m.geometry.length>=2).map(m=>m.geometry);
  let open=0;
  while(pieces.length){
    let ring=pieces.shift().slice();
    for(let joined=true;joined&&!closedRing(ring);){
      joined=false;
      for(let i=0;i<pieces.length;i++){
        const piece=pieces[i],end=ring.at(-1);
        if(same(piece[0],end)){ring=ring.concat(piece.slice(1));}else if(same(piece.at(-1),end)){ring=ring.concat(piece.slice(0,-1).reverse());}else continue;
        pieces.splice(i,1);joined=true;break;
      }
    }
    if(closedRing(ring))rings.push(ring);else open++;
  }
  return {rings,open};
}

// Ribbon widths in metres by `highway` class; paths are drawn lighter than roads.
export const ROAD_WIDTHS={motorway:16,trunk:16,primary:14,secondary:12,tertiary:10,unclassified:8,residential:8,living_street:6,service:5,construction:6,
  motorway_link:8,trunk_link:8,primary_link:8,secondary_link:8,tertiary_link:8,pedestrian:6,track:3,footway:2.5,path:2,cycleway:2.5,steps:2.5,bridleway:2.5,corridor:2};
const PATHS=new Set(['pedestrian','track','footway','path','cycleway','steps','bridleway','corridor']);
const AREA_KIND=tags=>/^(beach|sand)$/.test(tags.natural??'')?'beach'
  :/^(park|garden|pitch|golf_course|playground|dog_park)$/.test(tags.leisure??'')||/^(grass|recreation_ground|cemetery|meadow|village_green)$/.test(tags.landuse??'')?'park'
  :tags.natural==='water'||tags.water?'water':tags.amenity==='parking'?'parking':null;
export const SEA_COLOR='#1f5f8b',LAND_COLOR='#27353b';
const MAX_AREA_CORNERS=1500,MAX_RIBBON_POINTS=5000;

export function overpassGroundQuery({south,west,north,east},timeout=120){
  const box=`(${south},${west},${north},${east})`;
  return `[out:json][timeout:${timeout}];(way["highway"]${box};way["natural"~"coastline|beach|water|sand"]${box};relation["natural"~"water|beach"]${box};way["leisure"~"park|pitch|golf_course|garden|playground|dog_park"]${box};way["landuse"~"grass|recreation_ground|cemetery|meadow|village_green"]${box};way["water"]${box};way["amenity"="parking"]${box};);out geom;`;
}

const zero=n=>n+0;// −0 → 0
const dropRepeats=points=>points.filter((v,i)=>i===0||v[0]!==points[i-1][0]||v[1]!==points[i-1][1]);
// Douglas–Peucker for an open line (end points kept): drops corners closer than `tolerance` metres to the line.
export function thinLine(points,tolerance){
  if(points.length<3)return points.slice();
  const keep=new Uint8Array(points.length);keep[0]=keep[points.length-1]=1;
  const stack=[[0,points.length-1]];
  while(stack.length){
    const [first,last]=stack.pop(),[ax,az]=points[first],[bx,bz]=points[last],dx=bx-ax,dz=bz-az,length=Math.hypot(dx,dz)||1;
    let worst=-1,distance=tolerance;
    for(let i=first+1;i<last;i++){const d=Math.abs((points[i][0]-ax)*dz-(points[i][1]-az)*dx)/length;if(d>distance){distance=d;worst=i;}}
    if(worst>0){keep[worst]=1;stack.push([first,worst],[worst,last]);}
  }
  return points.filter((_,i)=>keep[i]);
}
// A ring (no closing point) thinned to at most `max` corners: the tolerance doubles until it fits.
export function thinRing(points,max){
  let ring=dropRepeats(points);
  for(let tolerance=.25;ring.length>max&&tolerance<1e4;tolerance*=2)ring=thinLine([...ring,ring[0]],tolerance).slice(0,-1);
  return ring;
}
// Liang–Barsky: a polyline clipped to the rectangle |x| ≤ halfWidth, |z| ≤ halfDepth → the inside pieces.
export function clipPolyline(points,{halfWidth,halfDepth}){
  const pieces=[];let current=null;
  for(let i=0;i<points.length-1;i++){
    const [ax,az]=points[i],[bx,bz]=points[i+1],dx=bx-ax,dz=bz-az;let t0=0,t1=1,inside=true;
    for(const [p,q] of [[-dx,ax+halfWidth],[dx,halfWidth-ax],[-dz,az+halfDepth],[dz,halfDepth-az]]){
      if(p===0){if(q<0){inside=false;break;}continue;}
      const r=q/p;if(p<0){if(r>t1){inside=false;break;}if(r>t0)t0=r;}else{if(r<t0){inside=false;break;}if(r<t1)t1=r;}
    }
    if(!inside){if(current){pieces.push(current);current=null;}continue;}
    const p0=[zero(ax+t0*dx),zero(az+t0*dz)],p1=[zero(ax+t1*dx),zero(az+t1*dz)];
    if(!current)current=[p0];current.push(p1);
    if(t1<1){pieces.push(current);current=null;}
  }
  if(current)pieces.push(current);
  return pieces.map(dropRepeats).filter(piece=>piece.length>=2);
}
// Sutherland–Hodgman: a polygon clipped to the rectangle (convex clip region).
export function clipPolygon(points,{halfWidth,halfDepth}){
  let out=points;
  for(const [inside,cut] of [
    [v=>v[0]>=-halfWidth,(a,b)=>[-halfWidth,a[1]+(b[1]-a[1])*(-halfWidth-a[0])/(b[0]-a[0])]],
    [v=>v[0]<=halfWidth,(a,b)=>[halfWidth,a[1]+(b[1]-a[1])*(halfWidth-a[0])/(b[0]-a[0])]],
    [v=>v[1]>=-halfDepth,(a,b)=>[a[0]+(b[0]-a[0])*(-halfDepth-a[1])/(b[1]-a[1]),-halfDepth]],
    [v=>v[1]<=halfDepth,(a,b)=>[a[0]+(b[0]-a[0])*(halfDepth-a[1])/(b[1]-a[1]),halfDepth]]]){
    const input=out;out=[];
    for(let i=0;i<input.length;i++){
      const a=input[i],b=input[(i+1)%input.length];
      if(inside(b)){if(!inside(a))out.push(cut(a,b));out.push(b);}else if(inside(a))out.push(cut(a,b));
    }
    if(!out.length)break;
  }
  out=dropRepeats(out.map(([x,z])=>[zero(x),zero(z)]));
  if(out.length>1&&out[0][0]===out.at(-1)[0]&&out[0][1]===out.at(-1)[1])out.pop();
  return out;
}

// Coastline chains (map metres, x east, z south; OSM direction) → land polygons inside the rectangle.
// Works in (east, north) = (x, −z): land is left of each chain, so land polygons run counter-clockwise; at the
// map edge a polygon continues counter-clockwise along the border to the next place a coast enters.
// → {land, open}: open counts pieces that start or end inside the map (unfinished coastline data).
export function coastLand(chains,rect){
  const {halfWidth:hw,halfDepth:hd}=rect,en=v=>[v[0],-v[1]],back=v=>[v[0],zero(-v[1])];
  const eq=(a,b)=>a[0]===b[0]&&a[1]===b[1];
  // 1. Join pieces head to tail (coastline ways keep their direction).
  const pieces=chains.map(c=>c.map(en)).filter(c=>c.length>=2),joined=[];
  while(pieces.length){
    let chain=pieces.shift();
    for(let grown=true;grown&&!(chain.length>3&&eq(chain[0],chain.at(-1)));){
      grown=false;
      for(let i=0;i<pieces.length;i++){
        if(eq(pieces[i][0],chain.at(-1))){chain=chain.concat(pieces[i].slice(1));pieces.splice(i,1);grown=true;break;}
        if(eq(pieces[i].at(-1),chain[0])){chain=pieces[i].concat(chain.slice(1));pieces.splice(i,1);grown=true;break;}
      }
    }
    joined.push(chain);
  }
  const box={halfWidth:hw,halfDepth:hd},land=[];let open=0;
  // 2. Closed rings (islands): counter-clockwise = land inside.
  const onEdge=v=>Math.abs(Math.abs(v[0])-hw)<1e-6||Math.abs(Math.abs(v[1])-hd)<1e-6;
  const crossings=[];
  for(const chain of joined){
    if(chain.length>3&&eq(chain[0],chain.at(-1))){
      if(signedArea(chain)<=0)continue;
      const clipped=clipPolygon(chain.slice(0,-1),box);if(clipped.length>=3&&Math.abs(signedArea(clipped))>1e-6)land.push(clipped);continue;
    }
    for(const piece of clipPolyline(chain,box)){if(onEdge(piece[0])&&onEdge(piece.at(-1)))crossings.push(piece);else open++;}
  }
  // 3. Pieces crossing the map: close them counter-clockwise along the border.
  const perimeter=4*hw+4*hd;
  const along=([e,n])=>Math.abs(n+hd)<1e-6?e+hw:Math.abs(e-hw)<1e-6?2*hw+(n+hd):Math.abs(n-hd)<1e-6?2*hw+2*hd+(hw-e):4*hw+2*hd+(hd-n);
  const corners=[[2*hw,[hw,-hd]],[2*hw+2*hd,[hw,hd]],[4*hw+2*hd,[-hw,hd]],[perimeter,[-hw,-hd]]];
  const used=new Set();
  for(let s=0;s<crossings.length;s++){
    if(used.has(s))continue;
    const polygon=[];let current=s,guard=0;
    while(guard++<=crossings.length){
      used.add(current);polygon.push(...crossings[current]);
      const exit=along(crossings[current].at(-1));let next=-1,best=Infinity;
      crossings.forEach((piece,i)=>{if(used.has(i)&&i!==s)return;const d=((along(piece[0])-exit)%perimeter+perimeter)%perimeter;if(d<best){best=d;next=i;}});
      for(const [t,corner] of [...corners,...corners.map(([t,c])=>[t+perimeter,c])]){const d=t-exit;if(d>1e-9&&d<best-1e-9)polygon.push(corner);}
      if(next===s||next<0)break;current=next;
    }
    if(polygon.length>=3&&Math.abs(signedArea(polygon))>1e-6)land.push(polygon);
  }
  return {land:land.map(p=>p.map(back)),open};
}

// Ground elements (an Overpass result) → surfaces for a map. project: (lat, lon) → [x, z] in metres around the
// projection centre; shift: [mx, mz] moves them into map coordinates; rect: the map half sizes.
// → {surfaces, report, sea}: sea is true when land polygons were found (the map colour then shows the sea).
export function convertGround(overpass,{project,shift:[mx,mz],rect,simplify,maxPoints=400000,maxSurfaces=20000}){
  const round2=n=>zero(Math.round(n*100)/100),local=g=>{const [x,z]=project(g.lat,g.lon);return [x-mx,z-mz];};
  const report={roads:0,paths:0,beach:0,park:0,water:0,parking:0,land:0,landDropped:0,openCoast:0,skipped:0,dropped:0};
  const areas=[],lines=[],coast=[];
  // Areas: clipped only when they cross the map edge; thinned to ≤ MAX_AREA_CORNERS; kept only if still simple.
  const inside=([x,z])=>Math.abs(x)<=rect.halfWidth&&Math.abs(z)<=rect.halfDepth;
  const addArea=(kind,ring)=>{
    const projected=ring.slice(0,-1).map(local),points=projected.every(inside)?projected:clipPolygon(projected,rect);if(points.length<3)return;
    const outline=dropRepeats(thinRing(points,MAX_AREA_CORNERS).map(([x,z])=>[round2(x),round2(z)]));
    if(outline.length>=3&&Math.abs(signedArea(outline))>.5&&isSimple(outline)){areas.push({kind,points:outline});report[kind]++;}else report.skipped++;
  };
  for(const element of Array.isArray(overpass?.elements)?overpass.elements:[]){
    const tags=element?.tags;if(!tags||typeof tags!=='object')continue;
    try{
      if(element.type==='relation'){const kind=AREA_KIND(tags);if(kind)for(const ring of outerRings(element.members).rings)addArea(kind,ring);continue;}
      if(element.type!=='way'||!Array.isArray(element.geometry)||!element.geometry.every(validCoordinate)||element.geometry.length<2){report.skipped++;continue;}
      const geometry=element.geometry;
      if(tags.natural==='coastline'){coast.push(geometry.map(local));continue;}
      if(tags.highway&&tags.area!=='yes'){
        const kind=PATHS.has(tags.highway)?'path':'road',width=Object.hasOwn(ROAD_WIDTHS,tags.highway)?ROAD_WIDTHS[tags.highway]:5;
        for(const piece of clipPolyline(geometry.map(local),rect)){
          const points=dropRepeats(piece.map(([x,z])=>[round2(x),round2(z)]));
          // Ribbons longer than the per-surface limit are split (sharing one point, so no gap).
          for(let start=0;start<points.length-1;start+=MAX_RIBBON_POINTS-1){
            const part=points.slice(start,start+MAX_RIBBON_POINTS);
            if(part.length>=2){lines.push({kind,points:part,width});report[kind==='road'?'roads':'paths']++;}
          }
        }
        continue;
      }
      const kind=AREA_KIND(tags);if(kind&&closedRing(geometry))addArea(kind,geometry);
    }catch{report.skipped++;}
  }
  // Coast lines are thinned first (Douglas–Peucker, 0.5 m) — the map-edge corners added by coastLand stay exact.
  // A closed chain (an island) has identical end points; it is thinned as a ring, open chains as lines.
  const thinCoast=chain=>{const closed=chain.length>3&&chain[0][0]===chain.at(-1)[0]&&chain[0][1]===chain.at(-1)[1];if(!closed)return thinLine(chain,.5);const ring=thinRing(chain.slice(0,-1),MAX_AREA_CORNERS);return [...ring,ring[0]];};
  const {land,open}=coastLand(coast.map(thinCoast),rect);report.openCoast=open;
  const landSurfaces=[];
  for(const polygon of land){
    const points=dropRepeats(thinRing(polygon,MAX_AREA_CORNERS).map(([x,z])=>[round2(x),round2(z)]));
    if(points.length>=3&&isSimple(points))landSurfaces.push({kind:'land',points});else report.landDropped++;
  }
  report.land=landSurfaces.length;
  // Budget: land and areas first, then roads, then paths (footways are the most numerous and least important).
  const order={land:0,park:1,beach:1,water:1,parking:2,road:3,path:4},all=[...landSurfaces,...areas,...lines].sort((a,b)=>order[a.kind]-order[b.kind]);
  const surfaces=[];let points=0;
  for(const surface of all){if(surfaces.length>=maxSurfaces||points+surface.points.length>maxPoints){report.dropped++;continue;}surfaces.push(surface);points+=surface.points.length;}
  return {surfaces,report,sea:landSurfaces.length>0};
}
