# Phase 10: Evidence-based development workflow

Checked 2026-10-14 (Asia/Tokyo). Independently authored workflow informed by [chrichuang218/ai-learning-coach](https://github.com/chrichuang218/ai-learning-coach). This reference improves development continuity; it adds no coach service or second mastery engine to the product.

## Verified upstream evidence

[Metadata](https://api.github.com/repos/chrichuang218/ai-learning-coach) reports MIT and Python; main tree SHA is `26158f72632f10b7443e89f01da15de304838606`, untruncated, last push 2026-09-26. [LICENSE](https://github.com/chrichuang218/ai-learning-coach/blob/main/LICENSE) text was read and confirms MIT.

Files verified in the actual tree:

- [EVIDENCE-FORMAT.md](https://github.com/chrichuang218/ai-learning-coach/blob/main/plugins/ai-learning-coach/skills/learning-coach/EVIDENCE-FORMAT.md): read; observed actions retain source references, assistance level, uncertainty and next action. Derived indexes are not a second writable truth.
- [RESUME.md](https://github.com/chrichuang218/ai-learning-coach/blob/main/plugins/ai-learning-coach/skills/learning-coach/RESUME.md): read; resume from current progress and actual source/HEAD, preserve user changes and historical evidence.
- [evals/release-checklist.md](https://github.com/chrichuang218/ai-learning-coach/blob/main/evals/release-checklist.md): read; distinguishes deterministic engineering validation, selected behavior evaluations and unproven real-user outcomes. Its PASS is their historical report, not our validation.
- [scripts/validate_repo.py](https://github.com/chrichuang218/ai-learning-coach/blob/main/scripts/validate_repo.py), [tests/test_learning_core.py](https://github.com/chrichuang218/ai-learning-coach/blob/main/tests/test_learning_core.py), [evals/scenarios.json](https://github.com/chrichuang218/ai-learning-coach/blob/main/evals/scenarios.json) and [.github/workflows/validate.yml](https://github.com/chrichuang218/ai-learning-coach/blob/main/.github/workflows/validate.yml): tree confirms separate validation, deterministic tests, evaluations and CI artifacts. They were not executed in this audit.

## Session start and scope

Read USER_REQUIREMENTS.md, the current implementation evidence, current HEAD, git status and the relevant domain files. Record baseline failures and uncommitted work without resetting it. Select the smallest next observable acceptance result. Separate completed behavior, planned work and unverified claims. Keep the current next action in one progress record; other documents link it.

For each phase, record: date; HEAD plus dirty state; scope and files; requirement; command or manual action; actual exit/result; test/report artifact; remaining limitation; next action. Historical evidence retains its original date and revision. Never backfill invented past activity or present old passing output as current verification.

## G0–G10

| Gate | Required evidence |
| --- | --- |
| G0 | Baseline HEAD/status and observed failures |
| G1 | Diff matches requested phase; existing business model/data retained |
| G2 | npm run typecheck, result and revision |
| G3 | npm run lint, result and revision |
| G4 | Targeted unit tests for changed domain invariants |
| G5 | Relevant integration tests for persistence and event mapping |
| G6 | npm test |
| G7 | npm run build |
| G8 | Relevant browser flow, browser/project, trace/report; microphone simulation disclosed |
| G9 | Independent review of actual diff and findings resolution |
| G10 | After repair, targeted reproduction then all relevant gates rerun |

A missing command, unavailable browser or permission block is recorded as not run or blocked, never PASS. Independent review cannot be relabeled self-review. Tests must retain meaningful assertions; failures trigger root-cause analysis, repair and regression verification without dropping acceptance criteria.

## Evidence before mastery and completion claims

A rendered control is not proof its persisted behavior works. A self-rating is not an official speaking score. An npm package import is not proof the requested FSRS distributions or migrations work. A correct practice percentage is not an official TOEFL/GRE score. A CI file is not a remote successful run. A passing deterministic suite does not prove a seven-day learner outcome.

The product's seven-day success criterion requires actual dated usage evidence: what attempts/errors changed, which weakness and priority changed, and what the next prescription recommended. A synthetic seven-day fixture is useful algorithm evidence but must remain labeled simulated.

## Resume and handoff

Record what now works, what failed, the last relevant commands, pending independent review and one concrete next action. On resumption, compare stored revision with current source and user edits, then rerun only the checks invalidated by changes or unresolved risk. Do not restart the project or discard historical evidence. No upstream source, prompts or skill text was copied into this document.
