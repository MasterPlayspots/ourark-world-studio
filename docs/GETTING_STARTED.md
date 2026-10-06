# Get a map running, then make it yours

This guide follows the implemented Map Studio path: import a small project, edit the same data in 2D and 3D, walk through it, and save a portable JSON file. The current interface uses German labels; the instructions below quote the labels you will see.

The steps are derived from the source and automated model tests. They are also a manual acceptance exercise: fresh browser, device and real-user results for this public release still need to be recorded. See [current limits](LIMITS.md) and [value and real-use validation](VALUE_AND_VALIDATION.md).

## Before you start

- Install Git and **Node.js 24 or newer**. Check with `node --version`.
- Clone this repository using its GitHub **Code** menu, or extract its source ZIP, and open a terminal in the directory containing `package.json`.
- Use a browser with WebGL for the 2D/3D canvas and walking. The application uses browser ES modules and IndexedDB.
- Keep the small [starter project](../examples/map-starter.map.json) in your checkout. It has no image, hosted dataset, account, API key or remote-service requirement.

No `npm install` is required for the default local server or Node test suite. Vendored rendering code and the prebuilt simulation WASM are included. `dist/` is authored source; do not delete it as generated output.

## First 15 minutes

### 1. Start the local server

From the repository root:

```sh
npm run dev
```

