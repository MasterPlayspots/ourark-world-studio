# Current limits and what the evidence supports

This is a source preview for developers building browser editors and explorable worlds. Its strongest current starting point is a map document that can be edited in 2D, viewed in 3D, walked through, saved locally and exchanged as JSON. It is not yet a unified world engine, a packaged SDK or a proven production collaboration service.

This inventory was checked on 6 October 2026 against implementation baseline `e27fd30af1192f8c311bba0ed08181ad43c1347b` and the documentation/licensing revision `47e13432f3e72e39b25c17f0e5f26c4edc0fcc8d`. The latter passed the original repository's full `npm run verify` CI. That result does not automatically validate a later curated release snapshot. No new real-device, browser, field-use, production-load or Rust-rebuild validation was performed for this inventory.

Source and test paths below identify the original implementation evidence. Some dataset-dependent tests or assets may be absent from a curated public distribution; their mention does not promise that those files are included or redistributable. See the public repository's verification record for what was actually rerun.

## Read the evidence in four separate categories

| Category | What it means | What it does not mean |
| --- | --- | --- |
| Implemented behavior | An active code path and, where named, regression tests exist | A user has successfully completed a real job with it |
| Enforced ceiling | A validator or runtime rejects values beyond a limit | All accepted combinations perform well on every device |
| Recorded measurement | A particular workload produced a result on the recorded setup | A general FPS, accuracy, savings or scalability guarantee |
| Unvalidated benefit | A plausible use case is enabled by implemented behavior | Proven customer value, production readiness or market differentiation |

Start with the [setup instructions](../README.md), [Map Studio guide](MAP_STUDIO.md) and [architecture](architecture/README.md). Use this document when deciding whether the current implementation fits a task.

## Map documents: enforced ceilings

All limits apply together. For example, a project can reach its serialized byte budget before it reaches its point or surface count ceiling. A valid document is not necessarily comfortable to edit, render or walk through.

| Item | Current rule | Implementation evidence |
| --- | --- | --- |
| Infrastructure points | At most 5,000 | `dist/map-studio/model.js`: `MAX_POINTS`, `validateDocument`; `tests/map-v3.test.mjs` |
| Map width and depth | Each 10–5,000 m | `model.js`: `MAX_MAP_METRES`, `validateDocument` |
| Point position and walk spawn | X/Z each within ±2,500 m; editor movement additionally clamps to the current map | `model.js`: `validateDocument`, `validateRuntime`, `movePoint` |
| Simple point dimensions | Width/depth 0.5–300 m; height 0.2–300 m | `model.js`: `MAX_SIZE`, `validateDocument` |
| Building footprints | Simple, non-self-intersecting polygon; 3–64 vertices; at most 100,000 vertices across all footprints; width/depth and local coordinate magnitudes limited to 300 m | `model.js`: `validateFootprint`, `MAX_TOTAL_FOOTPRINT_VERTICES`; `tests/polygon.test.mjs`, `tests/map-v3.test.mjs` |
| Ground surfaces | At most 20,000 surfaces and 400,000 surface points combined | `model.js`: `MAX_SURFACES`, `MAX_SURFACE_POINTS`; `tests/surfaces.test.mjs` |
| Individual ground geometry | Areas: 3–2,000 points. Road/path ribbons: 2–5,000 points, width 0.5–60 m. Coordinates may extend 50 m beyond each map edge | `model.js`: `validateSurfaces` |
| Attached point data | JSON object whose serialized string has at most 6,000 JavaScript string code units | `model.js`: `validateDocument`; this is not a 6,000-byte limit |
| Points-only JSON import | At most 2 MiB; added points must still fit the document's total point and project budgets | `dist/map-studio/editor.js`: `points-file` change handler |
| Uploaded ground image | PNG, JPEG or WebP; file at most 4 MiB; image decoder rejects dimensions above 8,192 pixels per side | `dist/map-studio/editor.js`: `image-file` change handler, `decodeImage`; `model.js`: `MAX_UPLOAD_BYTES` |
| Embedded image allowance | Nominal 8 MiB, implemented as a base64 data-URL string-length ceiling of `MAX_IMAGE_BYTES × 1.4`; not exact decoded-byte accounting | `model.js`: `MAX_IMAGE_BYTES`, `validateDocument`; `editor.js`: enhancement response check |
| Project import/export and edit budget | 16 MiB, measured from exact UTF-8 serialization | `dist/map-studio/project.js`: `MAX_PROJECT_BYTES`, `projectBytes`, `checkEditBudget`; `tests/map-project.test.mjs` |
| Undo history | At most 35 past steps; unchanged point serialization and images are shared | `model.js`: `HISTORY_LIMIT`, `History`; `tests/map-history.test.mjs`, `tests/map-edit-cost.test.mjs` |
| Georeference metadata | Opaque JSON object, at most 4,000 JavaScript string code units; no CRS validation | `project.js`: `MAX_GEO_REFERENCE_CHARS`, metadata validation |

