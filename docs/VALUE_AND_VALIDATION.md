# Added value and real-use validation

This document separates what the code provides from the benefits that still need to be demonstrated with users. The reviewed implementation is described in [FINDINGS](FINDINGS.md), [Map Studio](MAP_STUDIO.md) and the [architecture](architecture/README.md). The protocols and thresholds below are **proposed experiments, not completed results or published performance guarantees**.

The [detailed technology and use-case review (German)](TECHNOLOGY_AND_USE_CASES.de.md) maps the released modules to twelve application opportunities, distinguishes missing integration from missing validation, and adds device, simulation, GPU and hosted-network pilot plans. Its source links are pinned to the audited public implementation; all proposed benefit thresholds remain unmeasured.

## What someone can build on today

| Existing capability | Concrete technical value | User benefit still to test |
| --- | --- | --- |
| One map document drives 2D editing, 3D geometry and walking | A contributor can change one supported object and inspect it through multiple views without maintaining three separate models | Do site reviewers understand a layout better or reach an accurate answer faster than with their existing 2D process? |
| CSV/OSM converters produce editable maps and conversion reports | Existing supported records can become a starting scene, with explicit normalization and omissions | Does this reduce preparation and correction time for the user's actual data? |
| Versioned project JSON, `point.data`, import/export and local revisions | A small map can carry domain metadata, be backed up as a file and reopened; conflicting local saves are detected | Can unfamiliar users exchange projects and recover from conflicts without assistance or data loss? |
| Authored browser modules, example, tests and MIT core | Developers can inspect and adapt the existing editor/runtime code, subject to the [license scope](../LICENSE_SCOPE.md) | Can an outside developer ship a useful extension faster than with their usual starting point? |
| Optional vehicle, WASM, network and GPU modules | Concrete implementations are available for separate engineering experiments | Do they help a particular application on its real hardware and network? The editor pilots below do not answer this. |

No customer study, conversion improvement, cost saving, universal FPS target or production concurrency capacity is established by this release. Technical regression tests and historical measurements answer narrower questions. Reduced redraw or handler work does not by itself prove better decisions or lower project cost.

## Boundaries that affect these experiments

- A background image is a texture; it does not reconstruct the buildings in the image. Procedural geometry is not a measured digital twin.
- CSV `lat`/`lng` fields are interpreted as planar source coordinates, north/east respectively. `--scale` means metres per source unit; this path does not convert geographic degrees into metres. The converter can reduce the requested scale to fit its extent limit. Use its reported effective scale and inspect field filtering, shortened data, renamed duplicate IDs and dropped rows.
- The OSM converter uses a local geographic projection. Height can come from tags, levels or estimates; outlines can be simplified and elements skipped. The result is not a survey, a general CRS conversion service or proof of real-world clearance. Preserve data attribution and distinguish estimates from observations.
- The editor accepts at most 5,000 points, map sides up to 5,000 m and a 16 MiB project export budget, with further geometry/image limits in [Map Studio](MAP_STUDIO.md). These are different limits; reaching one does not imply the others remain usable.
- Project formats across the layer editor, Map Studio and World Studio are different. Complete asset-inclusive world-package export is not implemented.
- Storage is browser-local. Export is the portable backup; another browser, device or origin does not automatically receive the project. Multi-tab conflict detection is not collaboration, automatic merging or cloud synchronization.
- Walking and collision describe this runtime's geometry and controller. They do not validate wheelchair access, pedestrian safety, evacuation, structural safety, legal compliance or construction accuracy. No such planning claim should be inferred from these pilots.
- Keyboard, touch, assistive technology and motion comfort need real-user testing. Pointer-driven 3D navigation and the walking controller are not substitutes for an accessible alternative. German UI text and technical setup can also affect first-use results.

## Use one reproducible method

Start with three small formative pilots below. Recruit people who actually do the task and have not worked on this code. A suggested first cohort is five reviewers for P1, three data preparers for P2 and three external developers for P3. These small samples identify failures; they do not establish market-wide adoption or statistical superiority.

