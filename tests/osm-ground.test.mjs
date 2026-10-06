// worldport P2b: OpenStreetMap ground → map.v3 surfaces: roads/paths as ribbons (width by class), beach, parks,
// water, parking; land from the coastline (land on the left, closed along the map edge) — the rest is sea.
import assert from 'node:assert/strict';
import {convertOsm} from '../dist/worldport/osm.mjs';
import {coastLand,clipPolyline,clipPolygon,ROAD_WIDTHS,overpassGroundQuery} from '../dist/worldport/osm-ground.mjs';
import {validateDocument} from '../dist/map-studio/model.js';
import {signedArea,isSimple} from '../dist/runtime/geometry/polygon.js';

// 1. Clipping to the map rectangle (half sizes 100 × 50).
{
  const rect={halfWidth:100,halfDepth:50};
  assert.deepEqual(clipPolyline([[-200,0],[0,0],[0,200]],rect),[[[-100,0],[0,0],[0,50]]]);
  assert.deepEqual(clipPolyline([[-200,70],[200,70]],rect),[],'completely outside');
  const square=clipPolygon([[-150,-10],[50,-10],[50,10],[-150,10]],rect);
  assert.equal(Math.abs(signedArea(square)),150*20);
}
// 2. Coastline → land. Coordinates here are map metres (x east, z south). A coast running north along x = 20
//    (south → north, i.e. z decreasing) has the land on its left = west. Map 200 × 100.
{
  const rect={halfWidth:100,halfDepth:50};
  const {land,open}=coastLand([[[20,80],[20,-80]]],rect);
  assert.equal(open,0);assert.equal(land.length,1);
  const xs=land[0].map(v=>v[0]);assert.equal(Math.min(...xs),-100);assert.equal(Math.max(...xs),20);
  assert.equal(Math.abs(signedArea(land[0])),120*100,'west part of the map is land');
  // The same coast drawn the other way (north → south): land on the left is now east.
  const east=coastLand([[[20,-80],[20,80]]],rect).land[0];assert.equal(Math.min(...east.map(v=>v[0])),20);
  // Coast in two pieces that join, plus a closed island in the sea; a dangling piece is counted as open.
  const joined=coastLand([[[20,80],[20,0]],[[20,0],[20,-80]],[[60,-10],[80,-10],[80,10],[60,10],[60,-10]].reverse(),[[-5,5],[-5,6]]],rect);
  assert.equal(joined.land.length,2);assert.equal(joined.open,1);
}
// 3. Road widths by class.
assert.equal(ROAD_WIDTHS.primary,14);assert.equal(ROAD_WIDTHS.residential,8);assert.equal(ROAD_WIDTHS.footway,2.5);
// 4. Whole conversion with ground data: surfaces valid, sea colour when land exists, counts in the report.
{
  const ring=(lat,lon,dLat,dLon)=>[{lat,lon},{lat,lon:lon+dLon},{lat:lat+dLat,lon:lon+dLon},{lat:lat+dLat,lon},{lat,lon}];
  const buildings={elements:[
    {type:'way',id:1,geometry:ring(25.7800,-80.1320,.0002,.0003),tags:{building:'hotel'}},
    {type:'way',id:2,geometry:ring(25.7830,-80.1290,.0002,.0003),tags:{building:'yes'}}]};
  const w=(id,geometry,tags)=>({type:'way',id,geometry,tags});
  const ground={elements:[
    w(10,[{lat:25.7805,lon:-80.1330},{lat:25.7805,lon:-80.1270}],{highway:'primary'}),
    w(11,[{lat:25.7815,lon:-80.1330},{lat:25.7815,lon:-80.1270}],{highway:'footway'}),
    w(12,ring(25.7815,-80.1289,.0003,.0003),{natural:'beach'}),
    w(13,ring(25.7825,-80.1315,.0002,.0002),{leisure:'park'}),
    w(14,ring(25.7822,-80.1300,.0001,.0001),{natural:'water'}),
    w(15,ring(25.7812,-80.1305,.0001,.0002),{amenity:'parking'}),
    // Coast along −80.1285 running north: land on the left = west (the city), sea to the east.
    w(16,[{lat:25.7770,lon:-80.1285},{lat:25.7860,lon:-80.1285}],{natural:'coastline'}),
    w(17,[{lat:25.78,lon:-80.13},{lat:25.781,lon:-80.13}],{highway:'residential',area:'yes'})// area highway: ignored
  ]};
  const {document:doc,report}=convertOsm(buildings,{name:'Boden',ground});
  const kinds=doc.surfaces.map(s=>s.kind);
  for(const kind of ['land','road','path','beach','park','water','parking'])assert.ok(kinds.includes(kind),kind);
  assert.equal(doc.map.color,'#1f5f8b','sea around the land');
  assert.equal(doc.surfaces.find(s=>s.kind==='road').width,14);assert.equal(doc.surfaces.find(s=>s.kind==='path').width,2.5);
  assert.deepEqual(validateDocument(JSON.parse(JSON.stringify(doc))),doc);
  assert.equal(report.ground.roads,1);assert.equal(report.ground.paths,1);assert.equal(report.ground.land,1);
  const land=doc.surfaces.find(s=>s.kind==='land');assert.ok(Math.max(...land.points.map(v=>v[0]))<doc.map.width/2,'land ends at the coast, sea east of it');
}
// 5. Query for the ground data of a box.
assert.match(overpassGroundQuery({south:1,west:2,north:3,east:4}),/way\["highway"\]\(1,2,3,4\)/);
assert.match(overpassGroundQuery({south:1,west:2,north:3,east:4}),/natural/);
// 6. Review H1: a long, finely mapped coast (6000 nodes) still gives the right, simple land polygon.
{
  const {convertGround}=await import('../dist/worldport/osm-ground.mjs'),{simplify}=await import('../dist/worldport/osm.mjs');
  const coast=Array.from({length:6000},(_,i)=>({lat:25.80-i*(.02/5999),lon:-80.13+.0005*Math.sin(i/300)}));// north → south: land on the left = east
  const rect={halfWidth:1000,halfDepth:800},project=(lat,lon)=>[(lon+80.13)*100000,-(lat-25.79)*110000];
  const {surfaces,report,sea}=convertGround({elements:[{type:'way',id:1,geometry:coast,tags:{natural:'coastline'}}]},{project,shift:[0,0],rect,simplify});
  const land=surfaces.filter(s=>s.kind==='land');
  assert.equal(land.length,1);assert.ok(sea);assert.ok(isSimple(land[0].points),'land polygon is simple');assert.ok(land[0].points.length<=1500);
  const area=Math.abs(signedArea(land[0].points));assert.ok(area>1.55e6&&area<1.65e6,`land area ${Math.round(area)} (east of the coast: ≈ 1000 × 1600 m)`);
  assert.equal(report.land,1);
}
// 6b. A closed coastline ring (an island) survives the thinning.
{
  const {convertGround}=await import('../dist/worldport/osm-ground.mjs'),{simplify}=await import('../dist/worldport/osm.mjs');
  const island=Array.from({length:40},(_,i)=>{const a=i/40*Math.PI*2;return {lat:.001*Math.sin(a),lon:.001*Math.cos(a)};});island.push(island[0]);// counter-clockwise in (east, north)
  const {surfaces}=convertGround({elements:[{type:'way',id:1,geometry:island,tags:{natural:'coastline'}}]},{project:(lat,lon)=>[lon*100000,-lat*100000],shift:[0,0],rect:{halfWidth:500,halfDepth:500},simplify});
  assert.equal(surfaces.filter(s=>s.kind==='land').length,1,'island kept');
}
// 7. Review M2/L1: odd highway values, over-long roads, points exactly on the border.
{
  const {convertGround}=await import('../dist/worldport/osm-ground.mjs'),{simplify}=await import('../dist/worldport/osm.mjs');
  const rect={halfWidth:500,halfDepth:500},project=(lat,lon)=>[lon*1000,-lat*1000];
  const long=Array.from({length:6000},(_,i)=>({lat:(i%2)*.01,lon:-.45+i*(.9/5999)}));
  const {surfaces}=convertGround({elements:[
    {type:'way',id:1,geometry:[{lat:0,lon:-.1},{lat:0,lon:.1}],tags:{highway:'constructor'}},
    {type:'way',id:2,geometry:long,tags:{highway:'footway'}}]},{project,shift:[0,0],rect,simplify});
  assert.equal(surfaces.find(s=>s.points.length===2).width,5,'unknown class → 5 m, not a prototype function');
  assert.ok(surfaces.every(s=>s.points.length<=5000),'long ribbons are split');
  assert.equal(surfaces.filter(s=>s.kind==='path').reduce((n,s)=>n+s.points.length,0)>=6000,true);
  assert.deepEqual(clipPolyline([[-200,0],[-100,0],[-50,20]],{halfWidth:100,halfDepth:50}),[[[-100,0],[-50,20]]],'no doubled border point');
}
console.log('PASS: OSM ground — clipping, coastline → land (both directions, joined pieces, islands), road widths, surfaces in the document.');
