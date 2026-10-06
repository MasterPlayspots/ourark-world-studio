// InputRouter — while the runtime is active it is the only keyboard receiver for movement (ADR 0001).
// Physical key codes keep WASD usable on QWERTZ/AZERTY. Held actions are cleared on any focus loss.

export const BINDINGS={
  KeyW:'forward',ArrowUp:'forward',KeyS:'back',ArrowDown:'back',
  KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',
  KeyQ:'turnLeft',KeyE:'turnRight',KeyC:'down'
};
// Digit1–4 choose the camera (first, third, fly, source) where a world offers them (camera-rig.js).
export const COMMANDS={Escape:'pause',KeyR:'reset',Enter:'interact',Space:'interact',Digit1:'view1',Digit2:'view2',Digit3:'view3',Digit4:'view4'};
const EDITABLE='input,textarea,select,[contenteditable="true"],[contenteditable=""]';

export class InputRouter {
  constructor({window:win=globalThis.window,document:doc=globalThis.document,onCommand=()=>{},onFocusLoss=()=>{}}={}){
    Object.assign(this,{win,doc,onCommand,onFocusLoss});
    // held: physical key codes; down: number of held keys per action (isDown is a lookup, no allocation).
    this.held=new Set();this.down=Object.create(null);this.active=false;
    this.keydown=this.keydown.bind(this);this.keyup=this.keyup.bind(this);
    this.blur=()=>this.lose('blur');this.visibility=()=>{if(this.doc.hidden)this.lose('hidden');};
  }
  activate(){
    if(this.active)return;this.active=true;
    this.win.addEventListener('keydown',this.keydown);this.win.addEventListener('keyup',this.keyup);this.win.addEventListener('blur',this.blur);
    this.doc.addEventListener('visibilitychange',this.visibility);
  }
  deactivate(){
    if(!this.active)return;this.active=false;this.clear();
    this.win.removeEventListener('keydown',this.keydown);this.win.removeEventListener('keyup',this.keyup);this.win.removeEventListener('blur',this.blur);
    this.doc.removeEventListener('visibilitychange',this.visibility);
  }
  clear(){this.held.clear();for(const action in this.down)this.down[action]=0;}
  lose(reason){this.clear();this.onFocusLoss(reason);}
  // Called several times per simulation step.
  isDown(action){return this.down[action]>0;}
  // Normalised movement intent: x = right, z = forward; diagonals are scaled by the controller.
  axes(){return {x:(this.isDown('right')?1:0)-(this.isDown('left')?1:0),z:(this.isDown('forward')?1:0)-(this.isDown('back')?1:0)};}
  ignored(event){return event.ctrlKey||event.metaKey||event.altKey||Boolean(event.target?.closest?.(EDITABLE))||Boolean(this.doc.querySelector?.('dialog[open]'));}
  keydown(event){
    // macOS sends no keyup for other keys while ⌘ is held; drop held movement rather than let it stick.
    if(event.metaKey||event.key==='Meta'){this.clear();return;}
    if(this.ignored(event))return;
    if(BINDINGS[event.code]){event.preventDefault();if(!this.held.has(event.code)){this.held.add(event.code);const a=BINDINGS[event.code];this.down[a]=(this.down[a]||0)+1;}return;}
    const command=COMMANDS[event.code];
    // Enter/Space on a focused button keep their native meaning.
    if(!command||event.repeat||(command==='interact'&&event.target?.closest?.('button,a')))return;
    event.preventDefault();this.onCommand(command);
  }
  keyup(event){if(event.metaKey||event.key==='Meta'){this.clear();return;}if(this.held.delete(event.code)&&BINDINGS[event.code])this.down[BINDINGS[event.code]]--;}
}