Image dimensions and file size do not bound decoded GPU memory or guarantee texture support on a particular device. Large textures, dense footprints, overlapping colliders and many surfaces need their own device measurements. Raising a constant alone is not evidence that a larger workload is supported.

Existing oversized local projects have a recovery exception: they can be opened, saved, reduced and exported as a backup; size-increasing edits are refused. A file that fits before normalization but grows beyond the budget can open with a warning. Oversized backup exports cannot be re-imported through the normal import path. See the [project envelope contract](../contracts/map-project-v1.md).

## Application and format boundaries

| Capability | Current boundary and practical consequence |
| --- | --- |
| Shared 2D/3D map | Both views derive from one map payload. A ground image is a texture: it does not automatically create building geometry, correct heights or a navigable reconstruction |
| World Studio | Its procedural scenes and world JSON are separate from Map Studio project envelopes. A diorama background image is not equivalent to full surrounding 3D geometry |
| Layer editor | Uses DOM/CSS layout and CSS 3D preview. State is memory-only and resets on reload/navigation. JSON export has no UI re-import or local restore; layers do not automatically become meshes, colliders or the map's document model |
| Walking | Uses a frozen editor snapshot, collision shapes and a specialized movement controller. It does not provide general rigid-body physics, arbitrary vehicle dynamics or a configurable avatar system |
| Driving and flying | Implemented in the kart/globe applications; there is no general vehicle authoring tool or completed vehicle integration for every user-authored map |
| World interchange | Map JSON, World Studio JSON, prepared scans and track manifests are different formats. `contracts/world-package-v2.d.ts` describes a future complete archive; a shipping asset-inclusive world-package importer/exporter is absent |
| Time and automation | No general 4D world timeline, arbitrary simulation-event authoring or automatic conversion of recorded user behavior into reliable workflows |
| GIS interpretation | Coordinates are local metres. Preserving `geoReference` metadata does not implement survey accuracy, CRS transforms, terrain reconstruction or validation of upstream data quality |
| Team editing | No shared cloud editor persistence, simultaneous editor collaboration, workspace navigation contract or automatic merge of conflicting edits |

Evidence: `dist/map-studio/model.js`, `renderer.js`; `dist/world-studio/model.js`; `dist/app.js`; `dist/runtime/session.js`, `walk-host.js`, `map-adapter.js`, `physics/adapter.js`; `dist/kart/main.js`; `dist/globe/main.js`; `contracts/world-package-v2.d.ts`.

## Storage, rendering and simulation

**Local save is device-local persistence.** Map Studio uses IndexedDB with a transactional revision comparison. A stale tab receives a conflict instead of silently overwriting that world's newer save. This does not sync devices, resolve the conflict for the user, provide cloud backup or guarantee storage availability under browser quota/eviction policies. Export project files for transfer and backup. Publishing the source does not publish anyone's browser-local projects. World Studio uses separate localStorage/IndexedDB paths. Evidence: `dist/map-studio/storage.js`, `tests/map-project.test.mjs`, `dist/world-studio/city-store.js`.

Map Studio restores the last **saved** project, not necessarily the last one opened. Selecting a stored project only reads it; save it to change which project a reload restores. The layer editor has none of these persistence mechanisms: its export records data but cannot be re-imported through its UI. Evidence: `dist/map-studio/storage.js` (`loadProject`, `saveLocal`), `dist/map-studio/editor.js` (`showLocalProjects`), `dist/app.js` (`state`, `sceneData`).

**Three.js rendering remains WebGL.** Optional WebGPU is a compute culling path, requested with `gpu=1` in the kart app. The default remote-entity culler runs on the CPU; unavailable/failed WebGPU falls back to CPU. Upload, queueing and readback are part of the awaited culling cost. CPU/fallback tests do not establish execution or a speedup on a real GPU. There is no integrated Makepad runtime, `wgpu-core`, subgroup-matrix kernel, SharedArrayBuffer transport or WebTransport path. Evidence: `dist/runtime/gpu/cull.js`, `tests/gpu-cull.test.mjs`, `dist/kart/main.js`, `sim/Cargo.toml`.

**The Rust/WASM module exists; browser controllers still run in JavaScript.** The module contains car, pedestrian and plane logic; MapRoom uses it for ground-height checks. Typed views share WASM memory without JavaScript repacking, but GPU uploads, readbacks, network encoding and snapshots still move or copy data. Do not infer an end-to-end zero-copy engine. Evidence: `sim/src/lib.rs`, `dist/runtime/sim/wasm.js`, `edge/map-room.mjs`.

**Fixed simulation steps are not rendered FPS.** Editor walking uses a 1/60 s step; kart and globe controllers use 1/120 s steps. Scheduling gaps and catch-up are bounded; display cadence depends on device, browser, load and scene. Exact local controller snapshot replay has regression tests. JS/WASM comparisons use tolerances, including car X/Z within 0.25 m and plane X/Z within 0.6 m in the specified scenarios. They do not prove bit-identical results across languages, browsers or GPUs. Evidence: `dist/runtime/session.js`, `frame-loop.js`, `dist/kart/main.js`, `dist/globe/main.js`, `tests/sim-snapshot.test.mjs`, `tests/sim-wasm.test.mjs`.

