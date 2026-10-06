# Findings and their evidence

Implementation reviewed on 6 October 2026. The original code baseline is `e27fd30af1192f8c311bba0ed08181ad43c1347b`; the public export's exact parent source is in `PUBLIC_SOURCE.json`. The words **implemented**, **tested**, **measured** and **validated by users** describe different evidence.

## Findings you can inspect and test

| Finding | Source/test evidence | Consequence |
| --- | --- | --- |
| 2D and 3D maps share one model | `dist/map-studio/model.js`, `renderer.js`, `tests/map-studio.test.mjs` | No second document to synchronize when switching views; images do not reconstruct geometry |
| Walking uses a frozen document snapshot | `dist/runtime/session.js`, `tests/runtime.test.mjs` | Movement does not become editor undo history; specialized collision, not general physics |
| Local saves detect stale-tab revisions | `dist/map-studio/storage.js`, `tests/map-project.test.mjs` | Protects against silent local overwrite, not cross-device collaboration |
| Edit cost avoids processing all unchanged points | `dist/runtime/frozen.js`, `tests/map-edit-cost.test.mjs` | Structural sharing and cached serialization; still bounded by memory and real workload |
| Spatial broadphase preserves tested collision results | `dist/runtime/physics/adapter.js`, `tests/broadphase.test.mjs` | Useful optimization whose cost depends on geometry distribution |
| JS controllers and WASM module are separate | `dist/kart/`, `sim/src/lib.rs`, `tests/sim-wasm.test.mjs` | Main browser vehicle simulation remains JS; cross-language comparisons use tolerances |
| GPU culling is optional | `dist/runtime/gpu/cull.js`, `tests/gpu-cull.test.mjs` | CPU/fallback checks do not prove a real GPU speedup; renderer remains WebGL |
| Networking sends quantized client poses | `dist/runtime/net/`, `edge/room.mjs`, protocol tests | Interest/delta savings are possible; no server-authoritative full simulation |
| Local snapshots replay controller state | `dist/runtime/sim/snapshot.js`, `tests/sim-snapshot.test.mjs` | Exact replay for covered local scenarios, not integrated network rollback |
| Height packing preserves grid values | `dist/runtime/assets/codec.js`, public codec tests | Lossless for input grid values; does not make imagery previews/LOD lossless |

## Historical measurements, not new release guarantees

The following numbers were recorded during development on particular workloads. They are included to explain why the code changed. They were not reproduced as real customer pilots for this release, and original datasets/logs are not all part of the public distribution.

| Workload | Recorded result | Interpretation |
| --- | --- | --- |
| Edge 154 / Apple M4, 5,000 map points, 50 height edits | Handler 24.5 → 4.9 ms; heap 238 → 117 MB | About 80% lower handler time for that run; not five times the rendered FPS |
| Apple M4, deterministic kart ticks on original terrain fixtures | Rosenberg allocation 61.6 → 16.9 KB/tick; Kronach 64.7 → 20.3 KB/tick | Less transient allocation for those workloads; private terrain fixtures excluded |
| Original imagery preview-first loading | First-frame bytes 5.5 → 2.6 MB and 10.4 → 3.6 MB on two maps | Lower initial transfer; preview is lower resolution and full image still loads |
| Original Kronach globe surface workload | Reported p95 24.9 → 8.4–8.8 ms with local sampling | Narrow data-path result, not all Cesium/Google surfaces or devices |
| Controlled 64-kart protocol workload | Approximately 25 versus 163 kbit/s/client for full snapshots | Encoding/interest result, not an internet deployment with 64 real users |

Source-level regression tests protect relevant semantics, not every historical timing. Use fixed workloads, paired runs on the same device, distributions rather than just averages, and include conversion/transfer costs when benchmarking.

## Claims that remain unproven

No customer productivity gain, geometric/survey accuracy, real-device FPS floor, accessibility conformance, production player capacity, general cross-platform determinism or end-to-end zero-copy pipeline has been established. Adaptive resolution, LOD, quantized network poses and image previews deliberately trade fidelity for cost in particular paths.

The [limits inventory](LIMITS.md) gives exact enforced ceilings. The [value and validation guide](VALUE_AND_VALIDATION.md) turns plausible user benefits into measurable experiments. The [release record](RELEASE_STATUS.md) explains what to verify on this exact tree.
