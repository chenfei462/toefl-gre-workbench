# Agent Team Final Report

Current local acceptance (2026-10-13): **CODEX_ACCEPTED**. The authorized follow-through fixes passed final integrated gates and independent review; see [CODEX_FOLLOW_THROUGH.md](CODEX_FOLLOW_THROUGH.md). Historical command transcripts and failed model attempts below remain unchanged.

## Current verification

- Root ran the final gates after all source changes: `npm test` passed 24 files / 115 tests; `npm run lint`, `npm run typecheck`, and `npm run build` each exited 0. Lint reported no findings. The build transformed 2345 modules and produced `index-B8GDp1SR.js` at 494.73 kB (gzip 150.60 kB).
- Independent algorithm re-review accepted the repairs; its targeted run passed 10 files / 41 tests, and 3152 additional in-memory scoring cases confirmed explanation/priority parity.
- Independent application/reference re-review accepted its scope; its targeted run passed 7 files / 44 tests.

## Outcome

The previous Codex review accepted the locally executable implementation against `docs/AGENT_TEAM_EXECUTION_PLAN.md`. That historical decision covered deterministic mastery, evidence-weighted priority, explainable prescription, safe migration, question-reference reconciliation, trajectory/dashboard surfaces, reference-only learning, UserQuestionState, ETS source verification, responsive UI rules, and the plan-to-practice navigation path.

## Historical verification evidence

- `npm run typecheck` -> `tsc -b` completed, exit 0.
- `npm run lint` -> `oxlint` completed, exit 0.
- `npm test` -> 18 test files passed, 80 tests passed, exit 0.
- `npm run build` -> Vite transformed 2342 modules and built `dist/`, exit 0.
- `git diff --check` -> no whitespace errors, exit 0; only normal line-ending warnings.
- `src/questionDatabase/learning.integration.test.ts` passes the reference-only attempt -> Error Lab -> mastery -> priority -> prescription path.
- ETS catalog URL verification returned HTTP 200 for all 17 listed URLs.

## Historical DeepSeek runtime failures

Paseo created agent `5ca06c7b-4c48-40c3-9e0c-d57d1b409e9b` with the required `deepseek-harness/["xiaobai","deepseek-v4.1-flash"]` selection, but the desktop harness returned `xiaobai API error (404)` before the first turn. The provider/model configuration was not changed and no alternate vendor was used. The blocker evidence is in `docs/dsh/reports/BLOCKED_MODEL_RUNTIME.md`.

The later DSH catalog probe on `deepseek-official / deepseek-flash` failed before any model request with `MISSING_CREDENTIAL`; see [RUNTIME_AUDIT.md](dsh/runtime/RUNTIME_AUDIT.md). Those failures remain historical evidence. The user has authorized Codex continuation, so a passing DeepSeek route is not a dependency of the current local follow-through.

## Latest regression follow-through

The mixed-exam planning path preserves exam and section metadata for due error blocks without a `skillId`, with integration coverage for a TOEFL error in a mixed GRE/TOEFL plan. The latest exact-model Paseo attempt was agent `24685091-49ee-47c7-bb97-d3819d7c7c76` and failed before implementation with HTTP 404.

## Known limits

P4.3 includes a manual Edge run at 390 x 844 with screenshots and interaction checks. The original screenshots are preserved with dimensions and checksums in [the evidence manifest](evidence/P4.3/manifest.md). No automated browser or pixel-regression harness is configured. These historical screenshots do not certify later code changes. ETS account-only product availability is not inferred from public URL reachability.

## Historical Codex checklist

- [x] Plan and task contracts read.
- [x] Provider/model lock preserved; no fallback to another vendor.
- [x] Migration and storage tests pass.
- [x] Adaptivity acceptance and learning integration tests pass.
- [x] Full typecheck, lint, test, build, and diff checks pass.
- [x] Official source metadata and live reachability recorded.
- [x] No protected question content copied into the repository.
- [x] Codex independent acceptance: ACCEPT for locally executable tasks.
- [x] DeepSeek runtime blocker and mobile verification limitation recorded.
- [x] Mixed-exam due-error exam/section metadata regression fixed and covered.
