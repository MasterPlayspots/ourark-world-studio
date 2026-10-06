// Footprint polygons (map.v3): validity, point-in-polygon and convex decomposition for collisions.
import assert from 'node:assert/strict';
import {signedArea,isSimple,containsPoint,triangulate,convexParts,isConvex,convexHull} from '../dist/runtime/geometry/polygon.js';

const L=[[0,0],[10,0],[10,4],[4,4],[4,10],[0,10]];// L-shaped building, counter-clockwise (x right, z down → area sign)
const square=[[0,0],[4,0],[4,4],[0,4]];
const bowtie=[[0,0],[4,4],[4,0],[0,4]];
const comb=[[0,0],[12,0],[12,6],[10,6],[10,2],[8,2],[8,6],[6,6],[6,2],[4,2],[4,6],[2,6],[2,2],[0,2]].reverse();

// 1. Area and orientation.
assert.equal(Math.abs(signedArea(L)),64);assert.equal(signedArea(square),-signedArea([...square].reverse()));
// 2. Simple polygons only: no self-intersection, no repeated vertices, no zero area.
assert.ok(isSimple(L)&&isSimple(square)&&isSimple(comb));
assert.ok(!isSimple(bowtie),'self-intersecting');assert.ok(!isSimple([[0,0],[1,0],[1,0],[0,1]]),'repeated vertex');
assert.ok(!isSimple([[0,0],[1,0],[2,0]]),'zero area');assert.ok(!isSimple([[0,0],[1,1]]),'too few vertices');
// 3. Point in polygon works for concave shapes (the notch of the L is outside).
assert.ok(containsPoint(L,{x:2,z:8}));assert.ok(!containsPoint(L,{x:7,z:7}),'notch');assert.ok(containsPoint(L,{x:7,z:2}));
// 4. Triangulation covers the area exactly, in both orientations.
for(const poly of [L,[...L].reverse(),comb,square]){
  const tris=triangulate(poly);assert.equal(tris.length,poly.length-2);
  assert.ok(Math.abs(tris.reduce((s,t)=>s+Math.abs(signedArea(t)),0)-Math.abs(signedArea(poly)))<1e-9);
}
// 5. Convex parts: each part convex, same total area, few parts (L → 2, comb → at most 7), convex stays one part.
for(const [poly,max] of [[L,2],[comb,7],[square,1],[[...L].reverse(),2]]){
  const parts=convexParts(poly);
  assert.ok(parts.length<=max,`${parts.length} parts`);assert.ok(parts.every(isConvex));
  assert.ok(Math.abs(parts.reduce((s,p)=>s+Math.abs(signedArea(p)),0)-Math.abs(signedArea(poly)))<1e-9);
  // Sampled: a point is in the polygon exactly when it is in one of the parts.
  for(let x=-.5;x<=12.5;x+=.37)for(let z=-.5;z<=10.5;z+=.41){const p={x,z};assert.equal(containsPoint(poly,p),parts.some(part=>containsPoint(part,p)),`${x},${z}`);}
}
// 6. Real-world shapes: a 64-vertex star-ish outline decomposes without error.
const star=Array.from({length:64},(_,i)=>{const a=i/64*Math.PI*2,r=i%2?6:10;return [r*Math.cos(a),r*Math.sin(a)];});
assert.ok(isSimple(star));assert.ok(convexParts(star).every(isConvex));

// 7. Convex hull (fallback collider) of the L: its bounding square minus nothing (5 corners collapse to 4 + 1).
assert.deepEqual(convexHull(L),[[0,0],[10,0],[10,4],[4,10],[0,10]]);
// 8. Cost (review M1): a 64-corner zigzag decomposes well under a millisecond on average.
{
  const zig=[];for(let i=0;i<32;i++)zig.push([i*2,0]);for(let i=31;i>=0;i--)zig.push([i*2+1,i%2?5:10]);
  assert.ok(isSimple(zig));const t0=performance.now();for(let i=0;i<200;i++){isSimple(zig);convexParts(zig);}
  const each=(performance.now()-t0)/200;assert.ok(each<1,`${each.toFixed(3)} ms per 64-corner outline`);
  console.log(`  64-Ecken-Zickzack: ${each.toFixed(3)} ms für Prüfung + Zerlegung`);
}

console.log('PASS: polygon area, simplicity, concave point-in-polygon, ear-clipping triangulation and convex decomposition.');
