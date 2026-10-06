// Live insights for the kart page: where you are (WGS84, UTM, height above sea level), how fast, in which mode,
// what the browser really renders there (frame time, draw calls, triangles, memory), a map of the measured frame
// rate along your own way and — from the server — the same values over all sessions of the last 24 hours.
// Every second one sample is taken; batches go anonymously to POST /api/kart-telemetry (session id per page
// load, no account, no IP stored; switch off in the panel). Toggle: I or the „Insights“ button, ?insights=1.

export const SAMPLE_MS=1000,SEND_MS=15000,FETCH_MS=30000,CELL=20,TELEMETRY_FORMAT='ourark.kart-telemetry.v1';
const STORE_KEY='ourark.kart.telemetry',OPEN_KEY='ourark.kart.insights';

/** ETRS89 / UTM → geographic degrees (Krüger series, GRS80). */
export function utmToGeo(east,north,zone=32){
  const a=6378137,f=1/298.257222101,k0=.9996,e2=f*(2-f),ep2=e2/(1-e2),e1=(1-Math.sqrt(1-e2))/(1+Math.sqrt(1-e2));
  const x=east-500000,mu=north/k0/(a*(1-e2/4-3*e2**2/64-5*e2**3/256));
  const phi=mu+(3*e1/2-27*e1**3/32)*Math.sin(2*mu)+(21*e1**2/16-55*e1**4/32)*Math.sin(4*mu)+(151*e1**3/96)*Math.sin(6*mu)+(1097*e1**4/512)*Math.sin(8*mu);
  const sin=Math.sin(phi),cos=Math.cos(phi),tan=Math.tan(phi),n=a/Math.sqrt(1-e2*sin*sin),r=a*(1-e2)/(1-e2*sin*sin)**1.5;
  const t=tan*tan,c=ep2*cos*cos,d=x/(n*k0);
  const lat=phi-(n*tan/r)*(d**2/2-(5+3*t+10*c-4*c**2-9*ep2)*d**4/24+(61+90*t+298*c+45*t**2-252*ep2-3*c**2)*d**6/720);
  const lon=(d-(1+2*t+c)*d**3/6+(5-2*c+28*t-3*c**2+8*ep2+24*t**2)*d**5/120)/cos;
  return {lat:lat*180/Math.PI,lon:zone*6-183+lon*180/Math.PI};
}
/** Local map metres (x east, z south, origin = map centre) → UTM and WGS84. */
export function localToGeo(x,z,origin){const east=origin.east+x,north=origin.north-z;return {east,north,...utmToGeo(east,north)};}

export function frameStats(intervals){
  if(!intervals.length)return {fps:0,p50:null,p95:null,max:null};
  const s=[...intervals].sort((a,b)=>a-b),q=p=>s[Math.min(s.length-1,Math.floor(s.length*p))];
  return {fps:Math.round(1000*s.length/s.reduce((a,b)=>a+b,0)*10)/10,p50:Math.round(q(.5)*10)/10,p95:Math.round(q(.95)*10)/10,max:Math.round(s.at(-1)*10)/10};
}
export const median=v=>{if(!v.length)return null;const s=[...v].sort((a,b)=>a-b),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2;};

/** Frame rate per CELL-metre cell along the own way. */
export class PlaceGrid{
  constructor(cell=CELL){this.cell=cell;this.cells=new Map();}
  add(x,z,fps){const k=`${Math.floor(x/this.cell)},${Math.floor(z/this.cell)}`;(this.cells.get(k)??this.cells.set(k,[]).get(k)).push(fps);}
  list(){return [...this.cells.entries()].map(([k,v])=>{const [i,j]=k.split(',').map(Number);return {x:(i+.5)*this.cell,z:(j+.5)*this.cell,samples:v.length,fps:median(v)};});}
  slowest(min=3){return this.list().filter(c=>c.samples>=min).sort((a,b)=>a.fps-b.fps)[0]??null;}
}
export const fpsColor=fps=>fps==null?'#888':fps>=55?'#4ade80':fps>=40?'#facc15':fps>=28?'#fb923c':'#ef4444';

