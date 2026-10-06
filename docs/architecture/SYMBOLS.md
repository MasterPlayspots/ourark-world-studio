<!-- GENERIERT von scripts/architecture-index.mjs — nicht von Hand bearbeiten. Neu erzeugen: npm run docs:architecture -->
# Symbolregister — jede Variable, Funktion, Klasse und Eigenschaft

Basis: Commit `bd4850c` plus Arbeitsbaum. Ablageregel und Deutung: [README.md](README.md).

Erfasst werden alle Deklarationen auf Modulebene (`const`/`let`/`var`/`function`/`class`, auch destrukturiert), jede Klassenmethode, jedes Instanzfeld (`this.x=`), alle Imports und Exporte, jede DOM-ID, die ein Skript anspricht, jede Event-Bindung sowie Speicher-Schlüssel. Lokale Variablen innerhalb von Funktionsrümpfen sind absichtlich nicht aufgeführt, weil sie nicht über die Funktion hinaus wirken.

Nicht analysiert: Bibliotheken unter `vendor/` (Drittanbieter).

## Vertragsprüfung HTML ↔ Skript

| Skript | Seite | Angesprochene IDs (davon dynamische Präfixe) | IDs in HTML | Im Skript benutzt, im HTML fehlend | Im HTML, vom Skript nie direkt angesprochen |
|---|---|---:|---:|---|---|
| `dist/map-studio/editor.js` | `dist/map-studio/index.html` | 63 (`point-*`, `map-*`, `*-file`) | 90 | keine | `oaGlow`, `oaBg`, `walk-enter`, `stage`, `runtime-hud`, `runtime-state`, `runtime-fullscreen`, `runtime-pause`, `runtime-exit`, `runtime-hint`, `runtime-info`, `runtime-info-type`, `runtime-info-name`, `runtime-info-data`, `runtime-info-empty`, `runtime-info-close`, `runtime-perf`, `runtime-position`, `runtime-paused`, `runtime-pause-reason`, `runtime-resume` |
| `dist/world-studio/editor.js` | `dist/world-studio/index.html` | 84 (—) | 132 | keine | `oaGlow`, `oaBg`, `stage`, `runtime-hud`, `runtime-state`, `runtime-modes`, `runtime-fullscreen`, `runtime-pause`, `runtime-exit`, `runtime-hint`, `runtime-stick`, `runtime-info`, `runtime-info-type`, `runtime-info-name`, `runtime-info-data`, `runtime-info-empty`, `runtime-info-close`, `runtime-perf`, `runtime-position`, `runtime-paused`, `runtime-pause-reason`, `runtime-resume`, `position-unit`, `position-x`, `position-y`, `position-z`, `rotation-x`, `rotation-y`, `rotation-z`, `scale-x`, `scale-y`, `scale-z`, `device-check-title` |
| `dist/app.js` | `dist/index.html` | 45 (`prop-*`) | 77 | keine | `oaGlow`, `oaBg`, `workspace`, `spread`, `spread-value`, `orbit`, `orbit-value`, `tilt`, `tilt-value`, `selected-icon`, `position-unit` |

Die rechte Spalte ist kein Fehler an sich: viele IDs dienen nur Labels (`for=`), ARIA-Verweisen oder CSS.

## `dist/app.js`

18.653 Bytes · 73 Zeilen · Layereditor / geteilte Styles

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 3 | const | `$` |  | `(s)=>document.querySelector(s)` |
| 4 | const | `icons` |  | `{welcome:"grid",motion:"play",comfort:"sliders",activity:"layers",note:"note"}` |
| 5 | const | `defaults` |  | `[{id:"overview",type:"welcome",name:"Workspace overview",x:24,y:20,z:0,width:772,height:1…` |
| 12 | const | `systemMotion` |  | `matchMedia("(prefers-reduced-motion: reduce)")` |
| 13 | let | `state` |  | `{layers:structuredClone(defaults),selected:"motion",mode:"2d",zoom:1,spread:75,orbit:-18,…` |
| 14 | let | `fitted` |  | `1` |
| 14 | let | `toastTimer` |  |  |
| 14 | let | `dragging` |  | `null` |
| 15 | const | `selected` |  | `()=>state.layers.find(l=>l.id===state.selected)` |
| 16 | const | `icon` |  | `(name)=>ˋ<svg aria-hidden="true"><use href="#i-${name}"/></svg>ˋ` |
| 17 | const | `escape` |  | `(value)=>String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&q…` |
| 18 | function | `toast` |  | `(message)` |
| 19 | function | `contents` |  | `(l)` |
| 27 | function | `renderLayers` |  | `()` |
| 32 | function | `applyGeometry` |  | `()` |
| 36 | function | `syncInspector` |  | `()` |
| 37 | function | `selectLayer` |  | `(id,announce=false)` |
| 38 | function | `fit` |  | `()` |
| 39 | function | `setMode` |  | `(mode)` |
| 40 | function | `syncMotion` |  | `()` |
| 41 | function | `toggleMotion` |  | `()` |
| 42 | function | `setReduced` |  | `(value)` |
| 43 | function | `updateLayer` |  | `(updates)` |
| 49 | const | `endDrag` |  | `()=>{if(!dragging)return;dragging=null;document.body.classList.remove("is-dragging");appl…` |
| 56 | function | `resetCamera` |  | `()` |
| 61 | function | `addLayer` |  | `()` |
| 65 | function | `sceneData` |  | `()` |
| 68 | const | `context` |  | `document.modelContext` |

**DOM-IDs, die dieses Skript anspricht (45):** `toast`, `layer-list`, `scene-layers`, `layer-count`, `selected-heading`, `selected-type`, `layer-name`, `prop-*`, `opacity`, `opacity-value`, `radius`, `radius-value`, `lock-layer`, `viewport`, `scene`, `scene-dimensions`, `zoom-value`, `view-2d`, `view-3d`, `dimension-toggle`, `view-caption`, `dimension-status`, `canvas-hint`, `spatial-toolbar`, `motion-toggle`, `motion-state`, `reduce-motion`, `reduce-toggle`, `prop-x`, `prop-y`, `explore-3d`, `reset-camera`, `fit-view`, `zoom-in`, `zoom-out`, `grid-toggle`, `high-contrast`, `add-layer`, `add-layer-bottom`, `about`, `about-dialog`, `reset`, `reset-dialog`, `confirm-reset`, `export`

**Event-Bindungen**

| Zeile | Ereignis | Ziel |
|---:|---|---|
| 44 | `click` | `$("#layer-list")` |
| 45 | `click` | `$("#scene-layers")` |
| 46 | `keydown` | `$("#scene-layers")` |
| 47 | `pointerdown` | `$("#scene-layers")` |
| 48 | `pointermove` | `$("#scene-layers")` |
| 49 | `pointerup` | `$("#scene-layers")` |
| 49 | `pointercancel` | `$("#scene-layers")` |
| 50 | `change` | `$("#layer-name")` |
| 51 | `change` | `$("#prop-"+key)` |
| 52 | `input` | `$("#"+key)` |
| 53 | `click` | `$("#lock-layer")` |
| 54 | `click` | `$("#view-2d")` |
| 54 | `click` | `$("#view-3d")` |
| 54 | `click` | `$("#dimension-toggle")` |
| 54 | `click` | `$("#explore-3d")` |
| 55 | `input` | `$("#"+key)` |
| 57 | `click` | `$("#reset-camera")` |
| 57 | `click` | `$("#fit-view")` |
| 57 | `click` | `$("#zoom-in")` |
| 57 | `click` | `$("#zoom-out")` |
| 58 | `click` | `$("#grid-toggle")` |
| 59 | `click` | `$("#motion-toggle")` |
| 59 | `change` | `$("#reduce-motion")` |
| 59 | `click` | `$("#reduce-toggle")` |
| 59 | `change` | `systemMotion` |
| 60 | `change` | `$("#high-contrast")` |
| 62 | `click` | `$("#add-layer")` |
| 62 | `click` | `$("#add-layer-bottom")` |
| 63 | `click` | `$("#about")` |
| 63 | `click` | `b` |
| 63 | `click` | `d` |
| 64 | `click` | `$("#reset")` |
| 64 | `click` | `$("#confirm-reset")` |
| 66 | `click` | `$("#export")` |

## `dist/glass.css`

1.763 Bytes · 22 Zeilen · Layereditor / geteilte Styles

14 Regelblöcke · Media-Queries: `(max-width:760px)`

| CSS-Variable | Erster Wert |
|---|---|
| `--bg` | `#000` |
| `--panel` | `rgba(28,28,30,.55)` |
| `--panel2` | `rgba(44,44,46,.6)` |
| `--surface` | `rgba(44,44,46,.5)` |
| `--line` | `rgba(255,255,255,.09)` |
| `--line-soft` | `rgba(255,255,255,.06)` |
| `--ink` | `#f5f5f7` |
| `--muted` | `#a1a1a6` |
| `--muted2` | `#8e8e93` |
| `--glass-blur` | `saturate(180%) blur(24px)` |
| `--glass-edge` | `inset 0 1px 0 rgba(255,255,255,.06)` |

## `dist/globe/car.js`

4.568 Bytes · 78 Zeilen · Globus

**Exporte:** `CAR`, `Car`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 5 | const | `CAR` | ✓ | `Object.freeze({maxSpeed:55,maxReverse:8,accel:7,brake:14,drag:.0021,rolling:.6,wheelbase:…` |
| 21 | const | `clamp` |  | `(v,a,b)=>Math.min(b,Math.max(a,v))` |
| 22 | const | `wrap` |  | `a=>{const t=Math.PI*2;return((a+Math.PI)%t+t)%t-Math.PI;}` |
| 23 | const | `PROBE` |  | `2` |
| 24 | const | `REVERSE_HOLD` |  | `.6` |
| 26 | class | `Car` | ✓ |  |

**Klasse `Car`** (Zeile 26)

| Zeile | Methode | Modifikatoren | Parameter |
|---:|---|---|---|
| 27 | `constructor` |  | `({ground,params=CAR})` |
| 28 | `place` |  | `({x,z,heading=0})` |
| 33 | `slope` |  | `()` |
| 36 | `step` |  | `(dt,{throttle=0,steer=0,handbrake=false}={})` |

| Zeile | Instanzfeld | Erster Wert |
|---:|---|---|
| 27 | `ground` | `(Konstruktor-Option)` |
| 27 | `p` | `(Konstruktor-Option)` |
| 27 | `resets` | `0` |
| 29 | `state` | `{x,z,y:this.ground(x,z),heading,pitch:0,speed:0,vy:0,onGround:true,steer:0}` |
| 30 | `previous` | `{...this.state}` |
| 48 | `hold` | `(this.hold??0)+dt` |
| 52 | `wasStopped` | `throttle!==0&&Math.sign(throttle)!==Math.sign(before)` |

## `dist/globe/globe.css`

3.073 Bytes · 31 Zeilen · Globus

33 Regelblöcke · Media-Queries: `(max-width:820px)`

## `dist/globe/index.html`

1.362 Bytes · 7 Zeilen · Globus

Titel: Globe integration — Ourark World Studio · Skripte: inline/Modul · Stylesheets: 

**Element-IDs (0):** 

## `dist/globe/integration.html`

4.078 Bytes · 51 Zeilen · Globus

Titel: Globe — Ourark World Studio · Skripte: `/runtime/perf-meter.js`, `/globe/vendor/cesium/Cesium.js`, `/globe/main.js` · Stylesheets: `/globe/vendor/cesium/Widgets/CesiumWidget/CesiumWidget.css`, `/motionspec-theme.css`, `/glass.css`, `/globe/globe.css`, `/runtime/perf-meter.css`

**Element-IDs (15):** `globe`, `globe-status`, `globe-search`, `globe-query`, `globe-results`, `globe-mode`, `globe-speed`, `globe-agl`, `globe-pos`, `globe-view`, `globe-photo`, `globe-help-btn`, `globe-help`, `globe-attribution`, `globe-credits`

**data-Attribute:** `data-place`, `data-mode`

## `dist/globe/main.js`

29.273 Bytes · 392 Zeilen · Globus

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 5 | `../kart/plane.js` | `Plane` |
| 6 | `../kart/pedestrian.js` | `Pedestrian` |
| 7 | `./car.js` | `Car` |
| 8 | `../runtime/input.js` | `InputRouter` |
| 9 | `../runtime/assets/codec.js` | `decodeHeightFile`, `decodeBinaryFile`, `assetUrl`, `gunzip` |
| 10 | `./surface.js` | `buildSurface`, `SurfaceTiles`, `readSurfaceFile`, `utm32` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 12 | const | `Cesium` |  | `window.Cesium` |
| 13 | const | `STEP` |  | `1/120` |
| 13 | const | `MAX_CATCH_UP` |  | `.25` |
| 13 | const | `REANCHOR` |  | `1500` |
| 13 | const | `GRID` |  | `1.5` |
| 13 | const | `HEIGHT_TTL` |  | `2000` |
| 14 | const | `IMAGERY` |  | `"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y…` |
| 15 | const | `TERRAIN` |  | `"https://terrain.reearth.land/cesium-mesh/ellipsoid"` |
| 20 | const | `GEOID` |  | `46.9` |
| 21 | const | `KRONACH` |  | `{lon:11.324506,lat:50.240442,base:300+GEOID,half:500}` |
| 23 | const | `COUNTY_UTM` |  | `[654000,5558000,686000,5600000]` |
| 24 | const | `COUNTY_TILES` |  | `"/geo/kronach-lk-2/tileset.json"` |
| 25 | const | `GAMMA` |  | `Math.atan(Math.tan((KRONACH.lon-9)*Math.PI/180)*Math.sin(KRONACH.lat*Math.PI/180))` |
| 26 | const | `$` |  | `id=>document.getElementById(id)` |
| 27 | const | `ui` |  | `{status:$("globe-status"),mode:$("globe-mode"),speed:$("globe-speed"),agl:$("globe-agl"),…` |
| 30 | const | `LABEL` |  | `{travel:"Reisen",plane:"Flugzeug",car:"Auto",walk:"Zu Fuß"}` |
| 31 | const | `fmt` |  | `(v,d=0)=>v==null\|\|!Number.isFinite(v)?"–":v.toLocaleString("de-DE",{minimumFractionDigits…` |
| 33 | async function | `main` |  | `()` |

**DOM-IDs, die dieses Skript anspricht (15):** `globe-status`, `globe-mode`, `globe-speed`, `globe-agl`, `globe-pos`, `globe-search`, `globe-query`, `globe-results`, `globe-view`, `globe-photo`, `globe-help`, `globe-help-btn`, `globe-credits`, `globe-attribution`, `globe`

**Event-Bindungen**

| Zeile | Ereignis | Ziel |
|---:|---|---|
| 171 | `click` | `ui.photo` |
| 274 | `click` | `b` |
| 275 | `click` | `ui.view` |
| 276 | `click` | `ui.helpBtn` |
| 279 | `pointerdown` | `canvas` |
| 280 | `pointermove` | `canvas` |
| 289 | `click` | `b` |
| 290 | `submit` | `ui.search` |
| 300 | `click` | `b` |
| 305 | `keydown` | `ui.query` |

## `dist/globe/surface.js`

6.699 Bytes · 107 Zeilen · Globus

**Exporte:** `buildSurface`, `SurfaceGrid`, `utm32`, `readSurfaceFile`, `SurfaceTiles`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 9 | function | `buildSurface` | ✓ | `(heights,{width,depth,cell=1,scale=.01},buildings=null)` |
| 25 | function | `rasterise` |  | `(data,width,depth,cell,raw,t)` |
| 44 | function | `stamp` |  | `(data,width,depth,cell,x,y,z)` |
| 49 | class | `SurfaceGrid` | ✓ |  |
| 65 | function | `utm32` | ✓ | `(lon,lat)` |
| 76 | async function | `readSurfaceFile` | ✓ | `(bytes,gunzip)` |
| 86 | class | `SurfaceTiles` | ✓ |  |

**Klasse `SurfaceGrid`** (Zeile 49)

| Zeile | Methode | Modifikatoren | Parameter |
|---:|---|---|---|
| 50 | `constructor` |  | `(data,width,depth,cell,roofs)` |
| 52 | `covers` |  | `(x,z)` |
| 54 | `at` |  | `(x,z)` |

| Zeile | Instanzfeld | Erster Wert |
|---:|---|---|
| 50 | `data` | `(Konstruktor-Option)` |
| 50 | `width` | `(Konstruktor-Option)` |
| 50 | `depth` | `(Konstruktor-Option)` |
| 50 | `cell` | `(Konstruktor-Option)` |
| 50 | `roofs` | `(Konstruktor-Option)` |
| 50 | `half` | `Math.min(width,depth)*cell/2` |

**Klasse `SurfaceTiles`** (Zeile 86)

| Zeile | Methode | Modifikatoren | Parameter |
|---:|---|---|---|
| 87 | `constructor` |  | `({load,keep=16,onLoad=()=>{}})` |
| 88 | `tile` |  | `(te,tn)` |
| 100 | `at` |  | `(E,N)` |

| Zeile | Instanzfeld | Erster Wert |
|---:|---|---|
| 87 | `load` | `(Konstruktor-Option)` |
| 87 | `keep` | `(Konstruktor-Option)` |
| 87 | `onLoad` | `(Konstruktor-Option)` |
| 87 | `tiles` | `new Map()` |

## `dist/index.html`

14.354 Bytes · 80 Zeilen · Layereditor / geteilte Styles · byte-identisch mit `dist/studio/index.html`

Titel: Layer Studio — Ourark World Studio · Skripte: `/app.js`, `/runtime/perf-meter.js` · Stylesheets: `/styles.css`, `/motionspec-theme.css`, `/glass.css`, `/runtime/perf-meter.css`

**Element-IDs (77):** `i-layers`, `i-square`, `i-cube`, `i-grid`, `i-play`, `i-pause`, `i-plus`, `i-check`, `i-eye`, `i-lock`, `i-reset`, `i-export`, `i-move`, `i-sliders`, `i-info`, `i-close`, `i-text`, `i-note`, `i-chevron`, `oaGlow`, `oaBg`, `about`, `export`, `add-layer`, `layer-list`, `add-layer-bottom`, `explore-3d`, `reset`, `workspace`, `view-2d`, `view-3d`, `dimension-toggle`, `view-caption`, `grid-toggle`, `reset-camera`, `viewport`, `scene-dimensions`, `scene`, `scene-layers`, `canvas-hint`, `zoom-out`, `zoom-value`, `zoom-in`, `fit-view`, `spatial-toolbar`, `spread`, `spread-value`, `orbit`, `orbit-value`, `tilt`, `tilt-value`, `motion-toggle`, `motion-state`, `reduce-toggle`, `layer-count`, `dimension-status`, `selected-icon`, `selected-type`, `selected-heading`, `layer-name`, `position-unit`, `prop-x`, `prop-y`, `prop-z`, `lock-layer`, `prop-width`, `prop-height`, `opacity-value`, `opacity`, `radius-value`, `radius`, `reduce-motion`, `high-contrast`, `toast`, `about-dialog`, `reset-dialog`, `confirm-reset`

## `dist/kart/index.html`

1.440 Bytes · 7 Zeilen · Kart und Gelände

Titel: Kart integration — Ourark World Studio · Skripte: inline/Modul · Stylesheets: 

**Element-IDs (0):** 

## `dist/kart/insights.js`

17.102 Bytes · 222 Zeilen · Kart und Gelände

**Exporte:** `SAMPLE_MS`, `SEND_MS`, `FETCH_MS`, `CELL`, `TELEMETRY_FORMAT`, `utmToGeo`, `localToGeo`, `frameStats`, `median`, `PlaceGrid`, `fpsColor`, `observations`, `KartInsights`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 7 | const | `SAMPLE_MS` | ✓ | `1000` |
| 7 | const | `SEND_MS` | ✓ | `15000` |
| 7 | const | `FETCH_MS` | ✓ | `30000` |
| 7 | const | `CELL` | ✓ | `20` |
| 7 | const | `TELEMETRY_FORMAT` | ✓ | `"ourark.kart-telemetry.v1"` |
| 8 | const | `STORE_KEY` |  | `"ourark.kart.telemetry"` |
| 8 | const | `OPEN_KEY` |  | `"ourark.kart.insights"` |
| 11 | function | `utmToGeo` | ✓ | `(east,north,zone=32)` |
| 22 | function | `localToGeo` | ✓ | `(x,z,origin)` |
| 24 | function | `frameStats` | ✓ | `(intervals)` |
| 29 | const | `median` | ✓ | `v=>{if(!v.length)return null;const s=[...v].sort((a,b)=>a-b),m=s.length>>1;return s.lengt…` |
| 32 | class | `PlaceGrid` | ✓ |  |
| 38 | const | `fpsColor` | ✓ | `fps=>fps==null?"#888":fps>=55?"#4ade80":fps>=40?"#facc15":fps>=28?"#fb923c":"#ef4444"` |
| 41 | function | `observations` | ✓ | `({now,session,place,drawCalls,area,slowest,server})` |
| 54 | const | `hex16` |  | `()=>[...crypto.getRandomValues(new Uint8Array(8))].map(b=>b.toString(16).padStart(2,"0"))…` |
| 55 | const | `fmt` |  | `(v,d=0)=>v==null\|\|!Number.isFinite(v)?"–":v.toLocaleString("de-DE",{minimumFractionDigits…` |
| 56 | const | `MODE_LABEL` |  | `{kart:"Kart",plane:"Flugzeug",walk:"Zu Fuß"}` |
| 58 | class | `KartInsights` | ✓ |  |
| 206 | function | `gpuName` |  | `(renderer)` |
| 210 | function | `buildingCells` |  | `(blockers)` |

**Klasse `PlaceGrid`** (Zeile 32)

| Zeile | Methode | Modifikatoren | Parameter |
|---:|---|---|---|
| 33 | `constructor` |  | `(cell=CELL)` |
| 34 | `add` |  | `(x,z,fps)` |
| 35 | `list` |  | `()` |
| 36 | `slowest` |  | `(min=3)` |

| Zeile | Instanzfeld | Erster Wert |
|---:|---|---|
| 33 | `cell` | `cell` |
| 33 | `cells` | `new Map()` |

**Klasse `KartInsights`** (Zeile 58)

| Zeile | Methode | Modifikatoren | Parameter |
|---:|---|---|---|
| 61 | `constructor` |  | `({meta,mapName,renderer,state,image,blockers=[],track=null,button=null})` |
| 77 | `mark` |  | `(name)` |
| 79 | `frame` |  | `(now)` |
| 87 | `sample` |  | `(now)` |
| 100 | `flush` |  | `(leaving)` |
| 110 | `fetchServer` | async | `()` |
| 113 | `setOpen` |  | `(open)` |
| 118 | `buildPanel` |  | `()` |
| 137 | `paint` |  | `(s,stats)` |
| 182 | `areaAround` |  | `(x,z)` |
| 187 | `drawMap` |  | `(st,server)` |

| Zeile | Instanzfeld | Erster Wert |
|---:|---|---|
| 62 | `meta` | `(Konstruktor-Option)` |
| 62 | `mapName` | `(Konstruktor-Option)` |
| 62 | `renderer` | `(Konstruktor-Option)` |
| 62 | `state` | `(Konstruktor-Option)` |
| 62 | `image` | `(Konstruktor-Option)` |
| 62 | `track` | `(Konstruktor-Option)` |
| 62 | `button` | `(Konstruktor-Option)` |
| 63 | `session` | `hex16()` |
| 63 | `seq` | `0` |
| 63 | `queue` | `[]` |
| 63 | `intervals` | `[]` |
| 63 | `last` | `0` |
| 63 | `lastSample` | `performance.now()` |
| 63 | `lastSend` | `performance.now()` |
| 64 | `samples` | `[]` |
| 64 | `grid` | `new PlaceGrid()` |
| 64 | `distance` | `0` |
| 64 | `marks` | `[]` |
| 64 | `server` | `null` |
| 64 | `serverAt` | `0` |
| 64 | `sent` | `0` |
| 64 | `sendErrors` | `0` |
| 65 | `buildCells` | `buildingCells(blockers)` |
| 66 | `enabled` | `localStorage.getItem(STORE_KEY)!=="0"` |
| 67 | `device` | `{gpu:gpuName(renderer),mobile:matchMedia("(pointer:coarse)").matches,dpr:devicePixelRatio…` |
| 82 | `lastCalls` | `info.calls` |
| 82 | `lastTris` | `info.triangles` |
| 114 | `open` | `open` |
| 131 | `panel` | `p` |
| 135 | `map` | `p.querySelector(".ki-map")` |
| 135 | `ctx` | `this.map.getContext("2d")` |

**Event-Bindungen**

| Zeile | Ereignis | Ziel |
|---:|---|---|
| 75 | `visibilitychange` | `document` |
| 132 | `click` | `p.querySelector(".ki-close")` |
| 134 | `change` | `box` |

**Speicherzugriffe**

| Zeile | API | Schlüssel |
|---:|---|---|
| 66 | `localStorage.getItem` | `STORE_KEY (Konstante)` |
| 70 | `localStorage.getItem` | `OPEN_KEY (Konstante)` |
| 115 | `localStorage.setItem` | `OPEN_KEY (Konstante)` |
| 134 | `localStorage.setItem` | `STORE_KEY (Konstante)` |

## `dist/kart/integration.html`

3.781 Bytes · 45 Zeilen · Kart und Gelände

Titel: Kart — Ourark World Studio · Skripte: `/runtime/perf-meter.js`, `./main.js` · Stylesheets: `/motionspec-theme.css`, `/glass.css`, `./kart.css`, `/runtime/perf-meter.css`

**Element-IDs (18):** `kart-canvas`, `kart-title`, `kart-status`, `kart-lap`, `kart-time`, `kart-best`, `kart-speed`, `kart-banner`, `kart-wrong`, `kart-overlay`, `kart-heading`, `kart-intro`, `kart-start`, `kart-view`, `kart-fly`, `kart-walk`, `kart-insights`, `kart-attribution`

**data-Attribute:** `data-map`, `data-touch`

## `dist/kart/kart.css`

5.806 Bytes · 66 Zeilen · Kart und Gelände

63 Regelblöcke · Media-Queries: `(pointer:coarse)`, `(max-width:640px)`, `(max-width:600px)`

## `dist/kart/kart.js`

7.591 Bytes · 141 Zeilen · Kart und Gelände

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 4 | `../runtime/sim/snapshot.js` | `StateLayout`, `saveOptional`, `loadOptional` |

**Exporte:** `KART`, `KART_STATE`, `MAX_LAPS`, `isForwardOnTrack`, `Kart`, `Race`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 6 | const | `KART` | ✓ | `Object.freeze({maxSpeed:20,verge:9,reverse:5,accel:9,brake:20,rolling:.6,drag:.012,wheelb…` |
| 25 | const | `KART_STATE` | ✓ | `new StateLayout([["x"],["z"],["y"],["heading"],["speed"],["vy"],["steer"],["grounded","bo…` |
| 27 | const | `RACE_STATE` |  | `new StateLayout([["lap"],["sector"],["time"],["lapStart"],["best","nullable"],["finished"…` |
| 28 | const | `MAX_LAPS` | ✓ | `16` |
| 30 | const | `clamp` |  | `(v,a,b)=>Math.min(b,Math.max(a,v))` |
| 31 | const | `wrap` |  | `a=>{const t=Math.PI*2;return((a+Math.PI)%t+t)%t-Math.PI;}` |
| 34 | function | `isForwardOnTrack` | ✓ | `({heading,speed},{tx,tz})` |
| 38 | class | `Kart` | ✓ |  |
| 106 | class | `Race` | ✓ |  |

**Klasse `Kart`** (Zeile 38)

| Zeile | Methode | Modifikatoren | Parameter |
|---:|---|---|---|
| 39 | `constructor` |  | `({track,start=0,lane=0,params=KART})` |
| 43 | `reset` |  | `(s=0,lane=0)` |
| 49 | `stateSize` | get | `()` |
| 50 | `saveState` |  | `(buf,offset)` |
| 51 | `loadState` |  | `(buf,offset)` |
| 53 | `step` |  | `(dt,{throttle=0,steer=0}={})` |

| Zeile | Instanzfeld | Erster Wert |
|---:|---|---|
| 40 | `track` | `track` |
| 40 | `p` | `params` |
| 40 | `proj` | `{}` |
| 46 | `state` | `{x,z,y:t.heightAt(sample.s),heading:Math.atan2(sample.tx,-sample.tz),speed:0,vy:0,steer:0…` |
| 47 | `previous` | `{...this.state}` |

**Klasse `Race`** (Zeile 106)

| Zeile | Methode | Modifikatoren | Parameter |
|---:|---|---|---|
| 107 | `constructor` |  | `({length,sectors=4,laps=3})` |
| 108 | `reset` |  | `()` |
| 110 | `stateSize` | get | `()` |
| 111 | `saveState` |  | `(buf,offset)` |
| 116 | `loadState` |  | `(buf,offset)` |
| 122 | `update` |  | `(dt,s,forward=true)` |

| Zeile | Instanzfeld | Erster Wert |
|---:|---|---|
| 107 | `length` | `(Konstruktor-Option)` |
| 107 | `sectors` | `(Konstruktor-Option)` |
| 107 | `laps` | `(Konstruktor-Option)` |
| 108 | `lap` | `1` |
| 108 | `sector` | `0` |
| 108 | `time` | `0` |
| 108 | `lapStart` | `0` |
| 108 | `lapTimes` | `[]` |
| 108 | `best` | `null` |
| 108 | `finished` | `false` |
| 108 | `lastSector` | `0` |
| 108 | `wrongWay` | `false` |

## `dist/kart/main.js`

43.815 Bytes · 634 Zeilen · Kart und Gelände

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 3 | `../worlds/vendor/three.module.js` | `THREE` |
| 4 | `./track.js` | `Track` |
| 5 | `./kart.js` | `Kart`, `Race`, `isForwardOnTrack` |
| 6 | `./plane.js` | `Plane` |
| 7 | `./pedestrian.js` | `Pedestrian`, `FOOT` |
| 8 | `./insights.js` | `KartInsights` |
| 9 | `../runtime/net/client.js` | `NetClient` |
| 10 | `../runtime/gpu/cull.js` | `EntityCuller`, `cullCpu`, `cameraFrom`, `LOD`, `CULLED` |
| 11 | `../runtime/perf-probes.js` | `registerPerfProbe` |
| 12 | `../runtime/lod/chunk-lod.js` | `ChunkLod` |
| 13 | `../runtime/input.js` | `InputRouter` |
| 14 | `../runtime/frame-loop.js` | `FrameLoop` |
| 15 | `../runtime/hud.js` | `Hud` |
| 16 | `../runtime/quality.js` | `AdaptiveResolution`, `shadowMapSize` |
| 17 | `../runtime/gpu-context.js` | `watchGpuContext` |
| 18 | `../runtime/sim/snapshot.js` | `SimSnapshot` |
| 19 | `../runtime/assets/codec.js` | `decodeHeightFile`, `assetUrl` |
| 20 | `./scenery.js` | `terrainMaterial`, `skyDome`, `loadBuildings`, `loadTrees`, `loadLand`, `cameraBlocker`, `asphaltTexture`, `gravelTexture` |

**Exporte:** `crossingGaps`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 22 | const | `STEP` |  | `1/120` |
| 22 | const | `MAX_CATCH_UP` |  | `.25` |
| 22 | const | `COUNTDOWN` |  | `3` |
| 23 | const | `$` |  | `id=>document.getElementById(id)` |
| 24 | const | `ui` |  | `{canvas:$("kart-canvas"),status:$("kart-status"),lap:$("kart-lap"),time:$("kart-time"),be…` |
| 27 | const | `clamp1` |  | `v=>Math.max(-1,Math.min(1,v))` |
| 28 | const | `fmt` |  | `t=>t==null?"–":ˋ${Math.floor(t/60)}:${(t%60).toFixed(2).padStart(5,"0")}ˋ` |
| 29 | const | `smoothstep` |  | `(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);}` |
| 34 | const | `ASSETS` |  | `new URL("./assets/",import.meta.url)` |
| 35 | async function | `loadMap` |  | `(name)` |
| 47 | async function | `upgradePhoto` |  | `(meta,scene,preview)` |
| 57 | function | `terrainSampler` |  | `(heights,{width,depth,cell,scale})` |
| 66 | function | `sampleGrid` |  | `(track,cell=10)` |
| 78 | function | `buildTerrain` |  | `(meta,ground,track,texture)` |
| 98 | function | `ribbon` |  | `(track,a,b,yOf,{color=null,colors=null,skirt=0,skip=null,map=null}={})` |
| 122 | function | `crossingGaps` | ✓ | `(track,offset)` |
| 137 | function | `buildCourse` |  | `(track)` |
| 173 | function | `buildKart` |  | `()` |
| 190 | function | `buildPlane` |  | `()` |
| 212 | function | `buildWalker` |  | `()` |
| 221 | async function | `main` |  | `()` |

**DOM-IDs, die dieses Skript anspricht (18):** `kart-canvas`, `kart-status`, `kart-lap`, `kart-time`, `kart-best`, `kart-speed`, `kart-banner`, `kart-wrong`, `kart-attribution`, `kart-title`, `kart-overlay`, `kart-start`, `kart-view`, `kart-fly`, `kart-walk`, `kart-insights`, `kart-heading`, `kart-intro`

**Event-Bindungen**

| Zeile | Ereignis | Ziel |
|---:|---|---|
| 310 | `click` | `ui.start` |
| 337 | `click` | `ui.walk` |
| 338 | `click` | `ui.fly` |
| 359 | `pointerdown` | `ui.canvas` |
| 360 | `pointermove` | `ui.canvas` |
| 365 | `click` | `ui.view` |
| 371 | `pointerdown` | `button` |

## `dist/kart/pedestrian.js`

4.421 Bytes · 78 Zeilen · Kart und Gelände

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 3 | `../runtime/sim/snapshot.js` | `StateLayout`, `saveOptional`, `loadOptional` |

**Exporte:** `FOOT`, `FOOT_STATE`, `Pedestrian`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 5 | const | `FOOT` | ✓ | `Object.freeze({walk:1.6,run:4.2,turnRate:2.2,maxPitch:1.3,eye:1.7,radius:.35,jump:4.6,gra…` |
| 18 | const | `PROBE` |  | `.5` |
| 20 | const | `FOOT_STATE` | ✓ | `new StateLayout([["x"],["z"],["y"],["heading"],["pitch"],["vy"],["onGround","bool"],["spe…` |
| 22 | const | `clamp` |  | `(v,a,b)=>Math.min(b,Math.max(a,v))` |
| 23 | const | `wrap` |  | `a=>{const t=Math.PI*2;return((a+Math.PI)%t+t)%t-Math.PI;}` |
| 25 | class | `Pedestrian` | ✓ |  |

**Klasse `Pedestrian`** (Zeile 25)

