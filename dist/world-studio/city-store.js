// The uploaded world (a Map Studio project) is kept on this device in IndexedDB — it can be several MB with a
// map image, more than localStorage allows.
const DB_NAME='motionspec-world-city-v1',STORE='worlds',KEY='uploaded';
function open(){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>request.result.createObjectStore(STORE);
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
    request.onblocked=()=>reject(new Error('Device storage is blocked by another tab.'));
  });
}
async function run(mode,action){
  const db=await open();
  try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,mode),result=action(tx.objectStore(STORE));tx.oncomplete=()=>resolve(result?.result??null);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
  finally{db.close();}
}
export const loadCity=()=>run('readonly',store=>store.get(KEY));
export const saveCity=document=>run('readwrite',store=>{store.put(document,KEY);});
export const removeCity=()=>run('readwrite',store=>{store.delete(KEY);});
