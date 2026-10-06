// Globe: the whole Earth with Cesium (Esri imagery, Re:Earth/Mapterhorn terrain, Kronach LoD2 tile, optional
// Google Photorealistic 3D Tiles) and four ways to move: travel (free camera), aeroplane, car and on foot.
// The vehicles are the pure, tested simulations (../kart/plane.js, ../kart/pedestrian.js, ./car.js); they run in
// local metres around a floating anchor (x east, z south, y = ellipsoid height) that moves with the vehicle.
import {Plane} from '../kart/plane.js';
import {Pedestrian} from '../kart/pedestrian.js';
import {Car} from './car.js';
import {InputRouter} from '../runtime/input.js';
import {decodeHeightFile,decodeBinaryFile,assetUrl,gunzip} from '../runtime/assets/codec.js';
import {buildSurface,SurfaceTiles,readSurfaceFile,utm32} from './surface.js';

const Cesium=window.Cesium;
const STEP=1/120,MAX_CATCH_UP=.25,REANCHOR=1500,GRID=1.5,HEIGHT_TTL=2000;
const IMAGERY='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const TERRAIN='https://terrain.reearth.land/cesium-mesh/ellipsoid';
// Kronach tile (World Studio kart bundle, EPSG:25832 E 665750 / N 5567950, 1 × 1 km). Centre = that UTM point in
// WGS84. Height: the GLB's y = 0 is 300 m NN; Re:Earth terrain is ellipsoidal and lies 46.9 m above the DGM1 there
// (median of 25 points, IQR 46.6–47.1 = the geoid undulation). The tile is aligned to the UTM grid, which is turned
// by the meridian convergence γ against true north: the model is rotated by −γ about the local up axis.
const GEOID=46.9;// m, Re:Earth/ellipsoid above NN in Kronach (median of 25 points); the county tiles use the same value
const KRONACH={lon:11.324506,lat:50.240442,base:300+GEOID,half:500};
// UTM extent (m) of the county surface files (scripts/geo/kronach_lk_surface.py): no requests outside it.
const COUNTY_UTM=[654000,5558000,686000,5600000];
const COUNTY_TILES='/geo/kronach-lk-2/tileset.json';
const GAMMA=Math.atan(Math.tan((KRONACH.lon-9)*Math.PI/180)*Math.sin(KRONACH.lat*Math.PI/180));
const $=id=>document.getElementById(id);
const ui={status:$('globe-status'),mode:$('globe-mode'),speed:$('globe-speed'),agl:$('globe-agl'),pos:$('globe-pos'),
  search:$('globe-search'),query:$('globe-query'),results:$('globe-results'),view:$('globe-view'),photo:$('globe-photo'),
  help:$('globe-help'),helpBtn:$('globe-help-btn'),credits:$('globe-credits'),attribution:$('globe-attribution')};
