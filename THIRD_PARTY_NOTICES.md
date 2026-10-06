# Third-party notices and data boundary

## Libraries distributed here

| Component | Version | License and retained notice |
| --- | --- | --- |
| Three.js and matching controls/loaders/utilities | 0.180.0 | MIT, `dist/worlds/vendor/LICENSE.txt`; keep source notices |
| CesiumJS browser distribution, including nested assets and workers | 1.138.0 | Apache-2.0 and bundled third-party terms, `dist/globe/vendor/cesium/LICENSE.md` and accompanying notices |

Upstream projects: https://github.com/mrdoob/three.js and https://github.com/CesiumGS/cesium. Three.js addon imports were adjusted to the local vendor modules. Cesium remains included for developers working on the optional globe integration.

The authored core is [MIT licensed](LICENSE), Copyright (c) 2026 Kevin Fröba. Simple replacement backgrounds/illustrations and the map starter are original release material under the same grant. See [LICENSE_SCOPE.md](LICENSE_SCOPE.md).

## Material excluded from this release

Original MotionSpec artwork/landscapes, kart aerial imagery and terrain/building/tree datasets, globe models, prepared scans, reference renders and hosted county geodata are not distributed here. Historical asset descriptions are not proof of redistribution rights. The export manifest records the source revision and excluded paths; it does not relicense them.

## Optional services and imported data

The original globe integration can request Esri imagery, Re:Earth/Mapterhorn terrain, OpenStreetMap Nominatim search and optional Google Photorealistic 3D Tiles. These are separate services with their own terms, limits and attribution requirements. No credentials, usage entitlement or production deployment is supplied. Review the current provider terms before enabling them. Map/OSM importers preserve available attribution; users remain responsible for their input data's provenance and redistribution conditions.

No provider service is necessary for the map starter. See [INTEGRATIONS](docs/INTEGRATIONS.md) before enabling a data-backed route.
