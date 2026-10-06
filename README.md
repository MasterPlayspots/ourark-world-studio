# Ourark World Studio

Part of the [MotionSpec ecosystem](https://github.com/MasterPlayspots/motionspec).

An open source starting point for browser-based map editors and explorable worlds. Edit one map in 2D and 3D, attach data to buildings and points, walk through the result, and save or exchange a project as JSON.

**Developer preview · 0.5.0 · MIT core · Copyright (c) 2026 Kevin Fröba.** This is a curated source release of MotionSpec World Studio. It is an application codebase with internal extension points, not a separately packaged SDK. Read the [license scope](LICENSE_SCOPE.md) and retain [third-party notices](THIRD_PARTY_NOTICES.md).

## Start here

Install Git and **Node.js 24 or newer**. Clone this repository or extract its source ZIP, open a terminal in the directory containing `package.json`, then run:

```sh
node --version
npm run dev
```

No npm installation, account, API key, Rust toolchain or cloud service is needed for the default editor. Rendering libraries and the prebuilt simulation WASM are included. Open **http://127.0.0.1:8080/map-studio/**.

1. Select **Importieren → Kartenprojekt öffnen** and choose `examples/map-starter.map.json` from your checkout.
2. Select **Workshop**, change its height, and switch between **2D Karte** and **3D Raum**.
3. Select **Welt betreten** to walk. Use WASD/arrows, Q/E to turn, Escape to pause, and **Zurück zum Editor** to return.
4. Select **Lokal speichern**, then **Exportieren**. Keep the downloaded JSON as a backup and try opening it again.

The starter contains one building and an unobstructed spawn on a 120 × 80 m map. It requires no external image or dataset. The [guided first session](docs/GETTING_STARTED.md) explains exact controls, expected results, storage and recovery. Much of Map Studio's UI is currently German; the developer documentation is English.

## What you can build on now

| Included | Current value | Boundary |
| --- | --- | --- |
| Map Studio | One validated document drives 2D editing, 3D geometry, walking and JSON exchange | No automatic 3D reconstruction from an image |
| Data import and extension points | CSV/Overpass conversion, custom point data, pure model modules and format contracts | CSV is planar-coordinate input; OSM geometry/heights may be simplified or estimated |
| Local project storage | Transactional revisions detect stale-tab saves | No team editing, cloud sync or managed backup |
| Layer and World editors | DOM/CSS editor and procedural 3D dioramas available locally | Separate formats and storage behavior; layer edits are temporary and its JSON export has no UI re-import; public dioramas use replacement backgrounds |
| Runtime experiments | Collision, cameras, JS vehicle controllers, WASM simulation, networking and optional GPU culling source | These are not all integrated into Map Studio; they are not a stable plugin API |
| Tests and documentation | Readable implementation, reproducible Node checks, limits and contribution recipes | Passing tests do not establish customer value, supported FPS or production scale |

The specific user benefits still to validate are **less time preparing spatial data, better identification of spatial/data problems, and less effort for developers adding features**. We have not established these benefits in real customer work. The [value and validation guide](docs/VALUE_AND_VALIDATION.md) defines three pilots, comparison baselines, proposed success criteria and how to report failures.

## Where to go next

- [Getting started and recovery](docs/GETTING_STARTED.md)
- [Architecture: state, rendering, simulation, storage and networking](docs/architecture/README.md)
- [Current limits and evidence](docs/LIMITS.md)
- [Findings: code, tests and historical measurements](docs/FINDINGS.md)
- [Map format and controls](docs/MAP_STUDIO.md)
- [Contribution and extension recipes](CONTRIBUTING.md)
- [Optional integrations and excluded data](docs/INTEGRATIONS.md)
- [Real-use result template](docs/validation/RESULT_TEMPLATE.md)
- [Release status and test scope](docs/RELEASE_STATUS.md)
- [6 October audit: corrections and verification status](docs/AUDIT_2026-10-06.md)

## Other local routes

| Route | Public release behavior |
| --- | --- |
| `/map-studio/` | Recommended starting point; self-contained starter |
| `/studio/` and `/` | Layer editor with replacement illustration; edits last only for the current page session |
| `/world-studio/` | Procedural world editor with replacement backgrounds; prepared scans require your own data |
| `/kart/` and `/globe/` | Integration instructions; original application entry pages are retained as `integration.html` for developers configuring their own datasets/services |

Kart/globe source is included, but the original aerial photographs, terrain bundles, scans, models and hosted county data are not included. Opening a gated route does not enable these integrations automatically. See [INTEGRATIONS](docs/INTEGRATIONS.md).

The layer editor resets on reload or navigation away. Its **Export** downloads the current layers and view settings for inspection or developer reuse; there is no save/restore store or UI importer for that JSON. Map Studio's local-save and re-import instructions do not apply to the layer editor.

## Verify and contribute

From a Git checkout:

```sh
npm run verify
```

This checks syntax, references, the public Node suite and generated architecture index. It does not launch a browser. After installing the separate browser tooling described in [CONTRIBUTING](CONTRIBUTING.md), run `npm run test:browser` for the public smoke and audit regressions. Both are required, and missing Playwright or Chromium is a failure. `npm run test:browser:extended` selects the older, broader integration suites. See [release status](docs/RELEASE_STATUS.md) for their evidence boundaries. After editing:

```sh
npm run docs:architecture
npm run verify
```

`dist/` is authored source, not disposable build output. There is no frontend bundler. Core modules live in `dist/map-studio/`, `dist/runtime/`, `dist/worldport/`, `edge/` and `sim/`. See the [file register](docs/architecture/FILES.md) and [symbol register](docs/architecture/SYMBOLS.md).

The public repository is intended to become the maintained home for released core changes and community pull requests. Private integrations should consume an identified public revision. Avoid maintaining separate manual copies of the core; see [CONTRIBUTING](CONTRIBUTING.md).

This project uses Three.js and Cesium. Makepad inspired the goal of an understandable developer-facing repository; no Makepad runtime is integrated. There is no general avatar builder, full asset-inclusive world archive exporter, shared editor persistence or authored 4D timeline in this release.
