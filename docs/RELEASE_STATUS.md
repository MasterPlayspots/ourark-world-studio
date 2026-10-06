# Release status and verification scope

This is the 0.5.0 public source preview prepared on 6 October 2026. Creation of this package does not itself create a GitHub repository, tag, npm/Rust registry publication or hosted deployment. `PUBLIC_SOURCE.json` records the initial export's exact source revision, copied/transformed files and exclusions. It is a historical bootstrap manifest, not a rolling checksum of later public changes. `npm run verify:source` checks that initial snapshot; use public Git commits and their check results to trace subsequent changes.

## What the default verification means

`npm run verify` runs syntax/static-reference checks, the public Node suite and generated-index consistency. The public suite keeps format, editor model, local persistence, history, collision, controller, WASM, snapshot, protocol, room and Worker behavior checks that can run with redistributable inputs. It also checks public routes and the starter.

Original asset-bound scan/terrain/imagery checks are not evidence for this distribution because those datasets are not included. The public test runner and export manifest identify exclusions. Generated/synthetic cases and other fixture checks demonstrate behavior only for their inputs. Do not quote the private repository's passing CI as proof that a changed public tree passed.

The CSV fixture `tests/fixtures/leonida-sample.csv` is an input for source exclusion, coordinate conversion and filtering of links/media paths. It contains `screenshots`, `trailer1`, `leaks` and other source labels, credit strings, placeholder localhost URLs and image-path strings. No referenced media is included. Those fields and their test assertions do not verify a real rights holder or establish reuse permission; the fixture is not a license database or a blanket provenance claim.

From a source ZIP, first initialize a local Git checkout if you want generated-index checks:

```sh
git init
git add .
git -c user.name="Local reviewer" -c user.email="reviewer@example.invalid" commit -m "Import public source snapshot"
npm run docs:architecture
npm run verify
```

From a normal clone, simply run `npm run verify`. The documentation index reads Git's file list and ignores its own three generated outputs when hashing. Source packaging uses committed files, so commit your edits before `npm run package`.

## Browser and Rust checks

Install the separate Playwright/Chromium tooling described in [CONTRIBUTING](../CONTRIBUTING.md), then run:

```sh
npm run test:browser
```

This command requires `tests/browser/public-smoke.browser.mjs` and `tests/browser/audit-regressions.browser.mjs` to pass in sequence. Missing Playwright or Chromium fails the run. Set `PLAYWRIGHT_CORE` to the installed package directory when it is outside the checkout. `npm run test:browser:public` runs only the narrower smoke; `npm run test:browser:extended` selects the older integration collection, which may need omitted datasets or workload-specific budgets.

CI's separate visual startup check uses pinned `agent-browser` tooling to open the locally served Map Studio, wait for network idle, capture a screenshot and page snapshot, inspect errors and close the session. That check observes initial rendering; it does not replace the interaction tests. No additional npm command is required for the CI-only visual step.

For a Rust rebuild, install Rustup; `rust-toolchain.toml` pins Rust 1.97.1 and the WebAssembly target. Then run:

```sh
rustup target add wasm32-unknown-unknown
npm run build:wasm
node tests/sim-wasm.test.mjs
```

The audit CI build check also compares the rebuilt module with the committed WASM bytes using its recorded toolchain. These commands rebuild the local artifact; behavior tests alone do not establish byte-for-byte reproducibility. Inspect the exact revision's CI run for the compiler version, comparison and browser artifacts. Describing these checks here does not record them as passed.

## Separate evidence still required

| Evidence | Meaning and current boundary |
| --- | --- |
| Node and HTTP checks | Repeatable from this checkout; evaluate the output from your exact revision |
| Browser checks | Visual startup plus required public smoke/audit regressions on the exercised browser; inspect results/artifacts for the exact revision; no real-device performance claim |
| Historical optimization measurements | Summarized in FINDINGS; not repeated customer results or release-wide guarantees |
| Rust rebuild | Compare rebuilt/committed bytes and run behavior checks with a recorded compiler; require the exact revision's result before claiming reproducibility |
| Real-device acceptance | Edge/Chrome, Safari, Firefox and physical phones need their own run records |
| Real-use value | No measured customer time savings or spatial-review advantage established; run the proposed pilots |
| Production | No hosted revision, availability, multi-user capacity or operating-cost claim established by this release |

Record any new run using [the result template](validation/RESULT_TEMPLATE.md), including failures and skipped checks. A successful exit with skipped browser checks is not a successful browser run. A software-rendered/headless browser is not physical-device GPU performance evidence.

## Maintenance

The first public tree is derived from a reviewed private source revision without its Git history. Future core fixes and contributor pull requests should target the public repository. Private applications should consume a named public revision or deliberately versioned package when one exists. Until extraction into packages is complete, use a pinned source dependency and document integration changes; there is no stable published SDK today.

The private exporter bootstraps this first release. It is not permission to overwrite future public commits or community work with a new snapshot. Later ports require reviewed diffs and preservation of public history.