Leave that terminal running and open **[http://127.0.0.1:8080/map-studio/](http://127.0.0.1:8080/map-studio/)**. The server may print a World Studio URL; use the Map Studio URL for this exercise. It binds to your own computer by default and has no login.

Do not double-click an HTML file. A `file://` URL does not provide the HTTP module, API and storage environment this application expects.

### 2. Open the example

1. Click **Importieren** → **Kartenprojekt öffnen**.
2. In the file picker, choose `examples/map-starter.map.json` from the checkout.
3. Confirm the project title is **First editable campus** and the left-hand **Infrastruktur** list contains **Workshop**.

The example is a 120 × 80 metre map with one mint building, initially 12 × 8 × 6 metres at X = 0, Z = 0. Its world ID is `example-campus`; the walking spawn is on clear ground at X = 0, Z = 20. If you see a previous local project, importing the example replaces the view only after any unsaved work is handled. Save or back up that work first; see the storage instructions below.

### 3. Change geometry and business data

1. Select **Workshop** in the list.
2. In the right-hand **Eigenschaften** inspector, change **Höhe** from `6` to `9`, then leave the field so the change is applied.
3. Click **3D Raum** to see the height; switch back with **2D Karte**. These are two views of one map document, so there is no conversion or second copy to keep synchronized.
4. Under **Verknüpfte Daten**, enter this JSON object and click **Daten übernehmen**:

```json
{
  "assetId": "building-001",
  "purpose": "Workshop",
  "status": "Ready for inspection"
}
```

Use the toolbar's **Rückgängig** (`↶`) and **Wiederholen** (`↷`) buttons to undo and redo the data change. The keyboard equivalents are Ctrl/⌘+Z and Ctrl/⌘+Shift+Z when focus is outside a text field. Return the building to 9 metres if you also undo the height edit.

In **2D Karte**, drag the point to move it. In **3D Raum**, drag the selected object's axis handles; drag empty space to orbit, right-drag to pan, and scroll to zoom. **Gesamte Karte** fits the map and **Auswahl** focuses the selection. With the canvas focused, arrow keys move the selection by 1 metre, or 5 metres with Shift. **1 m Raster** controls snapping. For this first walk, leave the building near the map centre so the starter spawn stays clear.

### 4. Walk through the edited map

Click **Welt betreten**. The runtime uses a frozen snapshot of your map; editor controls are unavailable until you return. It can request fullscreen; fullscreen is not necessary for the walk.

| Control | Action |
| --- | --- |
| WASD or arrow keys | Walk |
| Q / E | Turn |
| Drag on the canvas | Look around |
| Enter | Inspect a nearby interactive point when its prompt appears |
| R | Return to the starting position |
| Escape or **Pause** | Pause |
| **Fortsetzen** | Resume |
| **Zurück zum Editor** | End the walk and return to editing |

Approach Workshop and inspect it when prompted. Check that its attached values appear. **Blockiert Bewegung** and **Interaktiv** in the inspector determine whether the building blocks movement and can be inspected. Walking does not change its design position or height. Losing window focus or switching tabs pauses the runtime; use **Fortsetzen** when you return.

Return to the editor and confirm Workshop is still 9 metres high with your data. This is a small functional check, not evidence that the system is a physically accurate building simulator.

### 5. Save, export and reopen

1. Click **Lokal speichern**. Wait for the footer to say **In diesem Browser gespeichert · Revision …**.
2. Click **Exportieren** and keep the downloaded `.map.json` file. It includes the project ID, validated map, point data and any embedded ground image.
3. Reload the page at the same URL. Confirm the saved project, height and data return.
4. Use **Importieren** → **Kartenprojekt öffnen** to reopen the exported file, then check the same values again.

You now have a local working copy and a file backup. A map export is not a complete archive of World Studio scenes, third-party models, hosted geodata or the server.

## Understand local saves before using real data

**Lokal speichern is explicit browser storage, not automatic cloud sync.** Projects live in IndexedDB for the exact origin and browser profile. `http://127.0.0.1:8080`, `http://localhost:8080`, another port, another browser profile and a hosted domain have separate stores. Use the same URL consistently. Clearing site data or removing the profile can remove local projects; keep exported files separately.

- The most recently saved/opened local project is restored on load. Other stored projects appear under **Importieren** → **IN DIESEM BROWSER GESPEICHERT**. The current project is omitted from that list.
- Importing the same world ID replaces its map as an undoable edit. It does not create an independent project. Changing only **Projektname** also does not create a new world ID.
- Importing another world ID opens a separate project with fresh undo history. Unsaved edits block that switch. Save first, or export a backup and reload before switching if saving is unavailable. **Exportieren does not clear the unsaved-edit state.**
- The undo history has 35 steps and is not a durable version archive. Export dated checkpoints for work you need to recover later.

### If another tab has saved a newer revision

The save transaction checks the stored revision and refuses to overwrite a newer one. A conflict notice is expected protection; the tabs do not automatically merge or synchronize their open documents.

1. In the conflicting tab, click **Exportieren** and rename the downloaded file so you can identify that tab's work.
2. Preserve any other unsaved tab's work too, then choose one tab for continued editing.
3. Reload it to load the latest stored revision. If another project was saved last, select the intended project from the local project list.
4. Compare the backup with the current version and reapply the changes you want. Opening the conflicting backup for the same world replaces the whole document; it is not a merge.
5. Save the chosen result. Keep both backups until you have checked it.

If the browser cannot store data, export before reloading or closing it. Do not clear browser storage as a first troubleshooting step. Projects over the 16 MiB import budget can sometimes be exported as `*.sicherung.map.json` backups from older local data, but those oversized files cannot be re-imported unchanged; see the [project contract](../contracts/map-project-v1.md).

## Bring a small dataset

Start with three or four records whose coordinates and ownership you understand. For a direct point import, save this as a JSON file and choose **Importieren** → **Infrastrukturpunkte**:

```json
[
  {"id":"inspection-01","name":"Inspection station","type":"station","x":20,"z":-10,"height":3,"color":"#72a8ef","data":{"status":"Pending","assetId":"inspection-01"}}
]
```

This adds to the current map; **Kartenprojekt öffnen** opens a whole document. Coordinates are metres relative to the map centre: +X east, +Z south, +Y up. A map image is a ground texture. Loading one does not infer buildings or place your points automatically, and its displayed dimensions must be set deliberately.

For CSV conversion, create a folder outside the checkout for your working files. This command works in common macOS/Linux shells and Windows PowerShell:

```sh
node -e "require('node:fs').mkdirSync('../motionspec-local-example',{recursive:true})"
```

Save the following as `../motionspec-local-example/points.csv` using a text editor:

```csv
id,name,lat,lng,status
workshop,Workshop,0,0,Ready
station,Inspection station,10,20,Pending
entrance,Entrance,-20,0,Open
```

Then run:

```sh
node scripts/worldport.mjs ../motionspec-local-example/points.csv -o ../motionspec-local-example/points.map.json --scale 1 --name "My first data map"
```

Read the conversion report for warnings, excluded records and truncation. Import the resulting `points.map.json` as a **Kartenprojekt**. This converter treats `lat`/`lng` as north/east coordinates on a flat source plane, centres the records, and scales them into metres; these example numbers are not geographic latitude/longitude. A real CRS transformation is separate work. The result is a bare `motionspec.map.v3` payload, which the editor wraps into the current project identity; export before replacing existing work.

## Make your first code change

For ordinary domain information, use the existing point `data` object first. It already survives map import/export and appears in the walking inspection panel. This gives you a practical prototype without adding a format version or altering the renderer.

For a rendering or interaction change, use the following source map. Refresh the browser after edits; there is no frontend bundler or automatic hot reload.

| Goal | Source and checks |
| --- | --- |
| Validate a new map field or limit | `dist/map-studio/model.js`; `tests/map-v3.test.mjs` |
| Add an inspector control | `dist/map-studio/index.html`, `editor.js`; `tests/map-studio.test.mjs`, `map-history.test.mjs` |
| Change map geometry or picking | `dist/map-studio/renderer.js`, `dist/runtime/city-layer.js`; `tests/city-layer.test.mjs` |
| Change walking or collision | `dist/runtime/walk-host.js`, `walker.js`, `physics/adapter.js`; `tests/walker.test.mjs`, `physics.test.mjs`, `map-runtime.test.mjs` |
| Extend file metadata or local persistence | `dist/map-studio/project.js`, `storage.js`; `tests/map-project.test.mjs`; [envelope contract](../contracts/map-project-v1.md) |
| Convert another source dataset | Pure modules under `dist/worldport/`, thin CLIs under `scripts/`; `tests/worldport.test.mjs` |

Use the editor's existing edit transaction and replace validated point objects rather than mutating them in place. Preserve old-file defaults, undo/redo, local restore and export round trips. Unknown arbitrary top-level fields may be normalized away; supported persistence needs an explicit field or the existing `data` object.

For a focused map change:

```sh
node tests/map-v3.test.mjs
node tests/map-project.test.mjs
node tests/map-history.test.mjs
```

Before contributing, regenerate the file index and run the repository's verification entry point from a Git checkout:

```sh
npm run docs:architecture
npm run verify
```

The public verification suite covers the files and synthetic fixtures shipped here. Original private asset-only fixture checks are outside this release's suite; a passing result does not validate excluded scans or terrain. Node checks do not launch real browsers, certify device performance, or verify a production deployment. Browser harness requirements and contribution expectations are in [CONTRIBUTING](../CONTRIBUTING.md).

## Which application should I open?

| Route | Purpose and release boundary |
| --- | --- |
| `/map-studio/` | Start here: map editing, attached data, local projects and walking with the redistributable starter example |
| `/studio/` or local `/` | DOM/CSS layer editor; its CSS 3D view is a layout preview |
| `/world-studio/` | Separate Three.js scene editor and world JSON format; optional image/scan content needs available, licensed assets |
| `/kart/` | Vehicle and terrain integration code; original terrain datasets are not part of the asset-free starter exercise |
| `/globe/` | Cesium integration; imagery, terrain, tiles and related services have their own data, connectivity and configuration requirements |

Map Studio's **2D Karte** and **3D Raum** share one model. World Studio's JSON is a different format; selecting another navigation item does not transfer your current project between editors. Complete asset-inclusive world packages and a stable general plugin SDK are not implemented.

Optional image enhancement needs a configured external renderboost service. Hosting and multiplayer require their own setup; Map Studio has no connected shared editor persistence or map multiplayer. The public release excludes assets whose redistribution has not been cleared. Follow the [architecture](architecture/README.md), [license scope](../LICENSE_SCOPE.md) and [third-party notices](../THIRD_PARTY_NOTICES.md) before adding data or services.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `npm`/`node` is missing or the version is old | Install Node 24+, open a new terminal, and check `node --version` |
| `package.json` cannot be found | Change into the extracted/cloned repository root before running npm commands |
| Port 8080 is already in use | Stop your previous dev server with Ctrl+C, or start on another port. macOS/Linux: `PORT=8081 npm run dev`. PowerShell: run `$env:PORT = '8081'`, then `npm run dev`. Open the matching URL; its storage is separate |
| Page is blank or modules fail | Use the HTTP Map Studio URL, keep the server running, and inspect the browser console for the first error |
| **Kartenansicht nicht verfügbar** | WebGL failed to initialize. Check browser graphics support and hardware acceleration. The point list, properties and export remain available; walking needs working 3D graphics |
| My saved project is missing | Check the exact host, port, protocol and browser profile; then check **IN DIESEM BROWSER GESPEICHERT**. Re-import a file backup if necessary |
| An input edit seems ignored | Leave numeric fields to apply their change; click **Daten übernehmen** for JSON. Check **Gesperrt**, validation messages, and whether walk mode is active |
| Walking pauses unexpectedly | Focus loss, hidden tabs and leaving fullscreen pause it by design; choose **Fortsetzen** |
| A second tab cannot save | Export its work and follow the revision-conflict recovery above; there is no automatic merge |
| Enhancement or an optional dataset is unavailable | Use the plain Map Studio starter; these integrations require separately configured services or data |

When reporting a problem, include the commit, Node/browser/OS versions, exact steps, expected and actual results, and a minimal shareable project with sensitive values removed. For performance, also record hardware/GPU, viewport and DPR, point/surface counts, and measurement duration. Use [VALUE_AND_VALIDATION](VALUE_AND_VALIDATION.md) to turn a working demo into evidence about an actual user task.