| Zeile | Methode | Modifikatoren | Parameter |
|---:|---|---|---|
| 28 | `constructor` |  | `({ground,blocked=()=>false,params=FOOT})` |
| 29 | `stateSize` | get | `()` |
| 30 | `saveState` |  | `(buf,offset)` |
| 31 | `loadState` |  | `(buf,offset)` |
| 32 | `place` |  | `({x,z,heading=0})` |
| 37 | `step` |  | `(dt,{forward=0,strafe=0,turn=0,run=false,jump=false}={})` |
| 63 | `canMove` |  | `(x,z)` |
| 75 | `look` |  | `(dHeading,dPitch)` |
| 76 | `eye` |  | `()` |
| 77 | `forward` |  | `()` |

| Zeile | Instanzfeld | Erster Wert |
|---:|---|---|
| 28 | `ground` | `(Konstruktor-Option)` |
| 28 | `blocked` | `(Konstruktor-Option)` |
| 28 | `p` | `(Konstruktor-Option)` |
| 28 | `state` | `null` |
| 28 | `previous` | `{}` |

## `dist/kart/plane.js`

5.621 Bytes · 87 Zeilen · Kart und Gelände

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 4 | `../runtime/sim/snapshot.js` | `StateLayout`, `saveOptional`, `loadOptional` |

**Exporte:** `PLANE`, `PLANE_STATE`, `Plane`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 6 | const | `PLANE` | ✓ | `Object.freeze({cruise:38,minThrottle:0,maxThrottle:1,defaultThrottle:.55,maxSpeed:75,stal…` |
| 26 | const | `PLANE_STATE` | ✓ | `new StateLayout([["x"],["z"],["y"],["heading"],["pitch"],["roll"],["speed"],["throttle"],…` |
| 29 | const | `clamp` |  | `(v,a,b)=>Math.min(b,Math.max(a,v))` |
| 30 | const | `wrap` |  | `a=>{const t=Math.PI*2;return((a+Math.PI)%t+t)%t-Math.PI;}` |
| 32 | class | `Plane` | ✓ |  |

**Klasse `Plane`** (Zeile 32)

| Zeile | Methode | Modifikatoren | Parameter |
|---:|---|---|---|
| 34 | `constructor` |  | `({ground,params=PLANE})` |
| 35 | `stateSize` | get | `()` |
| 36 | `saveState` |  | `(buf,offset)` |
| 37 | `loadState` |  | `(buf,offset)` |
| 39 | `launch` |  | `({x,z,heading=0,height=80})` |
| 44 | `forward` |  | `()` |
| 46 | `step` |  | `(dt,{pitch=0,roll=0,yaw=0,throttle=0}={})` |
| 85 | `crash` |  | `()` |
| 86 | `height` |  | `()` |

| Zeile | Instanzfeld | Erster Wert |
|---:|---|---|
| 34 | `ground` | `ground` |
| 34 | `p` | `params` |
| 34 | `crashes` | `0` |
| 34 | `state` | `null` |
| 34 | `previous` | `{}` |

## `dist/kart/scenery.js`

19.969 Bytes · 292 Zeilen · Kart und Gelände

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 4 | `../worlds/vendor/three.module.js` | `THREE` |
| 5 | `../runtime/assets/codec.js` | `decodeHeightFile`, `decodeBinaryFile`, `assetUrl` |

**Exporte:** `sandstoneTexture`, `facadeTexture`, `asphaltTexture`, `gravelTexture`, `terrainMaterial`, `skyDome`, `loadBuildings`, `loadTrees`, `cameraBlocker`, `loadLand`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 8 | function | `random` |  | `(seed)` |
| 9 | function | `canvas` |  | `(size)` |
| 10 | function | `grain` |  | `(ctx,size,amount,rand)` |
| 15 | function | `texture` |  | `(c,repeat=true)` |
| 22 | function | `sandstoneTexture` | ✓ | `()` |
| 25 | function | `drawSandstone` |  | `(ctx,size,metres,rand)` |
| 46 | function | `facadeTexture` | ✓ | `(base)` |
| 62 | function | `asphaltTexture` | ✓ | `()` |
| 70 | function | `gravelTexture` | ✓ | `()` |
| 78 | function | `detailTexture` |  | `()` |
| 87 | function | `terrainMaterial` | ✓ | `(photo,{rock=null}={})` |
| 112 | function | `skyDome` | ✓ | `(sunDirection,{zenith=0x5f93cf,horizon=0xdce8f1}={})` |
| 126 | async function | `loadBuildings` | ✓ | `(url,{width,depth},photo,{walls="plaster",track=null,packing=null}={})` |
| 183 | function | `merge` |  | `(parts)` |
| 188 | function | `shade` |  | `(geo,centre=new THREE.Vector3())` |
| 198 | function | `crownGeometry` |  | `(rand)` |
| 207 | function | `coniferGeometry` |  | `()` |
| 211 | function | `trunkGeometry` |  | `()` |
| 215 | async function | `loadTrees` | ✓ | `(url,track)` |
| 253 | function | `cameraBlocker` | ✓ | `(objects)` |
| 265 | async function | `loadLand` | ✓ | `(name,mapMeta)` |

## `dist/kart/track.js`

6.088 Bytes · 105 Zeilen · Kart und Gelände

**Exporte:** `SAMPLE_SPACING`, `sampleClosedSpline`, `smoothClosed`, `featureHeight`, `Track`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 4 | const | `SAMPLE_SPACING` | ✓ | `1` |
| 7 | function | `sampleClosedSpline` | ✓ | `(points,spacing=SAMPLE_SPACING)` |
| 32 | function | `smoothClosed` | ✓ | `(values,window)` |
| 42 | function | `featureHeight` | ✓ | `(feature,s,length)` |
| 50 | class | `Track` | ✓ |  |

**Klasse `Track`** (Zeile 50)

| Zeile | Methode | Modifikatoren | Parameter |
|---:|---|---|---|
| 53 | `constructor` |  | `({points,width=10,shoulder=3,groundAt=()=>0,smoothing=25,features=[],start=0})` |
| 72 | `halfWidth` | get | `()` |
| 73 | `limit` | get | `()` |
| 75 | `heightAt` |  | `(s)` |
| 81 | `sampleAt` |  | `(s)` |
| 84 | `project` |  | `(x,z,hint=null,window=40,out={})` |
| 94 | `scanNearest` |  | `(x,z,from,count)` |

| Zeile | Instanzfeld | Erster Wert |
|---:|---|---|
| 55 | `length` | `length` |
| 55 | `width` | `width` |
| 55 | `shoulder` | `shoulder` |
| 55 | `features` | `[]` |
| 64 | `samples` | `rotated.map((p,i)=>{const a=rotated[(i-1+n)%n],b=rotated[(i+1)%n],tx=b.x-a.x,tz=b.z-a.z,l…` |
| 68 | `spacing` | `length/n` |

## `dist/map-studio/editor.js`

27.797 Bytes · 269 Zeilen · Map Studio

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 1 | `./model.js` | `demoDocument`, `validateDocument`, `newPoint`, `copy`, `editableShell`, `categories`, `MAX_POINTS`, `MAX_MAP_METRES`, `resizePoint`, `MAX_IMAGE_BYTES`, `MAX_UPLOAD_BYTES`, `movePoint`, `withType`, `enhanceTarget`, `enhancedName` |
| 2 | `./history.js` | `ProjectHistory` |
| 3 | `./storage.js` | `loadLocal`, `saveLocal`, `listLocal`, `loadProject`, `SaveConflict`, `SaveRevisionLimit` |
| 4 | `./project.js` | `readProject`, `serializeProject`, `projectBytes`, `checkEditBudget`, `newWorldId`, `MAX_PROJECT_BYTES`, `budgetText`, `mb` |
| 5 | `../runtime/map-adapter.js` | `prepareWalk` |
| 6 | `../runtime/net/protocol.js` | `mapFitsNetwork`, `ROOM_BOUND` |
| 7 | `../runtime/frozen.js` | `isValidated` |
| 8 | `../runtime/walk-host.js` | `createWalkMode`, `LABELS_DE` |
| 242 | `./renderer.js` | `(dynamisch)` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 10 | const | `$` |  | `id=>document.getElementById(id)` |
| 12 | let | `dragPoints` |  | `null` |
| 12 | let | `dragIndex` |  | `-1` |
| 13 | let | `doc` |  | `demoDocument()` |
| 13 | let | `meta` |  | `{worldId:newWorldId(),revision:0}` |
| 13 | let | `docBytes` |  | `projectBytes(doc,meta)` |
| 13 | let | `selected` |  | `doc.points[0].id` |
| 13 | let | `mode` |  | `"2d"` |
| 13 | let | `renderer` |  | `null` |
| 13 | let | `dirty` |  | `false` |
| 13 | let | `revision` |  | `0` |
| 13 | let | `placing` |  | `false` |
| 13 | let | `dragBefore` |  | `null` |
| 13 | let | `noticeTimer` |  |  |
| 13 | let | `importing` |  | `false` |
| 14 | const | `history` |  | `new ProjectHistory()` |
| 14 | const | `labelPool` |  | `[]` |
| 14 | const | `rows` |  | `new Map()` |
| 17 | const | `MAX_LABELS` |  | `60` |
| 17 | let | `pointById` |  | `new Map()` |
| 17 | let | `rowOrder` |  | `""` |
| 17 | let | `pressedRow` |  | `null` |
| 18 | const | `current` |  | `()=>pointById.get(selected)??doc.points.find(p=>p.id===selected)` |
| 19 | function | `notice` |  | `(message)` |
| 20 | function | `setStatus` |  | `(message)` |
| 21 | function | `networkHint` |  | `(map)` |
| 22 | function | `historyControls` |  | `()` |
| 23 | function | `markChanged` |  | `()` |
| 24 | const | `editing` |  | `()=>session.state==="editing"` |
| 26 | function | `assertEditing` |  | `()` |
| 29 | const | `dragging` |  | `()=>dragBefore!==null` |
| 30 | const | `DRAG_BUSY` |  | `"Bitte zuerst den gezogenen Punkt ablegen."` |
| 31 | function | `mutate` |  | `(action,message)` |
| 39 | function | `editPoint` |  | `(key,value)` |
| 40 | function | `select` |  | `(id)` |
| 41 | function | `renderList` |  | `()` |
| 64 | function | `renderInspector` |  | `()` |
| 75 | function | `renderLabels` |  | `()` |
| 81 | function | `placeLabels` |  | `(positions)` |
| 93 | function | `updateLabelSelection` |  | `()` |
| 94 | function | `render` |  | `()` |
| 101 | function | `add` |  | `(x=0,z=0)` |
| 105 | function | `setPlacing` |  | `(value)` |
| 106 | function | `setMode` |  | `(value)` |
| 107 | function | `stepHistory` |  | `(direction)` |
| 111 | function | `openProject` |  | `(next,nextMeta,message,{saved=false}={})` |
| 125 | async function | `showLocalProjects` |  | `()` |
| 140 | function | `fileData` |  | `(file)` |
| 141 | async function | `decodeImage` |  | `(dataUrl)` |
| 142 | async function | `withImport` |  | `(input,action)` |
| 152 | let | `enhancing` |  | `false` |
| 153 | const | `decimal` |  | `n=>n.toLocaleString("de-DE",{maximumFractionDigits:1})` |
| 199 | const | `choose` |  | `kind=>{$("import-dialog").close();$(ˋ${kind}-fileˋ).click();}` |
| 230 | const | `session` |  | `createWalkMode({$,getRenderer:()=>renderer,getDocument:()=>doc,notice,labels:LABELS_DE,ed…` |
| 268 | const | `restoreRevision` |  | `0` |

**DOM-IDs, die dieses Skript anspricht (63):** `notice`, `status`, `undo`, `redo`, `count`, `point-list`, `add`, `place`, `properties`, `no-selection`, `type-badge`, `focus`, `selection-info`, `selected-name`, `point-id`, `point-*`, `point-visible`, `point-locked`, `geometry`, `point-data`, `data-apply`, `delete`, `duplicate`, `data-error`, `labels`, `project-name`, `title`, `map-width`, `map-depth`, `map-color`, `map-name`, `map-detail`, `image-remove`, `image-enhance`, `attribution`, `snap`, `controls`, `view-2d`, `view-3d`, `projection`, `local-projects`, `local-list`, `import-dialog`, `map-*`, `overview`, `save`, `export`, `import`, `help`, `help-dialog`, `*-file`, `image-import`, `choose-image`, `choose-points`, `choose-project`, `image-file`, `project-file`, `points-file`, `canvas`, `point-x`, `point-z`, `fallback-text`, `fallback`

**Event-Bindungen**

| Zeile | Ereignis | Ziel |
|---:|---|---|
| 49 | `click` | `row` |
| 76 | `click` | `button` |
| 131 | `click` | `button` |
| 147 | `change` | `$("project-name")` |
| 148 | `change` | `$(ˋmap-${key}ˋ)` |
| 149 | `change` | `$("map-color")` |
| 154 | `click` | `$("image-enhance")` |
| 172 | `click` | `$("image-remove")` |
| 173 | `change` | `$(ˋpoint-${key}ˋ)` |
| 174 | `change` | `$(ˋpoint-${key}ˋ)` |
| 175 | `click` | `b` |
| 176 | `click` | `$("data-apply")` |
| 177 | `click` | `$("add")` |
| 177 | `click` | `$("place")` |
| 177 | `click` | `$("view-2d")` |
| 177 | `click` | `$("view-3d")` |
| 177 | `click` | `$("overview")` |
| 177 | `click` | `$("focus")` |
| 177 | `change` | `$("snap")` |
| 178 | `click` | `$("undo")` |
| 178 | `click` | `$("redo")` |
| 179 | `click` | `$("delete")` |
| 180 | `click` | `$("duplicate")` |
| 181 | `click` | `$("save")` |
| 193 | `click` | `$("export")` |
| 198 | `click` | `$("import")` |
| 198 | `click` | `$("help")` |
| 198 | `click` | `b` |
| 199 | `click` | `$("image-import")` |
| 199 | `click` | `$("choose-image")` |
| 199 | `click` | `$("choose-points")` |
| 199 | `click` | `$("choose-project")` |
| 200 | `change` | `$("image-file")` |
| 205 | `change` | `$("project-file")` |
| 211 | `change` | `$("points-file")` |
| 217 | `keydown` | `window` |
| 239 | `beforeunload` | `window` |

## `dist/map-studio/history.js`

922 Bytes · 21 Zeilen · Map Studio

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 1 | `./model.js` | `History` |

**Exporte:** `ProjectHistory`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 6 | class | `ProjectHistory` | ✓ |  |

**Klasse `ProjectHistory`** extends `History` (Zeile 6)

| Zeile | Methode | Modifikatoren | Parameter |
|---:|---|---|---|
| 7 | `pack` |  | `({doc,meta})` |
| 12 | `unpack` |  | `(entry)` |
| 15 | `step` |  | `(from,to,current)` |

## `dist/map-studio/index.html`

13.630 Bytes · 20 Zeilen · Map Studio

Titel: Map Studio — Ourark World Studio · Skripte: `/map-studio/editor.js`, `/runtime/perf-meter.js` · Stylesheets: `/map-studio/studio.css`, `/glass.css`, `/runtime/perf-meter.css`

**Element-IDs (90):** `oaGlow`, `oaBg`, `import`, `export`, `save`, `project-name`, `map-name`, `map-detail`, `image-import`, `image-enhance`, `map-width`, `map-depth`, `map-color`, `image-remove`, `count`, `add`, `point-list`, `help`, `title`, `view-2d`, `view-3d`, `walk-enter`, `place`, `overview`, `focus`, `undo`, `redo`, `snap`, `stage`, `attribution`, `canvas`, `labels`, `projection`, `controls`, `selection-info`, `runtime-hud`, `runtime-state`, `runtime-fullscreen`, `runtime-pause`, `runtime-exit`, `runtime-hint`, `runtime-info`, `runtime-info-type`, `runtime-info-name`, `runtime-info-data`, `runtime-info-empty`, `runtime-info-close`, `runtime-perf`, `runtime-position`, `runtime-paused`, `runtime-pause-reason`, `runtime-resume`, `fallback`, `fallback-text`, `status`, `type-badge`, `no-selection`, `properties`, `selected-name`, `duplicate`, `point-name`, `point-type`, `point-visible`, `point-locked`, `point-solid`, `point-interactive`, `geometry`, `point-x`, `point-z`, `point-width`, `point-depth`, `point-height`, `point-rotation`, `point-color`, `point-data`, `data-error`, `data-apply`, `point-id`, `delete`, `import-dialog`, `choose-image`, `choose-points`, `choose-project`, `local-projects`, `local-list`, `help-dialog`, `image-file`, `project-file`, `points-file`, `notice`

**data-Attribute:** `data-color`

## `dist/map-studio/model.js`

17.552 Bytes · 218 Zeilen · Map Studio

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 1 | `../runtime/geometry/polygon.js` | `isSimple` |
| 2 | `../runtime/frozen.js` | `markValidated`, `isValidated`, `validatedJson` |

**Exporte:** `SCHEMA`, `LEGACY_SCHEMA`, `MAX_POINTS`, `MAX_MAP_METRES`, `MAX_FOOTPRINT_VERTICES`, `MAX_TOTAL_FOOTPRINT_VERTICES`, `SURFACE_KINDS`, `RIBBON_KINDS`, `MAX_SURFACES`, `MAX_SURFACE_POINTS`, `MAX_UPLOAD_BYTES`, `MAX_IMAGE_BYTES`, `ENHANCE_LONG_SIDE`, `categories`, `copy`, `copyKeepingImage`, `clamp`, `editableShell`, `walkDefaults`, `withType`, `newPoint`, `demoDocument`, `validateDocument`, `resizePoint`, `enhanceTarget`, `enhancedName`, `mapToWorld`, `worldToMap`, `movePoint`, `HISTORY_LIMIT`, `History`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 5 | const | `SCHEMA` | ✓ | `"motionspec.map.v3"` |
| 6 | const | `LEGACY_SCHEMA` | ✓ | `"motionspec.map.v1"` |
| 7 | const | `READABLE` |  | `new Set([LEGACY_SCHEMA,"motionspec.map.v2",SCHEMA])` |
| 8 | const | `MAX_POINTS` | ✓ | `5000` |
| 9 | const | `MAX_MAP_METRES` | ✓ | `5000` |
| 10 | const | `MAX_FOOTPRINT_VERTICES` | ✓ | `64` |
| 12 | const | `MAX_TOTAL_FOOTPRINT_VERTICES` | ✓ | `100000` |
| 15 | const | `SURFACE_KINDS` | ✓ | `["land","park","beach","water","parking","road","path"]` |
| 16 | const | `RIBBON_KINDS` | ✓ | `new Set(["road","path"])` |
| 17 | const | `MAX_SURFACES` | ✓ | `20000` |
| 18 | const | `MAX_SURFACE_POINTS` | ✓ | `400000` |
| 20 | const | `MAX_POINTS_PER_SURFACE` |  | `5000` |
| 20 | const | `MAX_AREA_POINTS` |  | `2000` |
| 20 | const | `SURFACE_MARGIN` |  | `50` |
| 21 | const | `MAX_SIZE` |  | `300` |
| 23 | const | `MAX_UPLOAD_BYTES` | ✓ | `4*1024*1024` |
| 24 | const | `MAX_IMAGE_BYTES` | ✓ | `8*1024*1024` |
| 25 | const | `ENHANCE_LONG_SIDE` | ✓ | `3840` |
| 26 | const | `categories` | ✓ | `{building:"Gebäude",station:"Station",marker:"Datenpunkt"}` |
| 27 | const | `copy` | ✓ | `value=>structuredClone(value)` |
| 30 | const | `copyKeepingImage` | ✓ | `doc=>{const clone=copy({...doc,map:{...doc.map,image:null}});clone.map.image=doc.map.imag…` |
| 31 | const | `clamp` | ✓ | `(n,min,max)=>Math.max(min,Math.min(max,n))` |
| 36 | const | `VALID_SURFACES` |  | `new WeakMap()` |
| 38 | const | `editableShell` | ✓ | `doc=>({...doc,map:{...doc.map},runtime:{...doc.runtime,spawn:doc.runtime?.spawn?{...doc.r…` |
| 39 | const | `number` |  | `(value,min,max,name)=>{if(typeof value!=="number"\|\|!Number.isFinite(value)\|\|value<min\|\|va…` |
| 43 | const | `text` |  | `(value,max,name)=>{if(typeof value!=="string"\|\|value.length>max)throw new Error(ˋ${name}:…` |
| 49 | function | `walkDefaults` | ✓ | `(type)` |
| 50 | const | `flag` |  | `(value,fallback,name)=>{if(value===undefined)return fallback;if(typeof value!=="boolean")…` |
| 56 | function | `withType` | ✓ | `(point,type)` |
| 57 | function | `newPoint` | ✓ | `(index=1)` |
| 60 | function | `demoDocument` | ✓ | `()` |
| 64 | function | `validateDocument` | ✓ | `(input)` |
| 103 | const | `SIMPLE` |  | `new Set()` |
| 103 | const | `SIMPLE_LIMIT` |  | `50000` |
| 104 | function | `validateSurfaces` |  | `(surfaces,map)` |
| 122 | function | `validateFootprint` |  | `(footprint)` |
| 135 | const | `round` |  | `n=>Math.round(n*1000)/1000` |
| 136 | function | `extent` |  | `(footprint)` |
| 138 | function | `resizePoint` | ✓ | `(point,key,value)` |
| 144 | function | `validateRuntime` |  | `(runtime)` |
| 153 | function | `enhanceTarget` | ✓ | `({width,height},longSide=ENHANCE_LONG_SIDE)` |
| 157 | function | `enhancedName` | ✓ | `(name,contentType)` |
| 162 | function | `mapToWorld` | ✓ | `(u,v,map)` |
| 163 | function | `worldToMap` | ✓ | `(x,z,map)` |
| 164 | function | `movePoint` | ✓ | `(point,x,z,map,snap=false)` |
| 168 | const | `HISTORY_LIMIT` | ✓ | `35` |
| 172 | class | `History` | ✓ |  |

**Klasse `History`** (Zeile 172)

| Zeile | Methode | Modifikatoren | Parameter |
|---:|---|---|---|
| 173 | `constructor` |  | `()` |
| 178 | `pack` |  | `(doc)` |
| 187 | `text` |  | `(value)` |
| 188 | `object` |  | `(json)` |
| 189 | `same` | static | `(a,b)` |
| 195 | `unpack` |  | `(entry)` |
| 200 | `release` |  | `()` |
| 210 | `record` |  | `(before,after)` |
| 215 | `step` |  | `(from,to,current)` |
| 216 | `undo` |  | `(current)` |
| 217 | `redo` |  | `(current)` |

| Zeile | Instanzfeld | Erster Wert |
|---:|---|---|
| 173 | `past` | `[]` |
| 173 | `future` | `[]` |
| 173 | `images` | `new Map()` |
| 173 | `imageIds` | `new Map()` |
| 173 | `nextImage` | `1` |
| 173 | `objects` | `new Map()` |
| 173 | `pruneAt` | `20000` |

## `dist/map-studio/project.js`

6.116 Bytes · 89 Zeilen · Map Studio

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 5 | `./model.js` | `validateDocument` |
| 6 | `../runtime/frozen.js` | `isValidated`, `validatedJson` |

**Exporte:** `ENVELOPE_SCHEMA`, `MAX_PROJECT_BYTES`, `newWorldId`, `validateMeta`, `readProject`, `envelope`, `serializeProject`, `utf8Length`, `projectBytes`, `mb`, `budgetText`, `checkEditBudget`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 8 | const | `ENVELOPE_SCHEMA` | ✓ | `"ourark.map-project.v1"` |
| 11 | const | `MAX_PROJECT_BYTES` | ✓ | `16*1024*1024` |
| 12 | const | `MAX_GEO_REFERENCE_CHARS` |  | `4000` |
| 12 | const | `MAX_REVISION` |  | `2**31-1` |
| 13 | const | `ID` |  | `/^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/` |
| 15 | const | `newWorldId` | ✓ | `()=>crypto.randomUUID()` |
| 16 | const | `id` |  | `(value,name)=>{if(typeof value!=="string"\|\|!ID.test(value))throw new Error(ˋ${name}: 1 bi…` |
| 20 | function | `validateMeta` | ✓ | `(input,{lenient=false}={})` |
| 38 | function | `readProject` | ✓ | `(input)` |
| 52 | function | `envelope` | ✓ | `(doc,meta)` |
| 60 | const | `serializeProject` | ✓ | `(doc,meta)=>JSON.stringify(envelope(doc,meta))` |
| 63 | const | `encoder` |  | `new TextEncoder()` |
| 64 | const | `utf8Length` | ✓ | `text=>encoder.encode(text).length` |
| 67 | const | `ITEM_BYTES` |  | `new WeakMap()` |
| 68 | const | `itemBytes` |  | `value=>{if(!isValidated(value))return utf8Length(JSON.stringify(value));let bytes=ITEM_BY…` |
| 73 | const | `arrayBytes` |  | `items=>{let sum=Math.max(0,items.length-1);for(const item of items)sum+=itemBytes(item);r…` |
| 76 | function | `projectBytes` | ✓ | `(doc,meta)` |
| 83 | const | `mb` | ✓ | `bytes=>(bytes/1048576).toLocaleString("de-DE",{maximumFractionDigits:1})` |
| 84 | const | `budgetText` | ✓ | `()=>ˋ${mb(MAX_PROJECT_BYTES)} MBˋ` |
| 86 | function | `checkEditBudget` | ✓ | `(beforeBytes,afterBytes)` |

## `dist/map-studio/renderer.js`

15.602 Bytes · 132 Zeilen · Map Studio

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 1 | `../worlds/vendor/three.module.js` | `THREE` |
| 2 | `../worlds/vendor/OrbitControls.js` | `OrbitControls` |
| 3 | `../worlds/vendor/TransformControls.js` | `TransformControls` |
| 4 | `./model.js` | `movePoint` |
| 5 | `../runtime/city-layer.js` | `makePoint`, `release`, `CityLayer` |
| 6 | `../runtime/ground-layer.js` | `groundMesh`, `groundKey`, `BASE_ORDER` |
| 7 | `../runtime/frozen.js` | `isValidated` |

**Exporte:** `makePoint`, `release`, `createCameras`, `MapRenderer`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 8 | const | `GROUND_KEYS` |  | `new WeakMap()` |
| 9 | const | `groundKeyOf` |  | `surfaces=>{if(!isValidated(surfaces))return groundKey(surfaces);let key=GROUND_KEYS.get(s…` |
| 14 | const | `STATS` |  | `new URLSearchParams(globalThis.location?.search??"").has("stats")` |
| 15 | function | `createCameras` | ✓ | `()` |
| 21 | class | `MapRenderer` | ✓ |  |
| 132 | const | `clampZoom` |  | `n=>Math.max(.2,Math.min(n,12))` |

**Klasse `MapRenderer`** (Zeile 21)

| Zeile | Methode | Modifikatoren | Parameter |
|---:|---|---|---|
| 22 | `constructor` |  | `(canvas,callbacks={})` |
| 43 | `bindCanvas` |  | `()` |
| 48 | `unbindCanvas` |  | `()` |
| 50 | `enterRuntime` |  | `(start,eye=1.6)` |
| 58 | `placePlayer` |  | `({x,z,heading=0,pitch=0},eye=1.6)` |
| 60 | `showColliders` |  | `(colliders)` |
| 65 | `clearColliders` |  | `()` |
| 67 | `setRenderScale` |  | `(scale)` |
| 68 | `exitRuntime` |  | `()` |
| 77 | `connectOrbit` |  | `()` |
| 80 | `pointer` |  | `(e)` |
| 81 | `groundHit` |  | `(e)` |
| 82 | `pick` |  | `(e)` |
| 83 | `down` |  | `(e)` |
| 92 | `move` |  | `(e)` |
| 93 | `up` |  | `(e)` |
| 102 | `cancelDrag` |  | `()` |
| 104 | `follow` |  | `(doc)` |
| 105 | `sync` |  | `(doc,selection)` |
| 118 | `items` | get | `()` |
| 119 | `select` |  | `(id)` |
| 120 | `setSnap` |  | `(value)` |
| 121 | `setPlacing` |  | `(value)` |
| 122 | `setMode` |  | `(mode)` |
| 123 | `overview` |  | `()` |
| 124 | `focus` |  | `()` |
| 125 | `resize` |  | `()` |
| 126 | `request` |  | `()` |
| 128 | `draw` |  | `()` |
| 129 | `projectLabels` |  | `()` |
| 130 | `dispose` |  | `()` |

| Zeile | Instanzfeld | Erster Wert |
|---:|---|---|
| 23 | `canvas` | `canvas` |
| 23 | `callbacks` | `callbacks` |
| 23 | `mode` | `"2d"` |
| 23 | `selected` | `null` |
| 23 | `snap` | `true` |
| 23 | `placing` | `false` |
| 23 | `frame` | `0` |
| 23 | `imageVersion` | `0` |
| 23 | `imageKey` | `null` |
| 24 | `scene` | `new THREE.Scene()` |
| 24 | `city` | `new CityLayer(this.scene)` |
| 25 | `renderer` | `new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:"low-power"})` |
| 25 | `editorPixelRatio` | `Math.min(devicePixelRatio\|\|1,2)` |
| 25 | `renderScale` | `this.editorPixelRatio` |
| 26 | `cameras` | `createCameras()` |
| 26 | `camera` | `this.cameras.top` |
| 28 | `ground` | `new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:"#1c1c1c"}…` |
| 29 | `grid` | `new THREE.GridHelper(1,24,"#404040","#2e2e2e")` |
| 30 | `border` | `new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.5,0,-.5)…` |
| 31 | `selectionBox` | `new THREE.Box3Helper(new THREE.Box3(),"#f2f2f2")` |
| 33 | `transform` | `new TransformControls(this.camera,canvas)` |
| 37 | `ray` | `new THREE.Raycaster()` |
| 37 | `plane` | `new THREE.Plane(new THREE.Vector3(0,1,0),0)` |
| 39 | `resizeObserver` | `new ResizeObserver(()=>this.resize())` |
| 40 | `visibilityHandler` | `()=>{if(!document.hidden)this.request();}` |
| 44 | `handlers` | `{pointerdown:e=>this.down(e),pointermove:e=>this.move(e),pointerup:e=>this.up(e),pointerc…` |
| 53 | `saved` | `{mode:this.mode,selected:this.selected,camera:this.camera,position:this.camera.position.c…` |
| 54 | `runtime` | `true` |
| 61 | `colliderDebug` | `new THREE.Group()` |
| 78 | `orbit` | `new OrbitControls(this.camera,this.canvas)` |
| 84 | `startPointer` | `{x:e.clientX,y:e.clientY,gizmo:this.mode==="3d"&&this.transform.axis!==null}` |
| 89 | `drag` | `{id:p.id,pointer:e.pointerId,offsetX:p.x-hit.x,offsetZ:p.z-hit.z}` |
| 104 | `doc` | `doc` |
| 110 | `groundKey` | `key` |
| 110 | `surfaces` | `groundMesh(doc.surfaces)` |

**Event-Bindungen**

| Zeile | Ereignis | Ziel |
|---:|---|---|
| 34 | `change` | `this.transform` |
| 35 | `dragging-changed` | `this.transform` |
| 36 | `objectChange` | `this.transform` |
| 40 | `visibilitychange` | `document` |
| 78 | `change` | `this.orbit` |

## `dist/map-studio/storage.js`

5.563 Bytes · 87 Zeilen · Map Studio

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 4 | `./project.js` | `envelope`, `readProject`, `validateMeta` |

**Exporte:** `LEGACY_WORLD_ID`, `projectKey`, `SaveConflict`, `SaveRevisionLimit`, `openStore`, `loadLocal`, `listLocal`, `loadProject`, `saveLocal`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 6 | const | `DB_NAME` |  | `"motionspec-map-studio-v1"` |
| 6 | const | `STORE` |  | `"projects"` |
| 6 | const | `LEGACY_KEY` |  | `"current"` |
| 6 | const | `LAST_KEY` |  | `"last"` |
| 8 | const | `LEGACY_WORLD_ID` | ✓ | `"lokal-altbestand"` |
| 9 | const | `projectKey` | ✓ | `worldId=>ˋproject:${worldId}ˋ` |
| 10 | class | `SaveConflict` | ✓ |  |
| 11 | class | `SaveRevisionLimit` | ✓ |  |
| 13 | async function | `openStore` | ✓ | `(idb=globalThis.indexedDB)` |
| 24 | async function | `transact` |  | `(idb,mode,work)` |
| 33 | const | `read` |  | `(idb,key)=>transact(idb,"readonly",store=>{const request=store.get(key);return()=>request…` |
| 36 | async function | `loadLocal` | ✓ | `({idb}={})` |
| 49 | async function | `migrate` |  | `(idb,{meta,doc})` |
| 59 | async function | `listLocal` | ✓ | `({idb}={})` |
| 67 | async function | `loadProject` | ✓ | `(worldId,{idb}={})` |
| 71 | async function | `saveLocal` | ✓ | `(doc,meta,{idb}={})` |

**Klasse `SaveConflict`** extends `Error` (Zeile 10)

**Klasse `SaveRevisionLimit`** extends `Error` (Zeile 11)

## `dist/map-studio/studio.css`

16.668 Bytes · 12 Zeilen · Map Studio

227 Regelblöcke · Media-Queries: `(min-width:1600px)`, `(max-width:1200px)`, `(max-width:1000px)`, `(max-width:700px)`, `(prefers-reduced-motion:reduce)`, `(forced-colors:active)`, `(min-width:1001px)`

| CSS-Variable | Erster Wert |
|---|---|
| `--bg` | `#131313` |
| `--panel` | `#1b1b1b` |
| `--panel2` | `#292929` |
| `--line` | `#333333` |
| `--teal` | `#4ade80` |
| `--ink` | `#f2f2f2` |
| `--muted` | `#bababa` |
| `--mono` | `'JetBrains Mono',ui-monospace,monospace` |

## `dist/motionspec-theme.css`

17.690 Bytes · 287 Zeilen · Layereditor / geteilte Styles

212 Regelblöcke · Media-Queries: `(prefers-reduced-motion:no-preference)`, `(max-width:1240px)`, `(max-width:1000px)`, `(max-width:650px)`, `(forced-colors:active)`, `(prefers-reduced-transparency:reduce)`, `(prefers-contrast:more)`, `(prefers-reduced-motion:reduce)`

