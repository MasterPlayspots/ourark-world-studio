// RuntimeSession — lifecycle of one walk-through of a map snapshot (ADR 0001).
// States: editing → loading → playing ↔ paused → editing. Errors always return to editing.
// The session owns the single simulation/render loop while playing (FrameLoop, shared with the kart); the editor
// renders on demand otherwise.
import {deepFreeze} from './frozen.js';
import {FrameLoop} from './frame-loop.js';

export const STEP=1/60;
const MAX_FRAME=.25,MAX_STEPS=5;

const browserClock=()=>({now:()=>performance.now(),raf:fn=>requestAnimationFrame(fn),caf:id=>cancelAnimationFrame(id)});

export class RuntimeSession {
  // host: {prepare(snapshot) → world, activate(world), render(alpha), teardown()} — teardown must be idempotent.
  constructor({host,clock=browserClock(),simulate=()=>{},onState=()=>{},onError=()=>{},step=STEP}={}){
    Object.assign(this,{host,clock,simulate,onState,onError,step});
    this.state='editing';this.snapshot=null;this.world=null;this.pauseReason=null;this.generation=0;
    // Hidden tabs are handled by the session itself (InputRouter → pause), so the loop does not watch visibility.
    this.loop=new FrameLoop({step,maxFrame:MAX_FRAME,maxSteps:MAX_STEPS,clock,document:null,
      simulate:dt=>this.simulate(dt,this.world),render:(dt,alpha)=>this.host.render(alpha),
      onError:error=>{this.exit();this.onError(error);}});
  }
  setState(state){if(this.state===state)return;this.state=state;this.onState(state);}
  // Returns true once playing; false if the start failed or was cancelled.
  async enter(document){
    if(this.state!=='editing')return false;
    const generation=++this.generation;
    this.snapshot=deepFreeze(structuredClone(document));this.setState('loading');
    try{
      const world=await this.host.prepare(this.snapshot);
      // Stale result: only clean up if no newer session has taken over the host meanwhile.
      if(generation!==this.generation){if(this.state==='editing')this.host.teardown();return false;}
      this.world=world;this.host.activate(world);
      this.setState('playing');this.startLoop();return true;
    }catch(error){
      if(generation!==this.generation)return false;
      this.cleanup();this.setState('editing');this.onError(error);return false;
    }
  }
  pause(reason=null){if(this.state!=='playing')return;this.stopLoop();this.pauseReason=reason;this.setState('paused');this.host.render?.(0);}
  resume(){if(this.state!=='paused')return;this.pauseReason=null;this.setState('playing');this.startLoop();}
  exit(){
    if(this.state==='editing')return;
    this.generation++;this.cleanup();this.setState('editing');
  }
  cleanup(){this.stopLoop();this.host.teardown();this.world=null;this.snapshot=null;this.pauseReason=null;}
  startLoop(){this.loop.stop();this.loop.start();}
  stopLoop(){this.loop.stop();}
}
