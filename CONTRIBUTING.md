# Build on Ourark World Studio

Start with the [README](README.md), [architecture](docs/architecture/README.md), [findings](docs/FINDINGS.md) and [small map example](examples/README.md). The project-authored core is [MIT licensed](LICENSE), Copyright (c) 2026 Kevin Fröba. Read the [license scope](LICENSE_SCOPE.md) and preserve third-party and asset notices; the [release record](docs/RELEASE_STATUS.md) explains verification scope.

## Local workflow

Use Git and Node.js 24+. No npm install is needed for the default server or Node checks.

~~~sh
npm run dev
~~~

Edit authored files under dist/. Refresh the browser after changes; there is no bundler or automatic hot-reload framework. Keep the root and /studio/ HTML entries identical. Their layer state is memory-only: refresh or navigation discards edits. The layer JSON export is a record for inspection/developer reuse, with no UI re-import or local restore. Use Map Studio for the documented editable-project save/reopen workflow.

Before proposing a change:

~~~sh
npm run docs:architecture
npm run verify
~~~

These commands require a Git checkout. Include regenerated index files in the same change. Keep changes on a branch and explain the user-visible behavior, relevant evidence and compatibility impact in the pull request.

The public verification workflow does not deploy. Releases, registry publication and hosted deployments are separate maintainer actions. Keep production credentials and owner-specific bindings outside this source release.

## Where to extend

| Goal | Start here | What to preserve |
| --- | --- | --- |
| Add a map data field | dist/map-studio/model.js; project.js only for envelope metadata | Defaults/migration, exact export bytes, immutable validated records and meaningful round-trip tests |
| Add a map control | dist/map-studio/editor.js and index.html | Use existing edit transaction; no in-place mutation; drag ownership and undo/redo |
| Change map geometry | dist/runtime/city-layer.js, ground-layer.js and map-studio/renderer.js | Point IDs, selective updates, picking and matching collision geometry |
| Change walking behavior | dist/runtime/walker.js, physics/adapter.js and walk-host.js | Frozen design snapshot, pause/exit lifecycle, blocked spawn handling |
| Add data import | dist/worldport/ with a thin scripts/ CLI | Pure conversion, attribution, validation, report limits and deterministic fixtures |
| Extend a vehicle | dist/kart/kart.js, plane.js, pedestrian.js or dist/globe/car.js | Pure step(dt,input), terrain adapter and all state needed for replay |
| Add a new networked mode | runtime/net/protocol.js, sim/layout.js, edge/room.mjs and kart integration | Version/range compatibility, mode mapping, plausibility limits, render representation and protocol tests |
| Change Rust simulation | sim/src/lib.rs and runtime/sim/wasm.js | Layout v1 offsets, matching terrain and explicit JS/WASM tolerances |
| Change GPU culling | dist/runtime/gpu/cull.js | CPU fallback, real GPU comparison and upload/readback cost |
| Add hosted persistence | Separate proposed design first | Existing local revisions are not a server concurrency protocol |

These are internal extension points, not a stable plugin SDK. New vehicle families, avatars and complete world archives need additional design; the draft contracts do not supply implementations.

## A small extension recipe

To attach a new business property to buildings, first use the existing point.data JSON object. That requires no schema change. See the example's assetId and purpose fields.

For a first-class render/physics property:

1. Add a default and validation rule in model.js so older files still open.
2. Return a new point object when editing it; never mutate a frozen validated point.
3. Include the property in geometry/cache signatures if it changes rendering, and in the physics adapter if it affects collision.
4. Exercise import/export, undo/redo, local restore and one real interaction through the editor.
5. Document any new format version or limit. Rebuild the generated index.

Unknown fields are not automatically a supported extension mechanism: validators may normalize them away. Add persistence explicitly.

## Rebuild the optional WASM

The prebuilt module is already committed. To change it, install a Rust toolchain and the target:

~~~sh
rustup target add wasm32-unknown-unknown
npm run build:wasm
node tests/sim-wasm.test.mjs
~~~

