// worldport P2 — OpenStreetMap buildings → a walkable motionspec.map.v3 world (footprints, heights, attribution).
// Input: an Overpass API result in JSON with `out geom` (ways carry their node coordinates). Pure and deterministic,
// no network: fetching lives in scripts/worldport-osm.mjs. OSM data is © OpenStreetMap contributors, ODbL — the
// attribution travels with the document (`attribution`) and with every building (`Quelle`).
import {validateDocument,MAX_POINTS,MAX_MAP_METRES,MAX_FOOTPRINT_VERTICES,MAX_TOTAL_FOOTPRINT_VERTICES} from '../map-studio/model.js';
import {isSimple,signedArea} from '../runtime/geometry/polygon.js';
import {collidersFromSnapshot} from '../runtime/map-adapter.js';
import {createWorld} from '../runtime/physics/adapter.js';
import {outerRings,validCoordinate,convertGround,SEA_COLOR,LAND_COLOR} from './osm-ground.mjs';

export {outerRings};

export const OSM_ATTRIBUTION='Kartendaten: © OpenStreetMap-Mitwirkende, Datenlizenz ODbL (openstreetmap.org/copyright)';
const SOURCE='© OpenStreetMap-Mitwirkende (ODbL)';
const LEVEL_METRES=3.2,MAX_HEIGHT=300,MAX_SIZE=300,MARGIN=40;
// Height estimates where OSM has neither height nor levels (metres), by building type.
const ESTIMATE={house:6,detached:6,residential:9,apartments:15,hotel:15,commercial:10,retail:6,office:15,garage:3,garages:3,shed:3,hut:3,roof:4,kiosk:3,church:12,school:9,parking:9,industrial:9,warehouse:8};
const DEFAULT_ESTIMATE=7;
// Pastel Art-Deco palette by building type.
const COLORS={hotel:'#f6a6c1',apartments:'#5eead4',residential:'#5eead4',commercial:'#f3c969',retail:'#f3c969',office:'#72a8ef',parking:'#72a8ef',garage:'#72a8ef',house:'#eaf1fb',detached:'#eaf1fb'};
const DEFAULT_COLOR='#d5b5ff';

