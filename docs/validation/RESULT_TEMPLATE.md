# Validation result: <case and run ID>

Copy this file for a completed or attempted run. Replace placeholders; leave unmeasured fields as **not measured**, not zero. This blank template contains no achieved results. Use the protocol in [VALUE_AND_VALIDATION.md](../VALUE_AND_VALIDATION.md).

## Status and question

- Status: planned / passed / failed / blocked / incomplete.
- Date, tester alias and independent reviewer:
- Pilot/check: P1 / P2 / P3 / common check / separate engineering experiment.
- Hypothesis and exact user task:
- Protocol version and criteria recorded before testing:
- Expected answers / acceptance manifest:
- Proposed claim this run could support:
- Claims this run cannot support:

## Reproduction

| Item | Value |
| --- | --- |
| Repository and exact commit | |
| Clean or modified working tree; patch if modified | |
| App route and origin; deployment revision if hosted | |
| Node/tool versions and commands | |
| Browser/version, OS, physical device, CPU/GPU | |
| Viewport, DPR, refresh rate, power/thermal state | |
| Input filenames, SHA-256, source date and reuse/attribution terms | |
| Point/footprint/surface counts, project bytes, image sizes | |
| World ID, storage profile, starting revision | |
| Network, cold/warm cache, acceleration and profiler settings | |
| Baseline tool/version and familiarity | |
| Participant experience, task variant and tool order | |
| Data exclusions or anonymization | |

List numbered reproduction steps, including the starting state, route/camera sequence, input mode, expected result and observed result. Attach redistributable minimal fixtures and commands. Do not attach credentials, identifying participant records or private site data.

## Task outcomes

Use one row per attempted participant/task/condition. Keep failures and timeouts in the table. Separate prerequisite/setup time from task time; report hints and interventions.

| Run / participant alias | Condition / task variant | Setup minutes | Task minutes / time cap | Completed unaided? | Correct / required answers | Required records or fields lost | Hints / failure |
| --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | |

- First-success definition and measured time:
- Conversion report: effective scale, height sources, renames, filtering, clipping and omissions:
- Source-to-output record accounting and required-field differences:
- Normalized import/export comparison and expected revision changes:
- Save/reload and second-world result:
- Multi-tab conflict: saved A result, retained B work, recovery steps:
- Rejected-input/storage failure result; did the current project remain intact?:
- Keyboard/touch/assistive technology, language and motion-comfort observations:

## Performance evidence, when relevant

Do not combine different devices, scene sizes or cold/warm conditions into one number. Keep instrumented runs separate from participant task timing. Record unavailable metrics explicitly.

| Run / profile | Scene / action | Cold or warm | First usable scene ms | Frame interval p50 / p95 / p99 ms | Stalls >250 ms | Edit-to-visible ms | Process / JS heap measurement | Crash/context loss |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | | |

- Sample duration, repetitions, measurement method and raw frame trace:
- Memory before/after repeated cycles, idle interval, tools and retained trend:
- Browser errors, skipped steps or instrumentation limitations:
- Declared device budget and result against it:

## Decision and evidence

| Preregistered criterion | Observed evidence | Pass / fail / not measured |
| --- | --- | --- |
| | | |

- Paired baseline comparison, raw values, medians and correctness (retain incomplete attempts):
- Did added setup, correction, assistance or rework erase the expected benefit?:
- Unexpected failures, negative cases and plausible confounders:
- Evidence links: input hashes, reports, patches, test logs, screenshots/video and raw measurements:
- Narrow conclusion supported by this run:
- Open question / issue link, proposed fix and specific rerun needed:
- Protocol changes after starting (report old and new criteria separately):

A recorded pass applies to this revision, task, data and environment. It does not establish real-world planning accuracy, accessibility conformance, broader performance guarantees or production capacity.