| CSS-Variable | Erster Wert |
|---|---|
| `--bg` | `#131313` |
| `--panel` | `#1b1b1b` |
| `--panel2` | `#292929` |
| `--surface` | `#1e1e1e` |
| `--line` | `#333333` |
| `--line-soft` | `#333333` |
| `--teal` | `#4ade80` |
| `--teal2` | `#86efac` |
| `--mint` | `var(--teal)` |
| `--mint-light` | `var(--teal2)` |
| `--ink` | `#f2f2f2` |
| `--muted` | `#bababa` |
| `--muted2` | `#989898` |
| `--sans` | `-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Te` |
| `--mono` | `ui-monospace,'SF Mono',SFMono-Regular,'JetBrains Mono',Menlo` |
| `--glass-base` | `#222222` |
| `--glass-line` | `rgba(74, 222, 128, 0.64)` |
| `--glass-blur` | `26px` |
| `--glass-sat` | `180%` |
| `--glass-fill` | `linear-gradient(180deg,rgba(39,39,39,.60),rgba(19,19,19,.50)` |
| `--glass-fill-strong` | `linear-gradient(180deg,rgba(44,44,44,.78),rgba(21,21,21,.66)` |
| `--glass-edge` | `inset 0 1px 0 rgba(236,236,236,.16)` |
| `--glass-hairline` | `1px solid rgba(218,218,218,.14)` |
| `--glass-shadow` | `0 10px 34px rgba(0,0,0,.34)` |
| `--glass-shadow-lg` | `0 28px 74px rgba(0,0,0,.46)` |
| `--ease-spring` | `cubic-bezier(.22,1,.36,1)` |

## `dist/runtime/assets/codec.js`

3.201 Bytes · 55 Zeilen · Runtime (Begehmodus)

**Exporte:** `HEIGHT_PACKING`, `GZIP_PACKING`, `gunzip`, `encodeHeightPlanes`, `decodeHeightPlanes`, `decodeHeightFile`, `decodeBinaryFile`, `assetUrl`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 10 | const | `HEIGHT_PACKING` | ✓ | `"delta-planes+gzip"` |
| 10 | const | `GZIP_PACKING` | ✓ | `"gzip"` |
| 13 | async function | `gunzip` | ✓ | `(source)` |
| 19 | function | `encodeHeightPlanes` | ✓ | `(values,width,depth)` |
| 30 | function | `decodeHeightPlanes` | ✓ | `(planes,width,depth)` |
| 41 | async function | `decodeHeightFile` | ✓ | `(bytes,{width,depth,packing})` |
| 48 | async function | `decodeBinaryFile` | ✓ | `(bytes,packing)` |
| 55 | const | `assetUrl` | ✓ | `(base,file,hash)=>{const url=new URL(file,base);if(hash)url.searchParams.set("v",hash);re…` |

## `dist/runtime/camera-rig.js`

6.694 Bytes · 95 Zeilen · Runtime (Begehmodus)

**Exporte:** `CAMERA_MODES`, `THIRD`, `FLY`, `direction`, `segmentEnters`, `segmentExits`, `thirdPersonView`, `FlyController`, `sourceView`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 8 | const | `CAMERA_MODES` | ✓ | `Object.freeze(["first","third","fly","source"])` |
| 9 | const | `THIRD` | ✓ | `Object.freeze({distance:2.2,height:.35,aim:.3,margin:.15,minDistance:.35})` |
| 10 | const | `FLY` | ✓ | `Object.freeze({speed:2.2,pitchLimit:85})` |
| 11 | const | `rad` |  | `d=>d*Math.PI/180` |
| 12 | const | `wrap` |  | `degrees=>{const d=((degrees+180)%360+360)%360-180;return d===-180?180:d;}` |
| 13 | const | `clamp` |  | `(v,min,max)=>Math.max(min,Math.min(max,v))` |
| 15 | function | `direction` | ✓ | `(heading,pitch=0)` |
| 19 | function | `segmentEnters` | ✓ | `(a,b,vertices)` |
| 34 | function | `segmentExits` | ✓ | `(a,b,vertices)` |
| 48 | function | `thirdPersonView` | ✓ | `(pose,{eye,colliders=[],area=null,ceilingY=Infinity,scale=1})` |
| 62 | class | `FlyController` | ✓ |  |
| 91 | function | `sourceView` | ✓ | `(camera,time)` |

**Klasse `FlyController`** (Zeile 62)

| Zeile | Methode | Modifikatoren | Parameter |
|---:|---|---|---|
| 63 | `constructor` |  | `({bounds,speed=FLY.speed,physics=null})` |
| 64 | `place` |  | `({x,y,z,heading=0,pitch=0})` |
| 69 | `clamped` |  | `(p)` |
| 71 | `step` |  | `(dt,{x=0,z=0,up=0,turn=0})` |
| 79 | `look` |  | `(dx,dy,perPixel=.25)` |
| 83 | `interpolated` |  | `(alpha)` |
| 87 | `view` |  | `(pose=this.pose)` |

| Zeile | Instanzfeld | Erster Wert |
|---:|---|---|
| 63 | `bounds` | `bounds` |
| 63 | `speed` | `speed` |
| 63 | `physics` | `physics` |
| 63 | `pose` | `{x:0,y:0,z:0,heading:0,pitch:0}` |
| 63 | `previous` | `{...this.pose}` |

## `dist/runtime/city-layer.js`

9.960 Bytes · 132 Zeilen · Runtime (Begehmodus)

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 4 | `../worlds/vendor/three.module.js` | `THREE` |
| 5 | `./frozen.js` | `isValidated` |

**Exporte:** `makePoint`, `release`, `TILE_AXIS`, `TILE_MIN`, `CityLayer`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 8 | const | `UNIT` |  | `{}` |
| 9 | function | `unit` |  | `(type)` |
| 16 | function | `makePoint` | ✓ | `(record)` |
| 34 | function | `release` | ✓ | `(root)` |
| 41 | const | `TILE_AXIS` | ✓ | `6` |
| 41 | const | `TILE_MIN` | ✓ | `250` |
| 42 | const | `RENDER_KEYS` |  | `["type","x","z","width","depth","height","rotation","color","visible","footprint"]` |
| 43 | const | `signature` |  | `point=>JSON.stringify(RENDER_KEYS.map(key=>point[key]))` |
| 44 | const | `batchMaterial` |  | `new THREE.MeshStandardMaterial({vertexColors:true,roughness:.64,metalness:.12})` |
| 45 | const | `batchLines` |  | `new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.55})` |
| 47 | function | `mergeInto` |  | `(parts,withNormals)` |
| 64 | class | `CityLayer` | ✓ |  |

**Klasse `CityLayer`** (Zeile 64)

| Zeile | Methode | Modifikatoren | Parameter |
|---:|---|---|---|
| 66 | `constructor` |  | `(parent)` |
| 68 | `sync` |  | `(doc,selection)` |
| 104 | `setLive` |  | `(id)` |
| 110 | `rebuildTiles` |  | `(keys)` |
| 125 | `pickables` |  | `()` |
| 127 | `dispose` |  | `()` |

| Zeile | Instanzfeld | Erster Wert |
|---:|---|---|
| 66 | `parent` | `parent` |
| 66 | `items` | `new Map()` |
| 66 | `signatures` | `new Map()` |
| 66 | `records` | `new Map()` |
| 66 | `tiles` | `new Map()` |
| 66 | `tileOf` | `new Map()` |
| 66 | `live` | `null` |
| 66 | `tileSize` | `0` |
| 66 | `doc` | `null` |

## `dist/runtime/device-check.js`

3.267 Bytes · 47 Zeilen · Runtime (Begehmodus)

**Exporte:** `DEVICE_CHECK_FORMAT`, `CHECK`, `A2`, `summarize`, `deviceInfo`, `reportText`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 4 | const | `DEVICE_CHECK_FORMAT` | ✓ | `"motionspec.device-check.v1"` |
| 5 | const | `CHECK` | ✓ | `Object.freeze({seconds:20,warmupShare:.4})` |
| 7 | const | `A2` | ✓ | `Object.freeze({fps:57,p95:20})` |
| 9 | const | `percentile` |  | `(sorted,q)=>sorted.length?sorted[Math.min(sorted.length-1,Math.floor(sorted.length*q))]:0` |
| 10 | const | `round` |  | `(v,d=2)=>Math.round(v*10**d)/10**d` |
| 13 | function | `summarize` | ✓ | `(frames,scales)` |
| 26 | function | `deviceInfo` | ✓ | `(canvas)` |
| 39 | function | `reportText` | ✓ | `(report)` |

## `dist/runtime/frame-loop.js`

2.757 Bytes · 45 Zeilen · Runtime (Begehmodus)

**Exporte:** `FrameLoop`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 7 | const | `browserClock` |  | `()=>({now:()=>performance.now(),raf:fn=>requestAnimationFrame(fn),caf:id=>cancelAnimation…` |
| 9 | class | `FrameLoop` | ✓ |  |

**Klasse `FrameLoop`** (Zeile 9)

| Zeile | Methode | Modifikatoren | Parameter |
|---:|---|---|---|
| 10 | `constructor` |  | `({step=1/60,maxFrame=.25,maxSteps=Math.ceil(.25/step),simulate=()=>{},render=()=>{},onError=null,clock=browse…` |
| 16 | `start` |  | `()` |
| 21 | `stop` |  | `()` |
| 26 | `pause` |  | `()` |
| 27 | `resume` |  | `()` |
| 28 | `schedule` |  | `()` |
| 29 | `halt` |  | `()` |
| 30 | `frame` |  | `(now)` |

| Zeile | Instanzfeld | Erster Wert |
|---:|---|---|
| 11 | `step` | `(Konstruktor-Option)` |
| 11 | `maxFrame` | `(Konstruktor-Option)` |
| 11 | `maxSteps` | `(Konstruktor-Option)` |
| 11 | `simulate` | `(Konstruktor-Option)` |
| 11 | `render` | `(Konstruktor-Option)` |
| 11 | `onError` | `(Konstruktor-Option)` |
| 11 | `clock` | `(Konstruktor-Option)` |
| 11 | `doc` | `(Konstruktor-Option)` |
| 12 | `running` | `false` |
| 12 | `paused` | `false` |
| 12 | `frameId` | `0` |
| 12 | `last` | `0` |
| 12 | `accumulator` | `0` |
| 12 | `steps` | `0` |
| 13 | `frame` | `this.frame.bind(this)` |
| 14 | `visibility` | `()=>{if(this.doc.hidden)this.halt();else if(this.running&&!this.paused)this.schedule();}` |

## `dist/runtime/frozen.js`

1.380 Bytes · 19 Zeilen · Runtime (Begehmodus)

**Exporte:** `deepFreeze`, `markValidated`, `isValidated`, `validatedJson`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 4 | const | `DEEP` |  | `new WeakSet()` |
| 4 | const | `VALIDATED` |  | `new WeakSet()` |
| 6 | function | `deepFreeze` | ✓ | `(value)` |
| 11 | const | `markValidated` | ✓ | `value=>{deepFreeze(value);VALIDATED.add(value);return value;}` |
| 12 | const | `isValidated` | ✓ | `value=>Boolean(value)&&typeof value==="object"&&VALIDATED.has(value)` |
| 15 | const | `JSON_TEXT` |  | `new WeakMap()` |
| 16 | function | `validatedJson` | ✓ | `(value)` |

## `dist/runtime/geometry/polygon.js`

5.599 Bytes · 92 Zeilen · Runtime (Begehmodus)

**Exporte:** `signedArea`, `isSimple`, `containsPoint`, `isConvex`, `triangulate`, `convexParts`, `convexHull`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 3 | const | `EPS` |  | `1e-9` |
| 4 | const | `cross` |  | `(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0])` |
| 7 | function | `signedArea` | ✓ | `(poly)` |
| 9 | function | `segmentsTouch` |  | `(a,b,c,d)` |
| 17 | function | `isSimple` | ✓ | `(poly)` |
| 33 | function | `containsPoint` | ✓ | `(poly,{x,z})` |
| 38 | function | `isConvex` | ✓ | `(poly)` |
| 40 | const | `ccw` |  | `poly=>signedArea(poly)<0?[...poly].reverse():poly` |
| 42 | function | `earIndices` |  | `(poly)` |
| 62 | function | `triangulate` | ✓ | `(poly)` |
| 66 | function | `convexParts` | ✓ | `(poly)` |
| 89 | function | `convexHull` | ✓ | `(points)` |

## `dist/runtime/gpu-context.js`

804 Bytes · 10 Zeilen · Runtime (Begehmodus)

**Exporte:** `watchGpuContext`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 5 | function | `watchGpuContext` | ✓ | `(canvas,{onLost=()=>{},onRestored=()=>{}}={})` |

**Event-Bindungen**

| Zeile | Ereignis | Ziel |
|---:|---|---|
| 8 | `webglcontextlost` | `canvas` |
| 8 | `webglcontextrestored` | `canvas` |

## `dist/runtime/gpu/cull.js`

8.376 Bytes · 145 Zeilen · Runtime (Begehmodus)

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 6 | `../sim/layout.js` | `WGSL_ENTITY`, `ENTITY_BYTES` |

**Exporte:** `LOD`, `CULLED`, `cameraFrom`, `cullCpu`, `WGSL_CULL`, `EntityCuller`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 8 | const | `LOD` | ✓ | `Object.freeze({NEAR:0,MID:1,FAR:2})` |
| 9 | const | `CULLED` | ✓ | `255` |
| 10 | const | `ACTIVE` |  | `1<<8` |
| 10 | const | `CAMERA_FLOATS` |  | `32` |
| 13 | function | `cameraFrom` | ✓ | `({position,forward,viewProj,lod=[30,90,250],radius=3})` |
| 21 | function | `cullCpu` | ✓ | `(f32,u32,count,cam,out=new Uint8Array(count))` |
| 38 | const | `WGSL_CULL` | ✓ | `ˋ${WGSL_ENTITY}
struct Camera {
  viewProj: mat4x4<f32>,
  pos: vec4<f32>,
  forward: vec…` |
| 75 | class | `EntityCuller` | ✓ |  |

**Klasse `EntityCuller`** (Zeile 75)

| Zeile | Methode | Modifikatoren | Parameter |
|---:|---|---|---|
| 76 | `create` | static async | `({capacity,gpu=globalThis.navigator?.gpu,preferGpu=true}={})` |
| 81 | `constructor` |  | `(capacity)` |
| 82 | `initGpu` | async | `(gpu)` |
| 103 | `cull` | async | `(bytes,count,cam)` |
| 117 | `note` |  | `(backend,count,totalMs,phase=null)` |
| 120 | `cullGpu` | async | `(bytes,count,cam)` |
| 135 | `selfTest` | async | `(count=Math.min(this.capacity,10000))` |

| Zeile | Instanzfeld | Erster Wert |
|---:|---|---|
| 81 | `capacity` | `capacity` |
| 81 | `backend` | `"cpu"` |
| 81 | `busy` | `false` |
| 81 | `lastMs` | `0` |
| 81 | `gpuError` | `null` |
| 81 | `lastStats` | `null` |
| 89 | `gpu` | `{device,pipeline,entities:device.createBuffer({size:n*ENTITY_BYTES,usage:S.STORAGE\|S.COPY…` |
| 104 | `phase` | `null` |

## `dist/runtime/ground-layer.js`

4.413 Bytes · 66 Zeilen · Runtime (Begehmodus)

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 6 | `../worlds/vendor/three.module.js` | `THREE` |
| 7 | `./geometry/polygon.js` | `triangulate`, `isSimple` |

**Exporte:** `GROUND_STYLE`, `buildGround`, `GROUND_ORDER`, `BASE_ORDER`, `groundKey`, `groundMesh`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 9 | const | `GROUND_STYLE` | ✓ | `{land:{color:"#27353b",y:0},park:{color:"#3d7a55",y:.02},beach:{color:"#e3cf9c",y:.02},wa…` |
| 14 | function | `ribbon` |  | `(points,width)` |
| 30 | function | `buildGround` | ✓ | `(surfaces=[])` |
| 51 | const | `groundMaterial` |  | `()=>new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,metalness:0,depthTest…` |
| 53 | const | `GROUND_ORDER` | ✓ | `-1` |
| 53 | const | `BASE_ORDER` | ✓ | `-2` |
| 56 | function | `groundKey` | ✓ | `(surfaces)` |
| 62 | function | `groundMesh` | ✓ | `(surfaces)` |

## `dist/runtime/hud.js`

1.921 Bytes · 30 Zeilen · Runtime (Begehmodus)

**Exporte:** `HUD_RATE_HZ`, `Hud`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 6 | const | `HUD_RATE_HZ` | ✓ | `10` |
| 8 | class | `Hud` | ✓ |  |

**Klasse `Hud`** (Zeile 8)

| Zeile | Methode | Modifikatoren | Parameter |
|---:|---|---|---|
| 10 | `constructor` |  | `(elements,{rateHz=HUD_RATE_HZ,clock=()=>performance.now()}={})` |
| 15 | `text` |  | `(name,value)` |
| 18 | `live` |  | `(name,value)` |
| 19 | `flush` |  | `()` |
| 20 | `show` |  | `(name,visible)` |
| 24 | `write` |  | `(name,value)` |
| 29 | `forget` |  | `(name)` |

| Zeile | Instanzfeld | Erster Wert |
|---:|---|---|
| 11 | `elements` | `elements` |
| 11 | `interval` | `1000/rateHz` |
| 11 | `clock` | `clock` |
| 12 | `shown` | `new Map()` |
| 12 | `visible` | `new Map()` |
| 12 | `pending` | `new Map()` |
| 12 | `lastFlush` | `-Infinity` |
| 12 | `writes` | `0` |

## `dist/runtime/input.js`

3.338 Bytes · 49 Zeilen · Runtime (Begehmodus)

**Exporte:** `BINDINGS`, `COMMANDS`, `InputRouter`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 4 | const | `BINDINGS` | ✓ | `{KeyW:"forward",ArrowUp:"forward",KeyS:"back",ArrowDown:"back",KeyA:"left",ArrowLeft:"lef…` |
| 10 | const | `COMMANDS` | ✓ | `{Escape:"pause",KeyR:"reset",Enter:"interact",Space:"interact",Digit1:"view1",Digit2:"vie…` |
| 11 | const | `EDITABLE` |  | `"input,textarea,select,[contenteditable=\"true\"],[contenteditable=\"\"]"` |
| 13 | class | `InputRouter` | ✓ |  |

**Klasse `InputRouter`** (Zeile 13)

| Zeile | Methode | Modifikatoren | Parameter |
|---:|---|---|---|
| 14 | `constructor` |  | `({window:win=globalThis.window,document:doc=globalThis.document,onCommand=()=>{},onFocusLoss=()=>{}}={})` |
| 21 | `activate` |  | `()` |
| 26 | `deactivate` |  | `()` |
| 31 | `clear` |  | `()` |
| 32 | `lose` |  | `(reason)` |
| 34 | `isDown` |  | `(action)` |
| 36 | `axes` |  | `()` |
| 37 | `ignored` |  | `(event)` |
| 38 | `keydown` |  | `(event)` |
| 48 | `keyup` |  | `(event)` |

| Zeile | Instanzfeld | Erster Wert |
|---:|---|---|
| 15 | `win` | `(Konstruktor-Option)` |
| 15 | `doc` | `(Konstruktor-Option)` |
| 15 | `onCommand` | `(Konstruktor-Option)` |
| 15 | `onFocusLoss` | `(Konstruktor-Option)` |
| 17 | `held` | `new Set()` |
| 17 | `down` | `Object.create(null)` |
| 17 | `active` | `false` |
| 18 | `keydown` | `this.keydown.bind(this)` |
| 18 | `keyup` | `this.keyup.bind(this)` |
| 19 | `blur` | `()=>this.lose("blur")` |
| 19 | `visibility` | `()=>{if(this.doc.hidden)this.lose("hidden");}` |

**Event-Bindungen**

| Zeile | Ereignis | Ziel |
|---:|---|---|
| 23 | `keydown` | `this.win` |
| 23 | `keyup` | `this.win` |
| 23 | `blur` | `this.win` |
| 24 | `visibilitychange` | `this.doc` |

## `dist/runtime/lod/chunk-lod.js`

2.694 Bytes · 41 Zeilen · Runtime (Begehmodus)

**Exporte:** `ChunkLod`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 8 | const | `ORIGIN` |  | `Object.freeze({x:0,y:0,z:0})` |
| 10 | class | `ChunkLod` | ✓ |  |
| 41 | const | `bytesOf` |  | `geometry=>Object.values(geometry?.attributes??{}).reduce((sum,a)=>sum+(a.array?.byteLengt…` |

**Klasse `ChunkLod`** (Zeile 10)

| Zeile | Methode | Modifikatoren | Parameter |
|---:|---|---|---|
| 11 | `constructor` |  | `(meshes,{shadowDistance=260,viewDistance=1400,budgetBytes=64e6,evictAfterMs=10000,now=()=>performance.now()}=…` |
| 17 | `update` |  | `(cam)` |
| 36 | `residentBytes` |  | `()` |
| 37 | `stats` |  | `()` |

| Zeile | Instanzfeld | Erster Wert |
|---:|---|---|
| 12 | `shadowDistance` | `(Konstruktor-Option)` |
| 12 | `viewDistance` | `(Konstruktor-Option)` |
| 12 | `budgetBytes` | `(Konstruktor-Option)` |
| 12 | `evictAfterMs` | `(Konstruktor-Option)` |
| 12 | `now` | `(Konstruktor-Option)` |
| 13 | `entries` | `meshes.map(mesh=>({mesh,bytes:bytesOf(mesh.geometry),resident:true,hiddenSince:null,dist:…` |
| 14 | `evicted` | `0` |
| 14 | `restored` | `0` |

## `dist/runtime/map-adapter.js`

4.509 Bytes · 67 Zeilen · Runtime (Begehmodus)

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 3 | `./physics/adapter.js` | `createWorld`, `BOUNDS` |
| 4 | `./geometry/polygon.js` | `convexParts`, `convexHull`, `signedArea` |

**Exporte:** `WATER`, `waterColliders`, `shapeVertices`, `collidersFromSnapshot`, `prepareWalk`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 9 | const | `WATER` | ✓ | `Object.freeze({id:"water",name:"Wasser"})` |
| 10 | const | `WALL` |  | `1` |
| 11 | function | `waterColliders` | ✓ | `(snapshot)` |
| 32 | const | `SEGMENTS` |  | `{station:6,marker:24}` |
| 33 | function | `shapeVertices` | ✓ | `(point)` |
| 41 | function | `collidersFromSnapshot` | ✓ | `(snapshot)` |
| 49 | function | `solidParts` |  | `(outline)` |
| 51 | function | `prepareWalk` | ✓ | `(snapshot)` |

## `dist/runtime/net/client.js`

7.176 Bytes · 107 Zeilen · Runtime (Begehmodus)

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 5 | `./protocol.js` | `TYPE`, `encode`, `decode`, `decodeDelta`, `applyDelta`, `quantizeRecord`, `dequantizeRecord`, `poseOutOfRange` |
| 6 | `../sim/layout.js` | `EntityStore` |

**Exporte:** `SEND_MS`, `PING_MS`, `INTERP_MS`, `EXTRAP_MS`, `GONE_MS`, `HISTORY`, `MAX_REMOTES`, `SNAP_SPEED`, `BASELINES`, `NetClient`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 8 | const | `SEND_MS` | ✓ | `50` |
| 8 | const | `PING_MS` | ✓ | `2000` |
| 8 | const | `INTERP_MS` | ✓ | `100` |
| 8 | const | `EXTRAP_MS` | ✓ | `250` |
| 8 | const | `GONE_MS` | ✓ | `1500` |
| 8 | const | `HISTORY` | ✓ | `12` |
| 8 | const | `MAX_REMOTES` | ✓ | `64` |
| 8 | const | `SNAP_SPEED` | ✓ | `80` |
| 8 | const | `BASELINES` | ✓ | `32` |
| 9 | const | `BACKOFF` |  | `[1000,2000,5000,10000]` |
| 10 | const | `TAU` |  | `Math.PI*2` |
| 10 | const | `wrap` |  | `a=>((a+Math.PI)%TAU+TAU)%TAU-Math.PI` |
| 12 | class | `NetClient` | ✓ |  |

**Klasse `NetClient`** (Zeile 12)

| Zeile | Methode | Modifikatoren | Parameter |
|---:|---|---|---|
| 15 | `constructor` |  | `({url,state,onCorrection=()=>{},WebSocket:WS=globalThis.WebSocket,now=()=>performance.now(),setInterval:si=(f…` |
| 22 | `connect` |  | `()` |
| 33 | `close` |  | `()` |
| 34 | `send` |  | `(bytes)` |
| 38 | `sendPose` |  | `()` |
| 47 | `receive` |  | `(data)` |
| 79 | `render` |  | `()` |
| 101 | `stats` |  | `()` |

| Zeile | Instanzfeld | Erster Wert |
|---:|---|---|
| 17 | `url` | `(Konstruktor-Option)` |
| 17 | `state` | `(Konstruktor-Option)` |
| 17 | `onCorrection` | `(Konstruktor-Option)` |
| 17 | `WS` | `(Konstruktor-Option)` |
| 17 | `now` | `(Konstruktor-Option)` |
| 17 | `si` | `(Konstruktor-Option)` |
| 17 | `ci` | `(Konstruktor-Option)` |
| 17 | `st` | `(Konstruktor-Option)` |
| 18 | `ack` | `0` |
| 18 | `baselines` | `new Map()` |
| 18 | `lastSeen` | `new Map()` |
| 18 | `corrections` | `0` |
| 18 | `deltaCount` | `0` |
| 18 | `clampedPoses` | `0` |
| 19 | `id` | `null` |
| 19 | `ws` | `null` |
| 19 | `closed` | `false` |
| 19 | `attempt` | `0` |
| 19 | `store` | `new EntityStore(MAX_REMOTES)` |
| 19 | `history` | `new Map()` |
| 20 | `rtt` | `null` |
| 20 | `inLog` | `[]` |
| 20 | `outLog` | `[]` |
| 20 | `snapTimes` | `[]` |
| 20 | `serverTick` | `0` |
| 20 | `timers` | `[]` |

**Event-Bindungen**

| Zeile | Ereignis | Ziel |
|---:|---|---|
| 25 | `open` | `ws` |
| 26 | `message` | `ws` |
| 27 | `close` | `ws` |

## `dist/runtime/net/protocol.js`

9.074 Bytes · 153 Zeilen · Runtime (Begehmodus)

**Exporte:** `MAGIC`, `VERSION`, `HEADER_BYTES`, `RECORD_BYTES`, `MAX_RECORDS`, `POS_SCALE`, `SPEED_SCALE`, `TYPE`, `FLAG`, `quantize`, `POS_LIMIT`, `ROOM_BOUND`, `poseOutOfRange`, `mapFitsNetwork`, `dequantize`, `encode`, `decode`, `MAX_DELTA_ENTRIES`, `quantizeRecord`, `dequantizeRecord`, `encodeDelta`, `decodeDelta`, `applyDelta`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 6 | const | `MAGIC` | ✓ | `0x414f` |
| 6 | const | `VERSION` | ✓ | `1` |
| 6 | const | `HEADER_BYTES` | ✓ | `12` |
| 6 | const | `RECORD_BYTES` | ✓ | `16` |
| 6 | const | `MAX_RECORDS` | ✓ | `64` |
| 6 | const | `POS_SCALE` | ✓ | `16` |
| 6 | const | `SPEED_SCALE` | ✓ | `100` |
| 8 | const | `TYPE` | ✓ | `Object.freeze({POSE:1,SNAPSHOT:2,PING:3,PONG:4,WELCOME:5,DELTA:6,CORRECT:7})` |
| 10 | const | `FLAG` | ✓ | `Object.freeze({TELEPORT:1,BRAKING:2,CRASHED:4})` |
| 11 | const | `TYPES` |  | `new Set(Object.values(TYPE))` |
| 12 | const | `MODES` |  | `["none","kart","plane","walk","car"]` |
| 13 | const | `TAU` |  | `Math.PI*2` |
| 15 | const | `quantize` | ✓ | `(value,scale)=>Math.max(-32768,Math.min(32767,Math.round(value*scale)))` |
| 20 | const | `POS_LIMIT` | ✓ | `32767/POS_SCALE` |
| 20 | const | `ROOM_BOUND` | ✓ | `2000` |
| 22 | const | `poseOutOfRange` | ✓ | `r=>[r.x,r.y,r.z].some(v=>Math.abs(v??0)>POS_LIMIT)` |
| 24 | function | `mapFitsNetwork` | ✓ | `(map,bound=ROOM_BOUND)` |
| 28 | const | `dequantize` | ✓ | `(q,scale)=>q/scale` |
| 31 | function | `encode` | ✓ | `(type,tick,records=[],flags=0)` |
| 47 | function | `decode` | ✓ | `(data)` |
| 68 | const | `FIELDS` |  | `["x","y","z","h","s"]` |
| 68 | const | `NEW` |  | `64` |
| 68 | const | `GONE` |  | `128` |
| 68 | const | `MODE_FLAGS` |  | `32` |
| 69 | const | `MAX_DELTA_ENTRIES` | ✓ | `MAX_RECORDS*2` |
| 72 | function | `quantizeRecord` | ✓ | `(r)` |
| 77 | function | `dequantizeRecord` | ✓ | `(q)` |
| 81 | const | `zig` |  | `n=>(n<<1)^(n>>31)` |
| 81 | const | `unzig` |  | `n=>(n>>>1)^-(n&1)` |
| 82 | function | `pushVarint` |  | `(out,n)` |
| 85 | function | `encodeDelta` | ✓ | `(tick,baseTick,base,cur)` |
| 114 | function | `decodeDelta` | ✓ | `(data)` |
| 141 | function | `applyDelta` | ✓ | `(base,entries)` |

## `dist/runtime/perf-meter.css`

2.319 Bytes · 22 Zeilen · Runtime (Begehmodus)

25 Regelblöcke · Media-Queries: `(prefers-reduced-motion:reduce)`

## `dist/runtime/perf-meter.js`

12.147 Bytes · 147 Zeilen · Runtime (Begehmodus)

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 7 | `./perf-probes.js` | `readPerfProbes` |

**Exporte:** `PERF_FORMAT`, `BUDGET_MS`, `JANK_MS`, `HISTORY`, `LOG_MAX`, `percentile`, `frameSummary`, `primitives`, `logCsv`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 9 | const | `PERF_FORMAT` | ✓ | `"ourark.perf-log.v1"` |
| 10 | const | `BUDGET_MS` | ✓ | `1000/60` |
| 10 | const | `JANK_MS` | ✓ | `20` |
| 10 | const | `HISTORY` | ✓ | `240` |
| 10 | const | `LOG_MAX` | ✓ | `3600` |
| 12 | const | `percentile` | ✓ | `(sorted,q)=>sorted.length?sorted[Math.min(sorted.length-1,Math.floor(sorted.length*q))]:0` |
| 13 | const | `round` |  | `(v,d=1)=>v==null\|\|!Number.isFinite(v)?null:Math.round(v*10**d)/10**d` |
| 16 | function | `frameSummary` | ✓ | `(frames)` |
| 24 | function | `primitives` | ✓ | `(mode,count,instances=1)` |
| 30 | function | `logCsv` | ✓ | `(log)` |
| 36 | const | `gpuCounter` |  | `{calls:0,triangles:0}` |
| 37 | function | `countDraws` |  | `()` |
| 47 | function | `start` |  | `()` |

**Event-Bindungen**

| Zeile | Ereignis | Ziel |
|---:|---|---|
| 79 | `click` | `root` |
| 84 | `click` | `pill` |
| 88 | `fullscreenchange` | `document` |
| 147 | `DOMContentLoaded` | `document` |

**Speicherzugriffe**

| Zeile | API | Schlüssel |
|---:|---|---|
| 51 | `localStorage.getItem` | `ourark.perf` |
| 74 | `localStorage.setItem` | `ourark.perf` |

## `dist/runtime/perf-probes.js`

931 Bytes · 13 Zeilen · Runtime (Begehmodus)

**Exporte:** `registerPerfProbe`, `readPerfProbes`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 4 | const | `registry` |  | `globalThis.__ourarkPerfProbes??=new Map()` |
| 6 | function | `registerPerfProbe` | ✓ | `(name,read)` |
| 8 | function | `readPerfProbes` | ✓ | `()` |

## `dist/runtime/physics/adapter.js`

10.613 Bytes · 152 Zeilen · Runtime (Begehmodus)

**Exporte:** `PLAYER`, `MAX_STEP_DISTANCE`, `BOUNDS`, `SPAWN_GRID`, `SPAWN_NEAR`, `SPAWN_SAMPLES`, `BROADPHASE_MIN`, `createWorld`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 6 | const | `PLAYER` | ✓ | `Object.freeze({radius:.3,height:1.8,eye:1.6,walkSpeed:3})` |
| 9 | const | `MAX_STEP_DISTANCE` | ✓ | `1` |
| 10 | const | `BOUNDS` | ✓ | `Object.freeze({id:"bounds",name:"Kartenrand"})` |
| 11 | const | `SKIN` |  | `1e-6` |
| 11 | const | `ITERATIONS` |  | `4` |
| 11 | const | `EPSILON` |  | `1e-9` |
| 13 | const | `SPAWN_GRID` | ✓ | `.25` |
| 13 | const | `SPAWN_NEAR` | ✓ | `30` |
| 13 | const | `SPAWN_SAMPLES` | ✓ | `400` |
| 14 | const | `finite` |  | `(...values)=>values.every(Number.isFinite)` |
| 17 | function | `prepare` |  | `({id,name,vertices})` |
| 31 | function | `contact` |  | `(p,r,c)` |
| 52 | const | `BROADPHASE_MIN` | ✓ | `32` |
| 53 | const | `GRID_MAX_AXIS` |  | `2**20` |
| 53 | const | `GRID_MAX_SPAN` |  | `64` |
| 53 | const | `GRID_MIN_GAIN` |  | `4` |
| 54 | function | `grid` |  | `(shapes,radius)` |
| 92 | function | `createWorld` | ✓ | `({bounds,area,colliders=[],start={x:0,z:0},radius=PLAYER.radius,broadphase=true})` |

## `dist/runtime/quality.js`

4.513 Bytes · 66 Zeilen · Runtime (Begehmodus)

**Exporte:** `TARGET_FPS`, `FRAME_BUDGET_MS`, `runtimePixelRatio`, `FrameStats`, `LEVELS`, `AdaptiveResolution`, `shadowMapSize`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 5 | const | `TARGET_FPS` | ✓ | `60` |
| 6 | const | `FRAME_BUDGET_MS` | ✓ | `1000/TARGET_FPS` |
| 8 | const | `runtimePixelRatio` | ✓ | `dpr=>Math.min(3,Math.max(1,Number.isFinite(dpr)?dpr:1))` |
| 10 | class | `FrameStats` | ✓ |  |
| 27 | const | `LEVELS` | ✓ | `[3,2.5,2,1.75,1.5,1.25,1,.75,.5]` |
| 28 | const | `GAP_MS` |  | `250` |
| 28 | const | `HOLD_AFTER_INEFFECTIVE_MS` |  | `20_000` |
| 28 | const | `UNDONE_RAISE_MS` |  | `5_000` |
| 30 | class | `AdaptiveResolution` | ✓ |  |
| 63 | function | `shadowMapSize` | ✓ | `(scale,maxSize=2048)` |

**Klasse `FrameStats`** (Zeile 10)

| Zeile | Methode | Modifikatoren | Parameter |
|---:|---|---|---|
| 11 | `constructor` |  | `(size=120)` |
| 12 | `push` |  | `(ms)` |
| 13 | `clear` |  | `()` |
| 14 | `fps` |  | `()` |
| 17 | `percentile` |  | `(q)` |
| 23 | `p95` |  | `()` |