## Multiplayer limits

| Item | Current rule | Evidence |
| --- | --- | --- |
| Room capacity | Configured maximum of 64 players per map | `edge/room.mjs`: `MAX_PLAYERS`; not a real concurrent-user load result |
| Message cadence | Room tick 50 ms; client pose interval 50 ms | `edge/room.mjs`: `TICK_MS`; `dist/runtime/net/client.js`; protocol contract |
| Position precision | 1/16 m quantization; symmetric advertised wire range ±2,047.9375 m | `dist/runtime/net/protocol.js`: `POS_SCALE`, `POS_LIMIT` |
| Room bounds | X/Z ±2,000 m; Y −500–2,000 m | `edge/room.mjs`: `BOUND`, `Y_MIN`, `Y_MAX` |
| Interest cells | 64 m cells with mode-dependent neighborhood and distance-dependent refresh | `edge/room.mjs`: `CELL`, `interestRing`, `tick` |

The editor's maximum map is larger than the room's coordinate range. `mapFitsNetwork` exposes that mismatch; it does not connect Map Studio multiplayer. The current networking path distributes client-simulated poses with bounds, speed and available-ground plausibility checks. It is not authoritative per-player server physics or proven anti-cheat. The correction callback re-announces a teleport; full authoritative rollback/replay is not connected. See the [wire protocol](../contracts/net-protocol-v1.md), `edge/room.mjs`, `edge/map-room.mjs` and `dist/kart/main.js`.

The recorded approximately 25 kbit/s per client versus approximately 163 kbit/s for full snapshots comes from a controlled 64-kart protocol scenario (`tests/room.test.mjs`). It does not include a demonstrated internet deployment with that many users, all transport/service overhead, adverse networks, operational cost or durability. Production latency, loss/jitter handling, fairness, room availability and sustained capacity still require real load evidence.

## Assets, services and portability

The reusable source and a self-contained procedural example are different deliverables from the project's complete original content library. A public snapshot may omit uncleared photos, artwork, scan fixtures, models and geographic datasets. Retain third-party notices for everything distributed; the MIT core grant does not establish rights to every input dataset or external asset. See [license scope](../LICENSE_SCOPE.md) and [third-party notices](../THIRD_PARTY_NOTICES.md).

Prepared scan loading does not include the full scan reconstruction toolchain. Image enhancement depends on an external renderboost service. County-scale globe tiles are hosted outside Git; historical regeneration scripts assume machine-specific inputs and paths such as `/root/geo-kronach`. This is not a clean-clone dataset rebuild. Cesium imagery/terrain and optional provider tiles have their own service and configuration dependencies. Evidence: `dist/runtime/scan/loader.js`, `scripts/geo/kronach_lk_run.sh`, `edge/app.mjs` and the globe application.

The local server supplies development API stand-ins and loopback rooms. Passing their tests does not validate hosted authentication, storage, resource bindings or the live revision. An optional-feature failure must not be interpreted as a missing local editor dependency. `net=0` disables realtime only; telemetry and external globe requests have separate behavior. Hosting under a URL subpath also needs review because application asset URLs assume the origin root.

## What still needs evidence from real use

The [findings ledger](FINDINGS.md) distinguishes historical measurements from current verification. For example, a recorded 5,000-point height-edit benchmark supports an edit-cost improvement for that workload; it does not establish FPS at all format ceilings or end-user productivity gains.

Before adopting the system for a real job, record the source revision, data provenance, device/browser, workload size, task, success criteria and observed outcome. The important open questions are:

- Can a person unfamiliar with the code install it, import their data, correct it and export a reusable result without maintainer help?
- Does switching between map and walk views help people find a real spatial or data problem more quickly or accurately than their existing workflow?
- Can representative maps remain responsive through edits, undo/redo, walking, export/re-import and longer sessions on the devices people actually use?
- Do save-conflict handling, storage failures and recovery protect real work in multi-tab and interrupted sessions?
- Does optional GPU culling improve the complete frame workload, including transfers, on real adapters while preserving acceptable output?
- Can a deliberately configured hosted deployment handle the intended users, networks, authentication and operating costs reliably?

There are no established release-wide guarantees for minimum FPS, supported mobile memory, geometric accuracy, accessibility conformance, time saved, conversion improvement or user capacity. Browser tests, real Safari/Firefox/mobile/touch coverage, accessibility review, field-use validation and live deployment checks remain separate work. A passing Node CI run should be reported as exactly that.

`npm run test:browser` requires both the public smoke and audit regressions to pass; `npm run test:browser:public` runs only the smoke. The scripts require separate Playwright/Chromium tooling and fail if it is absent. `npm run test:browser:extended` runs the older integration suites, which may need excluded datasets or hardware-specific budgets. Linux runs use software rendering; a successful functional check is not physical-device GPU/FPS evidence. Consult the exact revision's CI logs and [release record](RELEASE_STATUS.md) before reporting a browser or Rust build as passed.
