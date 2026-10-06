import assert from 'node:assert/strict';
import {demoDocument,validateDocument,copy,copyKeepingImage,History,HISTORY_LIMIT} from '../dist/map-studio/model.js';

// A realistic 4 MiB map image is ~5.6 MB as a data URL; a shorter one keeps the test fast while staying unique.
const image=(name,fill)=>({name,dataUrl:'data:image/png;base64,'+fill.repeat(200_000)});
const withImage=(doc,img)=>({...copy(doc),map:{...doc.map,image:img&&{...img}}});
const edit=(doc,height)=>{const next=copy(doc);next.points[0].height=height;return next;};
const imageBytes=history=>[...history.images.values()].reduce((sum,entry)=>sum+entry.dataUrl.length,0);
const retainsDataUrl=history=>[...history.past,...history.future].some(entry=>JSON.stringify(entry).includes('data:image'));

// 1. API unchanged: record/undo/redo round-trip whole documents, including the image.
{
  const history=new History(),a=withImage(demoDocument(),image('campus.png','A')),b=edit(a,25);
  assert.equal(history.record(a,b),true);
  assert.deepEqual(history.undo(b),a);
  assert.deepEqual(history.redo(a),b);
  assert.equal(history.record(b,copy(b)),false,'unchanged document is not recorded');
}

// 2. Many edits with the same image keep exactly one copy of it; entries hold no data URL.
{
  const history=new History();let doc=withImage(demoDocument(),image('campus.png','A'));
  for(let i=1;i<=HISTORY_LIMIT+10;i++){const next=edit(doc,i);assert.ok(history.record(doc,next));doc=next;}
  assert.equal(history.past.length,HISTORY_LIMIT,'limit still applies');
  assert.equal(history.images.size,1);assert.equal(imageBytes(history),doc.map.image.dataUrl.length);
  assert.equal(retainsDataUrl(history),false);
  for(let i=0;i<HISTORY_LIMIT;i++)doc=history.undo(doc);
  assert.equal(doc.map.image.dataUrl,image('campus.png','A').dataUrl,'image survives the full undo chain');
  assert.equal(history.undo(doc),null);
}

// 3. Image changes and removal are undoable; images no longer reachable are released.
{
  const history=new History(),base=demoDocument();
  const a=withImage(base,image('a.png','A')),b=withImage(base,image('b.png','B')),none=withImage(base,null);
  history.record(a,b);history.record(b,none);
  assert.equal(history.images.size,2);
  let doc=history.undo(none);assert.equal(doc.map.image.name,'b.png');assert.equal(doc.map.image.dataUrl,b.map.image.dataUrl);
  doc=history.undo(doc);assert.equal(doc.map.image.name,'a.png');
  doc=history.redo(doc);doc=history.redo(doc);assert.equal(doc.map.image,null);
  history.record(doc,edit(doc,99));
  assert.equal(history.future.length,0,'a new edit clears redo');
  // a.png and b.png are still reachable through past entries.
  assert.equal(history.images.size,2);
  let current=edit(doc,99);
  for(let i=0;i<HISTORY_LIMIT+2;i++){const next=edit(current,i);history.record(current,next);current=next;}
  assert.equal(history.images.size,0,'images dropped from the history are released');
}

// 4. Same image content under a new name is a different image entry but shares no stale state.
{
  const history=new History(),a=withImage(demoDocument(),image('a.png','A')),renamed=withImage(a,{...a.map.image,name:'umbenannt.png'});
  assert.ok(history.record(a,renamed));
  assert.equal(history.undo(renamed).map.image.name,'a.png');
  assert.equal(history.images.size,1,'identical pixels are stored once, names live in the entry');
}

// 5. Returned documents cannot change the history: they are validated and frozen (attempts throw), and an edited
// copy of them leaves the stored entries untouched.
{
  const history=new History(),a=withImage(demoDocument(),image('a.png','A')),b=edit(a,30);
  history.record(a,b);const undone=history.undo(b);
  assert.throws(()=>{undone.points[0].name='verändert';},TypeError);assert.throws(()=>{undone.map.image.name='x';},TypeError);
  const copyOfUndone={...undone,points:[{...undone.points[0],name:'verändert'},...undone.points.slice(1)]};assert.equal(copyOfUndone.points[0].name,'verändert');
  const again=history.redo(a);assert.equal(again.points[0].height,30);
  assert.equal(history.undo(again).points[0].name,a.points[0].name);
}

// 6. Editing copies share the (never mutated) image instead of cloning megabytes, everything else is deep.
{
  const doc=withImage(demoDocument(),image('a.png','A')),draft=copyKeepingImage(doc);
  assert.equal(draft.map.image,doc.map.image);assert.deepEqual(draft,doc);
  draft.points[0].data.Neu='x';draft.map.width=99;draft.points.pop();
  assert.equal(doc.points[0].data.Neu,undefined);assert.notEqual(doc.map.width,99);assert.equal(doc.points.length,5);
  const plain=copyKeepingImage(demoDocument());assert.equal(plain.map.image,null);
}

// 7. The image object is frozen by validation, so sharing it between doc, drafts and history is safe.
{
  const doc=validateDocument(withImage(demoDocument(),image('a.png','A')));
  assert.ok(Object.isFrozen(doc.map.image));assert.throws(()=>{doc.map.image.name='x';},TypeError);
  assert.equal(validateDocument(demoDocument()).map.image,null);
}

// 8. After undo releases an image, redo and new edits pack it again under a fresh reference.
{
  const history=new History(),a=withImage(demoDocument(),null),b=withImage(a,image('b.png','B'));
  history.record(a,b);let doc=history.undo(b);
  assert.equal(doc.map.image,null);assert.equal(history.images.size,1,'kept for redo');
  doc=history.redo(doc);assert.equal(doc.map.image.dataUrl,b.map.image.dataUrl);
  assert.equal(history.images.size,0,'the current document\'s image is not kept by the history');
  assert.ok(history.record(doc,edit(doc,42)));assert.equal(history.images.size,1);
  assert.equal(history.undo(edit(doc,42)).map.image.name,'b.png');
  assert.equal(history.record(b,withImage(b,{...b.map.image})),false,'same image under the same name is no change');
}

console.log('PASS: map history keeps one copy per image, releases unreachable images, round-trips documents and keeps the 35-step limit.');