| Zeile | Instanzfeld | Erster Wert |
|---:|---|---|
| 11 | `size` | `size` |
| 11 | `values` | `[]` |
| 19 | `sorted` | `new Float64Array(Math.max(n,this.size))` |

**Klasse `AdaptiveResolution`** (Zeile 30)

| Zeile | Methode | Modifikatoren | Parameter |
|---:|---|---|---|
| 32 | `constructor` |  | `({max,min=.5,budgetMs=FRAME_BUDGET_MS,window=30,cooldownMs=1000,raiseAfterMs=3000,maxRaiseAfterMs=60_000}={})` |
| 39 | `setIndex` |  | `(index,now)` |
| 41 | `feed` |  | `(ms,now)` |
| 58 | `reset` |  | `()` |

| Zeile | Instanzfeld | Erster Wert |
|---:|---|---|
| 33 | `budgetMs` | `(Konstruktor-Option)` |
| 33 | `window` | `(Konstruktor-Option)` |
| 33 | `cooldownMs` | `(Konstruktor-Option)` |
| 33 | `baseRaiseAfterMs` | `(Konstruktor-Option)` |
| 33 | `maxRaiseAfterMs` | `(Konstruktor-Option)` |
| 34 | `levels` | `[max,...LEVELS.filter(level=>level<max-1e-9&&level>=min-1e-9)]` |
| 35 | `index` | `Math.max(0,this.levels.findIndex(level=>level<=Math.min(max,2)+1e-9))` |
| 36 | `scale` | `this.levels[this.index]` |
| 36 | `stats` | `new FrameStats(window)` |
| 37 | `raiseAfterMs` | `raiseAfterMs` |
| 37 | `lastChange` | `-Infinity` |
| 37 | `lastSlow` | `-Infinity` |
| 37 | `lastRaise` | `-Infinity` |
| 37 | `holdDownUntil` | `-Infinity` |
| 37 | `pending` | `null` |

## `dist/runtime/scan/adapter.js`

5.780 Bytes · 81 Zeilen · Runtime (Begehmodus)

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 4 | `../physics/adapter.js` | `createWorld`, `PLAYER` |

**Exporte:** `SCAN_FORMAT`, `COLLIDERS_FORMAT`, `SCAN_ID`, `SHELL`, `FLY_RADIUS`, `LIMITS`, `readColliders`, `poseFromFrame`, `flyBounds`, `prepareScanWalk`, `bundleIdOf`, `checkManifest`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 6 | const | `SCAN_FORMAT` | ✓ | `"motionspec.scan.v1"` |
| 7 | const | `COLLIDERS_FORMAT` | ✓ | `"motionspec.scan.colliders.v1"` |
| 8 | const | `SCAN_ID` | ✓ | `/^[0-9a-f]{64}$/` |
| 10 | const | `SHELL` | ✓ | `/^(structure\|architecture)\//` |
| 10 | const | `FLY_RADIUS` | ✓ | `.15` |
| 11 | const | `LIMITS` | ✓ | `Object.freeze({colliders:5000,vertices:64,area:256,bundleBytes:64*1024*1024})` |
| 13 | const | `finitePoint` |  | `p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)` |
| 14 | function | `polygon` |  | `(value,max,what)` |
| 20 | function | `readColliders` | ✓ | `(data)` |
| 31 | function | `poseFromFrame` | ✓ | `([position,forward])` |
| 40 | function | `flyBounds` | ✓ | `(area,floorY,{top=floorY+2.4,ceilingY=Infinity}={})` |
| 47 | function | `prepareScanWalk` | ✓ | `({colliders:raw,camera,extent={}})` |
| 65 | async function | `bundleIdOf` | ✓ | `(files,digest)` |
| 69 | function | `checkManifest` | ✓ | `(manifest,id)` |

## `dist/runtime/scan/loader.js`

10.209 Bytes · 137 Zeilen · Runtime (Begehmodus)

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 4 | `../../worlds/vendor/three.module.js` | `THREE` |
| 5 | `../../worlds/vendor/GLTFLoader.js` | `GLTFLoader` |
| 6 | `./adapter.js` | `SCAN_ID`, `checkManifest`, `bundleIdOf` |

**Exporte:** `SCENES_BASE`, `SCENES_INDEX`, `scanMaterial`, `listScans`, `loadScan`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 8 | const | `SCENES_BASE` | ✓ | `"/scenes/"` |
| 9 | const | `SCENES_INDEX` | ✓ | `"/api/scenes"` |
| 13 | const | `PALETTE` |  | `{floor:[0xa87650,.42],plaster:[0xebe5da,.92],ceiling:[0xf1ece3,.95],beam:[0x4b3222,.62],t…` |
| 20 | const | `CLAY` |  | `new URLSearchParams(globalThis.location?.search??"").get("albedo")==="clay"` |
| 25 | const | `FACADE_GLSL` |  | `ˋ
  vec3 fn=normalize(vFacadeNormal);
  if(abs(fn.y)<.5){
    vec2 ft=normalize(vec2(-fn.…` |
| 44 | function | `facadeMaterial` |  | `()` |
| 55 | function | `scanMaterial` | ✓ | `(semantic)` |
| 67 | const | `hex` |  | `buffer=>[...new Uint8Array(buffer)].map(b=>b.toString(16).padStart(2,"0")).join("")` |
| 68 | const | `digest` |  | `async bytes=>hex(await crypto.subtle.digest("SHA-256",bytes))` |
| 70 | async function | `fetchOk` |  | `(url,fetcher,signal)` |
| 77 | async function | `listScans` | ✓ | `({fetcher=globalThis.fetch,signal}={})` |
| 87 | async function | `loadScan` | ✓ | `(id,{fetcher=globalThis.fetch,signal,base=SCENES_BASE}={})` |

## `dist/runtime/session.js`

2.821 Bytes · 49 Zeilen · Runtime (Begehmodus)

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 5 | `./frozen.js` | `deepFreeze` |
| 6 | `./frame-loop.js` | `FrameLoop` |

**Exporte:** `STEP`, `RuntimeSession`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 8 | const | `STEP` | ✓ | `1/60` |
| 9 | const | `MAX_FRAME` |  | `.25` |
| 9 | const | `MAX_STEPS` |  | `5` |
| 11 | const | `browserClock` |  | `()=>({now:()=>performance.now(),raf:fn=>requestAnimationFrame(fn),caf:id=>cancelAnimation…` |
| 13 | class | `RuntimeSession` | ✓ |  |

**Klasse `RuntimeSession`** (Zeile 13)

| Zeile | Methode | Modifikatoren | Parameter |
|---:|---|---|---|
| 15 | `constructor` |  | `({host,clock=browserClock(),simulate=()=>{},onState=()=>{},onError=()=>{},step=STEP}={})` |
| 23 | `setState` |  | `(state)` |
| 25 | `enter` | async | `(document)` |
| 40 | `pause` |  | `(reason=null)` |
| 41 | `resume` |  | `()` |
| 42 | `exit` |  | `()` |
| 46 | `cleanup` |  | `()` |
| 47 | `startLoop` |  | `()` |
| 48 | `stopLoop` |  | `()` |

| Zeile | Instanzfeld | Erster Wert |
|---:|---|---|
| 16 | `host` | `(Konstruktor-Option)` |
| 16 | `clock` | `(Konstruktor-Option)` |
| 16 | `simulate` | `(Konstruktor-Option)` |
| 16 | `onState` | `(Konstruktor-Option)` |
| 16 | `onError` | `(Konstruktor-Option)` |
| 16 | `step` | `(Konstruktor-Option)` |
| 17 | `state` | `"editing"` |
| 17 | `snapshot` | `null` |
| 17 | `world` | `null` |
| 17 | `pauseReason` | `null` |
| 17 | `generation` | `0` |
| 19 | `loop` | `new FrameLoop({step,maxFrame:MAX_FRAME,maxSteps:MAX_STEPS,clock,document:null,simulate:dt…` |

## `dist/runtime/sim/layout.js`

2.834 Bytes · 62 Zeilen · Runtime (Begehmodus)

**Exporte:** `ENTITY_BYTES`, `OFFSET`, `MODE`, `WGSL_ENTITY`, `EntityStore`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 6 | const | `ENTITY_BYTES` | ✓ | `64` |
| 7 | const | `OFFSET` | ✓ | `Object.freeze({id:0,flags:4,tick:8,pos:16,vel:32,heading:48,pitch:52,roll:56,mutation:60})` |
| 9 | const | `MODE` | ✓ | `Object.freeze({none:0,kart:1,plane:2,walk:3,car:4})` |
| 10 | const | `MODE_NAME` |  | `Object.fromEntries(Object.entries(MODE).map(([k,v])=>[v,k]))` |
| 11 | const | `ACTIVE` |  | `1<<8` |
| 13 | const | `WGSL_ENTITY` | ✓ | `ˋstruct Entity {
  id: u32,
  flags: u32,
  tick: u32,
  _pad0: u32,
  pos: vec3<f32>,
  …` |
| 28 | class | `EntityStore` | ✓ |  |

**Klasse `EntityStore`** (Zeile 28)

| Zeile | Methode | Modifikatoren | Parameter |
|---:|---|---|---|
| 29 | `constructor` |  | `(capacity)` |
| 34 | `count` | get | `()` |
| 35 | `ids` |  | `()` |
| 36 | `slot` |  | `(id)` |
| 38 | `upsert` |  | `(id,{mode,pos,vel,heading,pitch,roll,tick,mutation}={})` |
| 56 | `read` |  | `(id)` |
| 61 | `remove` |  | `(id)` |

| Zeile | Instanzfeld | Erster Wert |
|---:|---|---|
| 30 | `capacity` | `capacity` |
| 30 | `buffer` | `new ArrayBuffer(capacity*ENTITY_BYTES)` |
| 31 | `u32` | `new Uint32Array(this.buffer)` |
| 31 | `f32` | `new Float32Array(this.buffer)` |
| 32 | `slots` | `new Map()` |
| 32 | `free` | `[]` |

## `dist/runtime/sim/snapshot.js`

2.534 Bytes · 54 Zeilen · Runtime (Begehmodus)

**Exporte:** `StateLayout`, `SimSnapshot`, `saveOptional`, `loadOptional`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 7 | class | `StateLayout` | ✓ |  |
| 36 | class | `SimSnapshot` | ✓ |  |
| 45 | function | `saveOptional` | ✓ | `(layout,obj,buf,offset)` |
| 50 | function | `loadOptional` | ✓ | `(layout,buf,offset,current)` |

**Klasse `StateLayout`** (Zeile 7)

| Zeile | Methode | Modifikatoren | Parameter |
|---:|---|---|---|
| 9 | `constructor` |  | `(fields)` |
| 16 | `write` |  | `(obj,buf,offset=0)` |
| 24 | `read` |  | `(buf,offset,obj)` |

| Zeile | Instanzfeld | Erster Wert |
|---:|---|---|
| 10 | `fields` | `fields.map(([name,kind="num"])=>{if(!["num","bool","nullable"].includes(kind))throw new E…` |
| 14 | `size` | `this.fields.length` |

**Klasse `SimSnapshot`** (Zeile 36)

| Zeile | Methode | Modifikatoren | Parameter |
|---:|---|---|---|
| 37 | `constructor` |  | `(parts)` |
| 38 | `create` |  | `()` |
| 39 | `save` |  | `(buf=this.create())` |
| 40 | `restore` |  | `(buf)` |

| Zeile | Instanzfeld | Erster Wert |
|---:|---|---|
| 37 | `parts` | `parts` |
| 37 | `size` | `parts.reduce((n,p)=>n+p.stateSize,0)` |

## `dist/runtime/sim/wasm.js`

4.478 Bytes · 64 Zeilen · Runtime (Begehmodus)

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 4 | `./layout.js` | `ENTITY_BYTES`, `OFFSET`, `MODE` |

**Exporte:** `FLAG`, `loadSim`, `WasmSim`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 6 | const | `FLAG` | ✓ | `{active:1<<8,onGround:1<<9,crashed:1<<10,stalled:1<<11}` |
| 7 | const | `MODE_NAME` |  | `Object.fromEntries(Object.entries(MODE).map(([k,v])=>[v,k]))` |
| 10 | async function | `loadSim` | ✓ | `(source)` |
| 18 | class | `WasmSim` | ✓ |  |

**Klasse `WasmSim`** (Zeile 18)

| Zeile | Methode | Modifikatoren | Parameter |
|---:|---|---|---|
| 19 | `constructor` |  | `(instance)` |
| 27 | `views` |  | `()` |
| 32 | `check` |  | `()` |
| 34 | `entityBytes` |  | `(count=this.capacity)` |
| 35 | `setTerrain` |  | `(heights,width,depth,cell=1,scale=.01)` |
| 45 | `ground` |  | `(x,z)` |
| 46 | `spawn` |  | `(slot,{id=slot+1,mode,x=0,z=0,heading=0,height=80})` |
| 49 | `despawn` |  | `(slot)` |
| 51 | `setInput` |  | `(slot,input={})` |
| 57 | `step` |  | `(dt,steps=1,count=this.capacity)` |
| 58 | `read` |  | `(slot)` |

| Zeile | Instanzfeld | Erster Wert |
|---:|---|---|
| 20 | `exports` | `instance.exports` |
| 22 | `memory` | `x.memory` |
| 22 | `capacity` | `x.sim_capacity()` |
| 23 | `entitiesPtr` | `x.sim_entities()` |
| 23 | `inputsPtr` | `x.sim_inputs()` |
| 23 | `heightPtr` | `x.sim_height()` |
| 28 | `viewBuffer` | `b` |
| 29 | `f32` | `new Float32Array(b,this.entitiesPtr,this.capacity*16)` |
| 29 | `u32` | `new Uint32Array(b,this.entitiesPtr,this.capacity*16)` |
| 30 | `inF32` | `new Float32Array(b,this.inputsPtr,this.capacity*4)` |
| 30 | `inU32` | `new Uint32Array(b,this.inputsPtr,this.capacity*4)` |

## `dist/runtime/walk-host.js`

16.781 Bytes · 198 Zeilen · Runtime (Begehmodus)

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 5 | `./session.js` | `RuntimeSession` |
| 6 | `./input.js` | `InputRouter` |
| 7 | `./walker.js` | `Walker`, `interactionTarget` |
| 8 | `./quality.js` | `FrameStats`, `AdaptiveResolution`, `runtimePixelRatio` |
| 9 | `./camera-rig.js` | `CAMERA_MODES`, `FlyController`, `thirdPersonView`, `sourceView` |

**Exporte:** `STICK_SHARE`, `STICK_RADIUS`, `LABELS_DE`, `LABELS_EN`, `createWalkMode`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 12 | const | `STICK_SHARE` | ✓ | `.4` |
| 12 | const | `STICK_RADIUS` | ✓ | `50` |
| 14 | const | `LABELS_DE` | ✓ | `{loading:"Welt wird vorbereitet …",playing:"Aktiv · unterwegs",paused:"Pausiert",pauseEsc…` |
| 22 | const | `LABELS_EN` | ✓ | `{loading:"Preparing the world …",playing:"Active · exploring",paused:"Paused",pauseEscape…` |
| 35 | function | `createWalkMode` | ✓ | `({$,getRenderer,getDocument,prepare,describe,editorRegions,labels=LABELS_DE,notice,beforeEnter=()=>true,onEdi…` |

**DOM-IDs, die dieses Skript anspricht (22):** `canvas`, `stage`, `runtime-modes`, `runtime-info`, `runtime-info-type`, `runtime-info-name`, `runtime-info-data`, `runtime-info-empty`, `runtime-stick`, `runtime-perf`, `runtime-fullscreen`, `walk-enter`, `runtime-position`, `runtime-hint`, `runtime-hud`, `runtime-paused`, `runtime-state`, `runtime-pause`, `runtime-pause-reason`, `runtime-resume`, `runtime-exit`, `runtime-info-close`

**Event-Bindungen**

| Zeile | Ereignis | Ziel |
|---:|---|---|
| 127 | `fullscreenchange` | `document` |
| 189 | `click` | `$("walk-enter")` |
| 191 | `click` | `$("runtime-fullscreen")` |
| 192 | `click` | `$("runtime-exit")` |
| 193 | `click` | `modeButtons` |
| 194 | `click` | `$("runtime-info-close")` |
| 195 | `click` | `$("runtime-pause")` |
| 196 | `click` | `$("runtime-resume")` |

## `dist/runtime/walker.js`

4.711 Bytes · 74 Zeilen · Runtime (Begehmodus)

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 3 | `./physics/adapter.js` | `PLAYER` |
| 4 | `./map-adapter.js` | `shapeVertices` |
| 5 | `./geometry/polygon.js` | `containsPoint` |

**Exporte:** `TURN_SPEED`, `LOOK_DEGREES_PER_PIXEL`, `PITCH_LIMIT`, `INTERACT_DISTANCE`, `INTERACT_ANGLE`, `Walker`, `interactionTarget`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 7 | const | `TURN_SPEED` | ✓ | `120` |
| 8 | const | `LOOK_DEGREES_PER_PIXEL` | ✓ | `.25` |
| 9 | const | `PITCH_LIMIT` | ✓ | `75` |
| 10 | const | `INTERACT_DISTANCE` | ✓ | `2.5` |
| 11 | const | `INTERACT_ANGLE` | ✓ | `60` |
| 13 | const | `wrap` |  | `degrees=>{const d=((degrees+180)%360+360)%360-180;return d===-180?180:d;}` |
| 14 | const | `rad` |  | `degrees=>degrees*Math.PI/180` |
| 16 | class | `Walker` | ✓ |  |
| 52 | function | `closest` |  | `(p,vertices)` |
| 64 | function | `interactionTarget` | ✓ | `(items,pose,{distance=INTERACT_DISTANCE,footprint=shapeVertices,eligible=item=>item.interactive&&item.visible…` |

**Klasse `Walker`** (Zeile 16)

| Zeile | Methode | Modifikatoren | Parameter |
|---:|---|---|---|
| 18 | `constructor` |  | `({physics,start,speed=PLAYER.walkSpeed})` |
| 22 | `reset` |  | `()` |
| 24 | `place` |  | `({x,z,heading=this.pose.heading,pitch=0})` |
| 26 | `step` |  | `(dt,{x=0,z=0,turn=0})` |
| 38 | `look` |  | `(dx,dy)` |
| 43 | `interpolated` |  | `(alpha)` |

| Zeile | Instanzfeld | Erster Wert |
|---:|---|---|
| 19 | `physics` | `physics` |
| 19 | `speed` | `speed` |
| 19 | `start` | `{x:start.x,z:start.z,heading:start.heading??0}` |
| 19 | `contacts` | `[]` |
| 22 | `pose` | `{...this.start,pitch:0}` |
| 22 | `previous` | `{...this.pose}` |

## `dist/studio/index.html`

14.354 Bytes · 80 Zeilen · Layereditor / geteilte Styles · byte-identisch mit `dist/index.html`

Titel: Layer Studio — Ourark World Studio · Skripte: `/app.js`, `/runtime/perf-meter.js` · Stylesheets: `/styles.css`, `/motionspec-theme.css`, `/glass.css`, `/runtime/perf-meter.css`

**Element-IDs (77):** `i-layers`, `i-square`, `i-cube`, `i-grid`, `i-play`, `i-pause`, `i-plus`, `i-check`, `i-eye`, `i-lock`, `i-reset`, `i-export`, `i-move`, `i-sliders`, `i-info`, `i-close`, `i-text`, `i-note`, `i-chevron`, `oaGlow`, `oaBg`, `about`, `export`, `add-layer`, `layer-list`, `add-layer-bottom`, `explore-3d`, `reset`, `workspace`, `view-2d`, `view-3d`, `dimension-toggle`, `view-caption`, `grid-toggle`, `reset-camera`, `viewport`, `scene-dimensions`, `scene`, `scene-layers`, `canvas-hint`, `zoom-out`, `zoom-value`, `zoom-in`, `fit-view`, `spatial-toolbar`, `spread`, `spread-value`, `orbit`, `orbit-value`, `tilt`, `tilt-value`, `motion-toggle`, `motion-state`, `reduce-toggle`, `layer-count`, `dimension-status`, `selected-icon`, `selected-type`, `selected-heading`, `layer-name`, `position-unit`, `prop-x`, `prop-y`, `prop-z`, `lock-layer`, `prop-width`, `prop-height`, `opacity-value`, `opacity`, `radius-value`, `radius`, `reduce-motion`, `high-contrast`, `toast`, `about-dialog`, `reset-dialog`, `confirm-reset`

## `dist/styles.css`

34.585 Bytes · 14 Zeilen · Layereditor / geteilte Styles

492 Regelblöcke · Media-Queries: `(prefers-reduced-motion:no-preference)`, `(prefers-reduced-motion:reduce)`, `(min-width:1600px)`, `(max-width:1240px)`, `(max-width:1000px)`, `(max-width:650px)`

| CSS-Variable | Erster Wert |
|---|---|
| `--bg` | `#0f0f0f` |
| `--panel` | `#131313` |
| `--surface` | `#1b1b1b` |
| `--line` | `#292929` |
| `--line-soft` | `#202020` |
| `--ink` | `#f2f2f2` |
| `--muted` | `#ababab` |
| `--mint` | `#4ade80` |
| `--mint-light` | `#a7f3c8` |
| `--mono` | `ui-monospace,'SF Mono',SFMono-Regular,'IBM Plex Mono',Menlo,` |
| `--sans` | `-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Te` |
| `--sidebar` | `230px` |
| `--inspector` | `278px` |
| `--layer-opacity` | `1!important` |

## `dist/world-studio/city-store.js`

1.143 Bytes · 19 Zeilen · World Studio

**Exporte:** `loadCity`, `saveCity`, `removeCity`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 3 | const | `DB_NAME` |  | `"motionspec-world-city-v1"` |
| 3 | const | `STORE` |  | `"worlds"` |
| 3 | const | `KEY` |  | `"uploaded"` |
| 4 | function | `open` |  | `()` |
| 12 | async function | `run` |  | `(mode,action)` |
| 17 | const | `loadCity` | ✓ | `()=>run("readonly",store=>store.get(KEY))` |
| 18 | const | `saveCity` | ✓ | `document=>run("readwrite",store=>{store.put(document,KEY);})` |
| 19 | const | `removeCity` | ✓ | `()=>run("readwrite",store=>{store.delete(KEY);})` |

**Speicherzugriffe**

| Zeile | API | Schlüssel |
|---:|---|---|
| 6 | `indexedDB.open` | `(siehe DB_NAME)` |

## `dist/world-studio/editor.js`

38.961 Bytes · 356 Zeilen · World Studio

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 1 | `../worlds/data.js` | `worlds` |
| 2 | `./model.js` | `createDocument`, `createObject`, `validateDocument`, `readImport`, `History`, `clone`, `clamp`, `worldById` |
| 3 | `./renderer.js` | `WorldEditorRenderer` |
| 4 | `./walk.js` | `groundLevel`, `sceneColliders`, `prepareWorldWalk`, `WORLD_METRES` |
| 5 | `../runtime/walk-host.js` | `createWalkMode`, `LABELS_EN` |
| 6 | `../map-studio/model.js` | `validateMap` |
| 7 | `../runtime/map-adapter.js` | `prepareWalk` |
| 8 | `../runtime/physics/adapter.js` | `PLAYER` |
| 9 | `./city-store.js` | `loadCity`, `saveCity`, `removeCity` |
| 10 | `../runtime/scan/loader.js` | `listScans`, `loadScan` |
| 11 | `../runtime/scan/adapter.js` | `prepareScanWalk`, `SCAN_FORMAT`, `SCAN_ID` |
| 12 | `../runtime/device-check.js` | `CHECK`, `DEVICE_CHECK_FORMAT`, `summarize`, `deviceInfo`, `reportText` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 14 | const | `$` |  | `s=>document.querySelector(s)` |
| 15 | const | `esc` |  | `s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":…` |
| 16 | const | `icon` |  | `name=>ˋ<svg aria-hidden="true"><use href="#i-${name}"/></svg>ˋ` |
| 17 | const | `storageKey` |  | `"motionspec-world-studio-v1"` |
| 18 | const | `documents` |  | `new Map(worlds.map(w=>[w.id,createDocument(w)]))` |
| 19 | const | `histories` |  | `new Map(worlds.map(w=>[w.id,new History()]))` |
| 20 | const | `dirty` |  | `new Set()` |
| 20 | const | `saved` |  | `new Set()` |
| 21 | const | `systemMotion` |  | `matchMedia("(prefers-reduced-motion: reduce)")` |
| 22 | let | `active` |  | `"alpine"` |
| 22 | let | `engine` |  | `null` |
| 22 | let | `preview` |  | `false` |
| 22 | let | `playing` |  | `false` |
| 22 | let | `manualReduced` |  | `false` |
| 22 | let | `mode` |  | `"translate"` |
| 22 | let | `dragSnapshot` |  | `null` |
| 22 | let | `noticeTimer` |  |  |
| 23 | const | `doc` |  | `()=>documents.get(active)` |
| 25 | const | `CITY` |  | `"city"` |
| 25 | const | `MAP_SCHEMA` |  | `/^motionspec\.map\.v\d+$/` |
| 25 | const | `CITY_LIST_LIMIT` |  | `300` |
| 25 | const | `MAX_UPLOAD` |  | `16*1024*1024` |
| 26 | const | `CITY_KINDS` |  | `{building:"BUILDING",station:"STATION",marker:"DATA POINT"}` |
| 27 | let | `city` |  | `null` |
| 27 | let | `citySelected` |  | `null` |
| 27 | let | `cityGeneration` |  | `0` |
| 29 | function | `checkImage` |  | `(doc)` |
| 33 | const | `isCity` |  | `()=>active===CITY&&Boolean(city)` |
| 36 | const | `SCAN_PREFIX` |  | `"scan:"` |
| 36 | let | `scans` |  | `[]` |
| 36 | let | `scan` |  | `null` |
| 36 | let | `scanGeneration` |  | `0` |
| 37 | const | `isScan` |  | `()=>active.startsWith(SCAN_PREFIX)&&Boolean(scan)&&active===SCAN_PREFIX+scan.id` |
| 38 | const | `isExternal` |  | `()=>isCity()\|\|active.startsWith(SCAN_PREFIX)` |
| 39 | const | `selected` |  | `()=>doc().objects.find(o=>o.id===doc().selected)` |
| 40 | const | `reduced` |  | `()=>systemMotion.matches\|\|manualReduced` |
| 41 | function | `notify` |  | `(message)` |
| 42 | function | `setSaveStatus` |  | `()` |
| 43 | function | `restoreSaved` |  | `()` |
| 51 | function | `renderLibrary` |  | `()` |
| 58 | function | `renderCity` |  | `()` |
| 66 | function | `renderBuilding` |  | `()` |
| 76 | function | `selectBuilding` |  | `(id)` |
| 81 | function | `enterCity` |  | `({writeUrl=true}={})` |
| 91 | function | `leaveScanUi` |  | `()` |
| 95 | function | `renderScan` |  | `()` |
| 106 | async function | `enterScan` |  | `(id,{writeUrl=true}={})` |
| 123 | function | `renderObjects` |  | `()` |
| 128 | function | `setInputValue` |  | `(id,value)` |
| 129 | function | `syncInspector` |  | `()` |
| 150 | function | `renderPins` |  | `()` |
| 156 | function | `render` |  | `()` |
| 157 | function | `record` |  | `(before)` |
| 158 | function | `commit` |  | `(action,{rebuild=false}={})` |
| 163 | function | `changeObject` |  | `(updates)` |
| 164 | function | `selectObject` |  | `(id,{focus=false,visit=preview}={})` |
| 171 | function | `setWorld` |  | `(id,{writeUrl=true}={})` |
| 183 | function | `setPreview` |  | `(value)` |
| 189 | function | `showDestination` |  | `()` |
| 195 | function | `nextDestination` |  | `(direction)` |
| 196 | function | `setTool` |  | `(value)` |
| 197 | function | `syncMotion` |  | `()` |
| 198 | function | `undo` |  | `(redo=false)` |
| 199 | function | `duplicate` |  | `()` |
| 200 | function | `remove` |  | `()` |
| 201 | function | `addObject` |  | `(kind)` |
| 207 | function | `save` |  | `()` |
| 208 | function | `exportScene` |  | `()` |
| 209 | function | `unavailable` |  | `()` |
| 258 | async function | `uploadWorld` |  | `(input)` |
| 292 | const | `walk` |  | `createWalkMode({$:id=>document.getElementById(id),getRenderer:()=>engine,getDocument:()=>…` |
| 315 | let | `frameListener` |  | `null` |
| 315 | let | `checkRunning` |  | `false` |
| 316 | const | `sleep` |  | `ms=>new Promise(r=>setTimeout(r,ms))` |
| 317 | async function | `deviceCheck` |  | `()` |

**DOM-IDs, die dieses Skript anspricht (85):** `notice`, `save-status`, `world-library`, `object-count`, `pins`, `destinations`, `object-list`, `scene-status`, `city-summary`, `object-kind`, `selection-status`, `city-building-name`, `city-building-meta`, `city-building-data`, `focus`, `world-title`, `destination`, `city-info`, `canvas-help`, `scene-label`, `add-object`, `world-units`, `attribution`, `scan-info`, `walk-enter`, `camera-view`, `scan-name`, `scan-meta`, `scan-data`, `properties`, `empty-selection`, `selected-name`, `object-name`, `*-*`, `visible`, `locked`, `page-enabled`, `object-color`, `animation`, `page-title`, `page-body`, `lock-note`, `duplicate`, `delete`, `original-color`, `visit-destination`, `landscape-toggle`, `grid-toggle`, `exposure`, `exposure-value`, `undo`, `redo`, `snap`, `landscape`, `edit-mode`, `preview-mode`, `destination-kind`, `destination-title`, `destination-body`, `reduce-motion`, `play`, `add-dialog`, `fallback`, `canvas`, `close-destination`, `next-destination`, `previous-destination`, `overview`, `help`, `help-dialog`, `reset-world`, `reset-dialog`, `confirm-reset`, `save`, `export`, `import`, `import-file`, `city-remove`, `scan-quality`, `scan-device-check`, `device-check-result`, `device-check-verdict`, `device-check-stored`, `device-check-dialog`, `device-check-copy`

**Event-Bindungen**

| Zeile | Ereignis | Ziel |
|---:|---|---|
| 222 | `click` | `$("#world-library")` |
| 223 | `click` | `$("#object-list")` |
| 224 | `click` | `$("#pins")` |
| 225 | `click` | `$("#destinations")` |
| 226 | `click` | `b` |
| 227 | `change` | `$("#object-name")` |
| 228 | `change` | `input` |
| 233 | `change` | `$("#visible")` |
| 234 | `change` | `$("#locked")` |
| 235 | `change` | `$("#object-color")` |
| 236 | `click` | `$("#original-color")` |
| 237 | `change` | `$("#animation")` |
| 238 | `change` | `$("#"+id)` |
| 239 | `change` | `$("#landscape-toggle")` |
| 240 | `change` | `$("#grid-toggle")` |
| 241 | `change` | `$("#exposure")` |
| 242 | `input` | `$("#exposure")` |
| 243 | `click` | `$("#edit-mode")` |
| 243 | `click` | `$("#preview-mode")` |
| 244 | `click` | `$("#visit-destination")` |
| 245 | `click` | `$("#close-destination")` |
| 246 | `click` | `$("#next-destination")` |
| 246 | `click` | `$("#previous-destination")` |
| 247 | `click` | `$("#overview")` |
| 247 | `click` | `$("#focus")` |
| 248 | `change` | `$("#camera-view")` |
| 249 | `change` | `$("#snap")` |
| 250 | `click` | `$("#play")` |
| 250 | `change` | `$("#reduce-motion")` |
| 251 | `change` | `systemMotion` |
| 251 | `visibilitychange` | `document` |
| 252 | `click` | `$("#add-object")` |
| 252 | `click` | `b` |
| 253 | `click` | `$("#help")` |
| 253 | `click` | `b` |
| 254 | `click` | `$("#reset-world")` |
| 254 | `click` | `$("#confirm-reset")` |
| 255 | `click` | `$("#duplicate")` |
| 255 | `click` | `$("#delete")` |
| 255 | `click` | `$("#undo")` |
| 255 | `click` | `$("#redo")` |
| 256 | `click` | `$("#save")` |
| 256 | `click` | `$("#export")` |
| 256 | `click` | `$("#import")` |
| 265 | `click` | `$("#city-remove")` |
| 266 | `change` | `$("#import-file")` |
| 268 | `keydown` | `document` |
| 313 | `change` | `$("#scan-quality")` |
| 321 | `securitypolicyviolation` | `document` |
| 342 | `click` | `$("#device-check-copy")` |
| 345 | `click` | `$("#scan-device-check")` |

**Speicherzugriffe**

| Zeile | API | Schlüssel |
|---:|---|---|
| 45 | `localStorage.getItem` | `storageKey (Konstante)` |
| 207 | `localStorage.setItem` | `storageKey (Konstante)` |

## `dist/world-studio/index.html`

20.409 Bytes · 38 Zeilen · World Studio

Titel: 3D Worlds — Ourark World Studio · Skripte: `/world-studio/editor.js`, `/runtime/perf-meter.js` · Stylesheets: `/world-studio/studio.css`, `/glass.css`, `/runtime/perf-meter.css`

**Element-IDs (132):** `i-move`, `i-rotate`, `i-scale`, `i-select`, `i-cube`, `i-plus`, `i-eye`, `i-lock`, `i-copy`, `i-trash`, `i-focus`, `i-play`, `i-pause`, `i-grid`, `i-close`, `oaGlow`, `oaBg`, `import`, `export`, `save`, `world-library`, `object-count`, `add-object`, `object-list`, `help`, `world-title`, `edit-mode`, `preview-mode`, `walk-enter`, `undo`, `redo`, `snap`, `stage`, `attribution`, `landscape`, `canvas`, `runtime-hud`, `runtime-state`, `runtime-modes`, `runtime-fullscreen`, `runtime-pause`, `runtime-exit`, `runtime-hint`, `runtime-stick`, `runtime-info`, `runtime-info-type`, `runtime-info-name`, `runtime-info-data`, `runtime-info-empty`, `runtime-info-close`, `runtime-perf`, `runtime-position`, `runtime-paused`, `runtime-pause-reason`, `runtime-resume`, `pins`, `scene-label`, `world-units`, `overview`, `focus`, `camera-view`, `canvas-help`, `fallback`, `destination`, `close-destination`, `destination-kind`, `destination-title`, `destination-body`, `previous-destination`, `next-destination`, `destinations`, `play`, `reduce-motion`, `save-status`, `scene-status`, `selection-status`, `object-kind`, `empty-selection`, `properties`, `selected-name`, `duplicate`, `delete`, `object-name`, `visible`, `locked`, `position-unit`, `position-x`, `position-y`, `position-z`, `rotation-x`, `rotation-y`, `rotation-z`, `scale-x`, `scale-y`, `scale-z`, `lock-note`, `object-color`, `original-color`, `animation`, `page-enabled`, `page-title`, `page-body`, `visit-destination`, `city-info`, `city-building-name`, `city-building-meta`, `city-building-data`, `city-summary`, `city-remove`, `scan-info`, `scan-name`, `scan-meta`, `scan-data`, `scan-quality`, `scan-device-check`, `landscape-toggle`, `grid-toggle`, `exposure-value`, `exposure`, `reset-world`, `add-dialog`, `help-dialog`, `reset-dialog`, `confirm-reset`, `import-file`, `notice`, `device-check-dialog`, `device-check-title`, `device-check-verdict`, `device-check-result`, `device-check-stored`, `device-check-copy`

