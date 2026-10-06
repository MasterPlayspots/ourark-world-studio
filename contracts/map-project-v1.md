# Map project envelope v1

A map project file and a local Map Studio entry are one JSON envelope around the unchanged map payload (`motionspec.map.v3`). Source of truth: `dist/map-studio/project.js` (envelope, budget) and `dist/map-studio/storage.js` (local keys), tested in `tests/map-project.test.mjs`. This closes findings P01 and P03 of the visuals deep dive from 2026-10-02 and makes P02 visible.

```json
{
  "schema": "ourark.map-project.v1",
  "worldId": "3f1c…",
  "workspaceId": "ws-kronach",
  "revision": 4,
  "geoReference": {"crs": "EPSG:25832", "origin": [650000, 5570000]},
  "payload": { "schema": "motionspec.map.v3", "name": "…", "map": {}, "points": [] }
}
```

| Field | Rule |
|---|---|
| `worldId` | required in envelopes (refused without it); 1–100 characters `[A-Za-z0-9._:-]`, starting alphanumeric. A bare map file without one opens into the current world |
| `workspaceId` | optional; same character rule |
| `revision` | integer ≥ 0; the local save count the payload is based on (not a server revision) |
| `geoReference` | optional JSON object, at most 4,000 characters; carried opaquely (no CRS validation yet) |
| `payload` | validated by `validateDocument` exactly as before; v1/v2/v3 payloads open and become v3 |

Envelope versions above v1 are refused with a message; the open project stays unchanged. Bare map files (without envelope) still open. Metadata fields written next to their map fields are taken into the envelope when valid instead of being dropped; invalid ones are skipped, so such files keep opening.

## Byte budget (W1)

Export, import and edits measure the same thing: UTF-8 bytes of exactly the JSON the export writes. The limit is `MAX_PROJECT_BYTES` = 16 MiB (the import limit before this change).

- Import refuses files above the budget with the measured size.
- An edit, including a drag, that would grow a project above the budget is not applied (message, nothing lost). A file within the budget that grows past it by being normalized or wrapped opens with a warning. A project that is already above the budget (older local data) can still be opened, saved, shrunk, and exported. Such an export is a lossless backup named `*.sicherung.map.json`, and the notice states that it cannot be re-imported here.
- Every export within the budget is accepted by the import.
- Nothing is shrunk or deleted automatically. Larger projects need referenced assets or a versioned package format, not a higher limit.

## Local storage (W2)

IndexedDB `motionspec-map-studio-v1`, store `projects`:

| Key | Value |
|---|---|
| `project:<worldId>` | the envelope |
| `last` | the worldId opened or saved most recently |
| `current` | pre-envelope entry: read for migration only, never changed or deleted |

Saving is compare-and-set in one readwrite transaction: it writes revision `n+1` only if the stored revision is still `n` (or nothing is stored), otherwise `SaveConflict` and nothing is written. Two tabs therefore cannot overwrite each other silently.

How opening works depends on the world:
- A file of the same world replaces the document as one undoable step and keeps the local revision, even if the file carries an older one, so the next save goes through.
- Another world opens only when nothing is unsaved. It starts a fresh undo history and saves under its own key.
- Every stored project stays reachable: Import → „In diesem Browser gespeichert“ (`listLocal`, `loadProject`).

Migration copies `current` to `project:lokal-altbestand` with `add`, reads the copy back, and only then sets `last`. If `current` already names a valid world, that id is used instead of `lokal-altbestand`. If the copy exists already, for example from a run whose `last` write failed, it is never overwritten; only `last` is set. Retries therefore create no duplicates and cannot lose later saves.

## Network range (W3, P02)

Map Studio allows maps up to 5,000 m (±2,500 m). The network record carries ±2,047.9375 m (`POS_LIMIT`), and the map room accepts ±2,000 m (`ROOM_BOUND`, used by `edge/room.mjs`). `mapFitsNetwork(map)` states whether a map fits, and Map Studio shows it next to the map size. The wire format v1 is unchanged and still clamps. The client counts such poses (`stats().clampedPoses`) instead of losing them silently. A map multiplayer path is not connected yet. When it is, it has to check `mapFitsNetwork` or move to a versioned protocol.

## Not part of v1

There is no server sync. D1 metadata plus R2 payloads with a `baseRevision` pointer commit is separate follow-up work, including a cleanup policy for orphaned uploads. There is also no CRS validation of `geoReference` and no workspace navigation or embedding contract.
