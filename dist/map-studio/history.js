import {History} from './model.js';

// Editor history tracks a whole project transaction. The existing document history retains
// its shared images/point texts; small metadata travels in the same packed entry. The
// private head field is never added to the live map payload or its exported JSON.
export class ProjectHistory extends History {
  pack({doc,meta}) {
    const entry=super.pack(doc);
    entry.head=JSON.stringify({...JSON.parse(entry.head),__projectHistoryMeta:meta});
    return entry;
  }
  unpack(entry) {
    return {doc:super.unpack(entry),meta:JSON.parse(entry.head).__projectHistoryMeta};
  }
  step(from,to,current) {
    const restored=super.step(from,to,current);
    if(!restored)return null;
    // Undo changes content, never the current world's compare-and-set save revision.
    return {...restored,meta:{...restored.meta,worldId:current.meta.worldId,revision:current.meta.revision}};
  }
}
