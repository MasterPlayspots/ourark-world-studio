// Walk mode wiring shared by the studios (Map Studio, World Studio): session, input, walker, pointer look,
// fullscreen, adaptive resolution, HUD and the inspect panel. Each studio supplies only what differs:
// how to prepare a world from its document, how to describe a target, its texts and its editor regions.
// Expects the HUD markup with the ids used below (runtime-*, walk-enter, stage, canvas).
import {RuntimeSession} from './session.js';
import {InputRouter} from './input.js';
import {Walker,interactionTarget} from './walker.js';
import {FrameStats,AdaptiveResolution,runtimePixelRatio} from './quality.js';
import {CAMERA_MODES,FlyController,thirdPersonView,sourceView} from './camera-rig.js';

// Touch walking: a thumb stick on the left part of the canvas; full deflection at STICK_RADIUS CSS pixels.
export const STICK_SHARE=.4,STICK_RADIUS=50;

export const LABELS_DE={
  loading:'Welt wird vorbereitet …',playing:'Aktiv · unterwegs',paused:'Pausiert',
  pauseEscape:'Mit Escape pausiert.',pauseButton:'Pausiert.',pauseHidden:'Der Tab war im Hintergrund.',pauseBlur:'Das Fenster hat den Fokus verloren.',pauseFullscreen:'Vollbild verlassen.',
  canvas:'Begehbare Welt. Escape pausiert, Zurück zum Editor beendet den Begehmodus.',hint:name=>`Enter: „${name}“ untersuchen`,
  failed:message=>`Welt konnte nicht betreten werden: ${message} Der Editor und der Export bleiben nutzbar.`,
  unavailable:'Die 3D-Grafik ist nicht verfügbar.',fault:'Simulierter Startfehler (Testmodus).',decimal:',',
  views:{first:'Ich-Sicht',third:'Verfolger',fly:'Flug',source:'Originalkamera'}
};
export const LABELS_EN={
  loading:'Preparing the world …',playing:'Active · exploring',paused:'Paused',
  pauseEscape:'Paused with Escape.',pauseButton:'Paused.',pauseHidden:'The tab was in the background.',pauseBlur:'The window lost focus.',pauseFullscreen:'Left fullscreen.',
  canvas:'Walkable world. Escape pauses, Back to editor ends the walk.',hint:name=>`Enter: inspect “${name}”`,
  failed:message=>`Could not enter the world: ${message} The editor and export remain available.`,
  unavailable:'3D graphics are not available.',fault:'Simulated start failure (test mode).',decimal:'.',
  views:{first:'First person',third:'Third person',fly:'Fly',source:'Source camera'}
};

