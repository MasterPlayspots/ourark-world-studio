// Hud — writes HUD text and visibility to the DOM only when the shown value changes, and live values at most
// `rateHz` times per second (ADR 0006, Welle P1). Writing textContent every frame costs main-thread work and style
// invalidation even when the text is the same. Pure logic around a tiny element interface ({textContent, hidden}),
// so it runs in tests without a DOM (tests/hud.test.mjs).

export const HUD_RATE_HZ=10;

export class Hud {
  // elements: {name: element}; clock: () => ms.
  constructor(elements,{rateHz=HUD_RATE_HZ,clock=()=>performance.now()}={}){
    this.elements=elements;this.interval=1000/rateHz;this.clock=clock;
    this.shown=new Map();this.visible=new Map();this.pending=new Map();this.lastFlush=-Infinity;this.writes=0;
  }
  // Event values (lap, mode, banner): written now, if different from what is shown.
  text(name,value){this.pending.delete(name);this.write(name,value);}
  // Live values (speed, time, height): collected and written at the HUD rate. A changed value is never dropped,
  // only delayed until the next tick; flush() forces it out (e.g. at the finish line).
  live(name,value){this.pending.set(name,value);if(this.clock()-this.lastFlush>=this.interval)this.flush();}
  flush(){this.lastFlush=this.clock();for(const [name,value] of this.pending)this.write(name,value);this.pending.clear();}
  show(name,visible){
    const el=this.elements[name];if(!el||this.visible.get(name)===visible)return;
    this.visible.set(name,visible);el.hidden=!visible;this.writes++;
  }
  write(name,value){
    const el=this.elements[name],text=String(value);if(!el||this.shown.get(name)===text)return;
    this.shown.set(name,text);el.textContent=text;this.writes++;
  }
  // After someone else wrote to an element directly: forget the cached value so the next write goes through.
  forget(name){this.shown.delete(name);this.visible.delete(name);this.pending.delete(name);}
}
