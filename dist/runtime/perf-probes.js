// Measurement probes (W3): pages register small read-only functions; the perf meter (perf-meter.js) adds their
// values to every recorded sample, so a log carries backend, quality and transfer numbers next to frame times.
// A shared registry on globalThis, because the meter and the page are loaded as separate module scripts.
const registry=globalThis.__ourarkPerfProbes??=new Map();
/** name → () => plain JSON-able object (or null). Returns an unregister function. */
export function registerPerfProbe(name,read){registry.set(name,read);return ()=>{if(registry.get(name)===read)registry.delete(name);};}
/** All probe values; a failing probe reports its error instead of breaking the sample. */
export function readPerfProbes(){
  if(!registry.size)return null;
  const out={};
  for(const [name,read] of registry){try{out[name]=read()??null;}catch(error){out[name]={error:String(error?.message??error)};}}
  return out;
}
