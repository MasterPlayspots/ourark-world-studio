# Sim state layout v1

One entity = **64 bytes**, little endian, laid out like this WGSL struct (`vec3<f32>`: align 16, size 12). Source of truth: `dist/runtime/sim/layout.js` (`OFFSET`, `WGSL_ENTITY`), tested in `tests/sim-layout.test.mjs`.

| Offset | Type | Field | Meaning |
|---:|---|---|---|
| 0 | u32 | `id` | entity id (server-assigned player id) |
| 4 | u32 | `flags` | bits 0–3 mode (0 none, 1 kart, 2 plane, 3 walk, 4 car) · bits 4–7 LOD · bit 8 active |
| 8 | u32 | `tick` | server tick of the data |
| 12 | u32 | — | padding |
| 16 | f32 × 3 | `pos` | metres in the map frame (x east, y up, z south, origin = map centre) |
| 28 | f32 | — | padding |
| 32 | f32 × 3 | `vel` | m/s |
| 44 | f32 | — | padding |
| 48 | f32 | `heading` | rad, clockwise from north (−z) |
| 52 | f32 | `pitch` | rad, nose up |
| 56 | f32 | `roll` | rad, right wing down |
| 60 | u32 | `mutation` | per-entity state for vertex-shader variants (damage, doors, skin) |

```wgsl
struct Entity { id: u32, flags: u32, tick: u32, _pad0: u32, pos: vec3<f32>, _pad1: f32,
                vel: vec3<f32>, _pad2: f32, heading: f32, pitch: f32, roll: f32, mutation: u32 };
```

`EntityStore(capacity)` keeps the records in one `ArrayBuffer` (capacity × 64 B) with `Uint32Array`/`Float32Array` views; ids map to slots, freed slots are reused, a full store refuses (no growth, no allocation per update). Positions are map-relative so f32 stays at centimetre precision within ±10 km.
