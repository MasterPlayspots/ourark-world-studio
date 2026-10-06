// City layer (M04 from the visuals measurement plan): editing the selected point must not rebuild the tile it sits in —
// it is drawn on its own. Deselecting, moving to another tile and editing unselected points still update the tiles.
import assert from 'node:assert/strict';
import * as THREE from '../dist/worlds/vendor/three.module.js';
import {CityLayer} from '../dist/runtime/city-layer.js';
import {validateDocument,newPoint,SCHEMA} from '../dist/map-studio/model.js';

const points=Array.from({length:400},(_,i)=>({...newPoint(i),id:`p${i}`,x:(i%20)*45-450,z:Math.floor(i/20)*45-450,width:6,depth:6,height:6}));
let doc=validateDocument({schema:SCHEMA,name:'Kacheln',map:{width:1000,depth:1000,color:'#1c1c1c',image:null},runtime:{spawn:null},points});
const layer=new CityLayer(new THREE.Scene()),rebuilt=[];
const original=layer.rebuildTiles.bind(layer);layer.rebuildTiles=keys=>{rebuilt.push([...keys]);return original(keys);};
const edit=(id,change)=>{doc={...doc,points:doc.points.map(p=>p.id===id?{...p,...change}:p)};};
const step=(selection)=>{rebuilt.length=0;layer.sync(doc,selection);return rebuilt.flat();};
const tileOf=id=>layer.tileOf.get(id);

step(null);assert.ok(layer.tiles.size>1,'several tiles');
const sel='p210',home=tileOf(sel);
assert.deepEqual(step(sel).sort(),[home],'selecting takes the point out of its tile once');
// 1. Height and position edits of the selected point rebuild no tile (before the fix: its tile every time).
edit(sel,{height:20});assert.deepEqual(step(sel),[],'height edit: no tile rebuild');
edit(sel,{x:doc.points.find(p=>p.id===sel).x+1});assert.deepEqual(step(sel),[],'move inside the tile: no tile rebuild');
assert.equal(layer.items.get(sel).parent,layer.parent,'selected point still drawn on its own');
// 2. Moved into another tile while selected: still nothing; on deselect it joins the new tile (and the old one is redone).
edit(sel,{x:400,z:400});assert.deepEqual(step(sel),[],'move across tiles while selected: no rebuild yet');
const target=tileOf(sel);assert.notEqual(target,home);
assert.deepEqual(step(null),[target],'deselect: only the new tile (the old one has not contained it since selection)');
// Every visible point is drawn exactly once: as the live item or inside exactly one tile (counted by box vertices).
const perBox=(()=>{const one=new CityLayer(new THREE.Scene());one.sync({...doc,points:[doc.points[0]]},null);return [...one.tiles.values()][0].children[0].geometry.attributes.position.count;})();
const drawnBoxes=()=>[...layer.tiles.values()].reduce((n,t)=>n+t.children[0].geometry.attributes.position.count/perBox,0);
assert.equal(drawnBoxes(),doc.points.length,'all points in tiles after deselect, none twice');
assert.equal(layer.items.get(sel).parent,null,'deselected point is no longer drawn on its own');
// 3. Editing an unselected point still rebuilds exactly its tile.
assert.deepEqual(step(sel),[target],'select again');
edit('p5',{height:30});assert.deepEqual(step(sel),[tileOf('p5')],'unselected edit: its tile');
// 4. Changing the selection redoes both tiles (unchanged behaviour).
assert.deepEqual(step('p5').sort(),[target,tileOf('p5')].sort(),'selection change: both tiles');
assert.equal(drawnBoxes(),doc.points.length-1,'selected point drawn on its own, all others in tiles');
// 5. Review finding: resizing the map (new tile size) while a point is selected must not leave stale tiles —
// map 3000 m (tiles 500 m) → 4800 m (tiles 800 m); P and the selected L shared tile '1,1' before.
{
  let d=validateDocument({schema:SCHEMA,name:'Resize',map:{width:3000,depth:3000,color:'#1c1c1c',image:null},runtime:{spawn:null},
    points:[['P',700,700],['L',900,900],['Q',-900,-900],['R',100,-1200]].map(([id,x,z])=>({...newPoint(1),id,x,z,width:6,depth:6,height:6}))});
  const l=new CityLayer(new THREE.Scene()),boxes=()=>[...l.tiles.values()].reduce((n,t)=>n+t.children[0].geometry.attributes.position.count/perBox,0);
  l.sync(d,null);l.sync(d,'L');assert.equal(boxes(),3);
  d={...d,map:{...d.map,width:4800,depth:4800}};l.sync(d,'L');assert.equal(boxes(),3,'resize while selected: every other point exactly once');
  d={...d,points:d.points.filter(p=>p.id!=='P')};l.sync(d,'L');assert.equal(boxes(),2,'no ghost after deleting a point');
  l.sync(d,null);assert.equal(boxes(),3,'deselect after resize: all once');
  d={...d,points:d.points.map(p=>p.id==='L'?{...p,visible:false}:p)};l.sync(d,'L');assert.equal(boxes(),2,'hidden selected point not in a tile');
  d={...d,points:d.points.map(p=>p.id==='L'?{...p,visible:true}:p)};l.sync(d,null);assert.equal(boxes(),3,'shown again and deselected: back in its tile');
}
console.log('PASS: city layer — editing or moving the selected point rebuilds no tile; deselect, cross-tile moves, unselected edits and selection changes still update the right tiles.');