// Overpass QL for all buildings in a bounding box (south, west, north, east in degrees), with geometry.
export function overpassQuery({south,west,north,east},timeout=90){
  const box=`(${south},${west},${north},${east})`;
  return `[out:json][timeout:${timeout}];(way["building"]${box};relation["building"]${box};);out geom;`;
}
// Local metres around a centre (equirectangular with the WGS84 degree lengths at that latitude):
// east = +x, north = −z (north is up on the map, like the studios). Accurate to well under 1 % over a few km.
export function projection({lat,lon}){
  const phi=lat*Math.PI/180;
  const perLat=111132.92-559.82*Math.cos(2*phi)+1.175*Math.cos(4*phi),perLon=111412.84*Math.cos(phi)-93.5*Math.cos(3*phi);
  return (la,lo)=>[(lo-lon)*perLon,-(la-lat)*perLat];
}
const round2=n=>Math.round(n*100)/100;
// Min and max without spreading (big inputs would overflow the call stack).
function range(values){let min=Infinity,max=-Infinity;for(const v of values){if(v<min)min=v;if(v>max)max=v;}return [min,max];}
const median=values=>{const sorted=[...values].sort((a,b)=>a-b);return sorted.length?sorted[sorted.length>>1]:0;};
const text=(value,max)=>(value===undefined||value===null?'':String(value)).slice(0,max);
const MIN_HEIGHT=.2,MAX_RING_NODES=2000;
// Height in metres and where it came from: `height` (m, ft, 12'6", decimal comma), else levels × 3.2 m, else an
// estimate by type — `unreadable` when a height was given but could not be read.
export function parseHeight(tags){
  const raw=text(tags.height,40).trim().replace(',','.');
  let metres=null;
  const plain=/^(\d+(?:\.\d+)?)\s*(m|ft|')?$/i.exec(raw),imperial=/^(\d+)\s*'\s*(\d+(?:\.\d+)?)\s*"?$/.exec(raw);
  if(imperial)metres=Number(imperial[1])*.3048+Number(imperial[2])*.0254;
  else if(plain)metres=Number(plain[1])*(/ft|'/i.test(plain[2]??'')?.3048:1);
  const clamp=n=>Math.min(MAX_HEIGHT,Math.max(MIN_HEIGHT,round2(n)));
  if(metres>0)return {height:clamp(metres),source:'height'};
  const levels=Number(tags['building:levels']);
  if(levels>0&&Number.isFinite(levels)){const roof=Number(tags['roof:levels'])>0?Number(tags['roof:levels']):0;return {height:clamp((levels+roof)*LEVEL_METRES),source:'levels'};}
  return {height:ESTIMATE[tags.building]??DEFAULT_ESTIMATE,source:raw?'unreadable':'estimate'};
}
const triangle=(a,b,c)=>Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2;
// Outline clean-up: closing point, near-duplicates (< 5 cm), collinear corners (< 0.05 m² triangles); then
// Visvalingam–Whyatt removes the least significant corners until at most 64 remain. Rings with more than
// MAX_RING_NODES nodes are thinned evenly first, so the cost stays bounded.
export function simplify(points,max=MAX_FOOTPRINT_VERTICES){
  let p=points.slice();
  if(p.length>1&&p[0][0]===p.at(-1)[0]&&p[0][1]===p.at(-1)[1])p.pop();
  if(p.length>MAX_RING_NODES){const step=p.length/MAX_RING_NODES;p=Array.from({length:MAX_RING_NODES},(_,i)=>p[Math.floor(i*step)]);}
  p=p.filter((v,i)=>{const n=p[(i+1)%p.length];return Math.hypot(v[0]-n[0],v[1]-n[1])>=.05;});
  while(p.length>3){
    let best=-1,area=Infinity;
    for(let i=0;i<p.length;i++){const a=triangle(p[(i+p.length-1)%p.length],p[i],p[(i+1)%p.length]);if(a<area){area=a;best=i;}}
    if(area>=.05&&p.length<=max)break;
    p.splice(best,1);
  }
  return p;
}
const label=(tags,ref)=>{
  const address=[text(tags['addr:housenumber'],20),text(tags['addr:street'],100)].filter(Boolean).join(' ');
  return {name:(text(tags.name,80)||address||`Gebäude ${ref}`).slice(0,80),address};
};
const BASE={schema:'motionspec.map.v3',name:'Prüfung',map:{width:MAX_MAP_METRES,depth:MAX_MAP_METRES,color:'#1b2a33',image:null},runtime:{spawn:null}};
const acceptable=point=>{try{validateDocument({...BASE,points:[point]});return true;}catch{return false;}};

// → {document, report}. options: name (world name), centre ({lat, lon}; default: the median of all buildings),
// spawn ({lat, lon, heading}: where the walk starts; moved to the nearest free place if a building stands there),
// ground (a second Overpass result with roads, beach, parks, water, coastline → surfaces; see osm-ground.mjs).
// A broken element never fails the import: it is skipped and counted in report.skipped.
export function convertOsm(overpass,{name='OpenStreetMap-Welt',centre,spawn,ground}={}){
  if(spawn&&!(validCoordinate(spawn)&&Number.isFinite(spawn.lat)&&Number.isFinite(spawn.lon)))throw new Error('Startpunkt: Breite und Länge müssen gültige Gradzahlen sein.');
  const elements=Array.isArray(overpass?.elements)?overpass.elements:[];
  const skipped={invalid:0,relations:0,tooLarge:0,duplicate:0,outside:0,openRings:0,simplified:0},buildings=[],ids=new Set();
  for(const element of elements){
    const tags=element?.tags;
    if(!tags||typeof tags!=='object'||!tags.building||tags.building==='no')continue;
    if(!Number.isSafeInteger(element.id)||element.id<0){skipped.invalid++;continue;}
    const ref=`${element.type}/${element.id}`;
    if(ids.has(ref)){skipped.duplicate++;continue;}ids.add(ref);
    if(element.type==='relation'){
      const {rings,open}=outerRings(element.members);skipped.openRings+=open;
      if(!rings.length){skipped.relations++;continue;}
      rings.forEach((geometry,k)=>buildings.push({type:'relation',id:element.id,key:rings.length>1?`${element.id}-${k+1}`:String(element.id),geometry,tags}));continue;
    }
    if(element.type!=='way'||!Array.isArray(element.geometry)||element.geometry.length<4||!element.geometry.every(validCoordinate)){skipped.invalid++;continue;}
    buildings.push(element);
  }
  // Centre: the median building (robust against a few far-away outliers).
  const middle=centre??{lat:median(buildings.map(b=>b.geometry[0].lat)),lon:median(buildings.map(b=>b.geometry[0].lon))};
  const project=projection(middle),heights={height:0,levels:0,estimate:0,unreadable:0},candidates=[],reach=MAX_MAP_METRES/2-MARGIN;
  for(const b of buildings){
    try{
      const ref=`${b.type}/${b.id}`,world=b.geometry.map(g=>project(g.lat,g.lon));
      const [x0,x1]=range(world.map(v=>v[0])),[z0,z1]=range(world.map(v=>v[1])),cx=(x0+x1)/2,cz=(z0+z1)/2;
      if(Math.abs(cx)>reach||Math.abs(cz)>reach){skipped.outside++;continue;}
      if(x1-x0>MAX_SIZE||z1-z0>MAX_SIZE){skipped.tooLarge++;continue;}
      // Broken source outlines are invalid; an outline spoiled only by the reduction to 64 corners is `simplified`.
      const cleaned=simplify(world.map(([x,z])=>[round2(x-cx),round2(z-cz)]),Infinity);
      if(cleaned.length<3||!isSimple(cleaned)){skipped.invalid++;continue;}
      const outline=simplify(cleaned);
      if(outline.length<3||!isSimple(outline)){skipped.simplified++;continue;}
      const {height,source}=parseHeight(b.tags),{name:title,address}=label(b.tags,ref),type=text(b.tags.building,40);
      const levels=text(b.tags['building:levels'],20);
      const data={...(type!=='yes'?{Gebäudetyp:type}:{}),...(address?{Adresse:address}:{}),...(levels?{Etagen:levels}:{}),'Höhe (Quelle)':`${height} m (${source})`,OSM:ref,Quelle:SOURCE};
      candidates.push({area:Math.abs(signedArea(outline)),source,point:{id:`osm-${b.type}-${b.key??b.id}`,name:title,type:'building',x:round2(cx),z:round2(cz),width:1,depth:1,height,rotation:0,color:COLORS[type]??DEFAULT_COLOR,visible:true,locked:false,footprint:outline,data,solid:true,interactive:true}});
    }catch{skipped.invalid++;}
  }
  // Studio limits: keep the largest buildings (by footprint area) within the point and corner budgets; every kept
  // point is checked on its own, so one odd building cannot fail the document.
  candidates.sort((a,b)=>b.area-a.area||(a.point.id<b.point.id?-1:1));
  const kept=[];let corners=0,overBudget=0;
  for(const c of candidates){
    if(kept.length>=MAX_POINTS||corners+c.point.footprint.length>MAX_TOTAL_FOOTPRINT_VERTICES){overBudget++;continue;}
    if(!acceptable(c.point)){skipped.invalid++;continue;}
    kept.push(c);corners+=c.point.footprint.length;
  }
  kept.sort((a,b)=>a.point.id<b.point.id?-1:1);
  for(const c of kept)heights[c.source]++;
  const dropped=overBudget,warnings=[];
  if(dropped)warnings.push(`${dropped} kleinere Gebäude weggelassen (Grenze: ${MAX_POINTS} Gebäude, ${MAX_TOTAL_FOOTPRINT_VERTICES} Ecken).`);
  if(heights.estimate)warnings.push(`${heights.estimate} Höhen geschätzt (OSM ohne height/building:levels).`);
  if(heights.unreadable)warnings.push(`${heights.unreadable} Höhenangaben nicht lesbar (geschätzt).`);
  if(skipped.outside)warnings.push(`${skipped.outside} Gebäude liegen mehr als ${reach} m vom Mittelpunkt entfernt und wurden weggelassen.`);
  if(skipped.simplified)warnings.push(`${skipped.simplified} Umrisse ließen sich nicht sauber vereinfachen und wurden weggelassen.`);
  if(skipped.openRings)warnings.push(`${skipped.openRings} offene Außenring-Teile (Multipolygone) ließen sich nicht schließen.`);
  // Map: all buildings plus a margin, re-centred on the kept buildings.
  const extent=axis=>{let min=Infinity,max=-Infinity;for(const c of kept)for(const v of c.point.footprint){const n=c.point[axis]+v[axis==='x'?0:1];if(n<min)min=n;if(n>max)max=n;}return kept.length?[min,max]:[0,0];};
  const [x0,x1]=extent('x'),[z0,z1]=extent('z'),mx=round2((x0+x1)/2),mz=round2((z0+z1)/2);
  const width=Math.ceil(x1-x0+2*MARGIN),depth=Math.ceil(z1-z0+2*MARGIN);
  if(width>MAX_MAP_METRES||depth>MAX_MAP_METRES)throw new Error(`Ausschnitt zu groß: ${width} × ${depth} m (höchstens ${MAX_MAP_METRES} m pro Seite).`);
  const points=kept.map(c=>({...c.point,x:round2(c.point.x-mx),z:round2(c.point.z-mz)}));
  const mapWidth=Math.max(10,width),mapDepth=Math.max(10,depth);
  let surfaces,groundReport=null,color='#1b2a33';
  if(ground){
    const result=convertGround(ground,{project,shift:[mx,mz],rect:{halfWidth:mapWidth/2,halfDepth:mapDepth/2},simplify});
    surfaces=result.surfaces;groundReport=result.report;color=result.sea?SEA_COLOR:LAND_COLOR;
    if(groundReport.openCoast)warnings.push(`${groundReport.openCoast} Küstenstücke enden innerhalb der Karte; das Meer kann dort unvollständig sein.`);
    if(groundReport.dropped)warnings.push(`${groundReport.dropped} Bodenflächen weggelassen (Grenze der Bodenpunkte).`);
    if(groundReport.landDropped)warnings.push(`${groundReport.landDropped} Landflächen ließen sich nicht sauber aufbauen und fehlen.`);
  }
  let document=validateDocument({schema:'motionspec.map.v3',name:text(name,100)||'OpenStreetMap-Welt',attribution:OSM_ATTRIBUTION,map:{width:mapWidth,depth:mapDepth,color,image:null},runtime:{spawn:null},points,...(surfaces?{surfaces}:{})});
  let start=null;
  if(spawn){
    const [wx,wz]=project(spawn.lat,spawn.lon),wish={x:wx-mx,z:wz-mz},heading=Number.isFinite(Number(spawn.heading))?((Number(spawn.heading)%360)+360)%360:0;
    const found=createWorld({bounds:{width:document.map.width,depth:document.map.depth},colliders:collidersFromSnapshot(document)}).findSpawn(wish);
    if(found){
      document=validateDocument({...document,runtime:{spawn:{x:round2(found.x),z:round2(found.z),heading}}});
      start={moved:round2(Math.hypot(found.x-wish.x,found.z-wish.z)),...document.runtime.spawn};
    }else warnings.push('Kein freier Startplatz in der Nähe des Wunschpunkts; der Start wird beim Betreten gesucht.');
  }
  return {document,report:{elements:elements.length,buildings:kept.length,dropped,skipped,heights,corners,map:`${document.map.width} × ${document.map.depth} m`,centre:middle,spawn:start,ground:groundReport,warnings}};
}