**data-Attribute:** `data-tool`, `data-view`, `data-vector`, `data-axis`, `data-add`

## `dist/world-studio/model.js`

4.464 Bytes · 53 Zeilen · World Studio

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 1 | `../worlds/data.js` | `worlds`, `stopPositions` |
| 2 | `../map-studio/project.js` | `readProject`, `MAX_PROJECT_BYTES`, `utf8Length` |

**Exporte:** `SCHEMA`, `kinds`, `clone`, `clamp`, `worldById`, `createObject`, `createDocument`, `validateDocument`, `readImport`, `History`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 3 | const | `SCHEMA` | ✓ | `"motionspec.world.v1"` |
| 4 | const | `kinds` | ✓ | `["landmark","box","sphere","ring","panel","text","beacon"]` |
| 5 | const | `clone` | ✓ | `value=>structuredClone(value)` |
| 6 | const | `clamp` | ✓ | `(value,min,max)=>Math.min(max,Math.max(min,value))` |
| 7 | const | `worldById` | ✓ | `id=>worlds.find(w=>w.id===id)` |
| 8 | function | `createObject` | ✓ | `(kind,index=0)` |
| 14 | function | `createDocument` | ✓ | `(world)` |
| 21 | function | `validateDocument` | ✓ | `(input)` |
| 38 | function | `readImport` | ✓ | `(text)` |
| 48 | class | `History` | ✓ |  |

**Klasse `History`** (Zeile 48)

| Zeile | Methode | Modifikatoren | Parameter |
|---:|---|---|---|
| 49 | `constructor` |  | `()` |
| 50 | `record` |  | `(before,after)` |
| 51 | `undo` |  | `(current)` |
| 52 | `redo` |  | `(current)` |

| Zeile | Instanzfeld | Erster Wert |
|---:|---|---|
| 49 | `past` | `[]` |
| 49 | `future` | `[]` |

## `dist/world-studio/renderer.js`

34.565 Bytes · 394 Zeilen · World Studio

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 1 | `../worlds/vendor/three.module.js` | `THREE` |
| 2 | `../worlds/vendor/OrbitControls.js` | `OrbitControls` |
| 3 | `../worlds/vendor/TransformControls.js` | `TransformControls` |
| 4 | `../worlds/scene.js` | `buildWorld` |
| 5 | `./model.js` | `clamp`, `worldById` |
| 6 | `../runtime/city-layer.js` | `CityLayer` |
| 7 | `../runtime/ground-layer.js` | `groundMesh`, `BASE_ORDER` |
| 8 | `../runtime/camera-rig.js` | `sourceView` |

**Exporte:** `WorldEditorRenderer`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 11 | const | `STATS` |  | `new URLSearchParams(globalThis.location?.search??"").has("stats")` |
| 13 | const | `HOLD_FRAME` |  | `(v=>v!==null&&Number.isInteger(Number(v))?Number(v):null)(new URLSearchParams(globalThis.…` |
| 15 | const | `DIORAMA` |  | `{far:250,maxDistance:90,minDistance:3}` |
| 17 | const | `SCAN` |  | `{far:80,maxDistance:18,minDistance:.3}` |
| 17 | const | `SCAN_EXPOSURE` |  | `2**-.15` |
| 19 | function | `disposeTree` |  | `(root)` |
| 25 | function | `wrappedText` |  | `(ctx,text,x,y,maxWidth,lineHeight,maxLines)` |
| 38 | function | `panelTexture` |  | `(record)` |
| 50 | function | `textTexture` |  | `(record)` |
| 55 | const | `textureContentKey` |  | `record=>JSON.stringify([record.page.title\|\|record.name,record.page.body,record.color])` |
| 56 | class | `WorldEditorRenderer` | ✓ |  |

**Klasse `WorldEditorRenderer`** (Zeile 56)

| Zeile | Methode | Modifikatoren | Parameter |
|---:|---|---|---|
| 57 | `constructor` |  | `(canvas,callbacks={})` |
| 100 | `createItem` |  | `(record,sources)` |
| 126 | `load` |  | `(doc,resetCamera=false)` |
| 145 | `setReach` |  | `({far,maxDistance,minDistance})` |
| 146 | `leaveCity` |  | `()` |
| 147 | `loadCity` |  | `(doc,resetCamera=false)` |
| 163 | `leaveScan` |  | `()` |
| 170 | `setQuality` |  | `(tier)` |
| 175 | `loadScan` |  | `(scan)` |
| 203 | `applySourceFrame` |  | `(time)` |
| 208 | `scanExtent` |  | `()` |
| 213 | `playSource` |  | `()` |
| 220 | `stopSource` |  | `()` |
| 226 | `applyObject` |  | `(record)` |
| 240 | `updateSettings` |  | `()` |
| 243 | `updateRoute` |  | `()` |
| 249 | `updateSelectionBox` |  | `()` |
| 254 | `select` |  | `(id)` |
| 260 | `setMode` |  | `(mode)` |
| 261 | `setSnap` |  | `(value)` |
| 262 | `setPreview` |  | `(value)` |
| 263 | `setMotion` |  | `(playing,reduced)` |
| 264 | `overview` |  | `()` |
| 285 | `focus` |  | `(id)` |
| 291 | `cameraView` |  | `(view)` |
| 298 | `resize` |  | `()` |
| 302 | `request` |  | `()` |
| 303 | `render` |  | `(now)` |
| 328 | `gpuBegin` |  | `()` |
| 332 | `gpuEnd` |  | `(query)` |
| 342 | `walkUnits` |  | `()` |
| 347 | `enterRuntime` |  | `(start,eye)` |
| 359 | `placeView` |  | `({position,target,up=[0,1,0],avatar=null})` |
| 367 | `avatarFor` |  | `(eyeHeight)` |
| 377 | `placePlayer` |  | `({x,z,heading=0,pitch=0},eye)` |
| 378 | `draw` |  | `()` |
| 379 | `setRenderScale` |  | `(scale)` |
| 380 | `showColliders` |  | `(colliders,y=0)` |
| 385 | `clearColliders` |  | `()` |
| 386 | `exitRuntime` |  | `()` |

| Zeile | Instanzfeld | Erster Wert |
|---:|---|---|
| 58 | `canvas` | `canvas` |
| 58 | `callbacks` | `callbacks` |
| 58 | `frame` | `0` |
| 58 | `playing` | `false` |
| 58 | `reduced` | `false` |
| 58 | `preview` | `false` |
| 58 | `mode` | `"translate"` |
| 58 | `motionTime` | `0` |
| 58 | `items` | `new Map()` |
| 58 | `available` | `true` |
| 59 | `scene` | `new THREE.Scene()` |
| 59 | `camera` | `new THREE.PerspectiveCamera(42,1,.1,250)` |
| 62 | `rim` | `new THREE.DirectionalLight("#4ade80",2)` |
| 63 | `raycaster` | `new THREE.Raycaster()` |
| 64 | `renderer` | `new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:"low-power"})` |
| 65 | `editorPixelRatio` | `Math.min(window.devicePixelRatio\|\|1,1.5)` |
| 65 | `renderScale` | `this.editorPixelRatio` |
| 67 | `orbit` | `new OrbitControls(this.camera,canvas)` |
| 71 | `transform` | `new TransformControls(this.camera,canvas)` |
| 81 | `grid` | `new THREE.GridHelper(26,52,"#4ade80","#3f3f3f")` |
| 82 | `selectionBox` | `new THREE.Box3Helper(new THREE.Box3(),"#4ade80")` |
| 83 | `pointerStart` | `{x:e.clientX,y:e.clientY,gizmo:this.transform.axis!==null}` |
| 96 | `resizeObserver` | `new ResizeObserver(()=>this.resize())` |
| 97 | `lastTime` | `0` |
| 129 | `doc` | `doc` |
| 129 | `content` | `new THREE.Group()` |
| 130 | `builtRoot` | `built.root` |
| 146 | `city` | `null` |
| 146 | `cityDoc` | `null` |
| 160 | `selected` | `null` |
| 164 | `scan` | `null` |
| 171 | `quality` | `tier==="high"?"high":"medium"` |
| 184 | `scanReach` | `{far:Math.max(SCAN.far,span*6+4000*!!scan.lighting?.sky),maxDistance:Math.max(SCAN.maxDis…` |
| 218 | `sourceTime` | `0` |
| 218 | `source` | `true` |
| 221 | `sourceSaved` | `null` |
| 244 | `route` | `null` |
| 350 | `saved` | `{camera:this.camera,position:this.camera.position.clone(),quaternion:this.camera.quaterni…` |
| 351 | `runtime` | `true` |
| 375 | `avatar` | `group` |
| 375 | `avatarEye` | `eyeHeight` |
| 381 | `colliderDebug` | `new THREE.Group()` |

**Event-Bindungen**

| Zeile | Ereignis | Ziel |
|---:|---|---|
| 68 | `change` | `this.orbit` |
| 73 | `change` | `this.transform` |
| 74 | `dragging-changed` | `this.transform` |
| 75 | `objectChange` | `this.transform` |
| 83 | `pointerdown` | `canvas` |
| 84 | `pointerup` | `canvas` |
| 93 | `pointercancel` | `canvas` |
| 94 | `dblclick` | `canvas` |
| 95 | `webglcontextlost` | `canvas` |
| 97 | `visibilitychange` | `document` |

## `dist/world-studio/studio.css`

27.150 Bytes · 34 Zeilen · World Studio

349 Regelblöcke · Media-Queries: `(min-width:1700px)`, `(max-width:1250px)`, `(max-width:1020px)`, `(max-width:720px)`, `(prefers-reduced-motion:no-preference)`, `(prefers-reduced-motion:reduce)`, `(forced-colors:active)`

| CSS-Variable | Erster Wert |
|---|---|
| `--bg` | `#131313` |
| `--panel` | `#1b1b1b` |
| `--panel2` | `#292929` |
| `--line` | `#333333` |
| `--teal` | `#4ade80` |
| `--teal2` | `#86efac` |
| `--ink` | `#f2f2f2` |
| `--muted` | `#bababa` |
| `--muted2` | `#989898` |
| `--sans` | `Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',` |
| `--mono` | `'JetBrains Mono',ui-monospace,SFMono-Regular,Consolas,monosp` |

## `dist/world-studio/walk.js`

4.041 Bytes · 61 Zeilen · World Studio

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 3 | `../worlds/vendor/three.module.js` | `THREE` |
| 4 | `../runtime/physics/adapter.js` | `createWorld` |

**Exporte:** `WORLD_METRES`, `WALKER`, `STEP_HEIGHT`, `convexHull`, `walkableArea`, `groundLevel`, `sceneColliders`, `prepareWorldWalk`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 6 | const | `WORLD_METRES` | ✓ | `5` |
| 8 | const | `WALKER` | ✓ | `{radius:.3/WORLD_METRES,height:1.8/WORLD_METRES,eye:1.6/WORLD_METRES,speed:3/WORLD_METRES…` |
| 10 | const | `STEP_HEIGHT` | ✓ | `.5/WORLD_METRES` |
| 13 | function | `convexHull` | ✓ | `(points)` |
| 23 | function | `walkableArea` | ✓ | `(worldId,segments=64)` |
| 28 | function | `groundLevel` | ✓ | `(root)` |
| 35 | function | `sceneColliders` | ✓ | `(units,{groundY,height=WALKER.height,step=STEP_HEIGHT})` |
| 54 | function | `prepareWorldWalk` | ✓ | `({worldId,groundY,colliders,targets})` |

## `dist/worldport/core.mjs`

8.640 Bytes · 104 Zeilen · Datenimport

**Exporte:** `LIMITS`, `parseCsv`, `convertPoints`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 5 | const | `LIMITS` | ✓ | `Object.freeze({maxPoints:5000,maxDataChars:6000,maxMapMetres:5000,minMapMetres:10})` |
| 6 | const | `PALETTE` |  | `["#5eead4","#f3c969","#72a8ef","#d5b5ff","#ff8a65","#a3e635","#f472b6","#99f6e4"]` |
| 8 | const | `LABELS` |  | `{source:"Quelle",category:"Kategorie",description:"Beschreibung",tags:"Tags",igPhoto_cred…` |
| 11 | const | `SKIP_COLUMN` |  | `/^(lat\|lng\|id\|name\|record_no\|record_key\|motion_path)$/i` |
| 11 | const | `SKIP_WORDS` |  | `new Set(["link","links","url","urls","href","src","website","homepage","video","poster"])` |
| 12 | const | `SKIP_VALUE` |  | `/https?:\/\/\|^assets\/\|^(javascript\|data\|vbscript\|file):\|^\/\/\|^www\./i` |
| 13 | const | `words` |  | `column=>column.replace(/([a-z0-9])([A-Z])/g,"$1 $2").toLowerCase().split(/[^a-z0-9]+/).fi…` |
| 14 | const | `skipColumn` |  | `column=>SKIP_COLUMN.test(column)\|\|words(column).some(word=>SKIP_WORDS.has(word))` |
| 16 | const | `clip` |  | `(text,length)=>{const chars=Array.from(text);return chars.length>length?chars.slice(0,Mat…` |
| 17 | const | `MAX_KEY_CHARS` |  | `100` |
| 20 | function | `parseCsv` | ✓ | `(text)` |
| 40 | const | `toNumber` |  | `value=>/^-?(0\|[1-9]\d{0,14})(\.\d{1,15})?$/.test(value)&&value!=="-0"?Number(value):value` |
| 42 | const | `coordinate` |  | `value=>{const text=String(value??"").trim();return/^[-+]?(\d+\.?\d*\|\.\d+)(e[-+]?\d+)?$/i…` |
| 43 | const | `COORDINATES` |  | `"Original-Koordinaten"` |
| 46 | function | `variables` |  | `(record)` |
| 58 | function | `fitData` |  | `(entries,warnings,name)` |
| 75 | function | `convertPoints` | ✓ | `(records,{name="Importierte Welt",scale=1,exclude={},colorBy="source",size={width:6,depth:6,height:10},margin…` |

## `dist/worldport/osm-ground.mjs`

13.527 Bytes · 206 Zeilen · Datenimport

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 4 | `../runtime/geometry/polygon.js` | `signedArea`, `isSimple` |

**Exporte:** `validCoordinate`, `outerRings`, `ROAD_WIDTHS`, `SEA_COLOR`, `LAND_COLOR`, `overpassGroundQuery`, `thinLine`, `thinRing`, `clipPolyline`, `clipPolygon`, `coastLand`, `convertGround`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 6 | const | `validCoordinate` | ✓ | `g=>typeof g?.lat==="number"&&typeof g?.lon==="number"&&Math.abs(g.lat)<=90&&Math.abs(g.lo…` |
| 7 | const | `same` |  | `(a,b)=>a.lat===b.lat&&a.lon===b.lon` |
| 8 | const | `closedRing` |  | `g=>g.length>=4&&same(g[0],g.at(-1))` |
| 9 | const | `MAX_PIECES` |  | `5000` |
| 12 | function | `outerRings` | ✓ | `(members=[])` |
| 32 | const | `ROAD_WIDTHS` | ✓ | `{motorway:16,trunk:16,primary:14,secondary:12,tertiary:10,unclassified:8,residential:8,li…` |
| 34 | const | `PATHS` |  | `new Set(["pedestrian","track","footway","path","cycleway","steps","bridleway","corridor"])` |
| 35 | const | `AREA_KIND` |  | `tags=>/^(beach\|sand)$/.test(tags.natural??"")?"beach":/^(park\|garden\|pitch\|golf_course\|pl…` |
| 38 | const | `SEA_COLOR` | ✓ | `"#1f5f8b"` |
| 38 | const | `LAND_COLOR` | ✓ | `"#27353b"` |
| 39 | const | `MAX_AREA_CORNERS` |  | `1500` |
| 39 | const | `MAX_RIBBON_POINTS` |  | `5000` |
| 41 | function | `overpassGroundQuery` | ✓ | `({south,west,north,east},timeout=120)` |
| 46 | const | `zero` |  | `n=>n+0` |
| 47 | const | `dropRepeats` |  | `points=>points.filter((v,i)=>i===0\|\|v[0]!==points[i-1][0]\|\|v[1]!==points[i-1][1])` |
| 49 | function | `thinLine` | ✓ | `(points,tolerance)` |
| 62 | function | `thinRing` | ✓ | `(points,max)` |
| 68 | function | `clipPolyline` | ✓ | `(points,{halfWidth,halfDepth})` |
| 85 | function | `clipPolygon` | ✓ | `(points,{halfWidth,halfDepth})` |
| 108 | function | `coastLand` | ✓ | `(chains,rect)` |
| 158 | function | `convertGround` | ✓ | `(overpass,{project,shift:[mx,mz],rect,simplify,maxPoints=400000,maxSurfaces=20000})` |

## `dist/worldport/osm.mjs`

13.225 Bytes · 165 Zeilen · Datenimport

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 5 | `../map-studio/model.js` | `validateDocument`, `MAX_POINTS`, `MAX_MAP_METRES`, `MAX_FOOTPRINT_VERTICES`, `MAX_TOTAL_FOOTPRINT_VERTICES` |
| 6 | `../runtime/geometry/polygon.js` | `isSimple`, `signedArea` |
| 7 | `../runtime/map-adapter.js` | `collidersFromSnapshot` |
| 8 | `../runtime/physics/adapter.js` | `createWorld` |
| 9 | `./osm-ground.mjs` | `outerRings`, `validCoordinate`, `convertGround`, `SEA_COLOR`, `LAND_COLOR` |

**Exporte:** `outerRings`, `OSM_ATTRIBUTION`, `overpassQuery`, `projection`, `parseHeight`, `simplify`, `convertOsm`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 13 | const | `OSM_ATTRIBUTION` | ✓ | `"Kartendaten: © OpenStreetMap-Mitwirkende, Datenlizenz ODbL (openstreetmap.org/copyright)"` |
| 14 | const | `SOURCE` |  | `"© OpenStreetMap-Mitwirkende (ODbL)"` |
| 15 | const | `LEVEL_METRES` |  | `3.2` |
| 15 | const | `MAX_HEIGHT` |  | `300` |
| 15 | const | `MAX_SIZE` |  | `300` |
| 15 | const | `MARGIN` |  | `40` |
| 17 | const | `ESTIMATE` |  | `{house:6,detached:6,residential:9,apartments:15,hotel:15,commercial:10,retail:6,office:15…` |
| 18 | const | `DEFAULT_ESTIMATE` |  | `7` |
| 20 | const | `COLORS` |  | `{hotel:"#f6a6c1",apartments:"#5eead4",residential:"#5eead4",commercial:"#f3c969",retail:"…` |
| 21 | const | `DEFAULT_COLOR` |  | `"#d5b5ff"` |
| 24 | function | `overpassQuery` | ✓ | `({south,west,north,east},timeout=90)` |
| 30 | function | `projection` | ✓ | `({lat,lon})` |
| 35 | const | `round2` |  | `n=>Math.round(n*100)/100` |
| 37 | function | `range` |  | `(values)` |
| 38 | const | `median` |  | `values=>{const sorted=[...values].sort((a,b)=>a-b);return sorted.length?sorted[sorted.len…` |
| 39 | const | `text` |  | `(value,max)=>(value===undefined\|\|value===null?"":String(value)).slice(0,max)` |
| 40 | const | `MIN_HEIGHT` |  | `.2` |
| 40 | const | `MAX_RING_NODES` |  | `2000` |
| 43 | function | `parseHeight` | ✓ | `(tags)` |
| 55 | const | `triangle` |  | `(a,b,c)=>Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2` |
| 59 | function | `simplify` | ✓ | `(points,max=MAX_FOOTPRINT_VERTICES)` |
| 72 | const | `label` |  | `(tags,ref)=>{const address=[text(tags["addr:housenumber"],20),text(tags["addr:street"],10…` |
| 76 | const | `BASE` |  | `{schema:"motionspec.map.v3",name:"Prüfung",map:{width:MAX_MAP_METRES,depth:MAX_MAP_METRES…` |
| 77 | const | `acceptable` |  | `point=>{try{validateDocument({...BASE,points:[point]});return true;}catch{return false;}}` |
| 83 | function | `convertOsm` | ✓ | `(overpass,{name="OpenStreetMap-Welt",centre,spawn,ground}={})` |

## `dist/worlds/data.js`

11.624 Bytes · 28 Zeilen · Welt-Vorlagen (geteilt)

**Exporte:** `worlds`, `stopPositions`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 1 | const | `worlds` | ✓ | `[{id:"alpine",number:"01",name:"Alpine Retreat",category:"HOSPITALITY / TRAVEL",tag:"A pl…` |
| 28 | const | `stopPositions` | ✓ | `[[-6,0,2],[-1.8,0,-1.8],[3,0,-3.5],[7,0,0]]` |

## `dist/worlds/scene.js`

16.235 Bytes · 107 Zeilen · Welt-Vorlagen (geteilt)

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 1 | `./vendor/three.module.js` | `THREE` |
| 2 | `./data.js` | `stopPositions` |

**Exporte:** `buildWorld`, `WorldScene`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 3 | const | `v` |  | `(a)=>new THREE.Vector3(...a)` |
| 4 | const | `seeded` |  | `(i)=>{const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x)}` |
| 5 | function | `material` |  | `(color,opts={})` |
| 6 | function | `mesh` |  | `(geometry,mat,parent,pos=[0,0,0],scale)` |
| 7 | function | `box` |  | `(parent,mat,x,y,z,w,h,d)` |
| 8 | function | `cylinder` |  | `(parent,mat,x,y,z,r,h,rt=r)` |
| 9 | function | `sphere` |  | `(parent,mat,x,y,z,r)` |
| 10 | function | `torus` |  | `(parent,mat,r,tube,pos,rotation=[0,0,0],arc=Math.PI*2)` |
| 11 | function | `line` |  | `(parent,points,color,r=.026)` |
| 12 | function | `windowRow` |  | `(parent,mat,x,y,z,count=5)` |
| 13 | function | `lodge` |  | `(parent,wood,glass,metal,scale=1)` |
| 14 | function | `buildWorld` | ✓ | `(world)` |
| 84 | class | `WorldScene` | ✓ |  |

**Klasse `WorldScene`** (Zeile 84)

| Zeile | Methode | Modifikatoren | Parameter |
|---:|---|---|---|
| 85 | `constructor` |  | `(canvas,{onSelect,onProject,onStatus})` |
| 93 | `resize` |  | `()` |
| 94 | `setWorld` |  | `(world)` |
| 95 | `cameraScale` |  | `()` |
| 96 | `overview` |  | `(immediate=false)` |
| 97 | `select` |  | `(index,immediate=false)` |
| 98 | `moveTo` |  | `(pos,target,immediate)` |
| 99 | `setMotion` |  | `(paused,reduced=false)` |
| 100 | `setEnabled` |  | `(value)` |
| 101 | `request` |  | `()` |
| 102 | `render` |  | `(now)` |

| Zeile | Instanzfeld | Erster Wert |
|---:|---|---|
| 85 | `canvas` | `canvas` |
| 85 | `onSelect` | `onSelect` |
| 85 | `onProject` | `onProject` |
| 85 | `onStatus` | `onStatus` |
| 85 | `enabled` | `true` |
| 85 | `paused` | `true` |
| 85 | `reduced` | `false` |
| 85 | `frame` | `0` |
| 85 | `angle` | `0` |
| 85 | `flight` | `null` |
| 85 | `time` | `0` |
| 85 | `drag` | `null` |
| 85 | `camera` | `new THREE.PerspectiveCamera(38,1,.1,150)` |
| 85 | `lookAt` | `new THREE.Vector3(0,0,-1)` |
| 85 | `scene` | `new THREE.Scene()` |
| 85 | `rim` | `new THREE.DirectionalLight("#8fc9f0",2)` |
| 85 | `raycaster` | `new THREE.Raycaster()` |
| 86 | `renderer` | `new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:"low-power"})` |
| 93 | `width` | `document.body.clientWidth` |
| 93 | `height` | `document.body.offsetHeight` |
| 94 | `built` | `buildWorld(world)` |
| 100 | `active` | `value` |

**Event-Bindungen**

| Zeile | Ereignis | Ziel |
|---:|---|---|
| 87 | `webglcontextlost` | `canvas` |
| 88 | `visibilitychange` | `document` |
| 89 | `pointerdown` | `canvas` |
| 90 | `pointermove` | `canvas` |
| 91 | `pointerup` | `canvas` |
| 91 | `pointercancel` | `canvas` |

## `edge/app.mjs`

12.787 Bytes · 148 Zeilen · Edge-Worker (Auslieferung)

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 5 | `./policy.mjs` | `SECURITY_HEADERS`, `STRICT_TRANSPORT_SECURITY`, `readCredentials`, `sameSecret`, `fingerprint`, `clientKey`, `securityHeadersFor`, `assetCacheControl`, `REVALIDATE_CACHE` |
| 6 | `./guard.mjs` | `BLOCK_SECONDS` |
| 7 | `./telemetry.mjs` | `kartTelemetry`, `kartInsights` |
| 8 | `./globe.mjs` | `globeConfig`, `geocode` |
| 9 | `./realtime.mjs` | `realtime` |

**Exporte:** `ENHANCE_MAX_BODY`, `ENHANCE_MAX_RESPONSE`, `SCENE_PATH`, `SCENE_CACHE`, `GEO_PATH`, `DEVICE_CHECK_MAX`, `createWorker`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 12 | const | `ENHANCE_MAX_BODY` | ✓ | `Math.ceil(12*1024*1024*4/3)+64*1024` |
| 14 | const | `ENHANCE_MAX_RESPONSE` | ✓ | `28*1024*1024` |
| 16 | const | `RESULT_SHAPE` |  | `/"contentType"\s*:\s*"image\/(webp\|png\|jpeg)"/` |
| 16 | const | `RESULT_DATA` |  | `/"outputBase64"\s*:\s*"[A-Za-z0-9+/]/` |
| 17 | const | `ENHANCE_TIMEOUT_MS` |  | `100_000` |
| 18 | const | `REALM` |  | `"Basic realm=\"MotionSpec World Studio (Test)\", charset=\"UTF-8\""` |
| 22 | const | `SCENE_PATH` | ✓ | `/^\/scenes\/([0-9a-f]{64})\/([a-z0-9_-]+(?:\.[a-z0-9]+)+)$/` |
| 23 | const | `SCENE_CACHE` | ✓ | `"private, max-age=31536000, immutable"` |
| 24 | const | `SCENE_TYPES` |  | `{glb:"model/gltf-binary",json:"application/json; charset=utf-8",webp:"image/webp",png:"im…` |
| 26 | function | `reply` |  | `(status,body,headers={})` |
| 29 | const | `jsonReply` |  | `(status,body,headers={})=>reply(status,typeof body==="string"?body:JSON.stringify(body),{…` |
| 30 | async function | `scenes` |  | `(request,env,pathname)` |
| 49 | const | `GEO_PATH` | ✓ | `/^\/geo\/([a-z0-9][a-z0-9-]{0,62})\/(tileset\.json\|L[0-9]{1,2}\/[0-9]{1,6}_[0-9]{1,6}\.gl…` |
| 50 | async function | `geo` |  | `(request,env,pathname)` |
| 63 | const | `DEVICE_CHECK_MAX` | ✓ | `16*1024` |
| 64 | async function | `deviceCheck` |  | `(request,env)` |
| 75 | const | `hex` |  | `buffer=>[...new Uint8Array(buffer)].map(b=>b.toString(16).padStart(2,"0")).join("")` |
| 78 | async function | `enhance` |  | `(request,env,ctx,fetchOrigin)` |
| 106 | async function | `askGuard` |  | `(namespace,key,attempt)` |
| 112 | function | `createWorker` | ✓ | `({fetchOrigin=(url,init)=>fetch(url,init)}={})` |

## `edge/globe.mjs`

3.170 Bytes · 43 Zeilen · Edge-Worker (Auslieferung)

**Exporte:** `GEOCODE_URL`, `GEOCODE_AGENT`, `GEOCODE_MAX_QUERY`, `GEOCODE_TTL_S`, `globeConfig`, `parsePlaces`, `geocode`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 6 | const | `GEOCODE_URL` | ✓ | `"https://nominatim.openstreetmap.org/search"` |
| 7 | const | `GEOCODE_AGENT` | ✓ | `"ourark-world-studio/1.0 (+https://ourark.io)"` |
| 8 | const | `GEOCODE_MAX_QUERY` | ✓ | `120` |
| 8 | const | `GEOCODE_TTL_S` | ✓ | `86400` |
| 9 | let | `lastLookup` |  | `0` |
| 11 | function | `globeConfig` | ✓ | `(request,env,jsonReply)` |
| 19 | function | `parsePlaces` | ✓ | `(list)` |
| 24 | async function | `geocode` | ✓ | `(request,env,jsonReply,fetchOrigin=(url,init)=>fetch(url,init),ctx={waitUntil(){}},now=()=>Date.now())` |

## `edge/guard.mjs`

2.284 Bytes · 39 Zeilen · Edge-Worker (Auslieferung)

**Exporte:** `MAX_FAILURES`, `WINDOW_SECONDS`, `BLOCK_SECONDS`, `LoginGuard`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 6 | const | `MAX_FAILURES` | ✓ | `10` |
| 6 | const | `WINDOW_SECONDS` | ✓ | `600` |
| 6 | const | `BLOCK_SECONDS` | ✓ | `900` |
| 7 | const | `KEY` |  | `"state"` |
| 8 | const | `json` |  | `body=>new Response(JSON.stringify(body),{headers:{"Content-Type":"application/json"}})` |
| 10 | class | `LoginGuard` | ✓ |  |

**Klasse `LoginGuard`** (Zeile 10)

| Zeile | Methode | Modifikatoren | Parameter |
|---:|---|---|---|
| 11 | `constructor` |  | `(ctx,env,now=Date.now)` |
| 12 | `load` | async | `(now)` |
| 17 | `save` | async | `(state)` |
| 22 | `fetch` | async | `(request)` |
| 34 | `alarm` | async | `()` |

| Zeile | Instanzfeld | Erster Wert |
|---:|---|---|
| 11 | `storage` | `ctx.storage` |
| 11 | `now` | `now` |

## `edge/map-room.mjs`

9.661 Bytes · 144 Zeilen · Edge-Worker (Auslieferung)

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 5 | `./room.mjs` | `Room`, `TICK_MS` |
| 6 | `../dist/runtime/sim/wasm.js` | `loadSim` |
| 7 | `../dist/runtime/assets/codec.js` | `decodeHeightFile` |
| 9 | `../dist/runtime/net/protocol.js` | `HEADER_BYTES`, `RECORD_BYTES`, `MAX_RECORDS` |

**Exporte:** `MAX_GARBAGE`, `MAX_MESSAGE`, `FLOOD_LIMIT`, `FLOOD_WINDOW_MS`, `IDLE_MS`, `MAX_PER_IP`, `TERRAIN_RETRY_MS`, `MapRoom`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 11 | const | `MAX_GARBAGE` | ✓ | `20` |
| 12 | const | `MAX_MESSAGE` | ✓ | `HEADER_BYTES+RECORD_BYTES*MAX_RECORDS` |
| 13 | const | `FLOOD_LIMIT` | ✓ | `100` |
| 13 | const | `FLOOD_WINDOW_MS` | ✓ | `5000` |
| 14 | const | `IDLE_MS` | ✓ | `30000` |
| 15 | const | `MAX_PER_IP` | ✓ | `8` |
| 16 | const | `TERRAIN_RETRY_MS` | ✓ | `60000` |
| 17 | const | `ASSET_NAME` |  | `/^[a-z0-9][a-z0-9_-]{0,63}$/` |
| 17 | const | `ASSET_FILE` |  | `/^[a-z0-9][a-z0-9_-]{0,63}\.bin(\.gz)?$/` |
| 18 | const | `json` |  | `body=>new Response(JSON.stringify(body),{headers:{"Content-Type":"application/json; chars…` |
| 20 | class | `MapRoom` | ✓ |  |

**Klasse `MapRoom`** (Zeile 20)

| Zeile | Methode | Modifikatoren | Parameter |
|---:|---|---|---|
| 24 | `constructor` |  | `(ctx,env,options={})` |
| 37 | `fetch` | async | `(request)` |
| 52 | `webSocketMessage` | async | `(ws,message)` |
| 74 | `ground` |  | `(x,z)` |
| 79 | `loadTerrain` |  | `(map)` |
| 98 | `connectionsFrom` |  | `(ip)` |
| 99 | `webSocketClose` | async | `(ws)` |
| 100 | `webSocketError` | async | `(ws)` |
| 102 | `strike` |  | `(ws,id)` |
| 109 | `drop` |  | `(id)` |
| 112 | `idOf` |  | `(ws)` |
| 113 | `startTicking` |  | `()` |
| 114 | `stopTicking` |  | `()` |
| 115 | `idleDeadline` |  | `(player)` |
| 116 | `expireIdle` |  | `(sockets=this.ctx.getWebSockets())` |
| 120 | `scheduleIdleAlarm` | async | `()` |
| 126 | `alarm` | async | `()` |
| 127 | `tick` |  | `()` |

| Zeile | Instanzfeld | Erster Wert |
|---:|---|---|
| 22 | `simModule` | `null` |
| 25 | `now` | `options.now??Date.now` |
| 25 | `ctx` | `ctx` |
| 25 | `env` | `env` |
| 26 | `sim` | `null` |
| 26 | `terrain` | `null` |
| 26 | `ready` | `Promise.resolve()` |
| 27 | `room` | `new Room({now:this.now,ground:(x,z)=>this.ground(x,z)})` |
| 27 | `garbage` | `new Map()` |
| 27 | `strikes` | `new Map()` |
| 27 | `timer` | `null` |
| 27 | `socketIds` | `new WeakMap()` |
| 28 | `upgrade` | `options.upgrade??(client=>new Response(null,{status:101,webSocket:client}))` |
| 29 | `setInterval` | `options.setInterval??((fn,ms)=>setInterval(fn,ms))` |
| 29 | `clearInterval` | `options.clearInterval??(t=>clearInterval(t))` |
| 82 | `terrainFor` | `map` |
| 93 | `terrainFailed` | `{map,at:this.now()}` |

## `edge/policy.mjs`

5.220 Bytes · 76 Zeilen · Edge-Worker (Auslieferung)

