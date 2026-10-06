// Deep freezing and the "validated" mark, shared by the map model, its identity caches (size check, city layer, point
// list, history) and the walk session. A validated object is deeply frozen and passed every check once: caches may
// rely on its identity. isValidated is the test, not Object.isFrozen (which is shallow and says nothing about checks).
const DEEP=new WeakSet(),VALIDATED=new WeakSet();
/** Freezes value and everything below it (also below objects that were only frozen shallowly). */
export function deepFreeze(value){
  if(!value||typeof value!=='object'||DEEP.has(value))return value;
  Object.freeze(value);DEEP.add(value);for(const key of Object.keys(value))deepFreeze(value[key]);
  return value;
}
export const markValidated=value=>{deepFreeze(value);VALIDATED.add(value);return value;};
export const isValidated=value=>Boolean(value)&&typeof value==='object'&&VALIDATED.has(value);
// JSON text of a validated object, serialised once (V8 serialises frozen objects about twice as slowly as plain ones).
// Used by the map History (shared entry parts) and the project size check (bytes = UTF-8 of this text).
const JSON_TEXT=new WeakMap();
export function validatedJson(value){
  if(!isValidated(value))return JSON.stringify(value);
  let json=JSON_TEXT.get(value);if(json===undefined){json=JSON.stringify(value);JSON_TEXT.set(value,json);}return json;
}
