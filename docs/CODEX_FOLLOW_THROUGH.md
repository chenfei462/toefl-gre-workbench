# Codex follow-through — 2026-10-13

Status: **CODEX_ACCEPTED**

The user authorized continuation in Codex from chat `01a12bf6-1ba3-7b60-872a-bc50a54d19cd`. Existing work is retained on branch `codex/codex-follow-through`. The earlier DeepSeek attempts remain historical evidence; a successful DeepSeek run is not a dependency of this continuation.

## Scope and findings

Independent inspection found four defects within the previously accepted learning/planning scope:

1. Mastery and priority used different weighting formulas, and priority reasons printed lifetime accuracy while scoring recent accuracy.
2. Question reference reconciliation was only called by tests. Missing bank records could continue contributing evidence after a learning backup was restored.
3. Onboarding and Settings changed preference targets without changing the exam profiles used by the dashboard and planner.
4. A full question with an unknown source could bypass the registered-source rights check.

The repairs preserve history, separate temporary reference verification from manual answer exclusions, and keep standalone source references/batch summaries usable. Regression tests must reproduce each defect before the fix. Current review includes the production integration, not only pure helper tests.

Independent review also reproduced and repaired older date-bucket insertion-order dependence, a fractional-score rounding disagreement in explanations, inactive-exam due blocks, and a stale Settings form after backup restoration. Recovery visibility and persistence were missing: the original payload is now offered for download on startup and retained across subsequent successful loads. Restored attempts are also checked against current bank answer disputes.

## Resulting behavior

- Mastery, priority, reasons, and explanations share weighted evidence and the scored recent window. Entire date buckets remain together; explanations use the same final rounding as production priority.
- Question-backed attempts are pending until the separate IndexedDB bank is checked. Missing references remain visible and preserved but do not influence mastery, priority, due-error prescriptions, or rolling statistics. Restoring/importing the matching bank rechecks them. Inactive historical questions still resolve; missing standalone references and batch summaries remain usable. All non-batch records linked to a currently disputed bank question or answer receive a lasting exclusion, including reference-only records restored from an older backup. Historical grades and previous exclusions remain intact.
- Onboarding, Settings, app loading, and confirmed backup restoration synchronize validated preference targets into planner profiles without replacing baseline/checkpoint history. Restored Settings fields show the restored targets before any subsequent save.
- Retained errors from exams that are no longer active cannot introduce inactive-exam prescription blocks.
- Full question storage requires a registered source with permitted storage rights. Unknown-source reference-only records remain possible with the existing provenance warning.
- Recovery downloads preserve the original bytes/text rather than resaving an inferred state. The recovery payload is not removed by successful loads; only explicit data clearing removes it.

## Evidence and records

- Initial fresh baseline: `npm test` passed 18 files / 80 tests; lint and typecheck exited 0.
- Independent P2.1 check: `npx vitest run src/acceptance.test.ts` passed 1 file / 3 tests. The harness calls real learning/planning functions; a static allocation cannot satisfy the strict before/after Geometry allocation assertion.
- Existing October 12 mobile screenshots are preserved without modification in [the P4.3 evidence folder](evidence/P4.3/manifest.md). They document historical manual checks, not fresh automated pixel regression.
- Fresh Codex in-app browser check: onboarding targets TOEFL 5.0 / GRE 325 produced gaps +1 / +15 from the configured 4.0 / 310 baseline and persisted after refresh. [Screenshot](evidence/codex-follow-through/targets-after-refresh.png).
- Final integrated commands and independent review are recorded below.

## Final verification — 2026-10-13

| Command | Observed result | Exit |
| --- | --- | --- |
| `npm test` | 24 files; 115 tests passed; 0 failed | 0 |
| `npm run lint` | Oxlint completed without diagnostics | 0 |
| `npm run typecheck` | `tsc -b` completed without diagnostics | 0 |
| `npm run build` | Vite built `dist/`; 2345 modules transformed | 0 |
| `git diff --check` | No whitespace errors; normal working-copy line-ending notices only | 0 |

All source changes were present for this final gate set. The initial baseline had 80 tests in 18 files; the final set adds 35 tests across the repaired production paths.

Independent algorithm review accepted the shared evidence/scoring/planning changes after executing 10 files / 41 targeted tests and 3,152 priority/explanation parity probes. Independent profile/reference review accepted the UI, storage, provenance and restored-dispute paths after executing 7 files / 44 targeted tests. Reviewers did not implement the source they accepted. The integration tests use the actual IndexedDB repository and production `recordQuestionAttempt`/backup path for reference-only dispute restoration.

The local implementation and this follow-through are accepted. Previous failed DeepSeek attempts retain their original status and output; both historical team records now expose a separate current local acceptance outcome.

## Boundaries

Automated multi-viewport browser/pixel regression and persisted practice-set provenance are outside the accepted execution DAG. Historical screenshots do not certify subsequent UI changes; the fresh browser check here is limited to custom targets and refresh persistence. No framework, paid service, remote deployment or push is introduced. Existing failed DeepSeek attempts and their original output are preserved separately from local acceptance. Changes remain uncommitted in the existing workspace on `codex/codex-follow-through`, with the local preview at `http://127.0.0.1:5177/`.