1. Pin a commit and record the exact input files and SHA-256 hashes. Use synthetic or explicitly redistributable inputs. Give each run a fresh `worldId` and record the browser origin. Never publish private site plans, personal data or credentials as evidence.
2. Write the task, expected answers, time limit and success criteria before testing. Label measured facts, estimates and missing data in the task. Use an answer key prepared independently of the interface.
3. Compare with the participant's actual existing workflow. Record its name, version, setup and familiarity. For P1 also compare the same scene in 2D-only and 2D-plus-3D views to isolate the value of 3D.
4. Use two equivalent task variants with different layouts/data. Counterbalance tool order and task assignment across participants. Do not repeat the same questions after revealing the answers. Give equal briefing and record all hints.
5. Measure setup separately from task execution. Start first-use timing at the documented clone instructions with prerequisites recorded; finish when the participant imports, edits, enters/exits walking, exports and reopens the starter successfully. A screenshot of a loaded page alone is not success.
6. Record successes, failures, assistance and timeouts. A timeout is a failed completion at the time limit, not a fast run and not an omitted sample. Keep raw per-participant results alongside medians; do not average failed cases away.
7. Repeat the same functional case on the declared device/browser profiles. Keep task studies separate from instrumented performance runs, because profilers and coaching can change behavior.

Use [RESULT_TEMPLATE.md](validation/RESULT_TEMPLATE.md). The proposed decision thresholds below can be changed **before** collecting data, with the reason recorded. A later change creates a new protocol version and must not convert an old failure into a pass.

## P1 — Review a small campus or site layout

**Hypothesis:** switching between a shared 2D document and a walkable 3D scene helps a reviewer understand relative placement and communicate a layout change.

Prepare two synthetic 120 × 80 m layouts with 8–12 buildings, simple paths and explicit building metadata. The [starter](../examples/map-starter.map.json) provides the initial format, not the complete study dataset. Put three model-checkable questions in each task: identify the named building beside a landmark, compare specified building heights, and find a route between named locations in the model. Include one question the model cannot answer, such as the real entrance width, to check whether uncertainty is understood.

Ask each reviewer to answer the questions, change one building height and one metadata field, undo/redo, walk the route, export and reopen the project. Compare existing 2D workflow, Map Studio 2D-only, and Map Studio 2D-plus-3D using equivalent variants or separate sessions. Report navigation learning time and motion discomfort separately.

**Proposed decision rule:** at least 4 of 5 reviewers complete the edit/export/reopen sequence without help within 20 minutes; no supported field is lost; every reviewer identifies the unanswerable question as requiring additional evidence. A time-saving hypothesis passes this pilot only if median matched task time improves by at least 20% versus the chosen baseline without lower answer accuracy. If the baseline already answers the questions equally well, record that result. A preference for 3D alone does not demonstrate time saving or decision quality.

## P2 — Prepare existing data for a review scene

**Hypothesis:** conversion plus correction produces a useful review scene with less total effort than the user's current preparation process.

Begin with the reproducible CSV command in [examples](../examples/README.md). For the pilot, use a 50–100 row synthetic table in declared local units and a separate small, redistributable OSM `out geom` extract. OSM input is Overpass JSON, not arbitrary `.osm` XML. Record source date, extent and attribution; fetch time is separate from conversion time.

Give each preparer a target list of records/buildings and expected metadata. Ask them to convert, inspect the report, correct the scene, inspect it in 2D/3D, and export it. The acceptance manifest must distinguish preserved fields, intentional transformations and unsupported fields. CSV is intentionally not a lossless copy of every source column. Compare total preparation plus correction time with the existing workflow, including scripts, imports and manual reconstruction used by that baseline.

Include invalid coordinates, duplicate IDs, link/media columns, missing OSM heights and one oversized extent. Check whether the preparer notices the applied scale, estimated heights, omissions and shortened data. Compare source and output record accounting; inspect retained points by stable IDs. Measure geometric discrepancies against the declared conversion rules, not against an assumed surveyed truth. Repeat the same command twice to check deterministic converter output.

**Proposed decision rule:** all three preparers account for every required record as retained, intentionally transformed or explicitly rejected; no required field is silently lost; the normalized project survives export/import. The time-saving hypothesis passes only if median paired preparation-plus-correction time is at least 20% lower without more missing required records or incorrect values. An import that runs quickly but needs more manual repair fails the benefit test.

## P3 — Extend the released core

**Hypothesis:** the documented source and existing model/runtime boundaries lower the effort of a small domain adaptation.

Give three external JavaScript developers only the public repository instructions. Ask them first to complete the starter loop, then make a small maintenance-review example: add `assetId`, `inspectionStatus` and `inspectionDue` values in `point.data`, expose the status in an existing selection/control area, and demonstrate save/reload, undo/redo and export/import. Use synthetic dates and IDs. This is an internal-module extension; do not describe it as installing a stable plugin SDK.

For a fair comparison, ask for the same acceptance checklist using each developer's ordinary starting template or tool. Count environment setup, implementation, debugging and documentation separately. Record previous Three.js/editor experience and any copied external code. Do not require an elaborate framework change to demonstrate a small property.

