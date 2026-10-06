// Live insights: UTM → WGS84, frame statistics, place grid, colours and the generated observations.
import assert from 'node:assert/strict';
import {utmToGeo,localToGeo,frameStats,median,PlaceGrid,fpsColor,observations} from '../dist/kart/insights.js';
import {readFileSync} from 'node:fs';

const near=(a,b,tol,label)=>assert.ok(Math.abs(a-b)<=tol,`${label}: ${a} ≈ ${b}`);

{ // 50° N on the central meridian of zone 32 (9° E): northing = 0.9996 × meridian arc = 5 538 630.70 m.
  const p=utmToGeo(500000,5538630.70);
  near(p.lat,50,1e-6,'lat on central meridian');near(p.lon,9,1e-9,'lon on central meridian');
}
{ // Map centre of the Kronach bundle lies in Kronach (Obere Stadt): about 50.24° N, 11.33° E.
  const meta={origin:{crs:'EPSG:25832',east:665750,north:5567950}}; // Coordinate reference only; no geodata bundle.
  const c=localToGeo(0,0,meta.origin);
  near(c.lat,50.24,.01,'Kronach lat');near(c.lon,11.33,.01,'Kronach lon');
  // x east, z south: 100 m east and 100 m north of the centre.
  const p=localToGeo(100,-100,meta.origin);
  assert.equal(p.east,meta.origin.east+100);assert.equal(p.north,meta.origin.north+100);
  assert.ok(p.lat>c.lat&&p.lon>c.lon,'north-east of the centre');
  // A pure grid-north step of 100 m is ≈ 100 m true north (grid convergence ~1.8° here: cos ≈ 0.9995).
  const n=localToGeo(0,-100,meta.origin);
  near((n.lat-c.lat)*111229,100,.5,'100 m grid north in latitude');
  // East of the central meridian grid north points east of true north: the diagonal step gains only
  // 100·cos γ − 100·sin γ ≈ 96.8 m of latitude.
  near((p.lat-c.lat)*111229,96.8,.5,'diagonal step with grid convergence');
}
{ // Frame statistics from intervals.
  const s=frameStats([16,16,17,16,50,16,17,16,16,20]);
  near(s.fps,1000*10/200,.1,'fps');assert.equal(s.p50,16);assert.equal(s.p95,50);assert.equal(s.max,50);
  assert.deepEqual(frameStats([]),{fps:0,p50:null,p95:null,max:null});
  assert.equal(median([3,1,2]),2);assert.equal(median([4,1,2,3]),2.5);assert.equal(median([]),null);
}
{ // Place grid: 20 m cells, median per cell, slowest cell with enough samples.
  const g=new PlaceGrid(20);
  for(const fps of [60,58,59])g.add(5,5,fps);
  for(const fps of [30,25,28])g.add(45,-5,fps);
  g.add(100,100,10);// single sample: not enough for "slowest"
  const list=g.list();assert.equal(list.length,3);
  assert.deepEqual(g.slowest(3),{x:50,z:-10,samples:3,fps:28});
  assert.equal(fpsColor(60),'#4ade80');assert.equal(fpsColor(45),'#facc15');assert.equal(fpsColor(30),'#fb923c');assert.equal(fpsColor(12),'#ef4444');
}
{ // Observations compare with the session, name dense views, the slowest place and all sessions.
  const notes=observations({now:{fps:30},session:{fps:60},place:{x:0,z:0},drawCalls:900,area:{buildings:55},slowest:{x:30,z:40,fps:22},
    server:{sessions:4,hours:24,fps:{median:51},slowest:[{fps:19}]}});
  assert.match(notes[0],/50 % langsamer als dein Schnitt \(60\)/);
  assert.match(notes[1],/900 Draw Calls.*55 % bebaut/);
  assert.match(notes[2],/22 fps, 50 m von hier/);
  assert.match(notes[3],/4 Geräte, Median 51 fps, langsamste Stelle 19 fps/);
  assert.match(observations({now:{fps:59},session:{fps:60}})[0],/wie dein Schnitt/);
  // A "slowest" place no slower than the session average is not mentioned; one device is singular.
  const calm=observations({now:{fps:60},session:{fps:60},place:{x:0,z:0},slowest:{x:5,z:5,fps:58},server:{sessions:1,hours:24,fps:{median:60}}});
  assert.ok(!calm.some(t=>t.includes('Langsamste')),'no slowest-place note');assert.match(calm.at(-1),/1 Gerät,/);
}
console.log('PASS: kart insights – UTM→WGS84, frame statistics, place grid, colours, observations.');