**Exporte:** `CONTENT_SECURITY_POLICY`, `SECURITY_HEADERS`, `STRICT_TRANSPORT_SECURITY`, `IMMUTABLE_CACHE`, `REVALIDATE_CACHE`, `assetCacheControl`, `GLOBE_HOSTS`, `GLOBE_CONTENT_SECURITY_POLICY`, `securityHeadersFor`, `readCredentials`, `sameSecret`, `fingerprint`, `clientKey`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 6 | const | `CONTENT_SECURITY_POLICY` | ✓ | `["default-src 'self'","script-src 'self'","style-src 'self' 'unsafe-inline'","img-src 'se…` |
| 8 | const | `SECURITY_HEADERS` | ✓ | `Object.freeze({"Content-Security-Policy":CONTENT_SECURITY_POLICY,"X-Frame-Options":"DENY"…` |
| 17 | const | `STRICT_TRANSPORT_SECURITY` | ✓ | `"max-age=31536000"` |
| 21 | const | `IMMUTABLE_CACHE` | ✓ | `"private, max-age=31536000, immutable"` |
| 21 | const | `REVALIDATE_CACHE` | ✓ | `"private, no-cache"` |
| 22 | function | `assetCacheControl` | ✓ | `(url)` |
| 29 | const | `GLOBE_HOSTS` | ✓ | `["https://server.arcgisonline.com","https://terrain.reearth.land","https://tile.googleapi…` |
| 30 | const | `GLOBE_CONTENT_SECURITY_POLICY` | ✓ | `["default-src 'self'","script-src 'self' 'wasm-unsafe-eval' blob:","style-src 'self' 'uns…` |
| 34 | function | `securityHeadersFor` | ✓ | `(pathname="")` |
| 40 | function | `readCredentials` | ✓ | `(header)` |
| 48 | async function | `sameSecret` | ✓ | `(given,expected)` |
| 57 | async function | `fingerprint` | ✓ | `(secret,value)` |
| 65 | function | `clientKey` | ✓ | `(ip)` |

## `edge/realtime.mjs`

1.474 Bytes · 20 Zeilen · Edge-Worker (Auslieferung)

**Exporte:** `REALTIME_MAPS`, `realtime`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 5 | const | `REALTIME_MAPS` | ✓ | `new Set(["kronach","rosenberg"])` |
| 7 | async function | `realtime` | ✓ | `(request,env,reply,pathname)` |

## `edge/room.mjs`

8.218 Bytes · 128 Zeilen · Edge-Worker (Auslieferung)

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 5 | `../dist/runtime/net/protocol.js` | `TYPE`, `FLAG`, `encode`, `decode`, `MAX_RECORDS`, `quantizeRecord`, `dequantizeRecord`, `encodeDelta`, `ROOM_BOUND` |

**Exporte:** `CELL`, `TICK_MS`, `MAX_PLAYERS`, `STALE_MS`, `BOUND`, `Y_MIN`, `Y_MAX`, `MAX_SPEED`, `interestRing`, `FLAG_TELEPORT`, `STATE_FLAGS`, `GROUND_BELOW`, `GROUND_ABOVE`, `HISTORY`, `CORRECTION_GAP_MS`, `refreshEvery`, `Room`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 8 | const | `CELL` | ✓ | `64` |
| 8 | const | `TICK_MS` | ✓ | `50` |
| 8 | const | `MAX_PLAYERS` | ✓ | `64` |
| 8 | const | `STALE_MS` | ✓ | `3000` |
| 8 | const | `BOUND` | ✓ | `ROOM_BOUND` |
| 8 | const | `Y_MIN` | ✓ | `-500` |
| 8 | const | `Y_MAX` | ✓ | `2000` |
| 10 | const | `MAX_SPEED` | ✓ | `Object.freeze({kart:40,car:60,plane:80,walk:8})` |
| 12 | const | `RING` |  | `{walk:1,kart:2,car:2,plane:4}` |
| 13 | const | `interestRing` | ✓ | `mode=>RING[mode]??1` |
| 14 | const | `FLAG_TELEPORT` | ✓ | `FLAG.TELEPORT` |
| 16 | const | `STATE_FLAGS` | ✓ | `FLAG.BRAKING\|FLAG.CRASHED` |
| 17 | const | `GROUND_BELOW` | ✓ | `3` |
| 17 | const | `GROUND_ABOVE` | ✓ | `15` |
| 18 | const | `BUCKET` |  | `30` |
| 18 | const | `REFILL_PER_S` |  | `30` |
| 18 | const | `TELEPORT_GAP_MS` |  | `2000` |
| 18 | const | `RESYNC_AFTER` |  | `10` |
| 20 | const | `HISTORY` | ✓ | `32` |
| 20 | const | `CORRECTION_GAP_MS` | ✓ | `500` |
| 23 | const | `refreshEvery` | ✓ | `d=>d<=1?1:d===2?2:4` |
| 25 | const | `cellKey` |  | `(i,j)=>(i+1024)*2048+(j+1024)` |
| 26 | const | `blank` |  | `now=>({pose:null,at:0,joined:now,tokens:BUCKET,refilled:now,lastTeleport:0,strikes:0,sent…` |
| 28 | class | `Room` | ✓ |  |

**Klasse `Room`** (Zeile 28)

| Zeile | Methode | Modifikatoren | Parameter |
|---:|---|---|---|
| 30 | `constructor` |  | `({now=Date.now,maxPlayers=MAX_PLAYERS,ground=null}={})` |
| 34 | `size` | get | `()` |
| 35 | `join` |  | `()` |
| 42 | `adopt` |  | `(id)` |
| 46 | `leave` |  | `(id)` |
| 47 | `reject` |  | `(reason)` |
| 49 | `refuse` |  | `(p,reason,now)` |
| 55 | `receive` |  | `(id,data)` |
| 91 | `tick` |  | `()` |
| 126 | `stats` |  | `()` |

| Zeile | Instanzfeld | Erster Wert |
|---:|---|---|
| 31 | `now` | `(Konstruktor-Option)` |
| 31 | `maxPlayers` | `(Konstruktor-Option)` |
| 31 | `ground` | `(Konstruktor-Option)` |
| 32 | `players` | `new Map()` |
| 32 | `nextId` | `1` |
| 32 | `tickCount` | `0` |
| 32 | `active` | `0` |
| 32 | `bytesIn` | `0` |
| 32 | `bytesOut` | `0` |
| 32 | `rejected` | `{}` |
| 32 | `deltas` | `0` |
| 32 | `snapshots` | `0` |

## `edge/telemetry.mjs`

7.271 Bytes · 102 Zeilen · Edge-Worker (Auslieferung)

**Exporte:** `TELEMETRY_FORMAT`, `INSIGHTS_FORMAT`, `TELEMETRY_MAX`, `MAX_SAMPLES`, `MAX_HOURS`, `MAX_OBJECTS`, `CELL`, `cleanSample`, `cleanBatch`, `kartTelemetry`, `aggregate`, `kartInsights`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 6 | const | `TELEMETRY_FORMAT` | ✓ | `"ourark.kart-telemetry.v1"` |
| 7 | const | `INSIGHTS_FORMAT` | ✓ | `"ourark.kart-insights.v1"` |
| 8 | const | `TELEMETRY_MAX` | ✓ | `24*1024` |
| 8 | const | `MAX_SAMPLES` | ✓ | `30` |
| 8 | const | `MAX_HOURS` | ✓ | `48` |
| 8 | const | `MAX_OBJECTS` | ✓ | `400` |
| 8 | const | `CELL` | ✓ | `50` |
| 9 | const | `MODES` |  | `new Set(["kart","plane","walk"])` |
| 9 | const | `MAPS` |  | `/^[a-z0-9-]{1,32}$/` |
| 9 | const | `SESSION` |  | `/^[0-9a-f]{16}$/` |
| 10 | const | `INSIGHTS_TTL_MS` |  | `30_000` |
| 11 | const | `cache` |  | `new Map()` |
| 13 | const | `finite` |  | `(v,lo,hi)=>typeof v==="number"&&Number.isFinite(v)&&v>=lo&&v<=hi` |
| 14 | const | `median` |  | `values=>{if(!values.length)return null;const s=[...values].sort((a,b)=>a-b),m=s.length>>1…` |
| 15 | const | `quantile` |  | `(values,q)=>{if(!values.length)return null;const s=[...values].sort((a,b)=>a-b);return s[…` |
| 16 | const | `round` |  | `(v,d=1)=>v==null?null:Math.round(v*10**d)/10**d` |
| 19 | function | `cleanSample` | ✓ | `(s)` |
| 28 | function | `cleanBatch` | ✓ | `(body)` |
| 40 | async function | `kartTelemetry` | ✓ | `(request,env,jsonReply)` |
| 55 | function | `aggregate` | ✓ | `(batches,{map=null,since=0}={})` |
| 84 | async function | `kartInsights` | ✓ | `(request,env,jsonReply,now=Date.now())` |

## `edge/worker.mjs`

624 Bytes · 12 Zeilen · Edge-Worker (Auslieferung)

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 3 | `./app.mjs` | `createWorker` |
| 6 | `./map-room.mjs` | `MapRoom` |
| 9 | `../dist/runtime/sim/sim.wasm` | `simModule` |

**Exporte:** `LoginGuard`, `MapRoom`

## `scripts/architecture-index.mjs`

27.843 Bytes · 347 Zeilen · Werkzeug

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 6 | `node:child_process` | `execFileSync` |
| 7 | `node:fs/promises` | `readFile`, `writeFile`, `mkdir` |
| 8 | `node:crypto` | `createHash` |
| 9 | `node:path` | `path` |
| 10 | `node:url` | `fileURLToPath` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 12 | const | `root` |  | `fileURLToPath(new URL("../",import.meta.url))` |
| 13 | const | `out` |  | `path.join(root,"docs/architecture")` |
| 14 | const | `VENDOR` |  | `/\/vendor\//` |
| 15 | const | `GENERATED` |  | `/^docs\/architecture\/(FILES\|SYMBOLS)\.md$\|^docs\/architecture\/index\.json$/` |
| 17 | const | `role` |  | `file=>{if(GENERATED.test(file))return "Generiert (dieses Verzeichnis)";if(file.startsWith…` |
| 44 | const | `KEYWORDS_BEFORE_REGEX` |  | `new Set(["return","typeof","instanceof","in","of","new","delete","void","throw","case","d…` |
| 45 | const | `PUNCT` |  | `[">>>=","...","===","!==","**=","<<=",">>=",">>>","&&=","\|\|=","??=","=>","==","!=","<=","…` |
| 46 | function | `tokenize` |  | `(src)` |
| 81 | const | `OPEN` |  | `{"(":")","[":"]","{":"}"}` |
| 82 | function | `matchClose` |  | `(tokens,i)` |
| 88 | function | `matchOpen` |  | `(tokens,i)` |
| 94 | function | `memberStart` |  | `(tokens,end)` |
| 102 | function | `source` |  | `(tokens,a,b,max=90)` |
| 107 | function | `patternNames` |  | `(tokens,a,b)` |
| 115 | function | `skipExpr` |  | `(tokens,k,limit=tokens.length)` |
| 123 | function | `analyzeJs` |  | `(file,src)` |
| 249 | function | `analyzeHtml` |  | `(src)` |
| 257 | function | `analyzeCss` |  | `(src)` |
| 266 | const | `files` |  | `execFileSync("git",["ls-files","--cached","--others","--exclude-standard"],{cwd:root,enco…` |
| 267 | const | `entries` |  | `[]` |
| 282 | const | `byHash` |  | `new Map()` |
| 286 | const | `page` |  | `(dir)=>entries.find(e=>e.file===ˋdist/${dir}index.htmlˋ)` |
| 287 | const | `pairs` |  | `[["dist/map-studio/editor.js","map-studio/"],["dist/world-studio/editor.js","world-studio…` |
| 288 | const | `contracts` |  | `pairs.map(([js,dir])=>{const script=entries.find(e=>e.file===js),html=page(dir);if(!scrip…` |
| 297 | const | `commit` |  | `execFileSync("git",["rev-parse","--short","HEAD"],{cwd:root,encoding:"utf8"}).trim()` |
| 298 | const | `esc` |  | `s=>String(s??"").replace(/\\|/g,"\\\\\|").replace(/\n/g," ")` |
| 299 | const | `code` |  | `s=>s?"ˋ"+String(s).replace(/ˋ/g,"ˋ").replace(/\\|/g,"\\\\\|")+"ˋ":""` |
| 300 | const | `n` |  | `x=>x.toLocaleString("de-DE")` |
| 301 | const | `header` |  | `title=>ˋ<!-- GENERIERT von scripts/architecture-index.mjs — nicht von Hand bearbeiten. Ne…` |
| 303 | let | `F` |  | `header("Dateiregister — jede Datei, Byte für Byte")` |
| 304 | const | `total` |  | `entries.reduce((s,e)=>s+e.bytes,0)` |
| 304 | const | `vendor` |  | `entries.filter(e=>VENDOR.test(e.file)).reduce((s,e)=>s+e.bytes,0)` |
| 306 | const | `groups` |  | `new Map()` |
| 312 | let | `S` |  | `header("Symbolregister — jede Variable, Funktion, Klasse und Eigenschaft")` |
| 336 | const | `json` |  | `JSON.stringify({generatedBy:"scripts/architecture-index.mjs",commit,files:entries,contrac…` |
| 338 | const | `outputs` |  | `{"FILES.md":F,"SYMBOLS.md":S,"index.json":json}` |
| 339 | const | `strip` |  | `s=>s.replace(/Commit ˋ[0-9a-f]+ˋ/,"").replace(/"commit": "[0-9a-f]+"/,"")` |

## `scripts/check.mjs`

6.874 Bytes · 127 Zeilen · Werkzeug

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 1 | `node:fs/promises` | `readFile`, `readdir`, `access` |
| 2 | `node:child_process` | `execFileSync` |
| 3 | `node:path` | `path` |
| 4 | `node:url` | `fileURLToPath`, `pathToFileURL` |

**Exporte:** `relativeModuleReferences`, `checkProject`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 5 | async function | `walk` |  | `(dir)` |
| 9 | function | `tokens` |  | `(source)` |
| 70 | function | `relativeModuleReferences` | ✓ | `(source)` |
| 97 | async function | `checkProject` | ✓ | `(root)` |

## `scripts/city-tile.mjs`

8.127 Bytes · 100 Zeilen · Werkzeug

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 6 | `node:fs/promises` | `readFile`, `writeFile`, `mkdir` |
| 7 | `node:path` | `path` |
| 8 | `node:url` | `pathToFileURL` |
| 9 | `../dist/worlds/vendor/three.module.js` | `THREE` |
| 10 | `../dist/runtime/ground-layer.js` | `buildGround`, `GROUND_STYLE` |

**Exporte:** `writeGlb`, `clipToRect`, `buildTile`, `orbitCamera`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 13 | function | `writeGlb` | ✓ | `(parts)` |
| 34 | function | `clipToRect` | ✓ | `(triangle,[x0,z0,x1,z1])` |
| 44 | function | `buildTile` | ✓ | `(doc,[x0,z0,size])` |
| 80 | function | `orbitCamera` | ✓ | `([x0,z0,size],{seconds=20,fps=30,height=45}={})` |

## `scripts/globe/make-vehicles.mjs`

4.023 Bytes · 59 Zeilen · Werkzeug

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 5 | `node:fs/promises` | `writeFile`, `mkdir` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 8 | const | `COLORS` |  | `[[.96,.96,.95],[.95,.78,.14],[.13,.15,.18],[.42,.56,.66]]` |
| 9 | const | `PLANE` |  | `[[[0,0,0],[6.6,1,1],0],[[-.6,0,0],[1.2,1.04,1.04],1],[[3.5,0,0],[.6,.7,.7],2],[[1.1,.42,0…` |
| 15 | const | `CAR` |  | `[[[0,.55,0],[4.3,.7,1.8],1],[[-.25,1.15,0],[2.2,.6,1.62],3],[[-.25,1.48,0],[2,.06,1.5],1]…` |
| 21 | function | `boxes` |  | `(parts)` |
| 38 | function | `glb` |  | `(parts)` |
| 57 | const | `out` |  | `new URL("../../dist/globe/models/",import.meta.url)` |

## `scripts/kart/pack-assets.mjs`

5.169 Bytes · 80 Zeilen · Werkzeug

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 11 | `node:fs/promises` | `readFile`, `writeFile`, `unlink`, `access` |
| 12 | `node:crypto` | `createHash` |
| 13 | `node:zlib` | `gzipSync` |
| 14 | `node:child_process` | `execFileSync` |
| 15 | `../../dist/runtime/assets/codec.js` | `encodeHeightPlanes`, `decodeHeightFile`, `decodeBinaryFile`, `HEIGHT_PACKING`, `GZIP_PACKING` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 17 | const | `DIR` |  | `new URL("../../dist/kart/assets/",import.meta.url)` |
| 17 | const | `CHECK` |  | `process.argv.includes("--check")` |
| 18 | const | `MAPS` |  | `["rosenberg","kronach"]` |
| 18 | const | `PREVIEW_PX` |  | `1024` |
| 18 | const | `PREVIEW_QUALITY` |  | `80` |
| 19 | const | `file` |  | `name=>new URL(name,DIR)` |
| 20 | const | `exists` |  | `async name=>{try{await access(file(name));return true;}catch{return false;}}` |
| 21 | const | `hashOf` |  | `bytes=>createHash("sha256").update(bytes).digest("hex").slice(0,16)` |
| 22 | const | `gzip` |  | `bytes=>gzipSync(bytes,{level:9})` |
| 23 | const | `problems` |  | `[]` |
| 23 | let | `changed` |  | `false` |
| 25 | async function | `packHeight` |  | `(grid,label)` |
| 36 | async function | `packGzip` |  | `(entry,label)` |
| 45 | async function | `preview` |  | `(texture,label)` |
| 54 | async function | `stamp` |  | `(entry,label)` |
| 60 | async function | `save` |  | `(name,meta)` |
| 62 | const | `lands` |  | `new Set()` |

## `scripts/package-source.mjs`

962 Bytes · 12 Zeilen · Werkzeug

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 1 | `node:child_process` | `execFileSync` |
| 2 | `node:fs/promises` | `mkdir`, `writeFile` |
| 3 | `node:crypto` | `createHash` |
| 4 | `node:path` | `path` |
| 5 | `node:url` | `fileURLToPath` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 6 | const | `root` |  | `fileURLToPath(new URL("../",import.meta.url))` |
| 8 | const | `sha` |  | `execFileSync("git",["rev-parse","HEAD"],{cwd:root,encoding:"utf8"}).trim()` |
| 8 | const | `release` |  | `path.join(root,"releases")` |
| 9 | const | `archive` |  | `execFileSync("git",["archive","--format=zip","--prefix=ourark-world-studio/","HEAD"],{cwd…` |
| 10 | const | `name` |  | `ˋourark-world-studio-${sha.slice(0,8)}.zipˋ` |

## `scripts/public-tests.mjs`

1.297 Bytes · 21 Zeilen · Werkzeug

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 3 | `node:child_process` | `spawnSync` |
| 4 | `node:url` | `fileURLToPath` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 5 | const | `root` |  | `fileURLToPath(new URL("../",import.meta.url))` |
| 6 | const | `suites` |  | `["build-tools","world-studio","map-studio","map-history","map-enhance","map-v2","map-runt…` |
| 19 | const | `result` |  | `spawnSync(process.execPath,["--test","tests/repository.test.mjs","tests/edge.test.mjs"],{…` |

## `scripts/serve.mjs`

10.421 Bytes · 123 Zeilen · Werkzeug

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 1 | `node:http` | `createServer` |
| 2 | `node:fs/promises` | `readFile`, `readdir`, `realpath`, `stat` |
| 3 | `node:path` | `path` |
| 4 | `node:url` | `fileURLToPath`, `pathToFileURL` |
| 5 | `../edge/policy.mjs` | `SECURITY_HEADERS`, `securityHeadersFor` |
| 6 | `../edge/globe.mjs` | `globeConfig`, `geocode` |
| 7 | `../edge/app.mjs` | `ENHANCE_MAX_BODY` |
| 8 | `../edge/telemetry.mjs` | `cleanBatch`, `aggregate` |
| 9 | `./ws-local.mjs` | `handleUpgrade`, `localRooms` |

**Exporte:** `siteRoot`, `scenesRoot`, `createDevServer`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 11 | const | `siteRoot` | ✓ | `fileURLToPath(new URL("../dist/",import.meta.url))` |
| 14 | const | `scenesRoot` | ✓ | `process.env.SCENES_DIR?path.resolve(process.env.SCENES_DIR):fileURLToPath(new URL("../tes…` |
| 15 | const | `SCENE_PATH` |  | `/^\/scenes\/([0-9a-f]{64})\/([a-z0-9_-]+(?:\.[a-z0-9]+)+)$/i` |
| 15 | const | `SCENE_CACHE` |  | `"private, max-age=31536000, immutable"` |
| 16 | async function | `sceneIndex` |  | `(root)` |
| 23 | async function | `serveScenes` |  | `(req,res,pathname,root)` |
| 34 | const | `mime` |  | `{".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/j…` |
| 37 | async function | `proxyEnhance` |  | `(req,res,{url,token}={})` |
| 48 | async function | `globeLocal` |  | `(req,res,requested)` |
| 55 | const | `kartBatches` |  | `[]` |
| 56 | async function | `kartLocal` |  | `(req,res,requested)` |
| 71 | function | `createDevServer` | ✓ | `(root=siteRoot,options={})` |
| 74 | function | `createHttpServer` |  | `(root=siteRoot,{enhance,scenes=scenesRoot}={})` |

## `scripts/verify-public-source.mjs`

2.287 Bytes · 34 Zeilen · Werkzeug

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 4 | `node:fs/promises` | `readFile`, `readdir` |
| 5 | `node:crypto` | `createHash` |
| 6 | `node:assert/strict` | `assert` |
| 7 | `node:path` | `path` |
| 8 | `node:url` | `fileURLToPath` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 9 | const | `root` |  | `new URL("../",import.meta.url)` |
| 10 | const | `manifest` |  | `JSON.parse(await readFile(new URL("PUBLIC_SOURCE.json",root),"utf8"))` |
| 11 | const | `expected` |  | `new Set(["PUBLIC_SOURCE.json"])` |
| 22 | const | `ignoredDirectories` |  | `new Set([".git","node_modules",".browser-artifacts","releases"])` |
| 23 | const | `generated` |  | `new Set(["docs/architecture/FILES.md","docs/architecture/SYMBOLS.md","docs/architecture/i…` |
| 24 | async function | `audit` |  | `(dir,prefix="")` |

## `scripts/worldport-osm.mjs`

2.889 Bytes · 34 Zeilen · Werkzeug

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 8 | `node:fs/promises` | `readFile`, `writeFile` |
| 9 | `node:util` | `parseArgs` |
| 10 | `../dist/worldport/osm.mjs` | `convertOsm`, `overpassQuery` |
| 11 | `../dist/worldport/osm-ground.mjs` | `overpassGroundQuery` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 13 | const | `usage` |  | `"Aufruf: node scripts/worldport-osm.mjs --query\|--ground-query süd,west,nord,ost \| <gebäu…` |
| 14 | let | `parsed` |  |  |
| 17 | const | `options` |  | `parsed` |
| 17 | const | `positionals` |  | `parsed` |
| 29 | let | `spawn` |  |  |
| 31 | const | `ground` |  | `options.ground?JSON.parse(await readFile(options.ground,"utf8")):undefined` |
| 32 | const | `document` |  | `convertOsm(JSON.parse(await readFile(positionals[0],"utf8")),{name:options.name,spawn,gro…` |
| 32 | const | `report` |  | `convertOsm(JSON.parse(await readFile(positionals[0],"utf8")),{name:options.name,spawn,gro…` |

## `scripts/worldport.mjs`

1.722 Bytes · 18 Zeilen · Werkzeug

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 4 | `node:fs/promises` | `readFile`, `writeFile` |
| 5 | `node:util` | `parseArgs` |
| 6 | `../dist/worldport/core.mjs` | `parseCsv`, `convertPoints` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 8 | const | `usage` |  | `"Aufruf: node scripts/worldport.mjs <input.csv> -o <out.map.json> [--scale 0.125] [--name…` |
| 9 | let | `parsed` |  |  |
| 12 | const | `options` |  | `parsed` |
| 12 | const | `positionals` |  | `parsed` |
| 12 | const | `output` |  | `options.output` |
| 14 | const | `exclude` |  | `Object.create(null)` |
| 16 | const | `document` |  | `convertPoints(parseCsv(await readFile(positionals[0],"utf8")),{name:options.name,scale:Nu…` |
| 16 | const | `report` |  | `convertPoints(parseCsv(await readFile(positionals[0],"utf8")),{name:options.name,scale:Nu…` |

## `scripts/ws-local.mjs`

3.932 Bytes · 58 Zeilen · Werkzeug

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 3 | `node:crypto` | `createHash` |
| 4 | `../edge/room.mjs` | `Room`, `TICK_MS` |
| 5 | `../edge/realtime.mjs` | `REALTIME_MAPS` |

**Exporte:** `handleUpgrade`, `localRooms`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 7 | const | `GUID` |  | `"258EAFA5-E914-47DA-95CA-C5AB0DC85B11"` |
| 7 | const | `MAX_FRAME` |  | `4096` |
| 7 | const | `MAX_CONTROL` |  | `125` |
| 9 | const | `LOOPBACK` |  | `/^(localhost\|127\.0\.0\.1\|\[::1\])(:\d+)?$/` |
| 10 | const | `rooms` |  | `new Map()` |
| 12 | function | `frame` |  | `(opcode,payload)` |
| 18 | function | `handleUpgrade` | ✓ | `(req,socket,head=Buffer.alloc(0))` |
| 58 | const | `localRooms` | ✓ | `rooms` |

## `tests/broadphase.test.mjs`

4.983 Bytes · 70 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 2 | `node:assert/strict` | `assert` |
| 3 | `../dist/runtime/physics/adapter.js` | `createWorld`, `BOUNDS` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 6 | let | `seed` |  | `42` |
| 6 | const | `random` |  | `()=>((seed=(seed*1664525+1013904223)>>>0)/2**32)` |
| 7 | const | `triangle` |  | `(x,z,s)=>[[x,z],[x+s*(.5+random()),z+s*(random()-.5)],[x+s*(random()-.5),z+s*(.5+random()…` |
| 8 | const | `box` |  | `(x,z,w,d)=>[[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2]]` |
| 9 | function | `city` |  | `(count,{span=800,size=12}={})` |

## `tests/browser/agent-check.mjs`

2.952 Bytes · 42 Zeilen · Browsertest

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 2 | `node:assert/strict` | `assert` |
| 3 | `node:child_process` | `execFile` |
| 4 | `node:util` | `promisify` |
| 5 | `node:fs/promises` | `mkdir`, `writeFile` |
| 6 | `node:url` | `fileURLToPath` |
| 7 | `node:path` | `path` |
| 8 | `../../scripts/serve.mjs` | `createDevServer` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 10 | const | `run` |  | `promisify(execFile)` |
| 10 | const | `bin` |  | `process.env.AGENT_BROWSER_BIN` |
| 12 | const | `dir` |  | `fileURLToPath(new URL("../../.browser-artifacts/agent-check/",import.meta.url))` |
| 14 | const | `session` |  | `ˋourark-ci-${process.pid}ˋ` |
| 14 | const | `server` |  | `createDevServer()` |
| 15 | const | `evidence` |  | `{ok:false,scope:"agent-browser visual startup only"}` |
| 17 | const | `command` |  | `async(...args)=>{const{stdout,stderr}=await run(bin,["--session",session,...args],{timeou…` |

## `tests/browser/audit-regressions.browser.mjs`

16.341 Bytes · 181 Zeilen · Browsertest

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 3 | `node:assert/strict` | `assert` |
| 4 | `node:module` | `createRequire` |
| 5 | `node:fs/promises` | `readFile`, `mkdir`, `writeFile` |
| 6 | `node:child_process` | `execFileSync` |
| 7 | `node:path` | `path` |
| 8 | `node:url` | `fileURLToPath` |
| 9 | `../../scripts/serve.mjs` | `createDevServer` |
| 154 | `/worldport/core.mjs` | `(dynamisch)` |
| 154 | `/worldport/osm.mjs` | `(dynamisch)` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 11 | const | `root` |  | `fileURLToPath(new URL("../../",import.meta.url))` |
| 11 | const | `require` |  | `createRequire(import.meta.url)` |
| 12 | const | `artifacts` |  | `path.join(root,".browser-artifacts/audit-regressions")` |
| 14 | const | `evidence` |  | `{suite:"public-audit-regressions",startedAt:new Date().toISOString(),ok:false,commit:exec…` |
| 17 | let | `browser` |  |  |
| 17 | let | `server` |  |  |
| 17 | let | `origin` |  |  |
| 17 | let | `phase` |  | `"setup"` |
| 17 | let | `downloadCount` |  | `0` |
| 18 | const | `args` |  | `process.platform==="linux"?["--use-angle=swiftshader","--enable-unsafe-swiftshader","--ig…` |
| 19 | function | `playwright` |  | `()` |
| 27 | async function | `open` |  | `(route)` |
| 49 | async function | `check` |  | `(name,route,fn)` |
| 55 | async function | `exported` |  | `(page)` |
| 60 | async function | `importMap` |  | `(page,data,name="audit.map.json")` |
| 63 | async function | `waitName` |  | `(page,name)` |
| 64 | async function | `saveMap` |  | `(page)` |

**DOM-IDs, die dieses Skript anspricht (8):** `project-name`, `save`, `status`, `notice`, `count`, `world-title`, `runtime-position`, `object-name`

**Speicherzugriffe**

| Zeile | API | Schlüssel |
|---:|---|---|
| 30 | `localStorage.setItem` | `ourark.perf` |

## `tests/browser/baseline.browser.mjs`

18.285 Bytes · 218 Zeilen · Browsertest

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 3 | `node:fs/promises` | `writeFile` |
| 4 | `node:path` | `path` |
| 5 | `./harness.mjs` | `loadPlaywright`, `startServer`, `launch`, `environment`, `drawnRatio`, `recorder`, `assert`, `artifactDir` |
| 101 | `node:fs/promises` | `(dynamisch)` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 7 | const | `playwright` |  | `loadPlaywright()` |
| 8 | const | `origin` |  | `await startServer()` |
| 8 | const | `close` |  | `await startServer()` |
| 8 | const | `browser` |  | `await launch(playwright)` |
| 8 | const | `results` |  | `recorder()` |
| 8 | const | `step` |  | `recorder()` |
| 9 | const | `context` |  | `await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true})` |
| 10 | const | `page` |  | `await context.newPage()` |
| 10 | const | `errors` |  | `[]` |
| 13 | const | `shot` |  | `name=>page.screenshot({path:path.join(artifactDir,name)})` |
| 14 | const | `text` |  | `id=>page.locator(ˋ#${id}ˋ).textContent()` |
| 15 | const | `notice` |  | `async()=>(await text("notice")).trim()` |
| 16 | const | `pointCount` |  | `async()=>Number(await text("count"))` |
| 218 | const | `failed` |  | `results.filter(r=>!r.ok).length` |

**DOM-IDs, die dieses Skript anspricht (5):** `map-name`, `count`, `notice`, `status`, `project-name`

**Speicherzugriffe**

| Zeile | API | Schlüssel |
|---:|---|---|
| 146 | `indexedDB.open` | `(siehe DB_NAME)` |

## `tests/browser/city.browser.mjs`

6.049 Bytes · 72 Zeilen · Browsertest

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 3 | `node:path` | `path` |
| 4 | `./harness.mjs` | `loadPlaywright`, `startServer`, `launch`, `recorder`, `assert`, `artifactDir` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 6 | const | `playwright` |  | `loadPlaywright()` |
| 7 | const | `origin` |  | `await startServer()` |
| 7 | const | `close` |  | `await startServer()` |
| 7 | const | `browser` |  | `await launch(playwright)` |
| 7 | const | `results` |  | `recorder()` |
| 7 | const | `step` |  | `recorder()` |
| 8 | const | `page` |  | `await(await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:2})).n…` |
| 8 | const | `errors` |  | `[]` |
| 10 | const | `shot` |  | `name=>page.screenshot({path:path.join(artifactDir,name)})` |
| 11 | const | `BUDGET` |  | `1000/60` |
| 12 | const | `measure` |  | `ms=>page.evaluate(ms=>new Promise(res=>{const t=[];let last=0;const end=performance.now()…` |
| 13 | const | `stats` |  | `()=>page.evaluate(()=>({...globalThis.__MOTIONSPEC_RENDER_STATS__}))` |
| 16 | const | `shapes` |  | `[[[-8,-8],[8,-8],[8,-2],[-2,-2],[-2,8],[-8,8]],[[-9,-6],[9,-6],[9,6],[-9,6]],[[-8,-8],[8,…` |
| 17 | const | `colors` |  | `["#5eead4","#72a8ef","#f3c969","#d5b5ff","#eaf1fb"]` |
| 18 | const | `points` |  | `Array.from({length:2000},(_,i)=>({id:ˋb ${i}ˋ,name:ˋBlock ${i}ˋ,type:"building",x:(i%45)*…` |
| 19 | const | `doc` |  | `{schema:"motionspec.map.v3",name:"Stadt 2000",map:{width:1900,depth:1900,color:"#101f34",…` |
| 72 | const | `failed` |  | `results.filter(r=>!r.ok).length` |

**DOM-IDs, die dieses Skript anspricht (3):** `title`, `point-height`, `runtime-perf`

## `tests/browser/collision.browser.mjs`

7.275 Bytes · 102 Zeilen · Browsertest

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 3 | `node:path` | `path` |
| 4 | `./harness.mjs` | `loadPlaywright`, `startServer`, `launch`, `recorder`, `assert`, `artifactDir` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 6 | const | `playwright` |  | `loadPlaywright()` |
| 7 | const | `origin` |  | `await startServer()` |
| 7 | const | `close` |  | `await startServer()` |
| 7 | const | `browser` |  | `await launch(playwright)` |
| 7 | const | `results` |  | `recorder()` |
| 7 | const | `step` |  | `recorder()` |
| 8 | const | `context` |  | `await browser.newContext({viewport:{width:1440,height:900}})` |
| 9 | const | `page` |  | `await context.newPage()` |
| 9 | const | `errors` |  | `[]` |
| 11 | const | `shot` |  | `name=>page.screenshot({path:path.join(artifactDir,name)})` |
| 12 | const | `runtimeState` |  | `()=>page.evaluate(()=>document.body.dataset.runtime??"editing")` |
| 13 | const | `waitState` |  | `s=>page.waitForFunction(s=>(document.body.dataset.runtime??"editing")===s,s,{timeout:5000…` |
| 14 | const | `noticeText` |  | `()=>page.textContent("#notice")` |
| 16 | const | `point` |  | `(id,name,over={})=>({id,name,type:"building",x:0,z:0,width:10,depth:6,height:6,rotation:0…` |
| 17 | const | `project` |  | `(name,points,spawn=null)=>({schema:"motionspec.map.v2",name,map:{width:60,depth:60,color:…` |
| 18 | async function | `importProject` |  | `(doc)` |
| 22 | async function | `enterAndReport` |  | `()` |
| 28 | async function | `outlineRatio` |  | `()` |
| 102 | const | `failed` |  | `results.filter(r=>!r.ok).length` |

