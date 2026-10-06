# Optional integrations and excluded data

The public release includes reusable application/runtime/server source. The self-contained local starting points are Map Studio, the layer editor and procedural World Studio. Original production data and infrastructure are separate.

## Availability

| Feature | Included source | What you must supply or implement |
| --- | --- | --- |
| Map editing, walking, local save, project JSON | `dist/map-studio/`, `dist/runtime/`, starter example | Node and a WebGL-capable browser; no service |
| Procedural World Studio | `dist/world-studio/`, `dist/worlds/` | Simple replacement backgrounds are included; original imagery is excluded |
| Image enhancement | `edge/app.mjs`, local proxy in `scripts/serve.mjs` | A compatible separately deployed renderboost origin, URL and token; unconfigured requests return 503 |
| Prepared scan loading | `dist/runtime/scan/`, same-origin routes | Your own valid content-addressed scan bundle with licensed assets; the reconstruction pipeline is not included |
| Kart/plane/pedestrian application | `dist/kart/`, optional realtime code | Compatible track manifest, height grid, textures and any building/tree buffers; original datasets are excluded |
| Globe application | `dist/globe/`, Cesium vendor, `edge/globe.mjs` | Your own models/geodata, reviewed provider configuration and terms; original local tiles are excluded |
| Hosted realtime | `edge/room.mjs`, `edge/map-room.mjs`, `edge/realtime.mjs` | A deliberately configured Worker/Durable Object deployment, authentication and terrain resources; no production load evidence |
| Hosted scene/cache/geodata APIs | `edge/` | Your own R2 resources, routes, access controls and relevant data; no private bindings are copied |

The `/kart/` and `/globe/` index pages explain the missing integration requirements. Their original application HTML is retained as `integration.html` in each directory. Those files are source for integrators, not a turnkey public demo. Do not point users at them until their data/service dependencies have been supplied and tested. Globe startup can request online providers and absent local resources; `tiles=off` alone does not disable every network request.

## Reuse the source without inheriting production assumptions

1. Start from the default map example and a known public commit.
2. Choose one optional integration. Read its loader, format validation and failure handling before adding data.
3. Record each input's source, license, attribution, transformation and content hash. Keep required notices with distributed files.
4. Replace hardcoded dataset/provider assumptions with your own explicit configuration. The original county-build scripts contain machine-specific paths and external inputs; they are reference source, not a reproducible public dataset pipeline.
5. Test an unavailable service, invalid manifest, oversized file and missing asset as well as the successful path.
6. Publish reproducible evidence with the [result template](validation/RESULT_TEMPLATE.md). Distinguish a local test from hosted authentication/storage/load behavior.

The public checkout intentionally has no automatic deployment workflow or owner-specific `wrangler.jsonc`. The Node server is a loopback development server with local stand-ins, not a production login boundary. Serve at the origin root: application asset paths are absolute. Do not expose the development server to a public network as your hosted product.

## Boundaries to preserve

`net=0` affects realtime only. Kart telemetry is separate. Map Studio does not have live multiplayer despite its coordinate-range indicator. Worker pose plausibility checks are not authoritative vehicle physics. Browser-local map revisions are not a server collaboration protocol. API keys made available to browser integrations are visible to the browser and need provider-side restrictions.

These are known implementation boundaries, not missing secrets that should be copied from another project. See [LIMITS](LIMITS.md).

## Historical compatibility names

Some machine-readable identifiers retain `motionspec` for compatibility with existing projects and browser storage. The layer scene JSON also retains `makepadConnected: false`, including the read_dashboard_scene tool response. This is an explicit absence flag, not a dependency or integration. Public titles and download names identify Ourark World Studio. No Makepad runtime is connected.
