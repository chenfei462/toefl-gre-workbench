# V2 Gap Analysis

## Repository Audit

- **Project:** Vite 8 + React 19 + TypeScript 6, package manager npm.
- **Routing:** no React Router routes are registered; `App.tsx` switches a local `page` string.
- **State:** `App.tsx` owns the entire in-memory state and passes update callbacks to page components.
- **Persistence:** `src/storage.ts` is a thin `localStorage` wrapper under `toefl-gre-workbench:v1`; it validates a partial schema but has no migration layer or import preview.
- **Schema:** `src/types.ts` contains V1 profile, task, resource, practice and weekly review records. There are no question-level attempts, error records, retries, skills, mastery, checkpoints, vocabulary or prescriptions.
- **Planner:** `src/domain.ts` generates a fixed 30-day task list and calculates task completion, practice accuracy, minutes and streak. It does not use performance data.
- **Tests:** Vitest 2 is configured through the `test` script. Existing coverage is three domain tests for plan generation, progress and today's tasks.
- **UI:** the existing responsive single-page shell has onboarding, today, plan, resources, practice, review and settings surfaces. It is usable for V1 recording but presents task completion as the primary outcome.
- **Version control:** this desktop project is not currently a Git checkout, so audit evidence comes from the files and package metadata rather than commit history.

## V1 -> V2 Requirements

| V2 requirement | Gap | Incremental modification | Acceptance evidence |
| --- | --- | --- | --- |
| Current TOEFL task types and 1-6 scores | V1 uses broad legacy sections and string targets | Add official task-type constants, score source labels and 1-6-compatible profile/checkpoint fields while retaining legacy history | Schema tests reject invalid score formats and UI labels estimates clearly |
| GRE diagnostic loop | Practice entries only aggregate correct/total | Add manual checkpoint, attempt and section/question-type data | Attempt and checkpoint fixtures survive export/import |
| Skill-level diagnosis | No skills exist | Add catalog-backed `Skill` records and references from attempts/resources | Skill map groups attempts by question type and skill |
| Error Lab | V1 stores only free-text `errorTags` | Add typed `ErrorRecord` with lifecycle status and review metadata | New, due, repeated and resolved queues are queryable |
| Error retry | No retry records | Add `ReviewAttempt` and retry/resolution transitions | Retry accuracy and repair rate use only real review records |
| Mastery | No aggregation | Add transparent mastery calculation with sample confidence | Unit tests cover low sample, recency, retries and unresolved penalties |
| Priority Engine | No adaptive priority | Add explainable priority calculation, comfort penalty and maintenance floor | Priority explanation lists contributing signals |
| Daily Prescription | Home page is task list | Add time-budgeted prescription service with blocks and rationale | Total minutes never exceed available minutes |
| Replanning | 30-day list is static | Keep macro plan, derive rolling 7-day plan and today's prescription from current state | New attempts change future blocks without deleting history |
| Score trajectory | No baseline/checkpoint model | Add `ScoreCheckpoint` with source labels and explicit estimate flag | Baseline/latest/target/gap display separately for TOEFL and GRE |
| Vocabulary | No vocabulary queue | Add spaced-review records and due-date calculation | Correct grows interval; incorrect shortens it |
| Focus sessions | Practice form has no session lifecycle | Add session/result records and minimum end-of-session review | Batch results create attempts and errors |
| Import/export safety | Import replaces immediately; no preview/migration | Versioned parse -> migrate -> preview -> confirm flow | Invalid input never overwrites current data |

## Data Migration Risks

1. V1 target/current scores are strings and may contain old TOEFL 0-120 values. They must remain in an explicit legacy field rather than be silently converted to official 1-6 scores.
2. V1 `PracticeEntry` records aggregate many questions. They can be preserved as aggregate history, but cannot be fabricated into individual attempts.
3. V1 `errorTags` are free text. Migration may map known labels to `ErrorType`; unknown labels must become `unknown` with the original text retained in notes.
4. Existing task IDs and completion timestamps must remain stable so historical progress is not deleted.
5. V1 local storage may contain malformed or older shapes. Migration must fail safely and leave the current state untouched.

## Phase 1 Minimal Scope

1. Add V2 entities and typed enumerations without removing V1 interfaces.
2. Add a catalog of official TOEFL/GRE question types and initial skills.
3. Add Zod schemas for V2 entities and a versioned `migrateState` function from V1 to V2.
4. Upgrade the storage adapter to parse, migrate, export and import V2 state while preserving V1 records.
5. Add unit tests for migration, schema rejection, score-source labeling and preservation of legacy data.

## Risks and Mitigations

- **Scope risk:** the request contains many product surfaces; keep algorithms in domain modules and build them behind stable interfaces before changing the UI.
- **Scoring risk:** never infer official TOEFL/GRE scores from raw practice accuracy; store only source-labeled estimates or external scores.
- **Input friction:** use aggregate session entry first, then detail only incorrect questions.
- **Plan churn:** preserve the 30-day macro plan and derive rolling recommendations instead of rewriting history.

## Acceptance Method

Each phase must pass `npm test`, `npm run build`, and `npm run lint`. Phase-specific tests must run against real domain functions. Browser verification will cover onboarding, checkpoint entry, batch practice, error retry, prescription time limits, refresh persistence and import/export after the corresponding UI is wired.
