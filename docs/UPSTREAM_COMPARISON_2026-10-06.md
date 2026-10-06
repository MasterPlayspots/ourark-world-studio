# Source comparison and selective improvements — 6 October 2026

The upstream compared here is `MasterPlayspots/motionspec-world-studio`, the original source repository. This is not a comparison with Makepad. No Makepad runtime is introduced.

## Reproducible baseline

| Reference | Commit |
| --- | --- |
| Original release baseline | `8caf98f3532efbb794ab0df798873c0a9731a32f` |
| Export manifest source (same tree as baseline) | `22bc5a7f3150b8e28f88416b3ce2b62ae3f9e564` |
| Original current main | `a9760cafbb333062f4f2e12521d964a53858ad56` |
| Public main before this change | `fcc573cadfceeb9d4dd4e26906d81bd8062c6141` |

Recursive Git-tree comparison: original has 650 blob files; public has 539. Of 518 shared paths, 444 blobs are identical and 74 differ. There are 132 original-only and 21 public-only files. These counts describe the pinned baseline, before this change. They are not counts of missing features or defects.

Original main contains one new commit since the release baseline: “Open World Studio for public testing and play (#37)”. It changes 13 files: the deployment workflow, `dist/kart/insights.js`, public-access documentation, three generated architecture indexes, `edge/app.mjs`, `edge/globe.mjs`, `edge/guard.mjs`, the public exporter, live verification script, edge tests and Wrangler configuration.

The public-only files include audit and integration documentation, public smoke/regression tests, source verification, the Rust toolchain pin, integration gate pages, starter SVGs and Map history implementation. Original-only files include intentionally excluded geographic datasets, models, scan fixtures, preparation pipelines and exporter override templates. Restoring them requires separate provenance, licensing and integration work.

## Decisions

| Candidate | Decision | Added value and remaining evidence |
| --- | --- | --- |
| Explicit Kart telemetry opt-in | Adopt selectively | New visitors do not transmit performance/position samples by default. Existing saved choices remain effective; local measurements remain usable. This intentionally reduces automatic telemetry coverage. |
| Public visitor access via `PUBLIC_ACCESS` | Defer | Could make hosted trials easier, but changes who can access the app and APIs. Requires a deliberate deployment policy, route/authorization tests and checks against the actual host. |
| Durable Object public API budgets | Defer as a separate change | Could constrain public enhance, device, telemetry and geocoding traffic. Needs concurrency, expiry, shared-IP/NAT, dependency-failure and load tests with an agreed budget. Source unit tests are useful but not production capacity evidence. |
| Shared Nominatim upstream budget | Defer with public API work | Could coordinate lookups across isolates. Validate cache behavior, queueing, retries, throttling and provider policy for the intended workload. |
| Anonymous live-site verification | Adapt only with a hosted release | Original script assumes a particular host, routes and revision. Public integration gates intentionally differ. A successful check there would not prove this release's deployment. |
| Deployment workflow and Wrangler bindings | Do not copy | They describe a separately operated service. Public source must not silently acquire those infrastructure dependencies. |
| Exporter and generated architecture indexes | Do not copy | The exporter can overwrite public adaptations. Regenerate indexes from this repository. The exporter change pins updated edge tests, not improved starter SVG artwork. |
| Excluded models, scans and geographic pipelines | Do not restore automatically | Useful integration candidates only after rights, reproducibility, data requirements and real-device behavior are established. |

## Preserve the public improvements

The original source does not contain the public audit fixes. A wholesale merge or re-export risks replacing working public behavior with the older implementation. Preserve in particular:

- Atomic Map document/metadata undo, revision limits and deferred import handling during drags.
- Map-to-World import support, text repaint after rename and accurate unit labels.
- Malformed-URL handling, JavaScript module MIME types and query-preserving directory redirects.
- Realtime room idle cleanup and corrected simulation validation, slope, crash and lap behavior.
- Pinned Rust rebuild and binary comparison, strict browser prerequisites and public regression coverage.

See [the audit](AUDIT_2026-10-06.md) and [technology/use-case review](TECHNOLOGY_AND_USE_CASES.de.md). `PUBLIC_SOURCE.json` remains historical export provenance, not a regenerated claim that later public edits match upstream.

## Adopted behavior and verification boundary

Only the exact stored string `1` enables Kart sharing on startup. Missing, invalid, disabled or unreadable storage defaults to off. The real panel checkbox can still enable sharing for the current page if storage is unavailable; that choice cannot persist in unavailable storage. Turning sharing off clears queued samples and suppresses both fetch and beacon sends. Samples already submitted cannot be recalled.

Local sampling, the performance display and geographic sample grid continue regardless of sharing. Payloads include a per-page session identifier, device information, positions and performance measurements; the UI therefore says “Messwerte teilen” rather than making an anonymity claim. This switch is separate from realtime networking and server-summary reads; it is not a global offline mode.

The added browser regression uses the real insights module and DOM panel with synthetic renderer/state inputs. It covers absent, disabled, enabled, invalid and unavailable preferences; local display; checkbox changes; queue clearing; saved disabled state; and intercepted fetch/beacon sinks. It does not exercise the excluded Kart datasets, actual GPU gameplay or deployed HTTP transport. Existing repository, browser and WASM checks remain required; consult the PR's CI results for execution evidence.

## Real-world validation still required

1. Run an opt-in pilot on representative desktop/mobile devices. Check comprehension of the switch, persistence across visits, denied storage and the usefulness of the reduced sample set.
2. Before public hosting, test anonymous app access alongside protected operator reports, API allowlists and failure behavior against the intended deployment.
3. Exercise public rate budgets with concurrent visitors and shared IPs, dependency outages and cache misses. Measure throttling, latency, operator cost and recovery.
4. Measure editor task completion, round-trip fidelity and time saved on actual user projects. Source similarity and passing regression tests do not establish customer value.

This review supports a narrow, testable improvement. It cannot guarantee that every possible device, deployment and workload is regression-free.