/** Short German observations from the current values (pure, testable). */
export function observations({now,session,place,drawCalls,area,slowest,server}){
  const out=[];
  if(now&&session?.fps){
    const diff=Math.round((now.fps/session.fps-1)*100);
    out.push(Math.abs(diff)<8?`Hier ${now.fps} fps – wie dein Schnitt (${session.fps}).`:`Hier ${now.fps} fps – ${Math.abs(diff)} % ${diff<0?'langsamer':'schneller'} als dein Schnitt (${session.fps}).`);
  }
  if(drawCalls>600)out.push(`${drawCalls} Draw Calls pro Bild: dichte Bebauung in Sicht${area?.buildings>=40?` (${area.buildings} % bebaut im 50-m-Umkreis)`:''}.`);
  // Only worth a line when that place is clearly slower than the session.
  if(slowest&&place&&session?.fps&&slowest.fps<session.fps*.9)out.push(`Langsamste Stelle deiner Runde: ${slowest.fps} fps, ${Math.round(Math.hypot(slowest.x-place.x,slowest.z-place.z))} m von hier.`);
  if(server?.sessions)out.push(`Alle Sitzungen (${server.hours} h): ${server.sessions} ${server.sessions===1?'Gerät':'Geräte'}, Median ${server.fps?.median??'–'} fps${server.slowest?.[0]?`, langsamste Stelle ${server.slowest[0].fps} fps`:''}.`);
  return out;
}

