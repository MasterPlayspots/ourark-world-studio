import assert from 'node:assert/strict';
import {frameSummary,primitives,logCsv,percentile} from '../dist/runtime/perf-meter.js';

assert.deepEqual(frameSummary([]),{frames:0,fps:0,p50:0,p95:0,p99:0,max:0,jank:0});
const steady=frameSummary(Array(60).fill(1000/60));
assert.equal(steady.fps,60);assert.equal(steady.jank,0);assert.equal(steady.max,16.67);
const janky=frameSummary([...Array(90).fill(10),...Array(10).fill(40)]);
assert.equal(janky.jank,.1);assert.equal(janky.max,40);assert.equal(janky.p50,10);assert.equal(janky.p95,40);
assert.equal(percentile([1,2,3,4],.5),3);
assert.equal(primitives(4,36),12);assert.equal(primitives(4,36,10),120);assert.equal(primitives(5,6),4);assert.equal(primitives(1,100),0);
const csv=logCsv([{t:1,fps:60,calls:23,canvas:'100x50',runtime:'playing'}]).split('\n');
assert.equal(csv.length,2);assert.ok(csv[0].startsWith('t,fps,'));assert.ok(csv[1].startsWith('1,60,'));
console.log('PASS perf-meter');