const LABEL={travel:'Reisen',plane:'Flugzeug',car:'Auto',walk:'Zu Fuß'};
const fmt=(v,d=0)=>v==null||!Number.isFinite(v)?'–':v.toLocaleString('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d});

async function main(){
  if(!Cesium){ui.status.textContent='Cesium konnte nicht geladen werden.';return;}
  ui.status.textContent='Lade Globus …';
  const config=await fetch('/api/globe-config',{cache:'no-store'}).then(r=>r.ok?r.json():{}).catch(()=>({}));
  const params=new URLSearchParams(location.search);

  /* ---------- Cesium ---------- */
  // Re:Earth throttles bursts with 429: at most 6 parallel requests there, throttled tiles retried after a pause.
  Cesium.RequestScheduler.requestsByServer['terrain.reearth.land:443']=6;
  // One shared cooldown: a 429 pauses all retries for a growing window instead of each tile hammering on its own.
  let cooldownUntil=0,strikes=0;
  const terrainResource=new Cesium.Resource({url:TERRAIN,retryAttempts:6,retryCallback:(resource,error)=>{
    if(![429,502,503].includes(error?.statusCode))return false;
    const now=performance.now();strikes=now<cooldownUntil+5000?Math.min(strikes+1,6):1;
    cooldownUntil=Math.max(cooldownUntil,now+Math.min(16000,800*2**strikes));
    return new Promise(resolve=>setTimeout(()=>resolve(true),cooldownUntil-now+Math.random()*800));
  }});
  const terrain=new Cesium.Terrain(Cesium.CesiumTerrainProvider.fromUrl(terrainResource));
  const widget=new Cesium.CesiumWidget('globe',{
    baseLayer:new Cesium.ImageryLayer(new Cesium.UrlTemplateImageryProvider({url:IMAGERY,maximumLevel:19,credit:'Esri, Maxar, Earthstar Geographics'})),
    terrain,
    creditContainer:ui.credits,msaaSamples:4,shouldAnimate:true,
    useBrowserRecommendedResolution:params.get('res')!=='native'
  });
  const scene=widget.scene,camera=widget.camera,globe=scene.globe,ellipsoid=Cesium.Ellipsoid.WGS84;
  widget.creditDisplay.addStaticCredit(new Cesium.Credit('Re:Earth/Mapterhorn (CC BY 4.0)'));
  globe.depthTestAgainstTerrain=true;globe.enableLighting=false;scene.skyAtmosphere.show=true;
  // Inside the Kronach tile the coarse world terrain can lie above our 1 m ground: Cesium then counts the camera as
  // underground and draws no sky, only the background. Make that background the sky colour.
  scene.backgroundColor=Cesium.Color.fromCssColorString('#a9c4dc');
  // Apple's Metal translator cannot link Cesium's per-vertex model atmosphere (glTF models, 3D Tiles).
  try{const gl=scene.context._gl,d=gl.getExtension('WEBGL_debug_renderer_info');if(/apple|metal/i.test(String(d?gl.getParameter(d.UNMASKED_RENDERER_WEBGL):'')))scene.fog.renderable=false;}catch{}
  // Terrain unreachable: keep going on the flat ellipsoid instead of failing the page.
  terrain.errorEvent.addEventListener(()=>{scene.terrainProvider=new Cesium.EllipsoidTerrainProvider();ui.status.textContent='Gelände nicht erreichbar – flach.';});
  camera.setView({destination:Cesium.Cartesian3.fromDegrees(KRONACH.lon,KRONACH.lat-14,14_000_000)});

  /* ---------- Kronach LoD2 tile, with the globe terrain clipped below it ---------- */
  const kronachFrame=Cesium.Matrix4.multiply(Cesium.Transforms.eastNorthUpToFixedFrame(Cesium.Cartesian3.fromDegrees(KRONACH.lon,KRONACH.lat,KRONACH.base)),
    Cesium.Matrix4.fromRotationTranslation(Cesium.Matrix3.fromRotationZ(-GAMMA)),new Cesium.Matrix4());
  const corner=(e,n)=>Cesium.Matrix4.multiplyByPoint(kronachFrame,new Cesium.Cartesian3(e,n,0),new Cesium.Cartesian3());
  let kronachModel=null,countyTiles=null;
  // Same look for the Kronach tile and the county tileset: the aerial photo unlit like the imagery around it, walls
  // (vertex colours, no texture) with a soft sun shading so the houses stay three-dimensional.
  const photoShader=()=>new Cesium.CustomShader({lightingModel:Cesium.LightingModel.UNLIT,fragmentShaderText:`
      void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material){
        #ifdef HAS_COLOR_0
        vec3 n=normalize(fsInput.attributes.normalEC);float sun=max(dot(n,normalize(czm_sunDirectionEC)),0.0);
        material.diffuse*=0.62+0.38*sun;
        #endif
      }`});
  // forwardAxis X: only Y-up → Z-up; Cesium's default (forward +Z) would turn every model by another 90°.
  Cesium.Model.fromGltfAsync({url:'/globe/models/kronach-1km.glb',modelMatrix:kronachFrame,maximumScreenSpaceError:8,forwardAxis:Cesium.Axis.X}).then(model=>{
    // The aerial photo should look like the imagery around it: no extra lighting on the photo (roofs, ground);
    // walls (vertex colours, no texture) keep a soft sun shading so the houses stay three-dimensional.
    model.customShader=photoShader();
    kronachModel=scene.primitives.add(model);if(countyTiles)kronachModel.show=false;
    // Cut the world terrain 10 m inside the tile edge: tile and terrain overlap slightly instead of leaving a seam.
    if(!countyTiles)globe.clippingPolygons=new Cesium.ClippingPolygonCollection({polygons:[new Cesium.ClippingPolygon({positions:[corner(-490,-490),corner(490,-490),corner(490,490),corner(-490,490)]})]});
  }).catch(error=>console.warn('Kronach tile:',error));
  const kronachPoint=(x,z,nn)=>Cesium.Matrix4.multiplyByPoint(kronachFrame,new Cesium.Cartesian3(x,-z,nn-300),new Cesium.Cartesian3());
  // Skirt: a wall from the tile's edge 120 m down hides the gap to the coarser world terrain around it.
  let skirt=null;
  fetch('/globe/models/kronach-edge.json').then(r=>r.json()).then(edge=>{
    const top=edge.points.map(([x,z,nn])=>kronachPoint(x,z,nn)),heights=top.map(p=>Cesium.Cartographic.fromCartesian(p).height);
    skirt=scene.primitives.add(new Cesium.Primitive({show:!countyTiles,
      geometryInstances:new Cesium.GeometryInstance({geometry:new Cesium.WallGeometry({positions:top,maximumHeights:heights,minimumHeights:heights.map(h=>h-120),vertexFormat:Cesium.PerInstanceColorAppearance.FLAT_VERTEX_FORMAT}),
        attributes:{color:Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.fromCssColorString('#3a4430'))}}),
      appearance:new Cesium.PerInstanceColorAppearance({flat:true,translucent:false})}));
  }).catch(error=>console.warn('Kronach edge:',error));
  // Streets of the old town (kart track points): on foot or by car you start on the nearest one, not on a roof.
  // Surface grid of the tile (terrain + LoD2 roofs, dist/globe/surface.js) from the same kart bundle: ground heights in
  // Kronach become an array read instead of scene.sampleHeight(), which renders a pick pass per call.
  let streets=[],surface=null;
  const kartAssets=new URL('/kart/assets/',location.href);
  fetch(new URL('kronach.json',kartAssets)).then(r=>r.json()).then(async meta=>{
    streets=meta.track.points.map(([x,z])=>Cesium.Cartographic.fromCartesian(kronachPoint(x,z,300)));
    const t=meta.terrain,b=meta.buildings,load=f=>fetch(assetUrl(kartAssets,f.file,f.hash)).then(r=>r.arrayBuffer()).then(x=>new Uint8Array(x));
    const [heightBytes,buildingBytes]=await Promise.all([load(t),load(b)]);
    surface=buildSurface(await decodeHeightFile(heightBytes,t),t,await decodeBinaryFile(buildingBytes,b.packing));heightCache.clear();
  }).catch(error=>console.warn('Kronach surface:',error));
  const kronachInverse=Cesium.Matrix4.inverse(kronachFrame,new Cesium.Matrix4()),surfaceScratch=new Cesium.Cartesian3();
  // Ellipsoidal surface height in the tile, NaN outside it or before the grid is loaded. Tile-local (e, n) are kart
  // (x, −z); the grid's 0 is the GLB's y = 0 (300 m NN), which sits at KRONACH.base above the ellipsoid.
  const surfaceHeight=c=>{
    if(!surface)return NaN;
    const p=Cesium.Matrix4.multiplyByPoint(kronachInverse,Cesium.Cartesian3.fromRadians(c.longitude,c.latitude,KRONACH.base,ellipsoid,surfaceScratch),surfaceScratch);
    return surface.covers(p.x,-p.y)?KRONACH.base+surface.at(p.x,-p.y):NaN;
  };
  // Nearest street point and the street's direction there (towards the next track point, clockwise from north).
  const nearestStreet=(lon,lat)=>{
    let best=-1,d=Infinity;
    streets.forEach((c,i)=>{const dd=(c.longitude-lon)**2+((c.latitude-lat)*1.6)**2;if(dd<d){d=dd;best=i;}});
    if(best<0)return null;
    const a=streets[best],b=streets[(best+1)%streets.length];
    const heading=Math.atan2((b.longitude-a.longitude)*Math.cos(a.latitude),b.latitude-a.latitude);
    return {longitude:a.longitude,latitude:a.latitude,heading};
  };

  /* ---------- Landkreis Kronach as our own 3D tiles (scripts/geo/kronach_lk_*.py), ?tiles=<tileset.json> ---------- */
  // The county model replaces the 1 km Kronach tile; the world terrain is cut away inside the county boundary.
  // Default: the published county set (R2 bucket motionspec-world-geo via /geo/); ?tiles=off keeps the 1 km tile only.
  const tilesUrl=params.get('tiles')==='off'?null:params.get('tiles')??COUNTY_TILES;
  // Ground heights in the county from 1 km surface files next to the tileset (terrain + roofs, loaded around where
  // they are asked for); until a file is there, the globe terrain answers.
  let countySurface=null;
  if(tilesUrl){
    const base=new URL('.',new URL(tilesUrl,location.href));
    countySurface=new SurfaceTiles({load:(te,tn)=>fetch(new URL(`S/${te}_${tn}.bin`,base)).then(r=>r.ok?r.arrayBuffer():null).then(b=>b&&readSurfaceFile(new Uint8Array(b),gunzip)),
      onLoad:()=>heightCache.clear()});
  }
  if(tilesUrl){
    // skipLevelOfDetail: go straight to the level the view needs instead of streaming every ancestor first (measured:
    // flying into Kronach loaded 30+ coarse tiles, ~55 MB, before the first leaf). The cache cap keeps GPU memory bounded.
    const skip=params.get('skip')!=='0';
    Promise.all([Cesium.Cesium3DTileset.fromUrl(tilesUrl,{maximumScreenSpaceError:Number(params.get('sse'))||16,
      skipLevelOfDetail:skip,baseScreenSpaceError:1024,skipScreenSpaceErrorFactor:16,skipLevels:1,immediatelyLoadDesiredLevelOfDetail:false,loadSiblings:false,
      cacheBytes:(Number(params.get('cacheMB'))||384)*1e6,maximumCacheOverflowBytes:256e6}),fetch('/globe/models/landkreis-kronach.json').then(r=>r.json())]).then(([tileset,county])=>{
      tileset.customShader=photoShader();countyTiles=scene.primitives.add(tileset);
      if(kronachModel)kronachModel.show=false;if(skirt)skirt.show=false;
      globe.clippingPolygons=new Cesium.ClippingPolygonCollection({polygons:[new Cesium.ClippingPolygon({positions:Cesium.Cartesian3.fromDegreesArray(county.ring.flat())})]});
    }).catch(error=>{console.warn('County tiles:',error);ui.status.textContent=`Landkreis-Modell nicht geladen: ${error.message}`;});
  }

  /* ---------- optional Google Photorealistic 3D (key only from /api/globe-config) ---------- */
  let google=null,googleOn=false;
  async function setGoogle(on){
    if(on&&!google){
      ui.status.textContent='Lade Google 3D …';
      try{google=scene.primitives.add(await Cesium.createGooglePhotorealistic3DTileset({key:config.googleKey,onlyUsingWithGoogleGeocoder:true}));}
      catch(error){ui.status.textContent=`Google 3D nicht verfügbar: ${error.message}`;return;}
    }
    googleOn=on&&!!google;if(google)google.show=googleOn;
    // Google covers the whole Earth (terrain and buildings); globe, Esri imagery and our tile step aside.
    globe.show=!googleOn;if(kronachModel)kronachModel.show=!googleOn;if(skirt)skirt.show=!googleOn;
    // Google's terms: no non-Google place search together with its 3D tiles.
    ui.query.disabled=googleOn;ui.query.placeholder=googleOn?'Suche aus, solange Google 3D an ist (Google-Bedingungen)':'Ort suchen … (z. B. Kronach, Zugspitze, Tokio)';
    ui.photo.setAttribute('aria-pressed',String(googleOn));ui.status.textContent='';heightCache.clear();
  }
  if(config.googleKey){ui.photo.hidden=false;ui.photo.addEventListener('click',()=>setGoogle(!googleOn));if(params.get('photo')==='1')setGoogle(true);}

  /* ---------- floating anchor and ground heights ---------- */
  const enu=new Cesium.Matrix4(),scratch=new Cesium.Cartesian3(),scratchCarto=new Cesium.Cartographic();
  const anchor={lon:KRONACH.lon,lat:KRONACH.lat};
  function setAnchor(lon,lat){Object.assign(anchor,{lon,lat});Cesium.Transforms.eastNorthUpToFixedFrame(Cesium.Cartesian3.fromDegrees(lon,lat,0),ellipsoid,enu);heightCache.clear();}
  const localCarto=(x,z,result=new Cesium.Cartographic())=>Cesium.Cartographic.fromCartesian(Cesium.Matrix4.multiplyByPoint(enu,Cesium.Cartesian3.fromElements(x,-z,0,scratch),scratch),ellipsoid,result);
  const toWorld=(x,y,z,result)=>{const c=localCarto(x,z,scratchCarto);return Cesium.Cartesian3.fromRadians(c.longitude,c.latitude,y,ellipsoid,result);};
  const inKronach=c=>Math.abs(Cesium.Math.toDegrees(c.longitude)-KRONACH.lon)<.0085&&Math.abs(Cesium.Math.toDegrees(c.latitude)-KRONACH.lat)<.0055;
  const heightCache=new Map();let lastHeight=0;
  const excluded=[];
  // Ellipsoidal ground height at a cartographic point: the rendered surface (Google tiles or our Kronach tile, so
  // buildings count as ground and block like cliffs) where that matters, otherwise the loaded terrain.
  // scene.sampleHeight can answer nonsense while tiles are still loading (seen: 72 km); a sampled surface only
  // counts within −60…+250 m of the terrain (buildings, bridges), otherwise the terrain itself is the ground.
  function heightAt(c){
    if(!googleOn&&countySurface){
      const [E,N]=utm32(Cesium.Math.toDegrees(c.longitude),Cesium.Math.toDegrees(c.latitude));
      if(E>=COUNTY_UTM[0]&&E<COUNTY_UTM[2]&&N>=COUNTY_UTM[1]&&N<COUNTY_UTM[3]){const h=countySurface.at(E,N);if(Number.isFinite(h))return lastHeight=h+GEOID;}
    }
    if(!googleOn&&inKronach(c)){const s=surfaceHeight(c);if(Number.isFinite(s))return lastHeight=s;}
    const terrainH=globe.getHeight(c);
    let h;
    if(scene.sampleHeightSupported&&(googleOn||(kronachModel&&inKronach(c)))){
      const sampled=scene.sampleHeight(c,excluded);
      if(Number.isFinite(sampled)&&(!Number.isFinite(terrainH)||(sampled>terrainH-60&&sampled<terrainH+250)))h=sampled;
    }
    if(!Number.isFinite(h))h=terrainH;
    if(!Number.isFinite(h))h=lastHeight;
    return lastHeight=h;
  }
  function node(i,j,now){
    const key=`${i},${j}`,hit=heightCache.get(key);
    if(hit&&now-hit.t<HEIGHT_TTL)return hit.h;
    if(heightCache.size>20000)heightCache.clear();
    const h=heightAt(localCarto(i*GRID,j*GRID,scratchCarto));heightCache.set(key,{h,t:now});return h;
  }
  // Bilinear between cached 1.5 m grid nodes: cheap enough for many calls per simulation step.
  function ground(x,z){
    const now=performance.now(),gx=x/GRID,gz=z/GRID,i=Math.floor(gx),j=Math.floor(gz),u=gx-i,v=gz-j;
    return (node(i,j,now)*(1-u)+node(i+1,j,now)*u)*(1-v)+(node(i,j+1,now)*(1-u)+node(i+1,j+1,now)*u)*v;
  }

  /* ---------- vehicles ---------- */
  const plane=new Plane({ground}),car=new Car({ground}),walker=new Pedestrian({ground});
  const models={};
  for(const name of ['plane','car'])Cesium.Model.fromGltfAsync({url:`/globe/models/${name}.glb`,show:false,minimumPixelSize:0,forwardAxis:Cesium.Axis.X}).then(m=>{models[name]=scene.primitives.add(m);excluded.push(m);});
  let mode='travel',view=0,accumulator=0,last=performance.now(),crashTimer=0;
  const vehicle=()=>mode==='plane'?plane:mode==='car'?car:mode==='walk'?walker:null;
  const keys={shift:false,space:false,jump:false};

  // Where am I (geographic) and which way am I facing, in any mode.
  function here(){
    const v=vehicle();
    if(v){const s=v.state,c=localCarto(s.x,s.z);return {lon:c.longitude,lat:c.latitude,height:s.y,heading:s.heading};}
    const c=camera.positionCartographic;return {lon:c.longitude,lat:c.latitude,height:c.height,heading:camera.heading};
  }
  function setMode(next){
    if(next===mode&&next!=='travel')next='travel';
    const at=here();
    for(const m of Object.values(models))m.show=false;
    mode=next;
    scene.screenSpaceCameraController.enableInputs=mode==='travel';
    if(mode!=='travel'){
      if((mode==='walk'||mode==='car')&&kronachModel&&!googleOn&&inKronach(new Cesium.Cartographic(at.lon,at.lat))){
        const street=nearestStreet(at.lon,at.lat);if(street){at.lon=street.longitude;at.lat=street.latitude;at.heading=street.heading;}
      }
      setAnchor(Cesium.Math.toDegrees(at.lon),Cesium.Math.toDegrees(at.lat));
      const floor=ground(0,0),above=at.height-floor;
      if(mode==='plane'){plane.launch({x:0,z:0,heading:at.heading,height:Math.min(1500,Math.max(80,Number.isFinite(above)?above:150))});crashTimer=0;}
      if(mode==='car')car.place({x:0,z:0,heading:at.heading});
      if(mode==='walk')walker.place({x:0,z:0,heading:at.heading});
      if(models[mode])models[mode].show=true;
      view=mode==='walk'?0:view;
    }
    for(const b of document.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',String(b.dataset.mode===mode));
    ui.mode.textContent=LABEL[mode];$('globe').focus();
  }
  function reanchor(){
    const v=vehicle();if(!v)return;const s=v.state;
    if(Math.abs(s.x)<REANCHOR&&Math.abs(s.z)<REANCHOR)return;
    const c=localCarto(s.x,s.z),dx=s.x,dz=s.z;
    setAnchor(Cesium.Math.toDegrees(c.longitude),Cesium.Math.toDegrees(c.latitude));
    s.x-=dx;s.z-=dz;if(v.previous){v.previous.x-=dx;v.previous.z-=dz;}
  }

  /* ---------- input ---------- */
  const input=new InputRouter({onCommand:command=>{
    if(command==='reset'){const v=vehicle();if(mode==='plane')plane.launch({x:plane.state.x,z:plane.state.z,heading:plane.state.heading,height:150});else if(v)v.place({x:v.state.x,z:v.state.z,heading:v.state.heading});}
  }});
  input.activate();
  const onKey=(event,down)=>{
    if(event.target?.closest?.('input,textarea,select')||event.ctrlKey||event.metaKey||event.altKey)return;
    if(event.code==='ShiftLeft'||event.code==='ShiftRight')keys.shift=down;
    if(event.code==='Space'){keys.space=down;if(down&&!event.repeat)keys.jump=true;event.preventDefault();}
    if(!down||event.repeat)return;
    const map={KeyT:'travel',KeyF:'plane',KeyC:'car',KeyL:'walk'};
    if(map[event.code])setMode(map[event.code]);
    if(event.code==='KeyV')view=(view+1)%2;
    if(event.code==='KeyH')ui.help.hidden=!ui.help.hidden;
  };
  addEventListener('keydown',e=>onKey(e,true));addEventListener('keyup',e=>onKey(e,false));
  addEventListener('blur',()=>{keys.shift=keys.space=false;});
  for(const b of document.querySelectorAll('[data-mode]'))b.addEventListener('click',()=>setMode(b.dataset.mode));
  ui.view.addEventListener('click',()=>{view=(view+1)%2;});
  ui.helpBtn.addEventListener('click',()=>{ui.help.hidden=!ui.help.hidden;});
  // Mouse/finger look on foot.
  let look=null;const canvas=widget.canvas;
  canvas.addEventListener('pointerdown',e=>{if(mode!=='walk')return;look={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!look||look.id!==e.pointerId)return;walker.look((e.clientX-look.x)*.0045,-(e.clientY-look.y)*.0045);look.x=e.clientX;look.y=e.clientY;});
  for(const ev of ['pointerup','pointercancel'])canvas.addEventListener(ev,e=>{if(look?.id===e.pointerId)look=null;});

  /* ---------- places: presets, search, double-click ---------- */
  function flyTo(lon,lat,range=1500,rect=null){
    setMode('travel');
    if(rect){camera.flyTo({destination:Cesium.Rectangle.fromDegrees(rect[2],rect[0],rect[3],rect[1]),duration:3});return;}
    camera.flyToBoundingSphere(new Cesium.BoundingSphere(Cesium.Cartesian3.fromDegrees(lon,lat,0),50),{offset:new Cesium.HeadingPitchRange(0,Cesium.Math.toRadians(-35),range),duration:3.5});
  }
  for(const b of document.querySelectorAll('[data-place]'))b.addEventListener('click',()=>{const [lon,lat,range]=b.dataset.place.split(',').map(Number);flyTo(lon,lat,range);});
  ui.search.addEventListener('submit',async e=>{
    e.preventDefault();const q=ui.query.value.trim();if(!q)return;
    ui.results.hidden=false;ui.results.innerHTML='<li><small>Suche …</small></li>';
    try{
      const r=await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);const data=await r.json();
      if(!r.ok)throw new Error(data.error||r.status);
      ui.results.innerHTML=data.places.length?'':'<li><small>Nichts gefunden.</small></li>';
      for(const p of data.places){
        const li=document.createElement('li'),b=document.createElement('button');b.type='button';
        b.innerHTML=`${p.name.split(',')[0]}<br><small>${p.name.split(',').slice(1,4).join(',')}</small>`;
        b.addEventListener('click',()=>{ui.results.hidden=true;flyTo(p.lon,p.lat,2000,p.box&&p.kind!=='house'?p.box:null);});
        li.append(b);ui.results.append(li);
      }
    }catch(error){ui.results.innerHTML=`<li><small>Suche fehlgeschlagen: ${String(error.message||error)}</small></li>`;}
  });
  ui.query.addEventListener('keydown',e=>{if(e.key==='Escape'){ui.results.hidden=true;ui.query.blur();}});
  widget.screenSpaceEventHandler.setInputAction(click=>{
    if(mode!=='travel')return;
    const ray=camera.getPickRay(click.position),point=scene.pickPositionSupported&&scene.pickPosition(click.position)||globe.pick(ray,scene);
    if(!point)return;const c=Cesium.Cartographic.fromCartesian(point);
    flyTo(Cesium.Math.toDegrees(c.longitude),Cesium.Math.toDegrees(c.latitude),Math.max(400,camera.positionCartographic.height*.25));
  },Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

  /* ---------- simulation and camera ---------- */
  function simulate(dt){
    const axes=input.axes(),turn=(input.isDown('turnRight')?1:0)-(input.isDown('turnLeft')?1:0);
    if(mode==='travel'){
      // Free camera: speed grows with the height above ground, Shift ×5; Q/E down/up.
      const c=camera.positionCartographic,agl=Math.max(1,c.height-(globe.getHeight(c)??0)),speed=Math.min(3e6,Math.max(15,agl*.7))*(keys.shift?5:1);
      if(axes.z)camera.moveForward(axes.z*speed*dt);if(axes.x)camera.moveRight(axes.x*speed*dt);
      if(turn)camera.moveUp(turn*speed*dt);
      const floor=globe.getHeight(camera.positionCartographic);
      if(Number.isFinite(floor)&&camera.positionCartographic.height<floor+2){const p=camera.positionCartographic;camera.position=Cesium.Cartesian3.fromRadians(p.longitude,p.latitude,floor+2);}
      return;
    }
    accumulator+=dt;
    while(accumulator>=STEP){
      accumulator-=STEP;
      if(mode==='plane'){
        plane.step(STEP,{pitch:axes.z,roll:axes.x,yaw:turn,throttle:(keys.shift?1:0)-(keys.space?1:0)});
        if(plane.state.crashed&&(crashTimer+=STEP)>2){plane.launch({x:plane.state.x,z:plane.state.z,heading:plane.state.heading,height:150});crashTimer=0;}
      }else if(mode==='car')car.step(STEP,{throttle:axes.z,steer:axes.x,handbrake:keys.space});
      else if(mode==='walk'){walker.step(STEP,{forward:axes.z,strafe:axes.x,turn,run:keys.shift,jump:keys.jump});keys.jump=false;}
    }
    reanchor();
  }
  const camPos=new Cesium.Cartesian3(),target=new Cesium.Cartesian3(),dir=new Cesium.Cartesian3(),up=new Cesium.Cartesian3();
  function place(){
    const v=vehicle();if(!v)return;const s=v.state,fx=Math.sin(s.heading),fz=-Math.cos(s.heading);
    // Vehicle model.
    const m=models[mode];
    if(m){toWorld(s.x,s.y,s.z,target);Cesium.Transforms.headingPitchRollToFixedFrame(target,new Cesium.HeadingPitchRoll(s.heading-Math.PI/2,s.pitch??0,s.roll??0),ellipsoid,undefined,m.modelMatrix);m.show=view===0||mode==='walk';}
    // Camera: chase or cockpit / first person.
    let p,t;
    if(mode==='walk'){
      const [lx,ly,lz]=v.forward(),e=v.eye();
      if(view===0){p=[e.x,e.y,e.z];t=[e.x+lx*10,e.y+ly*10,e.z+lz*10];}else{p=[s.x-fx*4.5,s.y+2.4,s.z-fz*4.5];t=[s.x+fx*3,s.y+1.4,s.z+fz*3];}
    }else if(mode==='plane'){
      const [ox,oy,oz]=plane.forward();
      if(view===0){p=[s.x-fx*18,s.y+5,s.z-fz*18];t=[s.x+ox*25,s.y+oy*25+1.5,s.z+oz*25];}else{p=[s.x+ox*1.2,s.y+.5,s.z+oz*1.2];t=[s.x+ox*50,s.y+oy*50+.5,s.z+oz*50];}
    }else{
      const pitch=s.pitch??0;
      if(view===0){p=[s.x-fx*7.5,s.y+2.8,s.z-fz*7.5];t=[s.x+fx*6,s.y+1+Math.sin(pitch)*6,s.z+fz*6];}else{p=[s.x+fx*.2,s.y+1.25,s.z+fz*.2];t=[s.x+fx*20,s.y+1.25+Math.sin(pitch)*20,s.z+fz*20];}
    }
    // Chase cameras never end up inside a house: walking from the vehicle towards the camera, stop before the
    // first point where the ground (roofs count, see heightAt) rises above the vehicle's eye level.
    if(mode!=='plane'&&!(mode==='walk'&&view===0)){
      const eye=s.y+1.6;let free=0;
      for(let k=1;k<=10;k++){const f=k/10,x=s.x+(p[0]-s.x)*f,z=s.z+(p[2]-s.z)*f;if(ground(x,z)>eye)break;free=f;}
      if(free<1){const f=Math.max(.12,free*.9);p=[s.x+(p[0]-s.x)*f,s.y+Math.max(1.6,(p[1]-s.y)*f),s.z+(p[2]-s.z)*f];}
    }
    p[1]=Math.max(p[1],ground(p[0],p[2])+.8);
    toWorld(p[0],p[1],p[2],camPos);toWorld(t[0],t[1],t[2],target);
    Cesium.Cartesian3.normalize(Cesium.Cartesian3.subtract(target,camPos,dir),dir);ellipsoid.geodeticSurfaceNormal(camPos,up);
    camera.setView({destination:camPos,orientation:{direction:dir,up}});
  }
  let travelPrev=null,travelSpeed=0;
  scene.preUpdate.addEventListener(()=>{
    const now=performance.now(),dt=Math.min(MAX_CATCH_UP,(now-last)/1000);last=now;
    simulate(dt);place();
    if(mode==='travel'){const p=camera.positionWC;if(travelPrev&&dt>0)travelSpeed=Cesium.Cartesian3.distance(p,travelPrev)/dt;travelPrev=Cesium.Cartesian3.clone(p,travelPrev);}
  });

  /* ---------- HUD ---------- */
  setInterval(()=>{
    const v=vehicle(),at=here(),c=new Cesium.Cartographic(at.lon,at.lat),floor=v?ground(v.state.x,v.state.z):globe.getHeight(c);
    const speed=v?Math.abs(v.state.speed??0):travelSpeed;
    ui.speed.textContent=`${fmt(speed*3.6)} km/h`;
    ui.agl.textContent=Number.isFinite(floor)?`${fmt(Math.max(0,at.height-floor-(mode==='plane'?1.1:0)))} m über Grund`:'– m über Grund';
    ui.pos.textContent=`${fmt(Cesium.Math.toDegrees(at.lat),4)}°, ${fmt(Cesium.Math.toDegrees(at.lon),4)}°`;
    if(mode==='plane'&&plane.state.crashed)ui.status.textContent='Absturz! Neustart …';
    else if(mode==='plane'&&plane.state.stalled)ui.status.textContent='Überzogen – Nase runter, Gas geben!';
    else if(ui.status.textContent.startsWith('Absturz')||ui.status.textContent.startsWith('Überzogen')||ui.status.textContent==='Lade Globus …')ui.status.textContent='';
  },250);

  window.__globe={widget,setMode,setGoogle,flyTo,ground,heightAt,surfaceHeight,get surface(){return surface;},get countySurface(){return countySurface;},plane,car,walker,get mode(){return mode;},here,
    // Deterministic stepping for browser checks: advance the active vehicle by `seconds` with a fixed input.
    tick(seconds,control={}){const a=input.axes;input.axes=()=>({x:control.x??0,z:control.z??0});for(let t=0;t<seconds;t+=STEP){accumulator+=STEP;simulate(0);}input.axes=a;place();const v=vehicle();return v?{...v.state}:null;}};
  ui.status.textContent='';
  flyTo(KRONACH.lon,KRONACH.lat,2600);
}

main().catch(error=>{ui.status.textContent=`Fehler: ${error.message}`;console.error(error);});