const hex16=()=>[...crypto.getRandomValues(new Uint8Array(8))].map(b=>b.toString(16).padStart(2,'0')).join('');
const fmt=(v,d=0)=>v==null||!Number.isFinite(v)?'–':v.toLocaleString('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d});
const MODE_LABEL={kart:'Kart',plane:'Flugzeug',walk:'Zu Fuß'};

export class KartInsights{
  // meta: map JSON (origin, terrain, name); state(): {mode,x,y,z,speed,heading}; image: aerial photo for the minimap;
  // blockers: building meshes (for the built-up share around you); track: Track (drawn on the minimap).
  constructor({meta,mapName,renderer,state,image,blockers=[],track=null,button=null}){
    Object.assign(this,{meta,mapName,renderer,state,image,track,button});
    this.session=hex16();this.seq=0;this.queue=[];this.intervals=[];this.last=0;this.lastSample=performance.now();this.lastSend=performance.now();
    this.samples=[];this.grid=new PlaceGrid();this.distance=0;this.marks=[];this.server=null;this.serverAt=0;this.sent=0;this.sendErrors=0;
    this.buildCells=buildingCells(blockers);
    try{this.enabled=localStorage.getItem(STORE_KEY)!=='0';}catch{this.enabled=true;}
    this.device={gpu:gpuName(renderer),mobile:matchMedia('(pointer:coarse)').matches,dpr:devicePixelRatio,cores:navigator.hardwareConcurrency??null,memoryGB:navigator.deviceMemory??null};
    this.buildPanel();
    let open=new URLSearchParams(location.search).get('insights')==='1';
    try{open||=localStorage.getItem(OPEN_KEY)==='1';}catch{}
    this.setOpen(open);
    addEventListener('keydown',e=>{if(e.code==='KeyI'&&!e.repeat&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.target?.closest?.('input,textarea,select')){this.setOpen(!this.open);}});
    button?.addEventListener('click',()=>this.setOpen(!this.open));
    addEventListener('pagehide',()=>this.flush(true));
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.flush(true);});
  }
  mark(name){this.marks.push({name,ms:Math.round(performance.now())});}
  // Called once per animation frame after rendering.
  frame(now){
    if(this.last&&!document.hidden){const ms=now-this.last;if(ms<1000)this.intervals.push(ms);}
    this.last=now;
    const info=this.renderer.info.render;this.lastCalls=info.calls;this.lastTris=info.triangles;
    if(now-this.lastSample>=SAMPLE_MS){this.sample(now);this.lastSample=now;}
    if(now-this.lastSend>=SEND_MS){this.flush(false);this.lastSend=now;}
    if(this.open&&now-this.serverAt>=FETCH_MS){this.serverAt=now;this.fetchServer();}
  }
  sample(now){
    const st=this.state(),stats=frameStats(this.intervals.splice(0));if(!stats.fps||document.hidden)return;
    const prev=this.samples.at(-1);if(prev)this.distance+=Math.hypot(st.x-prev.x,st.z-prev.z);
    const heap=performance.memory?performance.memory.usedJSHeapSize/1048576:null;
    const n=this.net?.stats();
    const s={t:Math.round(now/100)/10,mode:st.mode,x:st.x,z:st.z,nn:st.y+(this.meta.terrain.offset??0),speed:Math.abs(st.speed??0),
      fps:stats.fps,p95:stats.p95,calls:this.lastCalls,tris:this.lastTris,...(heap!=null?{heapMB:Math.round(heap*10)/10}:{}),
      ...(n?.connected?{rtt:n.rttMs??undefined,netIn:n.inBytesPerS,netOut:n.outBytesPerS,remotes:n.remotes}:{})};
    this.samples.push(s);if(this.samples.length>3600)this.samples.shift();
    this.grid.add(s.x,s.z,s.fps);
    if(this.enabled)this.queue.push(s);
    if(this.open)this.paint(s,stats);
  }
  flush(leaving){
    if(!this.enabled||!this.queue.length)return;
    const samples=this.queue.splice(0,30);
    const body=JSON.stringify({format:TELEMETRY_FORMAT,session:this.session,map:this.mapName,seq:this.seq++,
      device:{...this.device,canvas:`${this.renderer.domElement.width}x${this.renderer.domElement.height}`},samples});
    // Same-origin: the browser sends the cached login along.
    if(leaving&&navigator.sendBeacon){navigator.sendBeacon('/api/kart-telemetry',new Blob([body],{type:'application/json'}));this.sent+=samples.length;return;}
    fetch('/api/kart-telemetry',{method:'POST',body,headers:{'Content-Type':'application/json'},keepalive:true})
      .then(r=>{if(r.ok)this.sent+=samples.length;else this.sendErrors++;}).catch(()=>{this.sendErrors++;});
  }
  async fetchServer(){
    try{const r=await fetch(`/api/kart-insights?map=${encodeURIComponent(this.mapName)}&hours=24`,{cache:'no-store'});if(r.ok)this.server=await r.json();}catch{}
  }
  setOpen(open){
    this.open=open;this.panel.hidden=!open;this.button?.setAttribute('aria-pressed',String(open));
    try{localStorage.setItem(OPEN_KEY,open?'1':'0');}catch{}
    if(open){this.serverAt=0;this.paint(this.samples.at(-1),null);}
  }
  buildPanel(){
    const p=document.createElement('aside');p.className='kart-insights';p.setAttribute('aria-label','Live-Insights');
    p.innerHTML=`<header><strong>Live-Insights</strong><span class="ki-mode"></span><button type="button" class="ki-close" aria-label="Schließen">×</button></header>
<canvas class="ki-map" width="440" height="440" aria-label="Karte: gemessene Bildrate entlang deines Weges"></canvas>
<div class="ki-legend"><span><i style="background:#4ade80"></i>≥ 55</span><span><i style="background:#facc15"></i>≥ 40</span><span><i style="background:#fb923c"></i>≥ 28</span><span><i style="background:#ef4444"></i>&lt; 28 fps</span><span><i class="ki-ring"></i>alle Sitzungen</span></div>
<ul class="ki-notes"></ul>
<h3>Hier</h3><dl class="ki-here"></dl>
<h3>Leistung live</h3><dl class="ki-perf"></dl>
<h3>Netz live</h3><dl class="ki-net"></dl>
<h3>LOD &amp; GPU</h3><dl class="ki-lod"></dl>
<h3>Alle Sitzungen · 24 h</h3><dl class="ki-all"></dl>
<h3>Laden</h3><dl class="ki-load"></dl>
<label class="ki-send"><input type="checkbox"> Anonyme Messwerte senden <span class="ki-sent"></span></label>`;
    document.body.append(p);this.panel=p;
    p.querySelector('.ki-close').addEventListener('click',()=>this.setOpen(false));
    const box=p.querySelector('.ki-send input');box.checked=this.enabled;
    box.addEventListener('change',()=>{this.enabled=box.checked;if(!this.enabled)this.queue.length=0;try{localStorage.setItem(STORE_KEY,this.enabled?'1':'0');}catch{}});
    this.map=p.querySelector('.ki-map');this.ctx=this.map.getContext('2d');
  }
  paint(s,stats){
    if(!s)return;
    const st=this.state(),geo=localToGeo(st.x,st.z,this.meta.origin),$=sel=>this.panel.querySelector(sel);
    const recent=this.samples.slice(-10),session=median(this.samples.map(v=>v.fps)),area=this.areaAround(st.x,st.z);
    const inside=Math.abs(st.x)<this.meta.terrain.width/2&&Math.abs(st.z)<this.meta.terrain.depth/2;
    const row=(k,v)=>`<dt>${k}</dt><dd>${v}</dd>`;
    $('.ki-mode').textContent=`${MODE_LABEL[st.mode]??st.mode} · ${this.meta.name}`;
    $('.ki-here').innerHTML=
      row('Position',`${fmt(geo.lat,5)}° N, ${fmt(geo.lon,5)}° O`)+row('UTM 32',`${fmt(geo.east)} E · ${fmt(geo.north)} N`)+
      row('Höhe',`${fmt(st.y+(this.meta.terrain.offset??0))} m ü. NN`)+row('Tempo',`${fmt(Math.abs(st.speed??0)*3.6,1)} km/h`)+
      row('Gebiet',inside?'Detailkarte (1 m Gelände, LoD2)':'Umland (3 × 3 km)')+row('Bebauung 50 m',`${area.buildings} %`)+
      row('Weg bisher',`${fmt(this.distance)} m in ${fmt(this.samples.length)} s`);
    const heap=s.heapMB!=null?`${fmt(s.heapMB,1)} MB`:'n/a (nur Chromium)',mem=this.renderer.info.memory;
    $('.ki-perf').innerHTML=
      row('Bildrate',`${fmt(s.fps,1)} fps`)+row('Frame-Zeit p95',`${fmt(s.p95,1)} ms`)+row('10 s Median',`${fmt(median(recent.map(v=>v.fps)),1)} fps`)+
      row('Sitzung Median',`${fmt(session,1)} fps`)+row('Draw Calls',fmt(s.calls))+row('Dreiecke',fmt(s.tris))+
      row('Geometrien · Texturen',`${mem.geometries} · ${mem.textures}`)+row('JS-Heap',heap)+
      row('Auflösung',`${this.renderer.domElement.width}×${this.renderer.domElement.height} @ ${fmt(this.renderer.getPixelRatio(),2)}`)+row('GPU',this.device.gpu??'unbekannt');
    const n=this.net?.stats();
    $('.ki-net').innerHTML=!this.net?row('Echtzeit','aus (?net=0)'):
      row('Verbindung',n.connected?`verbunden · Spieler-Nr. ${n.id??'–'}`:'getrennt – verbinde neu …')+
      row('Andere Spieler in Sicht',fmt(n.remotes))+row('Ping (Hin und zurück)',n.rttMs==null?'–':`${fmt(n.rttMs)} ms`)+
      row('Takt vom Server',`${fmt(n.snapshotHz,1)} Hz`)+row('Empfangen',`${fmt(n.inBytesPerS/1024,2)} kB/s`)+row('Gesendet',`${fmt(n.outBytesPerS/1024,2)} kB/s`)+
      row('Deltas · Korrekturen',`${fmt(n.deltas)} · ${fmt(n.corrections)}`);
    const l=this.lod?.();
    $('.ki-lod').innerHTML=!l?row('LOD','–'):
      row('Culling fremder Spieler',`${l.backend==='webgpu'?'WebGPU-Compute':l.backend==='cpu'?'CPU (kein WebGPU)':l.backend} · ${fmt(l.ms,2)} ms`)+
      row('Nah · mittel · fern · verworfen',l.counts.join(' · '))+
      (l.chunks?row('Gebäude-Chunks gezeichnet',`${l.chunks.visible} / ${l.chunks.chunks} (Schatten: ${l.chunks.shadowing})`)+
        row('Geometrie im VRAM',`${fmt(l.chunks.residentBytes/1048576,1)} / ${fmt(l.chunks.totalBytes/1048576,1)} MB · Budget ${fmt(l.chunks.budgetBytes/1e6)} MB`)+
        row('Entladen · neu geladen',`${l.chunks.evicted} · ${l.chunks.restored}`):'');
    const sv=this.server;
    $('.ki-all').innerHTML=sv?(
      row('Geräte',`${sv.sessions} (${sv.devices.desktop} Desktop, ${sv.devices.mobile} mobil)`)+row('Messpunkte',fmt(sv.samples))+
      row('Bildrate Median · P10',`${fmt(sv.fps.median,1)} · ${fmt(sv.fps.p10,1)} fps`)+row('Unter 30 fps',sv.fps.below30==null?'–':`${fmt(sv.fps.below30*100,1)} %`)+
      row('Nach Modus',Object.entries(sv.byMode).map(([m,v])=>`${MODE_LABEL[m]??m} ${fmt(v.fps,0)}`).join(' · ')||'–')+
      row('Stand',new Date(sv.updatedAt).toLocaleTimeString('de-DE')+(sv.local?' (lokal)':''))):row('Stand','wird geladen …');
    const nav=performance.getEntriesByType('navigation')[0],net=performance.getEntriesByType('resource').reduce((a,r)=>a+(r.transferSize||0),0);
    $('.ki-load').innerHTML=(nav?row('Seite (DOM bereit)',`${fmt(nav.domContentLoadedEventEnd)} ms`):'')+this.marks.map(m=>row(m.name,`${fmt(m.ms)} ms`)).join('')+row('Übertragen',`${fmt(net/1048576,1)} MB`);
    $('.ki-sent').textContent=this.enabled?`· ${fmt(this.sent)} gesendet${this.sendErrors?`, ${this.sendErrors} Fehler`:''}`:'· aus';
    const slowest=this.grid.slowest();
    $('.ki-notes').innerHTML=observations({now:s,session:{fps:session&&Math.round(session)},place:st,drawCalls:s.calls,area,slowest,server:sv}).map(t=>`<li>${t}</li>`).join('');
    this.drawMap(st,sv);
  }
  // Built-up share (LoD2 cells) within 50 m.
  areaAround(x,z){
    const r=50,c=10;let built=0,all=0;
    for(let i=-r;i<=r;i+=c)for(let j=-r;j<=r;j+=c){if(i*i+j*j>r*r)continue;all++;if(this.buildCells.has(`${Math.floor((x+i)/c)},${Math.floor((z+j)/c)}`))built++;}
    return {buildings:all?Math.round(built/all*100):0};
  }
  drawMap(st,server){
    const g=this.ctx,w=this.map.width,size=this.meta.terrain.width,k=w/size,px=x=>(x+size/2)*k;
    g.clearRect(0,0,w,w);
    if(this.image?.complete!==false&&this.image?.width)g.drawImage(this.image,0,0,w,w);else{g.fillStyle='#223';g.fillRect(0,0,w,w);}
    g.fillStyle='rgba(0,0,0,.28)';g.fillRect(0,0,w,w);
    if(this.track){g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=2;g.beginPath();this.track.samples.forEach((p,i)=>i?g.lineTo(px(p.x),px(p.z)):g.moveTo(px(p.x),px(p.z)));g.closePath();g.stroke();}
    // Other sessions: rings per 50 m cell.
    for(const c of server?.grid??[]){g.strokeStyle=fpsColor(c.fps);g.lineWidth=2;g.beginPath();g.arc(px(c.x),px(c.z),Math.max(3,(server.cell*k)/2-2),0,Math.PI*2);g.stroke();}
    // Own way: filled cells.
    const cell=this.grid.cell*k;
    for(const c of this.grid.list()){g.fillStyle=fpsColor(c.fps);g.globalAlpha=.85;g.fillRect(px(c.x)-cell/2,px(c.z)-cell/2,cell,cell);}
    g.globalAlpha=1;
    // You: dot and heading.
    const x=px(st.x),y=px(st.z),h=st.heading??0;
    g.fillStyle='#fff';g.strokeStyle='#000';g.lineWidth=2;g.beginPath();g.arc(x,y,7,0,Math.PI*2);g.fill();g.stroke();
    g.strokeStyle='#fff';g.lineWidth=3;g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.sin(h)*18,y-Math.cos(h)*18);g.stroke();
  }
}

function gpuName(renderer){
  try{const gl=renderer.getContext(),d=gl.getExtension('WEBGL_debug_renderer_info');return d?String(gl.getParameter(d.UNMASKED_RENDERER_WEBGL)).slice(0,120):null;}catch{return null;}
}
// 10 m cells that contain LoD2 geometry (from the building meshes' vertices, every third vertex is enough).
function buildingCells(blockers){
  const cells=new Set();
  for(const mesh of blockers){
    const pos=mesh.geometry?.attributes?.position;if(!pos)continue;
    mesh.updateMatrixWorld?.();const e=mesh.matrixWorld?.elements;
    for(let i=0;i<pos.count;i+=3){
      let x=pos.getX(i),z=pos.getZ(i);
      if(e){const y=pos.getY(i),wx=e[0]*x+e[4]*y+e[8]*z+e[12],wz=e[2]*x+e[6]*y+e[10]*z+e[14];x=wx;z=wz;}
      cells.add(`${Math.floor(x/10)},${Math.floor(z/10)}`);
    }
  }
  return cells;
}
