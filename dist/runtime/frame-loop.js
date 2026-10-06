// FrameLoop — the one fixed-step simulation/render loop of the runtime (ADR 0006, Welle P1).
// simulate(step) runs at a fixed rate; render(dt, alpha, now) once per animation frame, alpha = leftover/step for
// interpolation. A long gap (tab switch, debugger) is clamped to maxFrame and the backlog is capped at maxSteps,
// so the simulation never spirals. While the document is hidden the loop stops and the clock is reset on return,
// so coming back does not replay the time away. Pure logic with an injectable clock (tests/frame-loop.test.mjs).

const browserClock=()=>({now:()=>performance.now(),raf:fn=>requestAnimationFrame(fn),caf:id=>cancelAnimationFrame(id)});

export class FrameLoop {
  constructor({step=1/60,maxFrame=.25,maxSteps=Math.ceil(.25/step),simulate=()=>{},render=()=>{},onError=null,clock=browserClock(),document:doc=globalThis.document}={}){
    Object.assign(this,{step,maxFrame,maxSteps,simulate,render,onError,clock,doc});
    this.running=false;this.paused=false;this.frameId=0;this.last=0;this.accumulator=0;this.steps=0;
    this.frame=this.frame.bind(this);
    this.visibility=()=>{if(this.doc.hidden)this.halt();else if(this.running&&!this.paused)this.schedule();};
  }
  start(){
    if(this.running)return;this.running=true;this.paused=false;
    this.doc?.addEventListener?.('visibilitychange',this.visibility);
    if(!this.doc?.hidden)this.schedule();
  }
  stop(){
    if(!this.running)return;this.running=false;this.halt();
    this.doc?.removeEventListener?.('visibilitychange',this.visibility);
  }
  // Pause keeps the loop registered but stops simulating and rendering (resume() continues without a jump).
  pause(){if(!this.running||this.paused)return;this.paused=true;this.halt();}
  resume(){if(!this.running||!this.paused)return;this.paused=false;if(!this.doc?.hidden)this.schedule();}
  schedule(){this.halt();this.last=this.clock.now();this.accumulator=0;this.frameId=this.clock.raf(this.frame);}
  halt(){if(this.frameId)this.clock.caf(this.frameId);this.frameId=0;}
  frame(now){
    this.frameId=0;if(!this.running||this.paused)return;
    const dt=Math.min(this.maxFrame,Math.max(0,(now-this.last)/1000));this.last=now;this.accumulator+=dt;
    try{
      let steps=0;
      while(this.accumulator>=this.step&&steps<this.maxSteps){this.simulate(this.step);this.accumulator-=this.step;steps++;}
      if(steps===this.maxSteps&&this.accumulator>=this.step)this.accumulator=0; // drop the backlog instead of spiralling
      this.steps+=steps;
      this.render(dt,this.accumulator/this.step,now);
    }catch(error){
      if(!this.onError)throw error;
      this.stop();this.onError(error);return;
    }
    if(this.running&&!this.paused&&!this.frameId)this.frameId=this.clock.raf(this.frame);
  }
}