**DOM-IDs, die dieses Skript anspricht (4):** `title`, `notice`, `point-solid`, `point-interactive`

## `tests/browser/enhance.browser.mjs`

5.055 Bytes · 57 Zeilen · Browsertest

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 3 | `node:http` | `createServer` |
| 4 | `node:path` | `path` |
| 5 | `./harness.mjs` | `loadPlaywright`, `startServer`, `launch`, `recorder`, `assert`, `artifactDir` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 7 | const | `playwright` |  | `loadPlaywright()` |
| 9 | const | `seen` |  | `[]` |
| 9 | let | `reply` |  | `{status:200,body:{}}` |
| 10 | const | `origin` |  | `createServer((req,res)=>{let body="";req.on("data",c=>body+=c);req.on("end",()=>{seen.pus…` |
| 12 | const | `configured` |  | `await startServer({enhance:{url:ˋhttp://127.0.0.1:${origin.address().port}ˋ,token:"z".rep…` |
| 12 | const | `plain` |  | `await startServer()` |
| 13 | const | `browser` |  | `await launch(playwright)` |
| 13 | const | `results` |  | `recorder()` |
| 13 | const | `step` |  | `recorder()` |
| 14 | const | `page` |  | `await(await browser.newContext({viewport:{width:1440,height:900}})).newPage()` |
| 14 | const | `errors` |  | `[]` |
| 16 | const | `pngBase64` |  | `(w,h,fill)=>page.evaluate(async([w,h,fill])=>{const c=new OffscreenCanvas(w,h),g=c.getCon…` |
| 17 | const | `name` |  | `()=>page.textContent("#map-name")` |
| 18 | async function | `importImage` |  | `()` |
| 23 | const | `noticeMatching` |  | `re=>page.waitForFunction(re=>new RegExp(re).test(document.getElementById("notice").textCo…` |
| 57 | const | `failed` |  | `results.filter(r=>!r.ok).length` |

**DOM-IDs, die dieses Skript anspricht (2):** `map-name`, `notice`

## `tests/browser/footprint.browser.mjs`

4.970 Bytes · 59 Zeilen · Browsertest

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 3 | `node:path` | `path` |
| 4 | `node:fs/promises` | `readFile` |
| 5 | `./harness.mjs` | `loadPlaywright`, `startServer`, `launch`, `recorder`, `assert`, `artifactDir` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 7 | const | `playwright` |  | `loadPlaywright()` |
| 8 | const | `origin` |  | `await startServer()` |
| 8 | const | `close` |  | `await startServer()` |
| 8 | const | `browser` |  | `await launch(playwright)` |
| 8 | const | `results` |  | `recorder()` |
| 8 | const | `step` |  | `recorder()` |
| 9 | const | `page` |  | `await(await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true})).…` |
| 9 | const | `errors` |  | `[]` |
| 11 | const | `shot` |  | `name=>page.screenshot({path:path.join(artifactDir,name)})` |
| 12 | const | `waitState` |  | `s=>page.waitForFunction(s=>(document.body.dataset.runtime??"editing")===s,s,{timeout:5000…` |
| 13 | const | `pose` |  | `async()=>{const[,x,z,h]=/X (-?[\d.]+) · Z (-?[\d.]+) · (\d+)°/.exec(await page.textConten…` |
| 14 | const | `hold` |  | `async(code,ms)=>{await page.keyboard.down(code);await page.waitForTimeout(ms);await page.…` |
| 15 | const | `exportJson` |  | `async()=>{const[d]=await Promise.all([page.waitForEvent("download"),page.click("#export")…` |
| 20 | const | `L` |  | `[[-5,-5],[5,-5],[5,-1],[-1,-1],[-1,5],[-5,5]]` |
| 21 | const | `doc` |  | `{schema:"motionspec.map.v3",name:"Grundriss",map:{width:80,depth:80,color:"#101f34",image…` |
| 59 | const | `failed` |  | `results.filter(r=>!r.ok).length` |

**DOM-IDs, die dieses Skript anspricht (4):** `title`, `runtime-hint`, `notice`, `point-width`

## `tests/browser/harness.mjs`

4.397 Bytes · 75 Zeilen · Browsertest

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 4 | `node:module` | `createRequire` |
| 5 | `node:fs/promises` | `mkdir` |
| 6 | `node:url` | `fileURLToPath` |
| 7 | `../../scripts/serve.mjs` | `createDevServer` |

**Exporte:** `artifactDir`, `loadPlaywright`, `startServer`, `browserArgs`, `launch`, `environment`, `drawnRatio`, `recorder`, `assert`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 9 | const | `require` |  | `createRequire(import.meta.url)` |
| 10 | const | `artifactDir` | ✓ | `fileURLToPath(new URL("../../.browser-artifacts/",import.meta.url))` |
| 12 | function | `loadPlaywright` | ✓ | `()` |
| 22 | async function | `startServer` | ✓ | `(options)` |
| 31 | function | `browserArgs` | ✓ | `(platform=process.platform)` |
| 36 | async function | `launch` | ✓ | `(playwright,extraArgs=[])` |
| 45 | async function | `environment` | ✓ | `(page)` |
| 53 | async function | `drawnRatio` | ✓ | `(page,selector="#canvas",background=[11,18,36])` |
| 64 | function | `recorder` | ✓ | `()` |
| 75 | const | `assert` | ✓ | `(condition,message)=>{if(!condition)throw new Error(message);}` |

**Speicherzugriffe**

| Zeile | API | Schlüssel |
|---:|---|---|
| 41 | `localStorage.setItem` | `ourark.perf` |

## `tests/browser/kart-perf.browser.mjs`

18.758 Bytes · 263 Zeilen · Browsertest

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 7 | `node:path` | `path` |
| 8 | `node:fs/promises` | `readFile`, `writeFile` |
| 9 | `node:url` | `fileURLToPath` |
| 10 | `./harness.mjs` | `loadPlaywright`, `startServer`, `launch`, `recorder`, `assert`, `artifactDir`, `environment` |

**Exporte:** `TARGETS`

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 12 | const | `playwright` |  | `loadPlaywright()` |
| 13 | const | `BASELINE` |  | `fileURLToPath(new URL("./kart-perf.baseline.json",import.meta.url))` |
| 14 | const | `UPDATE` |  | `process.env.KART_BASELINE==="update"` |
| 15 | const | `MEASURE_MS` |  | `6000` |
| 15 | const | `MODE_MS` |  | `4000` |
| 17 | const | `ONLY` |  | `process.env.KART_ONLY??null` |
| 19 | const | `TARGETS` | ✓ | `Object.freeze({desktop:{fps:58,p95Ms:20.8,drawCalls:600,gpuMB:256,firstFrameMs:2000,first…` |
| 26 | const | `TOLERANCE` |  | `{bytes:1.05,drawCalls:1.10,triangles:1.10,gpuMB:1.05,fps:.85,p95Ms:1.5,firstFrameMs:1.5,a…` |
| 27 | const | `DEVICES` |  | `{desktop:{context:{viewport:{width:1440,height:900},deviceScaleFactor:2},throttle:1},phon…` |
| 32 | const | `origin` |  | `await startServer()` |
| 32 | const | `close` |  | `await startServer()` |
| 32 | const | `browser` |  | `await launch(playwright,["--enable-precise-memory-info"])` |
| 32 | const | `results` |  | `recorder()` |
| 32 | const | `step` |  | `recorder()` |
| 33 | const | `errors` |  | `[]` |
| 33 | const | `runs` |  | `{}` |
| 37 | function | `probes` |  | `()` |
| 110 | async function | `open` |  | `(map,device)` |
| 136 | const | `fmt` |  | `(v,d=1)=>Number.isFinite(v)?v.toFixed(d):String(v)` |
| 137 | const | `round` |  | `o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,typeof v==="number"?Math.round(v*…` |
| 138 | function | `targetReport` |  | `(device,m)` |
| 147 | async function | `measureRun` |  | `(map,device)` |
| 174 | function | `compareRun` |  | `(id,b,r)` |
| 263 | const | `failed` |  | `results.filter(r=>!r.ok).length` |

**DOM-IDs, die dieses Skript anspricht (2):** `kart-canvas`, `kart-status`

**Speicherzugriffe**

| Zeile | API | Schlüssel |
|---:|---|---|
| 38 | `localStorage.setItem` | `ourark.kart.telemetry` |

## `tests/browser/perf-meter.browser.mjs`

4.201 Bytes · 46 Zeilen · Browsertest

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 3 | `node:path` | `path` |
| 4 | `node:fs/promises` | `readFile` |
| 5 | `./harness.mjs` | `loadPlaywright`, `startServer`, `launch`, `recorder`, `assert`, `artifactDir` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 7 | const | `playwright` |  | `loadPlaywright()` |
| 8 | const | `origin` |  | `await startServer()` |
| 8 | const | `close` |  | `await startServer()` |
| 8 | const | `browser` |  | `await launch(playwright)` |
| 8 | const | `results` |  | `recorder()` |
| 8 | const | `step` |  | `recorder()` |
| 9 | const | `context` |  | `await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true})` |
| 11 | const | `page` |  | `await context.newPage()` |
| 11 | const | `errors` |  | `[]` |
| 13 | const | `value` |  | `label=>page.evaluate(label=>{for(const dt of document.querySelectorAll(".perf-grid dt"))i…` |
| 14 | const | `download` |  | `async act=>{const[d]=await Promise.all([page.waitForEvent("download"),page.click(ˋ.perf-h…` |
| 46 | const | `failed` |  | `results.filter(r=>!r.ok).length` |

## `tests/browser/perf.browser.mjs`

5.792 Bytes · 63 Zeilen · Browsertest

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 4 | `node:path` | `path` |
| 5 | `./harness.mjs` | `loadPlaywright`, `startServer`, `launch`, `recorder`, `assert`, `artifactDir` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 7 | const | `playwright` |  | `loadPlaywright()` |
| 8 | const | `origin` |  | `await startServer()` |
| 8 | const | `close` |  | `await startServer()` |
| 8 | const | `browser` |  | `await launch(playwright)` |
| 8 | const | `results` |  | `recorder()` |
| 8 | const | `step` |  | `recorder()` |
| 9 | const | `errors` |  | `[]` |
| 10 | const | `BUDGET` |  | `1000/60` |
| 12 | const | `measure` |  | `(page,ms)=>page.evaluate(ms=>new Promise(res=>{const t=[];let last=0;const end=performanc…` |
| 13 | const | `scale` |  | `async page=>Number((/·\s*([\d,]+)×/.exec(await page.textContent("#runtime-perf"))?.[1]??"…` |
| 14 | async function | `openWalk` |  | `(options,{throttle=1}={})` |
| 63 | const | `failed` |  | `results.filter(r=>!r.ok).length` |

**DOM-IDs, die dieses Skript anspricht (2):** `runtime-perf`, `canvas`

## `tests/browser/public-smoke.browser.mjs`

18.355 Bytes · 309 Zeilen · Browsertest

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 4 | `node:assert/strict` | `assert` |
| 5 | `node:module` | `createRequire` |
| 6 | `node:fs/promises` | `mkdir`, `readFile`, `writeFile` |
| 7 | `node:child_process` | `execFileSync` |
| 8 | `node:crypto` | `createHash` |
| 9 | `node:path` | `path` |
| 10 | `node:url` | `fileURLToPath` |
| 11 | `../../scripts/serve.mjs` | `createDevServer` |
| 12 | `../../dist/map-studio/project.js` | `readProject`, `serializeProject` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 14 | const | `require` |  | `createRequire(import.meta.url)` |
| 15 | const | `root` |  | `fileURLToPath(new URL("../../",import.meta.url))` |
| 16 | const | `artifacts` |  | `path.join(root,".browser-artifacts/public-smoke")` |
| 17 | const | `timeout` |  | `20_000` |
| 18 | const | `args` |  | `process.platform==="linux"?["--use-angle=swiftshader","--enable-unsafe-swiftshader","--ig…` |
| 21 | const | `evidence` |  | `{suite:"public-smoke",startedAt:new Date().toISOString(),ok:false,scope:"Functional brows…` |
| 28 | let | `browser` |  |  |
| 28 | let | `server` |  |  |
| 28 | let | `page` |  |  |
| 28 | let | `origin` |  |  |
| 28 | let | `phase` |  | `"setup"` |
| 29 | const | `contexts` |  | `[]` |
| 31 | function | `loadPlaywright` |  | `()` |
| 47 | async function | `check` |  | `(name,work)` |
| 54 | async function | `context` |  | `()` |
| 85 | async function | `navigate` |  | `(p,route)` |
| 90 | async function | `shot` |  | `(name,p=page)` |
| 96 | async function | `renderedCanvas` |  | `(p)` |
| 121 | async function | `importFile` |  | `(p,filename)` |
| 129 | async function | `height` |  | `(p,value)` |
| 134 | function | `cleanBrowserEvidence` |  | `()` |

**DOM-IDs, die dieses Skript anspricht (10):** `canvas`, `fallback`, `project-name`, `point-name`, `point-height`, `runtime-state`, `runtime-position`, `status`, `scene-layers`, `layer-list`

**Speicherzugriffe**

| Zeile | API | Schlüssel |
|---:|---|---|
| 62 | `localStorage.setItem` | `ourark.perf` |

## `tests/browser/runtime.browser.mjs`

11.200 Bytes · 126 Zeilen · Browsertest

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 3 | `node:fs/promises` | `writeFile` |
| 4 | `node:path` | `path` |
| 5 | `./harness.mjs` | `loadPlaywright`, `startServer`, `launch`, `environment`, `recorder`, `assert`, `artifactDir` |
| 26 | `node:fs/promises` | `(dynamisch)` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 7 | const | `playwright` |  | `loadPlaywright()` |
| 8 | const | `origin` |  | `await startServer()` |
| 8 | const | `close` |  | `await startServer()` |
| 8 | const | `browser` |  | `await launch(playwright)` |
| 8 | const | `results` |  | `recorder()` |
| 8 | const | `step` |  | `recorder()` |
| 9 | const | `context` |  | `await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true})` |
| 19 | const | `page` |  | `await context.newPage()` |
| 19 | const | `errors` |  | `[]` |
| 21 | const | `shot` |  | `name=>page.screenshot({path:path.join(artifactDir,name)})` |
| 22 | const | `state` |  | `()=>page.evaluate(()=>document.body.dataset.runtime??"editing")` |
| 23 | const | `waitState` |  | `s=>page.waitForFunction(s=>(document.body.dataset.runtime??"editing")===s,s,{timeout:5000…` |
| 24 | const | `exportJson` |  | `async()=>{const[d]=await Promise.all([page.waitForEvent("download"),page.click("#export")…` |
| 27 | const | `editorState` |  | `()=>page.evaluate(()=>({undo:document.getElementById("undo").disabled,redo:document.getEl…` |
| 28 | const | `canvasPng` |  | `()=>page.locator("#canvas").screenshot()` |
| 29 | const | `idleRaf` |  | `async(ms=600)=>{const a=await page.evaluate(()=>window.__probe.raf);await page.waitForTim…` |
| 126 | const | `failed` |  | `results.filter(r=>!r.ok).length` |

**DOM-IDs, die dieses Skript anspricht (9):** `undo`, `redo`, `selected-name`, `count`, `status`, `projection`, `runtime-hud`, `runtime-state`, `notice`

## `tests/browser/scan-world.browser.mjs`

23.639 Bytes · 240 Zeilen · Browsertest

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 5 | `./harness.mjs` | `loadPlaywright`, `startServer`, `launch`, `recorder`, `assert`, `environment`, `drawnRatio` |
| 6 | `node:path` | `path` |
| 7 | `./harness.mjs` | `artifactDir` |
| 8 | `node:fs/promises` | `readFile` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 10 | const | `playwright` |  | `loadPlaywright()` |
| 11 | const | `origin` |  | `await startServer()` |
| 11 | const | `close` |  | `await startServer()` |
| 11 | const | `browser` |  | `await launch(playwright)` |
| 11 | const | `results` |  | `recorder()` |
| 11 | const | `step` |  | `recorder()` |
| 12 | const | `perf` |  | `process.env.SCAN_PERF==="1"` |
| 12 | const | `viewport` |  | `perf?{width:1920,height:1080}:{width:1440,height:900}` |
| 13 | const | `page` |  | `await(await browser.newContext({viewport,deviceScaleFactor:1})).newPage()` |
| 13 | const | `errors` |  | `[]` |
| 15 | const | `shot` |  | `name=>page.screenshot({path:path.join(artifactDir,name)})` |
| 16 | const | `waitState` |  | `s=>page.waitForFunction(s=>(document.body.dataset.runtime??"editing")===s,s,{timeout:8000…` |
| 17 | const | `pose` |  | `async()=>{const text=await page.textContent("#runtime-position"),[,x,z,h]=/X (-?[\d.]+) ·…` |
| 18 | const | `stats` |  | `()=>page.evaluate(()=>globalThis.__MOTIONSPEC_RENDER_STATS__)` |
| 20 | const | `inRoom` |  | `p=>p.x>-.5&&p.x<4.2&&p.z>-.8&&p.z<5.4` |
| 21 | const | `hold` |  | `async(code,ms)=>{await page.keyboard.down(code);await page.waitForTimeout(ms);await page.…` |
| 240 | const | `failed` |  | `results.filter(r=>!r.ok).length` |

**DOM-IDs, die dieses Skript anspricht (5):** `scan-meta`, `canvas`, `runtime-perf`, `device-check-dialog`, `device-check-stored`

## `tests/browser/walking.browser.mjs`

6.802 Bytes · 89 Zeilen · Browsertest

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 3 | `node:path` | `path` |
| 4 | `node:fs/promises` | `readFile` |
| 5 | `./harness.mjs` | `loadPlaywright`, `startServer`, `launch`, `recorder`, `assert`, `artifactDir` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 7 | const | `playwright` |  | `loadPlaywright()` |
| 8 | const | `origin` |  | `await startServer()` |
| 8 | const | `close` |  | `await startServer()` |
| 8 | const | `browser` |  | `await launch(playwright)` |
| 8 | const | `results` |  | `recorder()` |
| 8 | const | `step` |  | `recorder()` |
| 9 | const | `context` |  | `await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true})` |
| 10 | const | `page` |  | `await context.newPage()` |
| 10 | const | `errors` |  | `[]` |
| 12 | const | `shot` |  | `name=>page.screenshot({path:path.join(artifactDir,name)})` |
| 13 | const | `waitState` |  | `s=>page.waitForFunction(s=>(document.body.dataset.runtime??"editing")===s,s,{timeout:5000…` |
| 15 | const | `pose` |  | `async()=>{const[,x,z,h]=/X (-?[\d.]+) · Z (-?[\d.]+) · (\d+)°/.exec(await page.textConten…` |
| 16 | const | `hold` |  | `async(code,ms)=>{await page.keyboard.down(code);await page.waitForTimeout(ms);await page.…` |
| 17 | const | `exportJson` |  | `async()=>{const[d]=await Promise.all([page.waitForEvent("download"),page.click("#export")…` |
| 19 | const | `point` |  | `(id,name,over={})=>({id,name,type:"building",x:0,z:0,width:10,depth:6,height:6,rotation:0…` |
| 20 | const | `doc` |  | `{schema:"motionspec.map.v2",name:"Laufstrecke",map:{width:80,depth:80,color:"#101f34",ima…` |
| 89 | const | `failed` |  | `results.filter(r=>!r.ok).length` |

**DOM-IDs, die dieses Skript anspricht (4):** `title`, `runtime-info`, `runtime-info-name`, `runtime-info-data`

## `tests/browser/world-upload.browser.mjs`

14.852 Bytes · 143 Zeilen · Browsertest

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 4 | `node:path` | `path` |
| 5 | `./harness.mjs` | `loadPlaywright`, `startServer`, `launch`, `recorder`, `assert`, `artifactDir` |
| 113 | `../../dist/worldport/osm.mjs` | `(dynamisch)` |
| 130 | `../../dist/worldport/osm.mjs` | `(dynamisch)` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 7 | const | `playwright` |  | `loadPlaywright()` |
| 8 | const | `origin` |  | `await startServer()` |
| 8 | const | `close` |  | `await startServer()` |
| 8 | const | `browser` |  | `await launch(playwright)` |
| 8 | const | `results` |  | `recorder()` |
| 8 | const | `step` |  | `recorder()` |
| 9 | const | `page` |  | `await(await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:2})).n…` |
| 9 | const | `errors` |  | `[]` |
| 11 | const | `shot` |  | `name=>page.screenshot({path:path.join(artifactDir,name)})` |
| 12 | const | `BUDGET` |  | `1000/60` |
| 13 | const | `measure` |  | `ms=>page.evaluate(ms=>new Promise(res=>{const t=[];let last=0;const end=performance.now()…` |
| 14 | const | `stats` |  | `()=>page.evaluate(()=>({...globalThis.__MOTIONSPEC_RENDER_STATS__}))` |
| 15 | const | `waitState` |  | `s=>page.waitForFunction(s=>(document.body.dataset.runtime??"editing")===s,s,{timeout:8000…` |
| 16 | const | `pose` |  | `async()=>{const[,x,z,h]=/X (-?[\d.]+) · Z (-?[\d.]+) · (\d+)°/.exec(await page.textConten…` |
| 17 | const | `hold` |  | `async(code,ms)=>{await page.keyboard.down(code);await page.waitForTimeout(ms);await page.…` |
| 20 | const | `shapes` |  | `[[[-8,-8],[8,-8],[8,-2],[-2,-2],[-2,8],[-8,8]],[[-9,-6],[9,-6],[9,6],[-9,6]],[[-8,-8],[8,…` |
| 21 | const | `colors` |  | `["#5eead4","#72a8ef","#f3c969","#d5b5ff","#eaf1fb"]` |
| 22 | const | `points` |  | `Array.from({length:2000},(_,i)=>({id:ˋb ${i}ˋ,name:ˋBlock ${i}ˋ,type:"building",x:(i%45)*…` |
| 23 | const | `city` |  | `{schema:"motionspec.map.v3",name:"Teststadt 2000",map:{width:1900,depth:1900,color:"#101f…` |
| 143 | const | `failed` |  | `results.filter(r=>!r.ok).length` |

**DOM-IDs, die dieses Skript anspricht (12):** `world-title`, `object-count`, `notice`, `city-building-name`, `city-building-data`, `runtime-perf`, `runtime-hint`, `runtime-info-type`, `runtime-info-name`, `runtime-info-data`, `attribution`, `title`

## `tests/browser/world-walk.browser.mjs`

6.462 Bytes · 75 Zeilen · Browsertest

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 3 | `node:path` | `path` |
| 4 | `node:fs/promises` | `readFile` |
| 5 | `./harness.mjs` | `loadPlaywright`, `startServer`, `launch`, `recorder`, `assert`, `artifactDir` |
| 6 | `../../dist/worlds/data.js` | `worlds` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 8 | const | `playwright` |  | `loadPlaywright()` |
| 9 | const | `origin` |  | `await startServer()` |
| 9 | const | `close` |  | `await startServer()` |
| 9 | const | `browser` |  | `await launch(playwright)` |
| 9 | const | `results` |  | `recorder()` |
| 9 | const | `step` |  | `recorder()` |
| 10 | const | `page` |  | `await(await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true})).…` |
| 10 | const | `errors` |  | `[]` |
| 12 | const | `shot` |  | `name=>page.screenshot({path:path.join(artifactDir,name)})` |
| 13 | const | `state` |  | `()=>page.evaluate(()=>document.body.dataset.runtime??"editing")` |
| 14 | const | `waitState` |  | `s=>page.waitForFunction(s=>(document.body.dataset.runtime??"editing")===s,s,{timeout:8000…` |
| 15 | const | `pose` |  | `async()=>{const[,x,z,h]=/X (-?[\d.]+) · Z (-?[\d.]+) · (\d+)°/.exec(await page.textConten…` |
| 16 | const | `hold` |  | `async(code,ms)=>{await page.keyboard.down(code);await page.waitForTimeout(ms);await page.…` |
| 17 | const | `exportJson` |  | `async()=>{const[d]=await Promise.all([page.waitForEvent("download"),page.click("#export")…` |
| 75 | const | `failed` |  | `results.filter(r=>!r.ok).length` |

**DOM-IDs, die dieses Skript anspricht (8):** `runtime-perf`, `pins`, `canvas-help`, `runtime-hint`, `runtime-info`, `runtime-info-type`, `runtime-info-name`, `runtime-info-data`

## `tests/build-tools.test.mjs`

4.387 Bytes · 81 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 1 | `node:test` | `test` |
| 2 | `node:assert/strict` | `assert` |
| 3 | `node:fs/promises` | `mkdtemp`, `mkdir`, `writeFile`, `rm` |
| 4 | `node:os` | `tmpdir` |
| 5 | `node:path` | `path` |
| 6 | `node:child_process` | `spawnSync` |
| 7 | `node:url` | `fileURLToPath` |
| 8 | `../scripts/check.mjs` | `relativeModuleReferences`, `checkProject` |
| 9 | `./browser/harness.mjs` | `browserArgs` |

## `tests/camera-rig.test.mjs`

4.553 Bytes · 52 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 3 | `node:assert/strict` | `assert` |
| 4 | `node:fs/promises` | `readFile`, `readdir` |
| 5 | `../dist/runtime/camera-rig.js` | `CAMERA_MODES`, `THIRD`, `direction`, `segmentEnters`, `segmentExits`, `thirdPersonView`, `FlyController`, `sourceView` |
| 6 | `../dist/runtime/scan/adapter.js` | `SCAN_ID`, `prepareScanWalk`, `flyBounds` |
| 7 | `../dist/runtime/walker.js` | `Walker` |
| 8 | `../dist/runtime/input.js` | `BINDINGS`, `COMMANDS` |
| 9 | `../dist/runtime/geometry/polygon.js` | `containsPoint` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 11 | const | `near` |  | `(a,b,e=1e-9,m="")=>assert.ok(Math.abs(a-b)<=e,ˋ${m} ${a} ≠ ${b}ˋ)` |
| 19 | const | `square` |  | `[[0,0],[1,0],[1,1],[0,1]]` |
| 26 | const | `pose` |  | `{x:0,z:0,heading:0,pitch:0}` |
| 27 | let | `v` |  | `thirdPersonView(pose,{eye:1.6})` |
| 40 | const | `fly` |  | `new FlyController({bounds:{min:[-5,0,-5],max:[5,3,5]},speed:2})` |
| 45 | const | `half` |  | `fly.interpolated(.5)` |
| 46 | const | `view` |  | `fly.view()` |
| 49 | const | `camera` |  | `{fps:10,frames:[[[0,1,0],[0,0,-1],[0,1,0]],[[1,1,0],[1,0,0],[0,1,0]]]}` |

## `tests/car.test.mjs`

3.860 Bytes · 59 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 2 | `node:assert/strict` | `assert` |
| 3 | `../dist/globe/car.js` | `Car`, `CAR` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 5 | const | `DT` |  | `1/120` |
| 6 | const | `drive` |  | `(car,seconds,input={})=>{for(let i=0;i<seconds/DT;i++)car.step(DT,typeof input==="functio…` |

## `tests/city-layer.test.mjs`

4.817 Bytes · 51 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 3 | `node:assert/strict` | `assert` |
| 4 | `../dist/worlds/vendor/three.module.js` | `THREE` |
| 5 | `../dist/runtime/city-layer.js` | `CityLayer` |
| 6 | `../dist/map-studio/model.js` | `validateDocument`, `newPoint`, `SCHEMA` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 8 | const | `points` |  | `Array.from({length:400},(_,i)=>({...newPoint(i),id:ˋp ${i}ˋ,x:(i%20)*45-450,z:Math.floor(…` |
| 9 | let | `doc` |  | `validateDocument({schema:SCHEMA,name:"Kacheln",map:{width:1000,depth:1000,color:"#1c1c1c"…` |
| 10 | const | `layer` |  | `new CityLayer(new THREE.Scene())` |
| 10 | const | `rebuilt` |  | `[]` |
| 11 | const | `original` |  | `layer.rebuildTiles.bind(layer)` |
| 12 | const | `edit` |  | `(id,change)=>{doc={...doc,points:doc.points.map(p=>p.id===id?{...p,...change}:p)};}` |
| 13 | const | `step` |  | `(selection)=>{rebuilt.length=0;layer.sync(doc,selection);return rebuilt.flat();}` |
| 14 | const | `tileOf` |  | `id=>layer.tileOf.get(id)` |
| 17 | const | `sel` |  | `"p210"` |
| 17 | const | `home` |  | `tileOf(sel)` |
| 25 | const | `target` |  | `tileOf(sel)` |
| 28 | const | `perBox` |  | `(()=>{const one=new CityLayer(new THREE.Scene());one.sync({...doc,points:[doc.points[0]]}…` |
| 29 | const | `drawnBoxes` |  | `()=>[...layer.tiles.values()].reduce((n,t)=>n+t.children[0].geometry.attributes.position.…` |

## `tests/city-tile.test.mjs`

2.634 Bytes · 35 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 3 | `node:assert/strict` | `assert` |
| 4 | `node:fs/promises` | `readFile` |
| 5 | `node:crypto` | `createHash` |
| 6 | `../scripts/city-tile.mjs` | `clipToRect`, `buildTile`, `writeGlb`, `orbitCamera` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 11 | const | `cut` |  | `clipToRect([[-5,5],[5,5],[5,-5]],[0,0,10,10])` |
| 15 | const | `doc` |  | `JSON.parse(await readFile(new URL("./fixtures/city-mini.map.json",import.meta.url),"utf8"…` |
| 16 | const | `tile` |  | `buildTile(doc,[0,0,250])` |
| 18 | const | `names` |  | `tile.parts.map(p=>p.name)` |
| 26 | const | `roofD` |  | `tile.parts.find(p=>p.name==="building/d/roof")` |
| 27 | const | `facadeB` |  | `tile.parts.find(p=>p.name==="building/b/facade")` |
| 27 | const | `ys` |  | `facadeB.positions.filter((_,i)=>i%3===1)` |
| 32 | const | `sha` |  | `b=>createHash("sha256").update(b).digest("hex")` |
| 34 | const | `cam` |  | `orbitCamera([0,0,250])` |

## `tests/device-check.test.mjs`

1.597 Bytes · 17 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 2 | `node:assert/strict` | `assert` |
| 3 | `../dist/runtime/device-check.js` | `summarize`, `reportText`, `A2` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 5 | const | `steady` |  | `summarize(Array(600).fill(1000/60),[2,2,1.5,1.5])` |
| 8 | const | `fast` |  | `summarize(Array(1200).fill(1000/120),[1])` |
| 10 | const | `hitchy` |  | `summarize([...Array(540).fill(1000/60),...Array(60).fill(50)],[1])` |
| 12 | const | `slow` |  | `summarize(Array(600).fill(1000/45),[1])` |
| 15 | const | `text` |  | `reportText({time:"t",scene:"a".repeat(64),seconds:20,warmup:8,device:{platform:"iPhone",m…` |

## `tests/edge.test.mjs`

51.050 Bytes · 615 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 1 | `node:fs` | `readFileSync` |
| 2 | `node:test` | `test` |
| 3 | `node:assert/strict` | `assert` |
| 4 | `../edge/policy.mjs` | `SECURITY_HEADERS`, `CONTENT_SECURITY_POLICY`, `readCredentials`, `sameSecret`, `clientKey` |
| 5 | `../edge/app.mjs` | `createWorker`, `ENHANCE_MAX_BODY`, `ENHANCE_MAX_RESPONSE` |
| 6 | `../edge/map-room.mjs` | `MapRoom`, `MAX_PER_IP`, `IDLE_MS` |
| 7 | `../dist/runtime/net/protocol.js` | `NET`, `netEncode`, `netDecode` |
| 8 | `../edge/guard.mjs` | `LoginGuard`, `MAX_FAILURES`, `WINDOW_SECONDS`, `BLOCK_SECONDS` |
| 9 | `../scripts/serve.mjs` | `createDevServer` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 11 | const | `basic` |  | `(user,password)=>"Basic "+Buffer.from(ˋ${user}:${password}ˋ).toString("base64")` |
| 12 | const | `good` |  | `basic("tester","richtig")` |
| 15 | function | `fakeStorage` |  | `()` |
| 19 | function | `fakeGuards` |  | `(clock)` |
| 30 | function | `setup` |  | `({env:overrides={},assetResponse}={})` |
| 39 | const | `assertBaseHeaders` |  | `response=>{for(const[name,value]of Object.entries(SECURITY_HEADERS))assert.equal(response…` |
| 40 | const | `wrong` |  | `i=>({headers:{Authorization:basic("tester","falsch"+i)}})` |
| 217 | function | `enhanceSetup` |  | `({originStatus=200,originBody,originText,originHeaders={},originThrows=false,withCache=true,configured=true}=…` |
| 226 | const | `enhanceBody` |  | `{inputBase64:"iVBORw0KGgo=",targetWidth:4,targetHeight:2,format:"webp",quality:90}` |
| 286 | const | `SCENE_ID` |  | `"a".repeat(64)` |
| 287 | function | `fakeScenes` |  | `(entries)` |
| 364 | function | `fakeTelemetryBucket` |  | `()` |
| 371 | const | `telemetryBatch` |  | `(over={})=>({format:"ourark.kart-telemetry.v1",session:"0123456789abcdef",map:"kronach",s…` |
| 458 | function | `fakeSocket` |  | `()` |
| 463 | function | `fakeRoomCtx` |  | `()` |

**Event-Bindungen**

| Zeile | Ereignis | Ziel |
|---:|---|---|
| 599 | `message` | `ws` |
| 599 | `open` | `ws` |
| 611 | `open` | `ws` |
| 613 | `open` | `ws` |

## `tests/frame-loop.test.mjs`

4.625 Bytes · 62 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 3 | `node:assert/strict` | `assert` |
| 4 | `../dist/runtime/frame-loop.js` | `FrameLoop` |
| 5 | `../dist/runtime/hud.js` | `Hud` |
| 6 | `../dist/runtime/quality.js` | `shadowMapSize` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 8 | function | `fakeClock` |  | `()` |
| 13 | function | `fakeDocument` |  | `()` |

## `tests/globe-surface.test.mjs`

5.553 Bytes · 76 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 2 | `node:assert/strict` | `assert` |
| 3 | `node:fs/promises` | `readFile` |
| 4 | `node:zlib` | `gzipSync` |
| 5 | `../dist/globe/surface.js` | `buildSurface`, `utm32`, `readSurfaceFile`, `SurfaceTiles` |
| 6 | `../dist/runtime/assets/codec.js` | `gunzip` |
| 7 | `../dist/runtime/assets/codec.js` | `decodeHeightFile`, `decodeBinaryFile` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 9 | const | `dir` |  | `new URL("../dist/kart/assets/",import.meta.url)` |
| 9 | const | `meta` |  | `JSON.parse(await readFile(new URL("kronach.json",dir),"utf8"))` |
| 10 | const | `heights` |  | `await decodeHeightFile(new Uint8Array(await readFile(new URL(meta.terrain.file,dir))),met…` |
| 11 | const | `kb01` |  | `await decodeBinaryFile(new Uint8Array(await readFile(new URL(meta.buildings.file,dir))),m…` |