`rust-toolchain.toml` pins Rust 1.97.1 and the `wasm32-unknown-unknown` target; the build uses Cargo's locked dependency resolution. Record `rustc --version` and `cargo --version` with rebuilt artifacts. CI compares the rebuilt module with the committed WASM as well as running its behavior checks. The Rust crate has no external dependencies; it does not use Makepad or wgpu.

## Browser verification

`npm run test:browser` runs `tests/browser/public-smoke.browser.mjs` followed by `tests/browser/audit-regressions.browser.mjs`. Both must pass. `npm run test:browser:public` runs only the focused public smoke and is not a substitute for the complete browser gate. The scripts require Playwright and Chromium and fail if either is missing. Install browser tooling in a separate directory, keeping the editor dependency-free. For example, create a sibling `motionspec-browser-tools` directory and run these commands there:

```sh
npm init -y
npm install --save-exact playwright@1.62.1
npx playwright install chromium
```

Then from this repository on macOS/Linux:

```sh
PLAYWRIGHT_CORE=/absolute/path/to/motionspec-browser-tools/node_modules/playwright npm run test:browser
```

In PowerShell set `$env:PLAYWRIGHT_CORE` to the equivalent full path first. `CHROMIUM_PATH` can select an installed Chromium executable. The script records the exercised browser/environment and screenshots. Headless/software rendering validates interactions, not physical-device performance. On Linux, system dependencies may need installation using Playwright's documented install procedure.

`npm run test:browser:extended` runs the older, broader browser suites using the same separately installed tooling. Their shared harness uses SwiftShader on Linux, Metal on macOS and the platform default elsewhere. Some suites still require omitted datasets or workload-specific budgets, so this command is not the public source acceptance gate. Missing browser tooling is a failure, not a successful skipped run. Linux software rendering cannot establish physical GPU performance or FPS.

For each new browser/device run record commit, date, browser/version, OS, GPU, viewport, DPR, scenario, assertions, errors and artifacts. Emulated mobile is not a physical phone. Performance timings require comparable runs on the same machine. Use [the result template](docs/validation/RESULT_TEMPLATE.md).

## Community and maintenance

Open core issues and pull requests in this public repository. Include the reproducible input (with redistribution permission), expected behavior, actual behavior, revision and environment. Choose a focused change; explain format compatibility and relevant tests. A fix is ready for review when its claims match its evidence, including known failures.

The public repository is the intended canonical home of released core code. Private integrations should consume a pinned public revision. A public snapshot must not be overwritten with a later private history or a blind mirror. Port later private improvements as reviewable diffs, preserve contributor attribution, and avoid two independent sets of core fixes.

Original third-party authors keep their notices. Changes to dataset/service support need their own provenance and integration evidence. The source preview has no support SLA, stable plugin API or published SDK compatibility guarantee.

Read [VALUE_AND_VALIDATION](docs/VALUE_AND_VALIDATION.md) before describing a change as a customer benefit. Proposed targets are not observed results.

The CSV fixture `tests/fixtures/leonida-sample.csv` exercises source exclusion and link/media filtering as well as coordinate conversion. Its source labels, credit strings, placeholder `https://localhost/...` URLs and media path strings are test inputs, not a rights registry. No referenced image or video is bundled with that CSV, and neither its credits nor a passing filter test establish who owns or may redistribute real media. Preserve that distinction when adding fixtures.

## Data and source conventions

- Validate imports before replacing active state. Failed imports leave the open document available.
- Persist serializable domain data, not Three.js references, DOM nodes or secrets.
- Preserve stable IDs and older format migration.
- Keep input focus handling and reduced-motion behavior. Test actual touch/keyboard changes in a browser.
- Modify application modules, not vendor internals. Upgrade a renderer and matching addons together with notices.
- Keep authored source, external service source, data rights and generated assets identifiable.
- Source packaging requires committed changes and a clean working tree; it does not publish to GitHub or deploy.
