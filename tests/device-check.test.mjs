// Device check summary (W8, A2): fps, percentiles, display rate, verdict.
import assert from 'node:assert/strict';
import {summarize,reportText,A2} from '../dist/runtime/device-check.js';

const steady=summarize(Array(600).fill(1000/60),[2,2,1.5,1.5]);
assert.equal(steady.fpsMean,60);assert.equal(steady.frameP95,16.67);assert.equal(steady.refreshHz,60);assert.equal(steady.a2,true);
assert.deepEqual([steady.scaleStart,steady.scaleEnd,steady.scaleMin],[2,1.5,1.5]);
const fast=summarize(Array(1200).fill(1000/120),[1]);assert.equal(fast.refreshHz,120);assert.equal(fast.a2,true);
// 10 % hitches of 50 ms: p95 far above 20 ms → fails even though the mean stays high.
const hitchy=summarize([...Array(540).fill(1000/60),...Array(60).fill(50)],[1]);
assert.equal(hitchy.a2,false);assert.ok(hitchy.frameP95>A2.p95);assert.equal(hitchy.slowShare,.1);
const slow=summarize(Array(600).fill(1000/45),[1]);assert.equal(slow.a2,false);assert.equal(Math.round(slow.fpsMean),45);
assert.equal(summarize(Array(30).fill(10),[1]).a2,false,'too few frames is never a pass');
assert.equal(summarize([],[]).fpsMean,0);
const text=reportText({time:'t',scene:'a'.repeat(64),seconds:20,warmup:8,device:{platform:'iPhone',mobile:true,gpu:'Apple GPU',cores:6,devicePixelRatio:3,screen:'390x844',canvas:'1170x2000',userAgent:'UA'},result:steady,errors:[]});
assert.match(text,/A2 .*PASS/);assert.match(text,/iPhone \(mobile\)/);assert.match(text,/Errors: none/);
console.log('PASS: device check summary — mean fps, percentiles, display rate, hitches and slow devices fail A2, too few frames fail, report text.');
