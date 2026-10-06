# Release status and verification scope

This is the 0.5.0 public source preview prepared on 6 October 2026. Creation of this package does not itself create a GitHub repository, tag, npm/Rust registry publication or hosted deployment. `PUBLIC_SOURCE.json` records the exact source revision, copied/transformed files and exclusions.

## What the default verification means

`npm run verify` runs syntax/static-reference checks, the public Node suite and generated-index consistency. The public suite keeps format, editor model, local persistence, history, collision, controller, WASM, snapshot, protocol, room and Worker behavior checks that can run with redistributable inputs. It also checks public routes and the starter.

Original asset-bound scan/terrain/imagery checks are not evidence for this distribution because those datasets are not included. The public test runner and export manifest identify exclusions. Synthetic tests demonstrate behavior only for their inputs. Do not quote the private repository's passing CI as proof that a changed public tree passed.

From a source ZIP, first initialize a local Git checkout if you want generated-index checks:

```sh
git init
git add .
git -c user.name="Local reviewer" -c user.email="reviewer@example.invalid" commit -m "Import public source snapshot"
npm run docs:architecture
npm run verify
```

From a normal clone, simply run `npm run verify`. The documentation index reads Git's file list and ignores its own three generated outputs when hashing. Source packaging uses committed files, so commit your edits before `npm run package`.

## Separate evidence still required

| Evidence | Meaning and current boundary |
| --- | --- |
| Node and HTTP checks | Repeatable from this checkout; evaluate the output from your exact revision |
| Browser smoke | Startup, import/edit/walk/save/export and gated routes on the browser exercised; does not establish real-device performance |
| Historical optimization measurements | Summarized in FINDINGS; not repeated customer results or release-wide guarantees |
| Rust rebuild | Prebuilt WASM included; matching source tests do not replace a separately recorded compiler rebuild |
| Real-device acceptance | Edge/Chrome, Safari, Firefox and physical phones need their own run records |
| Real-use value | No measured customer time savings or spatial-review advantage established; run the proposed pilots |
| Production | No hosted revision, availability, multi-user capacity or operating-cost claim established by this release |

Record any new run using [the result template](validation/RESULT_TEMPLATE.md), including failures and skipped checks. A successful exit with skipped browser checks is not a successful browser run. A software-rendered/headless browser is not physical-device GPU performance evidence.

## Maintenance

The first public tree is derived from a reviewed private source revision without its Git history. Future core fixes and contributor pull requests should target the public repository. Private applications should consume a named public revision or deliberately versioned package when one exists. Until extraction into packages is complete, use a pinned source dependency and document integration changes; there is no stable published SDK today.

The private exporter bootstraps this first release. It is not permission to overwrite future public commits or community work with a new snapshot. Later ports require reviewed diffs and preservation of public history.
