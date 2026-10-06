// worldport P2: OpenStreetMap buildings (Overpass JSON, `out geom`) → a walkable map.v3 world with footprints,
// heights and the ODbL attribution. Pure and deterministic; the data fetch is separate (scripts/worldport-osm.mjs).
import assert from 'node:assert/strict';
import {convertOsm,projection,parseHeight,simplify,OSM_ATTRIBUTION,overpassQuery} from '../dist/worldport/osm.mjs';
import {validateDocument,MAX_POINTS,MAX_TOTAL_FOOTPRINT_VERTICES} from '../dist/map-studio/model.js';
import {prepareWalk} from '../dist/runtime/map-adapter.js';
import {isSimple} from '../dist/runtime/geometry/polygon.js';

// A small synthetic Overpass result around Ocean Drive (not real OSM data): ways with geometry and tags.
const ring=(lat,lon,dLat,dLon)=>[{lat,lon},{lat,lon:lon+dLon},{lat:lat+dLat,lon:lon+dLon},{lat:lat+dLat,lon},{lat,lon}];
const way=(id,geometry,tags)=>({type:'way',id,geometry,tags});
const osm={elements:[
  way(1,ring(25.7800,-80.1300,.0002,.0003),{building:'hotel',name:'Hotel Pastel',height:'18 m','addr:housenumber':'1200','addr:street':'Ocean Drive'}),
  way(2,ring(25.7810,-80.1310,.0001,.0001),{building:'yes','building:levels':'3'}),
  way(3,ring(25.7790,-80.1290,.0001,.0002),{building:'house'}),
  way(4,[{lat:25.78,lon:-80.13},{lat:25.7801,lon:-80.1301},{lat:25.78,lon:-80.1301},{lat:25.7801,lon:-80.13},{lat:25.78,lon:-80.13}],{building:'yes'}),// bow-tie
  way(5,ring(25.7805,-80.1305,.0001,.0001),{highway:'residential'}),// not a building
  {type:'relation',id:6,tags:{building:'yes',type:'multipolygon'},members:[]},
  way(7,[{lat:25.782,lon:-80.132},{lat:25.7821,lon:-80.132}],{building:'yes'}),// open / too few points
  // Multipolygon building: the outer ring comes in two open pieces (one reversed); the courtyard (inner) is filled.
  {type:'relation',id:8,tags:{building:'hotel',type:'multipolygon',name:'Hotel Courtyard'},members:[
    {type:'way',ref:81,role:'outer',geometry:[{lat:25.7830,lon:-80.1330},{lat:25.7830,lon:-80.1326},{lat:25.7834,lon:-80.1326}]},
    {type:'way',ref:82,role:'outer',geometry:[{lat:25.7830,lon:-80.1330},{lat:25.7834,lon:-80.1330},{lat:25.7834,lon:-80.1326}]},
    {type:'way',ref:83,role:'inner',geometry:[{lat:25.7831,lon:-80.1329},{lat:25.7831,lon:-80.1327},{lat:25.7833,lon:-80.1327},{lat:25.7831,lon:-80.1329}]}
  ]}
]};

