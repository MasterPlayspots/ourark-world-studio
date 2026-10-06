// watchGpuContext — WebGL context loss and restore for one canvas (Welle P1). The browser may drop the context
// (GPU reset, driver update, too many contexts, a phone reclaiming memory). preventDefault() on the loss event asks
// for a restore; three.js re-uploads its resources on the next render after `webglcontextrestored`.
// Returns a function that removes the listeners.
export function watchGpuContext(canvas,{onLost=()=>{},onRestored=()=>{}}={}){
  const lost=event=>{event.preventDefault();onLost(event);};
  const restored=event=>onRestored(event);
  canvas.addEventListener('webglcontextlost',lost);canvas.addEventListener('webglcontextrestored',restored);
  return ()=>{canvas.removeEventListener('webglcontextlost',lost);canvas.removeEventListener('webglcontextrestored',restored);};
}
