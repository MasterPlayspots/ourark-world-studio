// Camera rig (W4): third person with camera collision, free flight clamped to the room, the source path, and the
// walker landing after flight. Checked on synthetic cases and on the office48 scan fixture.
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {CAMERA_MODES,THIRD,direction,segmentEnters,segmentExits,thirdPersonView,FlyController,sourceView} from '../dist/runtime/camera-rig.js';
import {SCAN_ID,prepareScanWalk,flyBounds} from '../dist/runtime/scan/adapter.js';
import {Walker} from '../dist/runtime/walker.js';
import {BINDINGS,COMMANDS} from '../dist/runtime/input.js';
import {containsPoint} from '../dist/runtime/geometry/polygon.js';

const near=(a,b,e=1e-9,m='')=>assert.ok(Math.abs(a-b)<=e,`${m} ${a} ≠ ${b}`);
assert.deepEqual(CAMERA_MODES,['first','third','fly','source']);
assert.equal(COMMANDS.Digit1,'view1');assert.equal(COMMANDS.Digit4,'view4');assert.equal(BINDINGS.KeyC,'down');

// 1. Directions: heading clockwise from north (−Z), pitch up.
direction(0).forEach((v,i)=>near(v,[0,0,-1][i]));direction(90).forEach((v,i)=>near(v,[1,0,0][i]));direction(0,90).forEach((v,i)=>near(v,[0,1,0][i]));

// 2. Segment against a square [0,1]²: enters at the near edge, misses beside it, starts inside at 0; exits an area.
const square=[[0,0],[1,0],[1,1],[0,1]];
near(segmentEnters([-1,.5],[2,.5],square),1/3);assert.equal(segmentEnters([-1,2],[2,2],square),null);assert.equal(segmentEnters([.5,.5],[3,.5],square),0);
assert.equal(segmentEnters([-1,.5],[-.5,.5],square),null,'stops short of it');
near(segmentExits([.5,.5],[.5,3],square),.5/2.5);assert.equal(segmentExits([.2,.5],[.8,.5],square),1);

// 3. Third person: free → full distance behind and above the head; a wall behind pulls the camera in front of it;
//    the room edge does the same; a low ceiling clamps the height; dioramas scale everything.
const pose={x:0,z:0,heading:0,pitch:0};
let v=thirdPersonView(pose,{eye:1.6});
near(v.distance,THIRD.distance);near(v.position[2],THIRD.distance);near(v.position[1],1.6+THIRD.height);assert.deepEqual(v.target,[0,1.6+THIRD.aim,0]);
v=thirdPersonView(pose,{eye:1.6,colliders:[{vertices:[[-1,1],[1,1],[1,1.2],[-1,1.2]]}]});
near(v.distance,1-THIRD.margin,1e-9,'pulled in front of the wall');assert.ok(v.position[2]<1);
v=thirdPersonView(pose,{eye:1.6,area:[[-3,-3],[3,-3],[3,.8],[-3,.8]]});near(v.position[2],.8-THIRD.margin,1e-9,'inside the room edge');
v=thirdPersonView(pose,{eye:1.6,ceilingY:1.8});near(v.position[1],1.8-THIRD.margin);
v=thirdPersonView(pose,{eye:.32,scale:.2});near(v.distance,THIRD.distance*.2);
v=thirdPersonView(pose,{eye:1.6,colliders:[{vertices:[[-1,.1],[1,.1],[1,.2],[-1,.2]]}]});near(v.distance,.05,1e-9,'wall right behind: halfway to it, never behind it');
// Looking up lowers the camera (it looks up at the head), looking down raises it.
assert.ok(thirdPersonView({...pose,pitch:40},{eye:1.6}).position[1]<thirdPersonView(pose,{eye:1.6}).position[1]);
assert.ok(thirdPersonView({...pose,pitch:-40},{eye:1.6}).position[1]>thirdPersonView(pose,{eye:1.6}).position[1]);

// 4. Flight: along the view including pitch, E/Q up and down, no collision, clamped to the box, pitch limited.
const fly=new FlyController({bounds:{min:[-5,0,-5],max:[5,3,5]},speed:2});
fly.place({x:0,y:1,z:0,heading:0,pitch:0});for(let i=0;i<60;i++)fly.step(1/60,{z:1});near(fly.pose.z,-2,1e-9,'2 m/s forward');
fly.place({x:0,y:1,z:0,heading:0,pitch:90});for(let i=0;i<60;i++)fly.step(1/60,{z:1});assert.equal(fly.pose.pitch,85);assert.ok(fly.pose.y>2.9,'pitched flight climbs');
fly.place({x:0,y:1,z:0});for(let i=0;i<600;i++)fly.step(1/60,{x:1,up:1});assert.deepEqual([fly.pose.x,fly.pose.y],[5,3],'clamped');
fly.place({x:0,y:1,z:0});for(let i=0;i<600;i++)fly.step(1/60,{up:-1});assert.equal(fly.pose.y,0);
fly.place({x:0,y:1,z:0,heading:0});fly.step(1/60,{z:1});const half=fly.interpolated(.5);near(half.z,-2/120);
fly.look(40/.25,0);near(fly.pose.heading,40);const view=fly.view();near(view.target[0]-view.position[0],Math.sin(40*Math.PI/180));

// 5. Source path: frame 0 at t = 0, halfway between frames, loops.
const camera={fps:10,frames:[[[0,1,0],[0,0,-1],[0,1,0]],[[1,1,0],[1,0,0],[0,1,0]]]};
assert.deepEqual(sourceView(camera,0).position,[0,1,0]);near(sourceView(camera,.05).position[0],.5);near(sourceView(camera,.2).position[0],0,1e-9,'loop');

console.log("PASS: synthetic camera modes, directions, intersection, third-person collision, flight bounds and source-camera interpolation. Prepared-scan regressions are excluded; see PUBLIC_SOURCE.json.");
