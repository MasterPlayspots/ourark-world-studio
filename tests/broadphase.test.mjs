// Physics broadphase (spatial grid): identical results to checking every collider, much faster with many.
import assert from 'node:assert/strict';
import {createWorld,BOUNDS} from '../dist/runtime/physics/adapter.js';

// Deterministic pseudo-random numbers.
let seed=42;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
const triangle=(x,z,s)=>[[x,z],[x+s*(.5+random()),z+s*(random()-.5)],[x+s*(random()-.5),z+s*(.5+random())]];
const box=(x,z,w,d)=>[[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2]];
function city(count,{span=800,size=12}={}){
  const colliders=[];for(let i=0;i<count;i++){const x=(random()-.5)*span,z=(random()-.5)*span;colliders.push({id:`c${i}`,name:`C${i}`,vertices:i%3?triangle(x,z,size):box(x,z,size*(.3+random()),size*(.3+random()))});}
  // One huge collider (e.g. a lake) covering many cells.
  colliders.push({id:'lake',name:'Lake',vertices:box(-span/4,span/4,span/3,span/5)});
  return colliders;
}

// 1. Same answers as the brute-force check: overlaps, move (position, contacts) and spawn.
for(const count of [10,40,400]){
  const colliders=city(count),args={bounds:{width:1000,depth:1000},colliders};
  const grid=createWorld(args),brute=createWorld({...args,broadphase:false});
  assert.equal(grid.broadphase,count+1>=32,'grid only when it pays off');
  for(let i=0;i<3000;i++){
    const p={x:(random()-.5)*1000,z:(random()-.5)*1000};
    assert.equal(grid.overlaps(p)?.id??null,brute.overlaps(p)?.id??null,`overlaps at ${JSON.stringify(p)}`);
    const d={x:(random()-.5)*2,z:(random()-.5)*2},a=grid.move(p,d),b=brute.move(p,d);
    assert.deepEqual([a.x,a.z,a.contacts.sort(),a.reset],[b.x,b.z,b.contacts.sort(),b.reset],`move from ${JSON.stringify(p)}`);
  }
  assert.deepEqual(grid.findSpawn({x:0,z:0}),brute.findSpawn({x:0,z:0}));
}

// 2. Many colliders stay cheap: 16 000 triangles (about 2000 buildings split into convex parts).
{
  const colliders=city(16000,{span:2400,size:10}),world=createWorld({bounds:{width:2500,depth:2500},colliders});
  let body={x:0,z:0};const spawn=world.findSpawn(body);assert.ok(spawn&&world.overlaps(spawn)===null);body=spawn;
  const t0=performance.now();for(let i=0;i<3000;i++){body=world.move(body,{x:.05*Math.cos(i/200),z:.05*Math.sin(i/300)});}
  const perMove=(performance.now()-t0)/3000;
  assert.equal(world.overlaps(body),null);
  assert.ok(perMove<.25,`one simulation step with 16 000 colliders: ${perMove.toFixed(3)} ms`);
  console.log(`  16 000 Hindernisse: ${perMove.toFixed(3)} ms pro Schritt`);
}

// 3. Colliders across the map edge and inside the huge one still behave (BOUNDS, huge list).
{
  const world=createWorld({bounds:{width:100,depth:100},colliders:[...city(60,{span:90,size:4}),{id:'big',name:'Big',vertices:box(0,0,95,10)}]});
  assert.equal(world.overlaps({x:0,z:0})?.id,'big');assert.equal(world.overlaps({x:49.99,z:40}),BOUNDS);
}

// 4. Review worst cases: identical results everywhere (also outside the colliders' extent) and never much
//    slower than the plain loop — identical colliders, two far clusters, long thin streets, one giant + many.
{
  const same=Array.from({length:2000},(_,i)=>({id:`s${i}`,name:'',vertices:box(5,5,2,2)}));
  const cluster=(cx,n,tag)=>Array.from({length:n},(_,i)=>({id:`${tag}${i}`,name:'',vertices:box(cx+(random()-.5)*50,(random()-.5)*50,1+random(),1+random())}));
  const streets=[...Array.from({length:300},(_,i)=>({id:`h${i}`,name:'',vertices:box(0,i*4-600,300,.5)})),...Array.from({length:300},(_,i)=>({id:`v${i}`,name:'',vertices:box(i*4-600,0,.5,300)}))];
  const giant=[{id:'giant',name:'',vertices:box(0,0,1e6,1e6)},...cluster(0,2000,'g')];
  const cases={same,clusters:[...cluster(0,1000,'a'),...cluster(1e5,1000,'b')],streets,giant};
  const time=(world,points)=>{const t0=performance.now();for(const p of points)world.overlaps(p);return performance.now()-t0;};
  for(const [name,colliders] of Object.entries(cases)){
    const args={bounds:{width:4e6,depth:4e6},colliders},grid=createWorld(args),brute=createWorld({...args,broadphase:false});
    const points=Array.from({length:5000},(_,i)=>i%10===0?{x:(random()-.5)*3e6,z:(random()-.5)*3e6}:{x:(random()-.5)*60,z:(random()-.5)*60});
    for(const p of points.slice(0,1500)){
      assert.equal(grid.overlaps(p)?.id??null,brute.overlaps(p)?.id??null,`${name}: overlaps`);
      const d={x:random()-.5,z:random()-.5},a=grid.move(p,d),b=brute.move(p,d);assert.deepEqual([a.x,a.z,a.contacts.sort()],[b.x,b.z,b.contacts.sort()],`${name}: move`);
    }
    time(grid,points);time(brute,points);// warm up
    const g=Math.min(time(grid,points),time(grid,points)),b=Math.min(time(brute,points),time(brute,points));
    console.log(`  ${name}: Raster ${g.toFixed(1)} ms, alle prüfen ${b.toFixed(1)} ms`);
    assert.ok(g<=b*1.3+3,`${name}: grid ${g.toFixed(1)} ms vs plain ${b.toFixed(1)} ms`);
  }
}

console.log('PASS: broadphase gives identical overlaps, moves and spawns to brute force; 16 000 colliders stay cheap; huge colliders and bounds handled.');
