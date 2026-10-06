# Realtime protocol v1 (`/api/realtime?map=<name>`)

Binary WebSocket messages, little endian. Source of truth: `dist/runtime/net/protocol.js` (browser and Worker), tested in `tests/net-protocol.test.mjs`. Text frames are not protocol messages. The hosted MapRoom counts them as strikes and can close repeated offenders.

## Header (12 B)

| Offset | Type | Field |
|---:|---|---|
| 0 | u16 | magic `0x414f` ("OA") |
| 2 | u8 | version = 1 |
| 3 | u8 | type: 1 POSE (client→server), 2 SNAPSHOT (server→client), 3 PING (c→s), 4 PONG (s→c), 5 WELCOME (s→c), 6 DELTA (s→c), 7 CORRECT (s→c) |
| 4 | u32 | tick (SNAPSHOT/DELTA/WELCOME/CORRECT: server tick; POSE: **last applied snapshot/delta tick = acknowledgement**; PING/PONG: client clock ms, echoed) |
| 8 | u16 | record count (≤ 64) |
| 10 | u16 | flags (PONG: server tick low 16 bit) |

## Record (16 B)

| Offset | Type | Field | Unit / range |
|---:|---|---|---|
| 0 | u32 | id | player id (POSE: ignored, the server knows the sender) |
| 4 | i16 | x | 1/16 m relative to the map centre, ±2047.9 m (saturating) |
| 6 | i16 | y | 1/16 m |
| 8 | i16 | z | 1/16 m (south positive) |
| 10 | u16 | heading | 2π/65536 rad, clockwise from north |
| 12 | i16 | speed | cm/s, ±327 m/s |
| 14 | u8 | mode | 0 none, 1 kart, 2 plane, 3 walk, 4 car |
| 15 | u8 | flags | bit 0 TELEPORT (POSE only: deliberate jump, ≤ 1 per 2 s; never forwarded) · bit 1 BRAKING · bit 2 CRASHED (forwarded; drive the vertex-shader mutation on other clients) |

For fixed-record messages, magic, version and type must be known and length must be exactly `12 + 16 × count`; otherwise `decode` returns `null`. DELTA uses its separate variable-length decoder and rules below.

## Flow

1. Upgrade (behind the tester login, `Origin` must equal the host) → server sends **WELCOME** with one record carrying your id.
2. Client sends **POSE** (1 record) every 50 ms and **PING** every 2 s; server answers PING with **PONG** at once.
3. Server sends every 50 ms a **SNAPSHOT** with the players you can see (64 m spatial hash; walk 3 × 3 cells, kart/car 5 × 5, plane 9 × 9; nearest 64). Players silent for 3 s drop out.
4. Server limits: 64 players per map, 30 messages/s per connection, bounds ±2000 m / y −500…2000 m, speed per mode (kart 40, car 60, plane 80, walk 8 m/s) × 1.5 + 5 m per message gap, resync after 10 refusals, close 1008 after more than 20 malformed/type-invalid messages (additional flood and idle checks apply).

## DELTA (type 6, server → client)

Header (count = entries) · **base tick u32** (the tick the client acknowledged) · entries. Entry: id varint · mask u8 · fields:
mask bit 0 x · 1 y · 2 z · 3 heading · 4 speed (each a zigzag varint of the quantised difference to the base; heading the short way round ±32768) · bit 5 mode u8 + flags u8 · bit 6 NEW (all five fields absolute + mode + flags) · bit 7 GONE (left your view). Unchanged entities are not listed. Decoding is strict (exact length, ≤ 128 entries, varints ≤ 5 bytes). The server keeps each viewer's sent states for 32 ticks; without a valid acknowledgement it sends a full SNAPSHOT. Client: `applyDelta(base, entries)` (`dist/runtime/net/protocol.js`).

**Network culling:** a visible player is refreshed every tick in the 3 × 3 cells around you, every 2nd tick two cells away, every 4th tick farther; skipped players keep their acknowledged values (zero bytes in the delta).

## CORRECT (type 7, server → client)

One record: your last accepted pose, sent when the server refused a pose (speed, ground, bounds), at most every 500 ms. The client re-announces its current place with the TELEPORT flag (reconciliation instead of a 0.5 s freeze).

Sizes: POSE 28 B, SNAPSHOT 12 + 16 n B (n = 63: 1020 B). Measured (tests/room.test.mjs): 64 karts in 5 × 5 cells ≈ 25 kbit/s per client with deltas + culling (full snapshots: ≈ 163 kbit/s).
