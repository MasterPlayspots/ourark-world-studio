# Map Studio: 2D/3D editing and walking

Current code baseline: e27fd30, reviewed 2026-10-06. Open /map-studio/ locally after npm run dev.

Both views use the same validated motionspec.map.v3 payload: an orthographic top view and a Three.js perspective view. File export and IndexedDB storage wrap it in ourark.map-project.v1. v1/v2 map payloads remain readable and migrate to v3.

## Try it

Import [the small example](../examples/map-starter.map.json). Select a building, edit its height or data, move it in 2D or with the 3D handles, switch views, and undo/redo. Save locally, export, then re-import to check portability.

PNG/JPEG/WebP images can supply ground textures. Buildings may use simple shapes or validated polygon footprints. Ground surfaces include land, parks, beaches, water, parking, roads and paths. Imported images are visual textures; they do not automatically reconstruct buildings.

“Welt betreten” starts walking on a frozen snapshot. WASD/arrows move, Q/E turn, pointer drag looks around, R resets, Enter examines an interactive object and Escape pauses. Leaving walk mode restores editing state. Collision, water boundaries and spawn checks are implemented; unrestricted terrain physics and a configurable avatar builder are not.

## Limits and storage

| Item | Current limit / behavior |
| --- | --- |
| Points | 5,000 |
| Map sides | 10–5,000 m |
| Point X/Z | ±2,500 m; editor movement also clamps to the map |
| Point dimensions | Up to 300 m; polygon validation also applies |
| Footprints | 3–64 vertices each; 100,000 total |
| Surfaces | 20,000; 400,000 total points; per-surface ceilings apply |
| Image upload | 4 MiB; 8192 px per side; PNG/JPEG/WebP |
| Image in document | Nominal 8 MiB allowance, checked as data-URL string length ≤ MAX_IMAGE_BYTES × 1.4; not exact decoded bytes |
| Project | 16 MiB exact UTF-8 export budget |
| Undo | 35 steps, shared point serialization and deduplicated images |
| Persistence | Device-local IndexedDB, one key per world, transactional revision check |

Limits are acceptance ceilings, not a frame-rate guarantee. Oversized legacy local projects can be backed up/shrunk; oversized backup exports cannot be re-imported. The [envelope contract](../contracts/map-project-v1.md) defines the exceptions and migration behavior.

Map project metadata can retain a world ID, workspace ID and opaque georeference object. This does not implement cloud sync, a CRS engine or shared workspace navigation.

Map coordinates are metres: +X east, +Y up, +Z south; map headings use degrees clockwise from north. The realtime protocol has a smaller coordinate range. Map Studio displays whether a map fits, but map multiplayer is not yet connected.

## Implementation

See the [current architecture](architecture/README.md) for edit transactions, drag ownership, immutable points, rendering, project storage and walking. Use [CONTRIBUTING](../CONTRIBUTING.md) for extension recipes.

Map exports are separate from World Studio scene JSON, scan bundles and the draft complete-world package format. They include their own embedded image and procedural map data, not a general archive of all world assets.