// prepare(snapshot) → {start, physics, colliders, targets, targetOptions?, speed?, eye?,
//   modes?, area?, ceilingY?, flyBounds?, camera?, scale?}  — modes (camera-rig.js) need renderer.placeView.
// describe(target) → {type, name, entries:[[label, value]]}
// onFrame(dt, scale): every measured frame interval while playing and the render scale after it (device check, W8).
export function createWalkMode({$,getRenderer,getDocument,prepare,describe,editorRegions,labels=LABELS_DE,notice,beforeEnter=()=>true,onEditing=()=>{},onFrame=()=>{}}){
  const canvas=$('canvas'),stage=$('stage'),canvasLabel=canvas.getAttribute('aria-label');
  // Development aid: `?colliders` in the URL outlines every collider while walking (not linked anywhere in the UI).
  const debugColliders=new URLSearchParams(location.search).has('colliders');
  const number=(value,digits=1)=>value.toFixed(digits).replace('.',labels.decimal);
  let activeWorld=null,infoOpen=null,lastHint='',lastPosition='',lookPointer=null,view='first',sourceTime=0,stick=null;
  const targetOf=world=>view==='first'||view==='third'?interactionTarget(world.targets,world.walker.pose,world.targetOptions):null;
  const modesOf=world=>world?.modes?.filter(m=>CAMERA_MODES.includes(m))??['first'];
  // Camera modes (W4). Leaving flight or the source path lands the walker on the nearest free place below.
  function setView(mode){
    const world=activeWorld;if(!world||!modesOf(world).includes(mode)||mode===view||session.state!=='playing')return;
    const from=view==='fly'?world.fly.pose:view==='source'?(([x,y,z])=>({x,y,z}))(sourceView(world.camera,sourceTime).position):null;
    if(mode==='fly'){const p=world.walker.pose,start=from??{x:p.x,y:world.eye,z:p.z};world.fly.place({...start,heading:view==='fly'?world.fly.pose.heading:p.heading,pitch:p.pitch});}
    if(mode==='source')sourceTime=0;
    if((mode==='first'||mode==='third')&&from){const spot=world.physics.findSpawn({x:from.x,z:from.z});if(spot)world.walker.place({...spot,heading:view==='fly'?world.fly.pose.heading:world.walker.pose.heading});}
    view=mode;closeInfo();syncModes(world);lastPosition='';updateHud(world);
  }
  function syncModes(world){
    const group=$('runtime-modes');if(!group)return;const modes=modesOf(world);group.hidden=!world||modes.length<2;
    for(const button of group.querySelectorAll('[data-view]')){button.hidden=!modes.includes(button.dataset.view);button.setAttribute('aria-pressed',String(button.dataset.view===view));}
  }

  function closeInfo(){infoOpen=null;$('runtime-info').hidden=true;}
  // The inspect panel shows text only, never HTML from data.
  function openInfo(target){
    const {type,name,entries}=describe(target);infoOpen=target.id;
    $('runtime-info-type').textContent=type;$('runtime-info-name').textContent=name;
    const list=$('runtime-info-data');list.replaceChildren();
    for(const [key,value] of entries){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=key;dd.textContent=typeof value==='string'?value:JSON.stringify(value);list.append(dt,dd);}
    $('runtime-info-empty').hidden=entries.length>0;$('runtime-info').hidden=false;
  }
  function command(name){
    if(name==='pause'){session.pause(labels.pauseEscape);return;}
    const world=activeWorld;if(!world||session.state!=='playing')return;
    if(/^view[1-4]$/.test(name)){setView(CAMERA_MODES[Number(name[4])-1]);return;}
    if(name==='reset'){world.walker.reset();if(view==='fly'){const p=world.walker.pose;world.fly.place({x:p.x,y:world.eye,z:p.z,heading:p.heading});}if(view==='source')sourceTime=0;closeInfo();}
    if(name==='interact'){const target=targetOf(world);if(target&&infoOpen!==target.id)openInfo(target);else closeInfo();}
  }
  // Pointer drag looks around while walking (no pointer lock, so no browser prompt); added and removed with the walk.
  // Touch: a finger landing on the left part of the canvas becomes the thumb stick (walk), any other finger looks.
  const showStick=(x,y,dx=0,dy=0)=>{const el=$('runtime-stick');if(!el)return;const rect=canvas.getBoundingClientRect();el.hidden=false;el.style.left=`${x-rect.left}px`;el.style.top=`${y-rect.top}px`;el.style.setProperty('--dx',`${dx}px`);el.style.setProperty('--dy',`${dy}px`);};
  const endStick=id=>{if(stick&&(id===undefined||stick.id===id)){stick=null;const el=$('runtime-stick');if(el)el.hidden=true;}};
  const turnView=(dx,dy)=>{if(!activeWorld||view==='source')return;(view==='fly'?activeWorld.fly:activeWorld.walker).look(dx,dy);};
  const look={
    pointerdown:e=>{
      if(session.state!=='playing'||e.button!==0)return;
      const rect=canvas.getBoundingClientRect();
      if(e.pointerType==='touch'&&!stick&&e.clientX<rect.left+rect.width*STICK_SHARE){stick={id:e.pointerId,x0:e.clientX,y0:e.clientY,x:0,z:0};canvas.setPointerCapture?.(e.pointerId);showStick(e.clientX,e.clientY);return;}
      if(lookPointer)return;lookPointer={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture?.(e.pointerId);
    },
    pointermove:e=>{
      if(session.state!=='playing'){lookPointer=null;endStick();return;}
      if(stick&&e.pointerId===stick.id){const dx=e.clientX-stick.x0,dy=e.clientY-stick.y0,length=Math.hypot(dx,dy),k=length>STICK_RADIUS?STICK_RADIUS/length:1;stick.x=dx*k/STICK_RADIUS;stick.z=-dy*k/STICK_RADIUS;showStick(stick.x0,stick.y0,dx*k,dy*k);return;}
      if(!lookPointer||e.pointerId!==lookPointer.id||!activeWorld)return;turnView(e.clientX-lookPointer.x,e.clientY-lookPointer.y);lookPointer.x=e.clientX;lookPointer.y=e.clientY;
    },
    pointerup:e=>{endStick(e.pointerId);if(lookPointer?.id===e.pointerId)lookPointer=null;},pointercancel:e=>{endStick(e.pointerId);if(lookPointer?.id===e.pointerId)lookPointer=null;},
    lostpointercapture:e=>{endStick(e.pointerId);if(lookPointer?.id===e.pointerId)lookPointer=null;}
  };
  // Keyboard and thumb stick together, still within −1…1 per axis.
  const intent=()=>{const k=input.axes(),x=Math.max(-1,Math.min(1,k.x+(stick?.x??0))),z=Math.max(-1,Math.min(1,k.z+(stick?.z??0)));return {x,z};};
  const turnIntent=()=>(input.isDown('turnRight')?1:0)-(input.isDown('turnLeft')?1:0);
  function simulate(dt,world){
    if(view==='fly'){world.fly.step(dt,{...intent(),up:(input.isDown('turnRight')?1:0)-(input.isDown('turnLeft')||input.isDown('down')?1:0)});return;}
    if(view==='source'){sourceTime+=dt;return;}
    return world.walker.step(dt,{...intent(),turn:turnIntent()});
  }
  function viewFor(world,alpha){
    if(view==='fly')return world.fly.view(session.state==='playing'?world.fly.interpolated(alpha):world.fly.pose);
    if(view==='source')return sourceView(world.camera,sourceTime);
    const pose=session.state==='playing'?world.walker.interpolated(alpha):world.walker.pose;
    return {...thirdPersonView(pose,{eye:world.eye,colliders:world.colliders,area:world.area,ceilingY:world.ceilingY??Infinity,scale:world.scale??1}),avatar:{...pose,groundY:world.groundY??0,eye:world.eye}};
  }
  // Frame budget: every rendered frame while playing feeds the adaptive resolution (60 fps target).
  const frameStats=new FrameStats(120);let adaptive=null,lastFrameAt=0,perfShownAt=0;
  function startPerformance(){adaptive=new AdaptiveResolution({max:runtimePixelRatio(globalThis.devicePixelRatio)});frameStats.clear();lastFrameAt=0;perfShownAt=0;getRenderer().setRenderScale(adaptive.scale);$('runtime-perf').textContent='';}
  function trackFrame(){
    const renderer=getRenderer();
    if(session.state!=='playing'||!adaptive){lastFrameAt=0;return;}
    // Test hook: simulated GPU-bound frames; the cost scales with the pixel count like real fill-rate load.
    const load=(Number(globalThis.__MOTIONSPEC_FRAME_LOAD_MS__)||0)*(renderer.renderScale/2)**2;if(load>0){const until=performance.now()+load;while(performance.now()<until);}
    const now=performance.now();
    if(lastFrameAt){const dt=now-lastFrameAt;frameStats.push(dt);const scale=adaptive.feed(dt,now);if(scale!==renderer.renderScale)renderer.setRenderScale(scale);onFrame(dt,renderer.renderScale);}
    lastFrameAt=now;
    if(now-perfShownAt>500&&frameStats.values.length>10){perfShownAt=now;$('runtime-perf').textContent=`${Math.round(frameStats.fps())} fps · p95 ${number(frameStats.p95())} ms · ${String(renderer.renderScale).replace('.',labels.decimal)}×`;}
  }
  // Fullscreen is requested inside the click (browsers require that). The request resolves asynchronously:
  // if the walk already ended (e.g. a failed start), a late grant is undone. Leaving fullscreen pauses the walk.
  // Only leaving a fullscreen this walk actually had pauses it: a late "left fullscreen" from an earlier, failed
  // start (its grant undone above) must not pause the next walk.
  let wantFullscreen=false,inFullscreen=false;
  function enterFullscreen(){wantFullscreen=true;if(!document.fullscreenElement&&stage.requestFullscreen)stage.requestFullscreen({navigationUI:'hide'}).catch(()=>{});}
  function leaveFullscreen(){wantFullscreen=false;if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});}
  document.addEventListener('fullscreenchange',()=>{
    const active=Boolean(document.fullscreenElement);$('runtime-fullscreen').setAttribute('aria-pressed',String(active));
    if(active&&(!wantFullscreen||session.state==='editing')){document.exitFullscreen().catch(()=>{});return;}
    if(active){inFullscreen=true;return;}
    const was=inFullscreen;inFullscreen=false;
    if(was){wantFullscreen=false;if(session.state==='playing')session.pause(labels.pauseFullscreen);}
    if(!active&&session.state==='editing'&&(document.activeElement===document.body||!document.activeElement))$('walk-enter').focus();
  });
  function updateHud(world){
    const pose=view==='fly'?world.fly.pose:world.walker.pose;
    const position=`X ${pose.x.toFixed(1)} · Z ${pose.z.toFixed(1)} · ${Math.round((pose.heading+360)%360)%360}°${view==='fly'?` · Y ${pose.y.toFixed(1)}`:''}${modesOf(world).length>1?` · ${labels.views[view]}`:''}`;
    if(position!==lastPosition){lastPosition=position;$('runtime-position').textContent=position;}
    if(infoOpen&&targetOf(world)?.id!==infoOpen)closeInfo();
    const target=infoOpen?null:targetOf(world),hint=target?labels.hint(describe(target).name):'';
    if(hint!==lastHint){lastHint=hint;$('runtime-hint').textContent=hint;$('runtime-hint').hidden=!hint;}
  }
  const input=new InputRouter({onCommand:command,onFocusLoss:reason=>session.pause(reason==='hidden'?labels.pauseHidden:labels.pauseBlur)});
  const session=new RuntimeSession({
    host:{
      async prepare(snapshot){
        if(!getRenderer())throw new Error(labels.unavailable);
        if(globalThis.__MOTIONSPEC_RUNTIME_FAULT__==='prepare')throw new Error(labels.fault);
        const world=await prepare(snapshot),renderer=getRenderer();
        // Extra camera modes only where the world offers them and the renderer can place a free view.
        const modes=['first',...(renderer.placeView?(world.modes??[]).filter(m=>m!=='first'&&CAMERA_MODES.includes(m)&&(m!=='source'||world.camera?.frames?.length)&&(m!=='fly'||world.flyBounds)):[])];
        return {...world,modes,walker:new Walker({physics:world.physics,start:world.start,speed:world.speed}),fly:world.flyBounds?new FlyController({bounds:world.flyBounds,speed:world.flySpeed,physics:world.flyPhysics}):null};
      },
      activate(world){
        const renderer=getRenderer();activeWorld=world;view='first';sourceTime=0;renderer.enterRuntime(world.start,world.eye);startPerformance();syncModes(world);
        if(debugColliders)renderer.showColliders(world.colliders,world.groundY);
        for(const [type,fn] of Object.entries(look))canvas.addEventListener(type,fn);
        updateHud(world);input.activate();canvas.setAttribute('aria-label',labels.canvas);canvas.focus({preventScroll:true});
      },
      // While paused the session renders once with alpha 0; show the current pose then, not the previous step.
      render(alpha){
        trackFrame();const renderer=getRenderer(),world=activeWorld;
        if(world){
          if(view==='first'||!renderer.placeView)renderer.placePlayer(session.state==='playing'?world.walker.interpolated(alpha):world.walker.pose,world.eye);
          else renderer.placeView(viewFor(world,alpha));
          updateHud(world);
        }
        renderer.draw();
      },
      teardown(){
        leaveFullscreen();adaptive=null;for(const [type,fn] of Object.entries(look))canvas.removeEventListener(type,fn);
        lookPointer=null;endStick();view='first';sourceTime=0;syncModes(null);closeInfo();lastHint='';lastPosition='';$('runtime-hint').hidden=true;
        activeWorld?.physics.dispose();activeWorld?.flyPhysics?.dispose?.();activeWorld=null;input.deactivate();getRenderer()?.exitRuntime();canvas.setAttribute('aria-label',canvasLabel);
      }
    },
    onState:state=>{
      input.clear();
      const active=state!=='editing';
      for(const region of editorRegions())region.inert=active;
      if(active)document.body.dataset.runtime=state;else delete document.body.dataset.runtime;
      $('runtime-hud').hidden=!active;$('runtime-paused').hidden=state!=='paused';
      if(active){$('runtime-state').textContent=labels[state];$('runtime-pause').disabled=state!=='playing';$('runtime-pause-reason').textContent=session.pauseReason??'';}
      if(state==='paused'){lookPointer=null;endStick();$('runtime-resume').focus();}
      if(state==='editing'){onEditing();getRenderer()?.request();$('walk-enter').focus();}
    },
    simulate,
    onError:error=>notice(labels.failed(error.message))
  });
  $('walk-enter').onclick=()=>{if(!beforeEnter())return;enterFullscreen();session.enter(getDocument());};
  $('runtime-fullscreen').hidden=!stage.requestFullscreen;// iPhone Safari: no element fullscreen
  $('runtime-fullscreen').onclick=()=>{if(document.fullscreenElement)leaveFullscreen();else enterFullscreen();canvas.focus({preventScroll:true});};
  $('runtime-exit').onclick=()=>session.exit();
  const modeButtons=$('runtime-modes');if(modeButtons)modeButtons.addEventListener('click',e=>{const button=e.target.closest('[data-view]');if(button){setView(button.dataset.view);canvas.focus({preventScroll:true});}});
  $('runtime-info-close').onclick=()=>{closeInfo();canvas.focus({preventScroll:true});};
  $('runtime-pause').onclick=()=>session.pause(labels.pauseButton);
  $('runtime-resume').onclick=()=>{session.resume();canvas.focus({preventScroll:true});};
  return {session,setView,view:()=>view};
}