## `tests/gpu-cull.test.mjs`

3.681 Bytes · 41 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 3 | `node:assert/strict` | `assert` |
| 4 | `../dist/runtime/gpu/cull.js` | `LOD`, `CULLED`, `cullCpu`, `cameraFrom`, `WGSL_CULL`, `EntityCuller` |
| 5 | `../dist/runtime/sim/layout.js` | `EntityStore`, `WGSL_ENTITY` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 8 | function | `perspective` |  | `(fovDeg,aspect,near,far)` |
| 9 | const | `cam` |  | `cameraFrom({position:[0,2,0],forward:[0,0,-1],viewProj:perspective(60,1,1,2000),lod:[30,9…` |

## `tests/kart-assets.test.mjs`

2.714 Bytes · 37 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 4 | `node:assert/strict` | `assert` |
| 5 | `node:fs` | `readFileSync` |
| 6 | `node:child_process` | `execFileSync` |
| 7 | `node:zlib` | `gzipSync` |
| 8 | `../dist/runtime/assets/codec.js` | `encodeHeightPlanes`, `decodeHeightPlanes`, `decodeHeightFile`, `decodeBinaryFile`, `assetUrl`, `HEIGHT_PACKING`, `GZIP_PACKING` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 10 | const | `rng` |  | `seed=>()=>{seed\|=0;seed=seed+0x6D2B79F5\|0;let t=Math.imul(seed^seed>>>15,1\|seed);t=t+Math…` |

## `tests/kart-insights.test.mjs`

3.688 Bytes · 54 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 2 | `node:assert/strict` | `assert` |
| 3 | `../dist/kart/insights.js` | `utmToGeo`, `localToGeo`, `frameStats`, `median`, `PlaceGrid`, `fpsColor`, `observations` |
| 4 | `node:fs` | `readFileSync` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 6 | const | `near` |  | `(a,b,tol,label)=>assert.ok(Math.abs(a-b)<=tol,ˋ${label}: ${a} ≈ ${b}ˋ)` |

## `tests/kart.test.mjs`

6.923 Bytes · 107 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 2 | `node:assert/strict` | `assert` |
| 3 | `node:fs` | `readFileSync` |
| 4 | `../dist/runtime/assets/codec.js` | `decodeHeightFile`, `decodeBinaryFile` |
| 5 | `../dist/kart/track.js` | `Track`, `sampleClosedSpline`, `smoothClosed`, `featureHeight` |
| 6 | `../dist/kart/kart.js` | `Kart`, `Race`, `KART`, `isForwardOnTrack` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 8 | const | `DT` |  | `1/60` |
| 9 | const | `circle` |  | `(r,n=16)=>Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2;return[Math.sin(a)*r,-Math.…` |
| 11 | function | `drive` |  | `(kart,track,seconds,throttle=1,onStep=()=>{})` |

## `tests/map-edit-cost.test.mjs`

8.247 Bytes · 93 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 3 | `node:assert/strict` | `assert` |
| 4 | `../dist/map-studio/model.js` | `SCHEMA`, `validateDocument`, `editableShell`, `newPoint`, `History`, `demoDocument` |
| 5 | `../dist/map-studio/project.js` | `projectBytes`, `serializeProject` |
| 6 | `../dist/runtime/frozen.js` | `isValidated`, `deepFreeze` |
| 7 | `../dist/runtime/city-layer.js` | `CityLayer` |
| 8 | `../dist/worlds/vendor/three.module.js` | `THREE` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 10 | const | `base` |  | `{schema:SCHEMA,name:"Kosten",map:{width:1000,depth:1000,color:"#1c1c1c",image:null},runti…` |
| 11 | const | `points` |  | `Array.from({length:500},(_,i)=>({...newPoint(i),id:ˋp ${i}ˋ,x:(i%25)*30-375,z:Math.floor(…` |
| 12 | const | `doc` |  | `validateDocument({...base,points})` |
| 19 | const | `draft` |  | `editableShell(doc)` |
| 20 | const | `next` |  | `validateDocument(draft)` |

## `tests/map-enhance.test.mjs`

1.811 Bytes · 23 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 2 | `node:assert/strict` | `assert` |
| 3 | `../dist/map-studio/model.js` | `demoDocument`, `validateDocument`, `enhanceTarget`, `enhancedName`, `MAX_IMAGE_BYTES`, `MAX_UPLOAD_BYTES`, `ENHANCE_LONG_SIDE` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 18 | const | `big` |  | `"data:image/webp;base64,"+"A".repeat(Math.floor(6*1024*1024*4/3/4)*4)` |
| 19 | const | `doc` |  | `validateDocument({...demoDocument(),map:{...demoDocument().map,image:{name:"gross-4k.webp…` |

## `tests/map-history.test.mjs`

8.260 Bytes · 130 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 1 | `node:assert/strict` | `assert` |
| 2 | `../dist/map-studio/model.js` | `demoDocument`, `validateDocument`, `copy`, `copyKeepingImage`, `History`, `HISTORY_LIMIT` |
| 3 | `../dist/map-studio/history.js` | `ProjectHistory` |
| 4 | `../dist/map-studio/project.js` | `serializeProject` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 7 | const | `image` |  | `(name,fill)=>({name,dataUrl:"data:image/png;base64,"+fill.repeat(200_000)})` |
| 8 | const | `withImage` |  | `(doc,img)=>({...copy(doc),map:{...doc.map,image:img&&{...img}}})` |
| 9 | const | `edit` |  | `(doc,height)=>{const next=copy(doc);next.points[0].height=height;return next;}` |
| 10 | const | `imageBytes` |  | `history=>[...history.images.values()].reduce((sum,entry)=>sum+entry.dataUrl.length,0)` |
| 11 | const | `retainsDataUrl` |  | `history=>[...history.past,...history.future].some(entry=>JSON.stringify(entry).includes("…` |

## `tests/map-project.test.mjs`

14.347 Bytes · 160 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 4 | `node:assert/strict` | `assert` |
| 5 | `../dist/map-studio/model.js` | `SCHEMA`, `demoDocument`, `newPoint` |
| 6 | `../dist/map-studio/project.js` | `ENVELOPE_SCHEMA`, `MAX_PROJECT_BYTES`, `readProject`, `serializeProject`, `envelope`, `projectBytes`, `utf8Length`, `checkEditBudget` |
| 7 | `../dist/map-studio/storage.js` | `loadLocal`, `saveLocal`, `listLocal`, `loadProject`, `SaveConflict`, `SaveRevisionLimit`, `projectKey`, `LEGACY_WORLD_ID` |
| 8 | `../dist/runtime/net/protocol.js` | `POS_LIMIT`, `ROOM_BOUND`, `mapFitsNetwork`, `poseOutOfRange`, `encode`, `decode`, `TYPE` |
| 9 | `../edge/room.mjs` | `BOUND`, `Room` |
| 10 | `../dist/runtime/gpu/cull.js` | `EntityCuller`, `cameraFrom` |
| 11 | `../dist/runtime/sim/layout.js` | `EntityStore` |
| 12 | `../dist/runtime/perf-probes.js` | `registerPerfProbe`, `readPerfProbes` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 14 | const | `extra` |  | `{workspaceId:"ws-kronach",worldId:"world-7",revision:3,geoReference:{crs:"EPSG:25832",ori…` |
| 61 | function | `fakeIndexedDB` |  | `({failPutOn=null}={})` |

## `tests/map-runtime.test.mjs`

5.501 Bytes · 66 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 2 | `node:assert/strict` | `assert` |
| 3 | `../dist/worlds/vendor/three.module.js` | `THREE` |
| 4 | `../dist/runtime/city-layer.js` | `CityLayer` |
| 5 | `../dist/worlds/vendor/TransformControls.js` | `TransformControls` |
| 6 | `../dist/map-studio/model.js` | `demoDocument` |
| 7 | `../dist/map-studio/renderer.js` | `createCameras`, `makePoint`, `release`, `MapRenderer` |
| 50 | `../dist/runtime/map-adapter.js` | `(dynamisch)` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 9 | const | `handlers` |  | `new Map()` |
| 9 | const | `root` |  | `{addEventListener(){},removeEventListener(){}}` |
| 10 | const | `canvas` |  | `{style:{},clientWidth:900,clientHeight:600,addEventListener(t,fn){handlers.set(fn,t);},re…` |
| 11 | const | `doc` |  | `demoDocument()` |
| 11 | const | `snapshot` |  | `JSON.stringify(doc)` |
| 12 | const | `renderer` |  | `Object.create(MapRenderer.prototype)` |
| 12 | const | `cameras` |  | `createCameras()` |
| 12 | const | `controls` |  | `new TransformControls(cameras.top)` |
| 13 | let | `draws` |  | `0` |
| 18 | const | `before` |  | `handlers.size` |

## `tests/map-studio.test.mjs`

4.554 Bytes · 34 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 1 | `node:assert/strict` | `assert` |
| 2 | `../dist/map-studio/model.js` | `demoDocument`, `validateDocument`, `copy`, `History`, `mapToWorld`, `worldToMap`, `movePoint` |
| 3 | `../dist/map-studio/renderer.js` | `makePoint`, `release`, `createCameras`, `MapRenderer` |
| 4 | `../dist/worlds/vendor/three.module.js` | `THREE` |
| 5 | `../dist/runtime/city-layer.js` | `CityLayer` |
| 6 | `../dist/worlds/vendor/TransformControls.js` | `TransformControls` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 8 | const | `doc` |  | `demoDocument()` |
| 12 | const | `moved` |  | `movePoint(doc.points[0],1000,-1000,doc.map,true)` |
| 13 | const | `exact` |  | `movePoint(doc.points[0],5.35,7.18,doc.map,false)` |
| 15 | const | `embedded` |  | `copy(doc)` |
| 16 | const | `history` |  | `new History()` |
| 16 | const | `before` |  | `copy(doc)` |
| 16 | const | `after` |  | `copy(doc)` |
| 19 | const | `first` |  | `makePoint(doc.points[0])` |
| 19 | const | `second` |  | `makePoint({...doc.points[0],color:"#ffffff"})` |
| 22 | const | `handlers` |  | `new Map()` |
| 22 | const | `root` |  | `{addEventListener(){},removeEventListener(){}}` |
| 23 | const | `canvas` |  | `{style:{},clientWidth:900,clientHeight:600,addEventListener(t,fn){handlers.set(fn,t);},re…` |
| 24 | const | `renderer` |  | `Object.create(MapRenderer.prototype)` |
| 24 | const | `cameras` |  | `createCameras()` |
| 24 | const | `controls` |  | `new TransformControls(cameras.top)` |
| 26 | const | `snapshot` |  | `JSON.stringify(doc)` |
| 26 | const | `listeners` |  | `handlers.size` |

## `tests/map-v2.test.mjs`

4.535 Bytes · 55 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 2 | `node:assert/strict` | `assert` |
| 3 | `../dist/map-studio/model.js` | `SCHEMA`, `LEGACY_SCHEMA`, `demoDocument`, `validateDocument`, `newPoint`, `copy`, `walkDefaults`, `withType` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 8 | const | `v1` |  | `{schema:"motionspec.map.v1",name:"Begehbarer Campus",map:{width:120,depth:80,color:"#101f…` |
| 13 | const | `migrated` |  | `validateDocument(copy(v1))` |
| 30 | const | `v2` |  | `copy(migrated)` |
| 36 | const | `demo` |  | `demoDocument()` |
| 38 | const | `imported` |  | `validateDocument({...demo,points:[...demo.points,{...newPoint(9),type:"marker",solid:unde…` |
| 42 | const | `retyped` |  | `withType(migrated.points[0],"marker")` |

## `tests/map-v3.test.mjs`

5.601 Bytes · 64 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 2 | `node:assert/strict` | `assert` |
| 3 | `../dist/map-studio/model.js` | `SCHEMA`, `MAX_POINTS`, `MAX_MAP_METRES`, `MAX_FOOTPRINT_VERTICES`, `MAX_TOTAL_FOOTPRINT_VERTICES`, `validateDocument`, `resizePoint`, `newPoint` |
| 4 | `../dist/runtime/map-adapter.js` | `shapeVertices`, `collidersFromSnapshot`, `prepareWalk` |
| 5 | `../dist/runtime/walker.js` | `Walker`, `interactionTarget` |
| 6 | `../dist/runtime/geometry/polygon.js` | `isConvex` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 9 | const | `L` |  | `[[-5,-5],[5,-5],[5,-1],[-1,-1],[-1,5],[-5,5]]` |
| 10 | const | `base` |  | `{schema:SCHEMA,name:"Stadt",map:{width:200,depth:200,color:"#101f34",image:null},runtime:…` |
| 11 | const | `building` |  | `(extra={})=>({...newPoint(1),id:"haus",name:"Haus L",x:10,z:0,footprint:L,height:12,...ex…` |

## `tests/net-client.test.mjs`

7.720 Bytes · 91 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 3 | `node:assert/strict` | `assert` |
| 4 | `../dist/runtime/net/client.js` | `NetClient`, `SEND_MS`, `INTERP_MS` |
| 5 | `../dist/runtime/net/protocol.js` | `TYPE`, `FLAG`, `encode`, `decode`, `encodeDelta`, `quantizeRecord` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 7 | const | `clock` |  | `{t:0}` |
| 7 | const | `timers` |  | `[]` |
| 8 | const | `fakeTimers` |  | `{now:()=>clock.t,setInterval:(fn,ms)=>{const t={fn,ms,next:clock.t+ms};timers.push(t);ret…` |
| 10 | const | `advance` |  | `ms=>{const end=clock.t+ms;for(;;){const due=timers.filter(t=>t.next<=end).sort((a,b)=>a.n…` |
| 11 | const | `sockets` |  | `[]` |
| 12 | class | `FakeSocket` |  |  |
| 16 | let | `me` |  | `{mode:"kart",x:1,y:2,z:3,heading:.5,speed:10,teleport:false}` |
| 17 | const | `client` |  | `new NetClient({url:"wss://world.example/api/realtime?map=kronach",state:()=>me,WebSocket:…` |

**Klasse `FakeSocket`** (Zeile 12)

| Zeile | Methode | Modifikatoren | Parameter |
|---:|---|---|---|
| 12 | `constructor` |  | `(url)` |
| 12 | `send` |  | `(b)` |
| 12 | `close` |  | `()` |
| 13 | `open` |  | `()` |
| 13 | `deliver` |  | `(bytes)` |

| Zeile | Instanzfeld | Erster Wert |
|---:|---|---|
| 12 | `url` | `url` |
| 12 | `sent` | `[]` |
| 12 | `readyState` | `0` |

## `tests/net-delta.test.mjs`

3.800 Bytes · 51 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 3 | `node:assert/strict` | `assert` |
| 4 | `../dist/runtime/net/protocol.js` | `TYPE`, `FLAG`, `encode`, `quantizeRecord`, `dequantizeRecord`, `encodeDelta`, `decodeDelta`, `applyDelta`, `decode` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 6 | const | `rec` |  | `(id,x,z,o={})=>({id,x,y:o.y??20,z,heading:o.heading??0,speed:o.speed??10,mode:o.mode??"ka…` |
| 7 | const | `toMap` |  | `list=>new Map(list.map(r=>[r.id,quantizeRecord(r)]))` |

## `tests/net-protocol.test.mjs`

3.041 Bytes · 41 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 2 | `node:assert/strict` | `assert` |
| 3 | `../dist/runtime/net/protocol.js` | `HEADER_BYTES`, `RECORD_BYTES`, `MAX_RECORDS`, `TYPE`, `encode`, `decode`, `quantize`, `dequantize` |

## `tests/osm-ground.test.mjs`

7.351 Bytes · 94 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 3 | `node:assert/strict` | `assert` |
| 4 | `../dist/worldport/osm.mjs` | `convertOsm` |
| 5 | `../dist/worldport/osm-ground.mjs` | `coastLand`, `clipPolyline`, `clipPolygon`, `ROAD_WIDTHS`, `overpassGroundQuery` |
| 6 | `../dist/map-studio/model.js` | `validateDocument` |
| 7 | `../dist/runtime/geometry/polygon.js` | `signedArea`, `isSimple` |
| 65 | `../dist/worldport/osm-ground.mjs` | `(dynamisch)` |
| 65 | `../dist/worldport/osm.mjs` | `(dynamisch)` |
| 76 | `../dist/worldport/osm-ground.mjs` | `(dynamisch)` |
| 76 | `../dist/worldport/osm.mjs` | `(dynamisch)` |
| 83 | `../dist/worldport/osm-ground.mjs` | `(dynamisch)` |
| 83 | `../dist/worldport/osm.mjs` | `(dynamisch)` |

## `tests/pedestrian.test.mjs`

3.253 Bytes · 57 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 2 | `node:assert/strict` | `assert` |
| 3 | `../dist/kart/pedestrian.js` | `Pedestrian`, `FOOT` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 5 | const | `DT` |  | `1/120` |
| 6 | const | `go` |  | `(walker,seconds,input={})=>{for(let i=0;i<seconds/DT;i++)walker.step(DT,input);return wal…` |
| 7 | const | `near` |  | `(a,b,tol,label)=>assert.ok(Math.abs(a-b)<=tol,ˋ${label}: ${a.toFixed(3)} ≈ ${b}ˋ)` |

## `tests/perf-meter.test.mjs`

945 Bytes · 13 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 1 | `node:assert/strict` | `assert` |
| 2 | `../dist/runtime/perf-meter.js` | `frameSummary`, `primitives`, `logCsv`, `percentile` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 5 | const | `steady` |  | `frameSummary(Array(60).fill(1000/60))` |
| 7 | const | `janky` |  | `frameSummary([...Array(90).fill(10),...Array(10).fill(40)])` |
| 11 | const | `csv` |  | `logCsv([{t:1,fps:60,calls:23,canvas:"100x50",runtime:"playing"}]).split("\\n")` |

## `tests/physics.test.mjs`

10.120 Bytes · 143 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 2 | `node:assert/strict` | `assert` |
| 3 | `../dist/worlds/vendor/three.module.js` | `THREE` |
| 4 | `../dist/map-studio/model.js` | `demoDocument`, `validateDocument`, `newPoint` |
| 5 | `../dist/map-studio/renderer.js` | `makePoint` |
| 6 | `../dist/runtime/map-adapter.js` | `shapeVertices`, `collidersFromSnapshot`, `prepareWalk` |
| 7 | `../dist/runtime/physics/adapter.js` | `PLAYER`, `MAX_STEP_DISTANCE`, `createWorld`, `BOUNDS` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 9 | const | `near` |  | `(a,b,eps=1e-9)=>Math.abs(a-b)<=eps` |
| 10 | const | `point` |  | `(over={})=>({...newPoint(1),id:over.id??"p",x:0,z:0,width:10,depth:6,height:5,rotation:0,…` |
| 11 | const | `docWith` |  | `(points,map={})=>validateDocument({...demoDocument(),map:{...demoDocument().map,...map},r…` |
| 12 | const | `inside` |  | `(world,p)=>world.overlaps(p)!==null` |

## `tests/plane.test.mjs`

4.119 Bytes · 61 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 2 | `node:assert/strict` | `assert` |
| 3 | `../dist/kart/plane.js` | `Plane`, `PLANE` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 5 | const | `DT` |  | `1/120` |
| 5 | const | `flat` |  | `()=>0` |
| 6 | const | `fly` |  | `(plane,seconds,input={})=>{for(let i=0;i<seconds/DT;i++)plane.step(DT,typeof input==="fun…` |

## `tests/polygon.test.mjs`

3.348 Bytes · 45 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 2 | `node:assert/strict` | `assert` |
| 3 | `../dist/runtime/geometry/polygon.js` | `signedArea`, `isSimple`, `containsPoint`, `triangulate`, `convexParts`, `isConvex`, `convexHull` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 5 | const | `L` |  | `[[0,0],[10,0],[10,4],[4,4],[4,10],[0,10]]` |
| 6 | const | `square` |  | `[[0,0],[4,0],[4,4],[0,4]]` |
| 7 | const | `bowtie` |  | `[[0,0],[4,4],[4,0],[0,4]]` |
| 8 | const | `comb` |  | `[[0,0],[12,0],[12,6],[10,6],[10,2],[8,2],[8,6],[6,6],[6,2],[4,2],[4,6],[2,6],[2,2],[0,2]]…` |
| 32 | const | `star` |  | `Array.from({length:64},(_,i)=>{const a=i/64*Math.PI*2,r=i%2?6:10;return[r*Math.cos(a),r*M…` |

## `tests/quality.test.mjs`

3.799 Bytes · 65 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 2 | `node:assert/strict` | `assert` |
| 3 | `../dist/runtime/quality.js` | `FrameStats`, `AdaptiveResolution`, `FRAME_BUDGET_MS`, `LEVELS`, `runtimePixelRatio` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 5 | const | `near` |  | `(a,b,eps=1e-6)=>Math.abs(a-b)<=eps` |
| 7 | function | `drive` |  | `(c,{seconds,interval,start=0})` |
| 8 | const | `fixed` |  | `ms=>()=>ms` |
| 10 | const | `gpu` |  | `(msAtOne)=>scale=>Math.max(1000/60,msAtOne*scale*scale)` |

## `tests/repository.test.mjs`

5.594 Bytes · 79 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 1 | `node:test` | `test` |
| 2 | `node:assert/strict` | `assert` |
| 3 | `node:fs/promises` | `readFile` |
| 4 | `../scripts/serve.mjs` | `createDevServer` |

## `tests/room.test.mjs`

10.796 Bytes · 138 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 2 | `node:assert/strict` | `assert` |
| 3 | `../edge/room.mjs` | `Room`, `CELL`, `TICK_MS`, `MAX_PLAYERS`, `interestRing`, `FLAG_TELEPORT`, `Y_MAX` |
| 4 | `../dist/runtime/net/protocol.js` | `TYPE`, `FLAG`, `encode`, `decode`, `decodeDelta`, `applyDelta`, `quantizeRecord` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 6 | const | `pose` |  | `(p)=>encode(TYPE.POSE,0,[{id:0,y:0,speed:0,heading:0,mode:"kart",...p}])` |
| 7 | const | `clock` |  | `{t:1_000_000}` |
| 7 | const | `now` |  | `()=>clock.t` |

## `tests/runtime.test.mjs`

10.095 Bytes · 149 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 2 | `node:assert/strict` | `assert` |
| 3 | `../dist/runtime/session.js` | `RuntimeSession` |
| 4 | `../dist/runtime/input.js` | `InputRouter` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 7 | function | `fakeClock` |  | `()` |
| 18 | function | `fakeHost` |  | `({fail=null}={})` |
| 26 | function | `fakeEvents` |  | `()` |
| 34 | const | `doc` |  | `{schema:"motionspec.map.v2",name:"Test",map:{width:40,depth:40,color:"#101f34",image:null…` |

## `tests/scan-world.test.mjs`

4.709 Bytes · 70 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 3 | `node:assert/strict` | `assert` |
| 4 | `node:fs/promises` | `readFile`, `readdir` |
| 5 | `node:crypto` | `createHash` |
| 6 | `../dist/runtime/physics/adapter.js` | `PLAYER`, `BOUNDS` |
| 7 | `../dist/runtime/walker.js` | `Walker` |
| 8 | `../dist/runtime/scan/adapter.js` | `SCAN_ID`, `readColliders`, `poseFromFrame`, `prepareScanWalk`, `bundleIdOf`, `checkManifest` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 10 | const | `root` |  | `new URL("./fixtures/scans/",import.meta.url)` |
| 10 | const | `id` |  | `(await readdir(root)).filter(n=>SCAN_ID.test(n))` |
| 12 | const | `file` |  | `name=>readFile(new URL(ˋ${id}/${name}ˋ,root))` |
| 12 | const | `json` |  | `async name=>JSON.parse(await file(name))` |
| 13 | const | `manifest` |  | `await json("manifest.json")` |
| 13 | const | `colliders` |  | `await json("colliders.json")` |
| 13 | const | `camera` |  | `await json("camera.json")` |
| 14 | const | `sha` |  | `bytes=>createHash("sha256").update(bytes).digest("hex")` |
| 26 | const | `room` |  | `readColliders(colliders)` |
| 33 | const | `first` |  | `poseFromFrame(camera.frames[0])` |
| 40 | const | `walk` |  | `prepareScanWalk({colliders,camera})` |
| 46 | function | `random` |  | `(seed)` |

## `tests/sim-layout.test.mjs`

2.424 Bytes · 35 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 2 | `node:assert/strict` | `assert` |
| 3 | `../dist/runtime/sim/layout.js` | `ENTITY_BYTES`, `OFFSET`, `MODE`, `WGSL_ENTITY`, `EntityStore` |

## `tests/sim-snapshot.test.mjs`

6.843 Bytes · 87 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 4 | `node:assert/strict` | `assert` |
| 5 | `../dist/runtime/sim/snapshot.js` | `StateLayout`, `SimSnapshot` |
| 6 | `../dist/kart/track.js` | `Track` |
| 7 | `../dist/kart/kart.js` | `Kart`, `Race`, `KART_STATE`, `MAX_LAPS` |
| 8 | `../dist/kart/plane.js` | `Plane` |
| 9 | `../dist/kart/pedestrian.js` | `Pedestrian` |
| 10 | `../dist/runtime/input.js` | `InputRouter` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 12 | const | `DT` |  | `1/120` |
| 14 | const | `rng` |  | `seed=>()=>{seed\|=0;seed=seed+0x6D2B79F5\|0;let t=Math.imul(seed^seed>>>15,1\|seed);t=t+Math…` |
| 15 | const | `sameBits` |  | `(a,b)=>a.length===b.length&&Buffer.compare(Buffer.from(a.buffer,a.byteOffset,a.byteLength…` |
| 16 | const | `wobbly` |  | `(r,n=24)=>Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2,k=r*(1+.18*Math.sin(3*a)+.0…` |

## `tests/sim-wasm.test.mjs`

7.990 Bytes · 117 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 3 | `node:assert/strict` | `assert` |
| 4 | `node:fs` | `readFileSync` |
| 5 | `../dist/runtime/sim/wasm.js` | `loadSim` |
| 6 | `../dist/runtime/assets/codec.js` | `decodeHeightFile` |
| 7 | `../dist/runtime/sim/layout.js` | `OFFSET`, `MODE` |
| 8 | `../dist/globe/car.js` | `Car` |
| 9 | `../dist/kart/pedestrian.js` | `Pedestrian` |
| 10 | `../dist/kart/plane.js` | `Plane` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 12 | const | `sim` |  | `await loadSim(readFileSync(new URL("../dist/runtime/sim/sim.wasm",import.meta.url)))` |
| 13 | const | `DT` |  | `1/120` |
| 14 | const | `near` |  | `(a,b,tol,label)=>assert.ok(Math.abs(a-b)<=tol,ˋ${label}: wasm ${a.toFixed(3)} vs js ${b.t…` |
| 15 | const | `sampler` |  | `(heights,w,d,cell=1,scale=.01)=>(x,z)=>{const gx=Math.min(w-1.001,Math.max(0,x/cell+w/2))…` |
| 20 | function | `terrain` |  | `(kind)` |

## `tests/surfaces.test.mjs`

4.528 Bytes · 54 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 3 | `node:assert/strict` | `assert` |
| 4 | `../dist/map-studio/model.js` | `validateDocument`, `newPoint`, `SURFACE_KINDS`, `MAX_SURFACES`, `MAX_SURFACE_POINTS` |
| 5 | `../dist/runtime/ground-layer.js` | `buildGround` |
| 42 | `../dist/runtime/geometry/polygon.js` | `(dynamisch)` |
| 50 | `../dist/runtime/ground-layer.js` | `(dynamisch)` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 7 | const | `base` |  | `{schema:"motionspec.map.v3",name:"Boden",map:{width:400,depth:400,color:"#1f5f8b",image:n…` |
| 8 | const | `road` |  | `{kind:"road",points:[[-150,0],[0,0],[0,150]],width:12}` |
| 9 | const | `beach` |  | `{kind:"beach",points:[[100,-150],[190,-150],[190,150],[100,150]]}` |
| 10 | const | `land` |  | `{kind:"land",points:[[-200,-200],[120,-200],[120,200],[-200,200]]}` |

## `tests/vram-budget.test.mjs`

2.448 Bytes · 26 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 2 | `node:assert/strict` | `assert` |
| 3 | `../dist/runtime/lod/chunk-lod.js` | `ChunkLod` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 5 | const | `fakeMesh` |  | `(kind,x,z,bytes)=>{const m={visible:true,userData:{lod:{kind}},geometry:{boundingSphere:{…` |
| 6 | const | `clock` |  | `{t:0}` |

## `tests/walker.test.mjs`

5.857 Bytes · 81 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 2 | `node:assert/strict` | `assert` |
| 3 | `../dist/map-studio/model.js` | `newPoint` |
| 4 | `../dist/runtime/map-adapter.js` | `prepareWalk` |
| 5 | `../dist/runtime/physics/adapter.js` | `PLAYER` |
| 6 | `../dist/runtime/walker.js` | `Walker`, `interactionTarget`, `TURN_SPEED`, `LOOK_DEGREES_PER_PIXEL`, `PITCH_LIMIT`, `INTERACT_DISTANCE` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 8 | const | `near` |  | `(a,b,eps=1e-6)=>Math.abs(a-b)<=eps` |
| 9 | const | `point` |  | `(over={})=>({...newPoint(1),id:"p",x:0,z:0,width:10,depth:6,height:5,rotation:0,solid:tru…` |
| 10 | const | `snapshot` |  | `(points=[],spawn={x:0,z:0,heading:0})=>({map:{width:100,depth:100},runtime:{spawn},points…` |
| 11 | const | `walkerFor` |  | `snap=>{const walk=prepareWalk(snap);return new Walker({physics:walk.world,start:walk.star…` |
| 12 | const | `run` |  | `(walker,seconds,intent)=>{for(let i=0;i<Math.round(seconds*60);i++)walker.step(1/60,{x:0,…` |

## `tests/water.test.mjs`

2.791 Bytes · 36 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 3 | `node:assert/strict` | `assert` |
| 4 | `../dist/map-studio/model.js` | `validateDocument` |
| 5 | `../dist/runtime/map-adapter.js` | `prepareWalk`, `waterColliders`, `WATER` |
| 6 | `../dist/runtime/walker.js` | `Walker` |
| 7 | `../dist/runtime/geometry/polygon.js` | `containsPoint` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 10 | const | `land` |  | `[[-100,-50],[20,-50],[20,50],[-100,50]]` |
| 10 | const | `pond` |  | `[[-60,-10],[-40,-10],[-40,10],[-60,10]]` |
| 11 | const | `doc` |  | `validateDocument({schema:"motionspec.map.v3",name:"Küste",map:{width:200,depth:100,color:…` |

## `tests/world-studio.test.mjs`

8.662 Bytes · 114 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 1 | `node:assert/strict` | `assert` |
| 2 | `node:fs/promises` | `readFile` |
| 3 | `../dist/worlds/data.js` | `worlds` |
| 4 | `../dist/worlds/scene.js` | `buildWorld` |
| 5 | `../dist/worlds/vendor/three.module.js` | `THREE` |
| 6 | `../dist/worlds/vendor/TransformControls.js` | `TransformControls` |
| 7 | `../dist/world-studio/model.js` | `createDocument`, `createObject`, `validateDocument`, `readImport`, `History`, `clone` |
| 8 | `../dist/world-studio/renderer.js` | `WorldEditorRenderer` |
| 9 | `../dist/map-studio/project.js` | `readProject`, `serializeProject`, `MAX_PROJECT_BYTES` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 78 | let | `meshCount` |  | `0` |
| 110 | const | `controls` |  | `new TransformControls(new THREE.PerspectiveCamera())` |

**Event-Bindungen**

| Zeile | Ereignis | Ziel |
|---:|---|---|
| 59 | `dispose` | `original` |

## `tests/world-walk.test.mjs`

4.955 Bytes · 65 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 2 | `node:assert/strict` | `assert` |
| 3 | `../dist/worlds/vendor/three.module.js` | `THREE` |
| 4 | `../dist/worlds/data.js` | `worlds` |
| 5 | `../dist/worlds/scene.js` | `buildWorld` |
| 6 | `../dist/world-studio/model.js` | `createDocument` |
| 7 | `../dist/world-studio/walk.js` | `WALKER`, `convexHull`, `walkableArea`, `groundLevel`, `sceneColliders`, `prepareWorldWalk` |
| 8 | `../dist/runtime/physics/adapter.js` | `BOUNDS` |
| 9 | `../dist/runtime/walker.js` | `Walker`, `interactionTarget` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 19 | function | `unitsFor` |  | `(world)` |

## `tests/worldport-osm.test.mjs`

11.114 Bytes · 135 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 3 | `node:assert/strict` | `assert` |
| 4 | `../dist/worldport/osm.mjs` | `convertOsm`, `projection`, `parseHeight`, `simplify`, `OSM_ATTRIBUTION`, `overpassQuery` |
| 5 | `../dist/map-studio/model.js` | `validateDocument`, `MAX_POINTS`, `MAX_TOTAL_FOOTPRINT_VERTICES` |
| 6 | `../dist/runtime/map-adapter.js` | `prepareWalk` |
| 7 | `../dist/runtime/geometry/polygon.js` | `isSimple` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 10 | const | `ring` |  | `(lat,lon,dLat,dLon)=>[{lat,lon},{lat,lon:lon+dLon},{lat:lat+dLat,lon:lon+dLon},{lat:lat+d…` |
| 11 | const | `way` |  | `(id,geometry,tags)=>({type:"way",id,geometry,tags})` |
| 12 | const | `osm` |  | `{elements:[way(1,ring(25.7800,-80.1300,.0002,.0003),{building:"hotel",name:"Hotel Pastel"…` |

## `tests/worldport.test.mjs`

8.679 Bytes · 109 Zeilen · Node-Test

**Imports**

| Zeile | Quelle | Namen |
|---:|---|---|
| 2 | `node:assert/strict` | `assert` |
| 3 | `node:fs/promises` | `readFile` |
| 4 | `../dist/worldport/core.mjs` | `parseCsv`, `convertPoints`, `LIMITS` |
| 5 | `../dist/map-studio/model.js` | `validateDocument`, `MAX_POINTS` |
| 100 | `node:child_process` | `(dynamisch)` |
| 100 | `node:fs` | `(dynamisch)` |
| 100 | `node:os` | `(dynamisch)` |
| 100 | `node:path` | `(dynamisch)` |

**Modulebene**

| Zeile | Art | Name | Export | Wert / Signatur |
|---:|---|---|:---:|---|
| 14 | const | `csv` |  | `await readFile(new URL("./fixtures/leonida-sample.csv",import.meta.url),"utf8")` |
| 15 | const | `records` |  | `parseCsv(csv)` |