// 1. Projection: metres around the centre, east = +x, north = −z (north up), equirectangular.
{
  const p=projection({lat:25.78,lon:-80.13});
  assert.deepEqual(p(25.78,-80.13).map(n=>+n.toFixed(6)),[0,0]);
  const [x]=p(25.78,-80.13+.001),[,z]=p(25.78+.001,-80.13);
  assert.ok(Math.abs(x-100.3)<.5,`0.001° east ≈ 100 m at 25.8° N: ${x}`);assert.ok(Math.abs(z+110.7)<.5,`0.001° north ≈ −110.7 m: ${z}`);
}
// 2. Heights: explicit height with units, levels × 3.2 m, otherwise an estimate by building type.
assert.deepEqual(parseHeight({height:'18 m'}),{height:18,source:'height'});
assert.deepEqual(parseHeight({height:'40 ft'}),{height:12.19,source:'height'});
assert.deepEqual(parseHeight({'building:levels':'3'}),{height:9.6,source:'levels'});
assert.deepEqual(parseHeight({'building:levels':'2','roof:levels':'1'}),{height:9.6,source:'levels'});
assert.equal(parseHeight({building:'house'}).source,'estimate');assert.equal(parseHeight({building:'garage'}).height,3);
assert.equal(parseHeight({height:'abc',building:'yes'}).source,'unreadable');assert.equal(parseHeight({height:'9000'}).height,300,'capped at the studio maximum');
// 3. Simplification: collinear and duplicate corners go, the closing point goes, at most 64 corners stay simple.
{
  const square=[[0,0],[5,0],[10,0],[10,10],[0,10],[0,0]];
  assert.deepEqual(simplify(square),[[0,0],[10,0],[10,10],[0,10]]);
  const circle=Array.from({length:300},(_,i)=>{const a=i/300*Math.PI*2;return [30*Math.cos(a),30*Math.sin(a)];});
  const s=simplify(circle);assert.ok(s.length<=64&&s.length>=16&&isSimple(s),`${s.length} corners`);
}
// 4. Conversion: buildings only, footprints around their centre, names/addresses, attribution, honest report.
{
  const {document:doc,report}=convertOsm(osm,{name:'Vice City – Test'});
  assert.equal(doc.schema,'motionspec.map.v3');assert.equal(doc.attribution,OSM_ATTRIBUTION);assert.match(OSM_ATTRIBUTION,/OpenStreetMap/);assert.match(OSM_ATTRIBUTION,/ODbL/);
  assert.equal(doc.points.length,4);
  const courtyard=doc.points.find(p=>p.id==='osm-relation-8');assert.equal(courtyard?.name,'Hotel Courtyard');assert.equal(courtyard.footprint.length,4);assert.equal(courtyard.data.OSM,'relation/8');
  const hotel=doc.points.find(p=>p.id==='osm-way-1');
  assert.equal(hotel.name,'Hotel Pastel');assert.equal(hotel.height,18);assert.equal(hotel.type,'building');assert.ok(hotel.solid&&hotel.interactive);
  assert.equal(hotel.data.Adresse,'1200 Ocean Drive');assert.equal(hotel.data['Höhe (Quelle)'],'18 m (height)');assert.equal(hotel.data['OSM'],'way/1');assert.equal(hotel.data.Quelle,'© OpenStreetMap-Mitwirkende (ODbL)');
  assert.ok(hotel.footprint.length===4&&isSimple(hotel.footprint));
  const w=Math.max(...hotel.footprint.map(v=>v[0]))-Math.min(...hotel.footprint.map(v=>v[0]));assert.ok(Math.abs(w-30.1)<.5,`hotel width ${w}`);
  assert.equal(doc.points.find(p=>p.id==='osm-way-2').name,'Gebäude way/2');
  assert.deepEqual({buildings:report.buildings,skipped:report.skipped,estimated:report.heights.estimate},{buildings:4,skipped:{invalid:2,relations:1,tooLarge:0,duplicate:0,outside:0,openRings:0,simplified:0},estimated:2});
  // Valid for the studio, and walkable with a free start.
  assert.deepEqual(validateDocument(JSON.parse(JSON.stringify(doc))),doc);
  const walk=prepareWalk(validateDocument(doc));assert.equal(walk.world.overlaps(walk.start),null);
  // Deterministic.
  assert.equal(JSON.stringify(convertOsm(osm,{name:'Vice City – Test'}).document),JSON.stringify(doc));
}
// 5. Limits: at most MAX_POINTS buildings and MAX_TOTAL_FOOTPRINT_VERTICES corners — the largest are kept.
{
  const many={elements:Array.from({length:MAX_POINTS+40},(_,i)=>way(100+i,ring(25.70+Math.floor(i/80)*.0003,-80.20+(i%80)*.0003,.0001*(1+i%5),.0001),{building:'yes'}))};
  const {document:doc,report}=convertOsm(many,{name:'Viele'});
  assert.equal(doc.points.length,MAX_POINTS);assert.equal(report.dropped,40);assert.match(report.warnings.join(' '),/40/);
  assert.ok(doc.points.reduce((s,p)=>s+p.footprint.length,0)<=MAX_TOTAL_FOOTPRINT_VERTICES);
  assert.ok(validateDocument(doc));
}
// 6. The Overpass query for a bounding box asks for buildings with geometry only.
{
  const q=overpassQuery({south:25.765,west:-80.145,north:25.795,east:-80.125});
  assert.match(q,/\[out:json\]/);assert.match(q,/way\["building"\]\(25\.765,-80\.145,25\.795,-80\.125\)/);assert.match(q,/out geom/);
}
// 7. Start: a wished spot (lat/lon, heading) becomes the stored spawn, moved to the nearest free place if a
//    building stands there — so the walk begins e.g. on Ocean Drive instead of the map edge.
{
  const inside=convertOsm(osm,{name:'Start',spawn:{lat:25.7801,lon:-80.12985,heading:0}});
  const {document:doc,report}=inside,spawn=doc.runtime.spawn;
  assert.ok(spawn&&spawn.heading===0,'spawn stored');assert.ok(report.spawn.moved>0,'moved out of the hotel');
  const walk=prepareWalk(validateDocument(doc));assert.equal(walk.source,'stored');assert.equal(walk.world.overlaps(walk.start),null);
  const free=convertOsm(osm,{name:'Start',spawn:{lat:25.7795,lon:-80.1320,heading:90}}).report.spawn;assert.equal(free.moved,0);
}
// 8. Review: hostile or odd input never breaks the whole import — bad elements are skipped and counted.
{
  const ok=id=>way(id,ring(25.7800+id*1e-5,-80.1300,.0001,.0001),{building:'yes'});
  const odd=[
    way(900,ring(25.7801,-80.1301,.0001,.0001),{building:'yes',height:'0.1'}),// tiny height → clamped to 0.2 m
    way(901,ring(25.7803,-80.1303,.0001,.0001),{building:'yes',name:12345,'addr:street':'x'.repeat(7000),'building:levels':'y'.repeat(7000)}),// odd tag types/lengths
    {...ok(902),id:undefined},// no id
    ok(903),ok(903),// duplicate id
    way(904,ring(25.7805,-80.1305,.0001,.0001),{building:'no'}),// explicitly not a building
    way(905,ring(55.78,-80.13,.0001,.0001),{building:'yes'}),// far outlier (30° north)
    way(906,[{lat:'x',lon:1},{lat:2,lon:2},{lat:3,lon:3},{lat:'x',lon:1}],{building:'yes'}),// not numbers
    way(907,ring(95,-80.13,.0001,.0001),{building:'yes'}),// latitude out of range
    {type:'relation',id:908,tags:{building:'yes'},members:[{role:'outer',geometry:[{lat:25.78,lon:-80.13},{lat:25.7801,lon:-80.13}]}]}// open ring
  ];
  const {document:doc,report}=convertOsm({elements:[ok(1),ok(2),...odd]},{name:'Robust'});
  const ids=doc.points.map(p=>p.id);
  assert.deepEqual(ids,['osm-way-1','osm-way-2','osm-way-900','osm-way-901','osm-way-903']);
  assert.equal(doc.points.find(p=>p.id==='osm-way-900').height,.2);
  const tall=doc.points.find(p=>p.id==='osm-way-901');assert.equal(tall.name,'12345');assert.ok(JSON.stringify(tall.data).length<=6000);
  assert.deepEqual(report.skipped,{invalid:3,relations:1,tooLarge:0,duplicate:1,outside:1,openRings:1,simplified:0});
  assert.ok(validateDocument(doc));
}
// 9. Review: big inputs stay fast and do not overflow the stack (30 000 buildings, rings with 50 000 nodes).
{
  const t0=performance.now();
  const many={elements:Array.from({length:30000},(_,i)=>way(i+1,ring(25.70+Math.floor(i/200)*.0002,-80.20+(i%200)*.0002,.00005,.00005),{building:'yes'}))};
  const {report}=convertOsm(many,{name:'Groß'});assert.equal(report.buildings,MAX_POINTS);
  const circle=Array.from({length:50001},(_,i)=>{const a=i/50000*Math.PI*2;return {lat:25.78+.0005*Math.sin(a),lon:-80.13+.0005*Math.cos(a)};});
  const round=convertOsm({elements:[way(1,circle,{building:'yes'})]},{name:'Rund'}).document.points[0];
  assert.ok(round.footprint.length<=64&&round.footprint.length>=16);
  const seconds=(performance.now()-t0)/1000;assert.ok(seconds<8,`${seconds.toFixed(1)} s`);
  console.log(`  30 000 Gebäude + 50 000-Knoten-Ring: ${seconds.toFixed(1)} s`);
}
// 10. Review: more OSM height forms; unreadable heights are counted and reported.
assert.equal(parseHeight({height:'12,5'}).height,12.5);assert.equal(parseHeight({height:"12'6\""}).height,3.81);assert.equal(parseHeight({height:'12.5m'}).height,12.5);
assert.equal(parseHeight({height:'-5',building:'house'}).source,'unreadable');assert.equal(parseHeight({height:'-5',building:'house'}).height,6);
{
  const {report}=convertOsm({elements:[way(1,ring(25.78,-80.13,.0001,.0001),{building:'yes',height:'hoch'})]},{name:'H'});
  assert.equal(report.heights.unreadable,1);assert.match(report.warnings.join(' '),/1 Höhenangabe.*nicht lesbar/);
}
// 11. Review: the spawn heading is normalised; a non-finite spawn is refused with a message.
{
  assert.equal(convertOsm(osm,{name:'S',spawn:{lat:25.7795,lon:-80.1320,heading:450}}).document.runtime.spawn.heading,90);
  assert.throws(()=>convertOsm(osm,{name:'S',spawn:{lat:NaN,lon:-80.13}}),/Startpunkt/);
}
console.log('PASS: OSM → map.v3: projection, heights, simplification, buildings with names/addresses/attribution, report, limits, walkable, deterministic.');