**Proposed decision rule:** all three complete the starter loop unaided within 20 minutes; at least two complete the extension within two hours, preserve the listed behaviors and pass the relevant checks. Compare total paired time and rework before claiming development savings. Record points where maintainers had to explain undocumented internals; those are documentation or API-design findings even if the final patch works.

## Common functional and device checks

Run these against the same commit and input used by the relevant pilot. They are proposed acceptance checks, not a statement that every browser has passed them.

| Check | Procedure and proposed pass condition |
| --- | --- |
| First successful use | Fresh browser profile; follow README without maintainer commands. Record prerequisite, clone and interaction time separately. Export and reopen the edited starter; no missing dependencies or unexplained console errors. |
| Project fidelity | Compare validated payload before/after export/import: IDs, geometry, data, surfaces, runtime spawn and embedded image. Compare world/workspace identity and georeference metadata; allow documented local revision changes after saves. Unknown unsupported fields are not an implicit preservation promise. No unintended supported-field differences. |
| Local restore | Save, close the tab/browser and reopen the same origin/profile. Compare the normalized payload and identity. Verify a second world remains separately selectable. Export a backup before any destructive storage test. |
| Multi-tab conflict | Load the same saved revision in A and B. Save a distinguishable edit in A; attempt a different edit in B. B must report a conflict, A's saved version must remain intact, and B's unsaved work must remain recoverable by export. Record the actual recovery steps; automatic merge is not expected. |
| Rejected input | Try malformed JSON, a future envelope version and an input above the project budget in a disposable profile. The active project must remain available, with a visible explanation. Separately test supported inputs that normalize/clip with warnings; do not expect every imperfect source record to reject an entire conversion. |
| Unavailable storage | In a disposable profile, exercise denied/quota-limited storage where the browser supports it. A failed save must not be reported as successful; retain a file-export recovery path. Record cases the browser cannot simulate as not run. |
| Accessibility and mobility | Try keyboard-only selection/edit/export, focus recovery after walking, zoomed text, the user's assistive technology, touch where relevant, and a task completed entirely in 2D. Record blocked steps and discomfort; do not claim accessibility conformance or mobile support from desktop emulation. |

For performance, declare profiles before testing: a target laptop without a discrete GPU, the development machine, and physical iPhone/Safari and Android/Chrome devices if mobile use is in scope. Record actual OS/browser/GPU, viewport, DPR, power mode, thermal state and whether the GPU is hardware accelerated. Unsupported hardware is a reported limit, not a missing row.

Use the small pilot scene first, then separately labeled 100-, 1,000- and 5,000-point stress scenes within all byte/geometry limits. Preserve point distribution, data size, surfaces and image dimensions; point count alone does not specify workload. Do not promise the ceiling is interactive.

- Record cold first usable scene time separately from warm runs. After a 30-second warm-up, run the same 60-second camera/walk/edit sequence three times in a foreground tab. Save raw frame intervals and report p50/p95/p99, long stalls, rendering errors, context loss and crashes. Frame cadence and simulation tick rate are different measures.
- As an initial **proposed** laptop pilot target, use p95 frame interval ≤33.3 ms during the small-scene interaction, with no unexpected stall over 250 ms, context loss or crash. State any different accessibility/device requirement before testing. Passing this target does not establish 60 FPS or capacity at 5,000 points.
- Record edit-to-visible response separately from the frame cadence. If tooling cannot measure a value, mark it unavailable. Do not infer missing values from perceived smoothness.
- Use a separate memory run for 20 enter/exit-walk and import/export cycles. Record browser-process memory and JS heap only where comparable APIs/tools expose them. Note retained trend after idle, context loss and tab reloads. Set any numeric memory budget per device before the run; heap is not total RAM or VRAM. An apparent increase needs a retained-object investigation before calling it a leak.

## Separate experiments and publication rules

Vehicle behavior, multiplayer internet latency, server load, optional WebGPU culling and JS/WASM parity require separate protocols. Record real clients, network conditions, deployment revision, server resource limits and CPU/GPU fallback costs. Do not use a synthetic 64-player encoding test as a 64-user production capacity result. Map Studio multiplayer is not connected; local save conflicts do not test it.

Publish exact observed outcomes, failed cases and rerun conditions using the template. Keep raw evidence reproducible without private inputs. A passing pilot supports a claim for that task, cohort, revision and device set. Broader product claims require further evidence. Until then, describe the benefit as a hypothesis and invite contributors to submit contrary results as well as successful examples.
