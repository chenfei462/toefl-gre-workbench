# V2 Gap Analysis — TOEFL / GRE 30-Day Score Improvement OS

> PHASE 0 deliverable. Written from a direct read of the repository on the day of the audit.
> Every command in this document was executed in this repository.

## 1. Repository Facts (verified, not assumed)

| Fact | Evidence |
| --- | --- |
| Build tool: Vite 8 | `vite.config.ts`, `package.json` |
| Framework: React 19 + TypeScript ~6.0.2 | `package.json`, `tsconfig.app.json` |
| Package manager: npm | `package-lock.json` present, no pnpm/yarn lock |
| Test runner: Vitest 5 + jsdom + @testing-library/react | `package.json`, `src/questionDatabase/ui.test.tsx` |
| Linter: oxlint 1.x | `.oxlintrc.json`, `npm run lint` |
| Routing: React Router `BrowserRouter` | `src/main.tsx` |
| Git | **Not a repository at audit time.** Initialised by the Captain during PHASE 0; a baseline commit was created before any production change. |
| Test files | 8 files, 40 tests — all passing |
| Source files | 39 files under `src/` |

### Real gate commands (confirmed by execution)

```bash
npm run lint      # oxlint            -> 0 warnings, 0 errors, 35 files
npm run build     # tsc -b && vite build
npx tsc -b        # typecheck only (currently reachable only as part of build)
npm test          # vitest run
```

There is **no** `test:e2e`, no Playwright, no Cypress, and no coverage script.
Any task that references such a command would be inventing infrastructure; this plan does not.

## 2. What Already Exists (V1 + partial V2) — MUST BE REUSED

The repository is **not** a greenfield V1 todo app. A substantial V2 foundation is already
present and working. The protocol requires reuse, not rewrite.

### Existing and functional

- **Storage adapter** — `src/storage.ts`: localStorage under `toefl-gre-workbench:v2` with a
  V1 key fallback, Zod validation (`v2Schema`), and `migrateState()` producing
  `legacyPracticeEntries`. Workbench export/import exists.
- **Router** — React Router installed and mounted in `src/main.tsx`; `App.tsx` reads
  `location.pathname` and navigates via `useNavigate`.
- **Onboarding** — `Onboarding` in `src/App.tsx` captures exams, start date, minutes, targets.
- **30-day plan** — `src/domain.ts` `generatePlan` + `defaultTemplate`, rendered by `Plan`.
- **Resources, Practice records, Weekly review, Settings** pages — present in `src/App.tsx`.
- **JSON export** — Settings page exports a full workbench backup.

### Domain model already defined (`src/types.ts`)

Already present: `Skill`, `Attempt`, `ErrorRecord`, `ReviewAttempt`, `SkillMastery`,
`ScoreCheckpoint`, `VocabularyItem`, `DailyPrescription`/`DailyPrescriptionBlock`,
`QuestionSource`, `Question`, `QuestionOption`, `QuestionAnswer`, `AnswerExplanation`,
`Passage`, `QuestionMedia`, `QuestionRevision`. Per-question personal state is currently
folded into `Attempt` + `ErrorRecord` rather than a distinct `UserQuestionState` (see G-6).

### Algorithms already implemented

- `src/algorithms/mastery.ts` — weighted mastery with evidence weighting, recency, retry
  accuracy, consistency, time efficiency, unresolved-error penalty, sample-size cap and
  low/medium/high confidence.
- `src/algorithms/priority.ts` — weakness + unresolved + review-due + exam urgency + target
  gap, with comfort penalty.
- `src/algorithms/prescription.ts` — time-budgeted blocks that never exceed `availableMinutes`.
- `src/algorithms/spacedReview.ts`, `src/algorithms/practiceSet.ts`.
- `src/questionDatabase/planning.ts` — `planForDate()` wiring mastery → priority → prescription.

### Question database already implemented

- `src/questionDatabase/schema.ts` — Zod `questionSchema` including `CURRENT_TYPES` covering
  the full TOEFL 2026 and GRE taxonomy required by the protocol.
- `src/questionDatabase/domain.ts` — content hashing, normalization, validation, duplicate
  detection, answer-conflict → `disputed`, freshness, evidence weights, false-official guard.
- `src/questionDatabase/repository.ts` + `indexedDbRepository.ts` — `QuestionRepository`
  interface, IndexedDB implementation with transactions, revision snapshots on conflict.
- `src/questionDatabase/ingestion.ts` — JSON/CSV parsing with `CSV_TEMPLATE`.
- `src/questionDatabase/learning.ts` — attempt recording, retry with 1/3/7/14 intervals,
  batch session recording.
- `src/questionDatabase/Capture.tsx` / `Batch.tsx` / `ErrorLabPage` / `QuestionBankPage` /
  `NextPlan.tsx`.
- `data/official-sources/sources.json` — official source seed metadata.

## 3. Gaps — Ranked by Effect on Real Score Improvement

| ID | Gap | Why it matters for score improvement | Status |
| --- | --- | --- | --- |
| G-1 | **`App.tsx` never calls `QuestionRepository`; the Question Bank lives in a parallel IndexedDB store while attempts/errors live in localStorage.** The P0 chain is split across two persistence systems joined only by `questionId` strings. | If the two stores drift, the priority engine silently trains on phantom data. Largest data-integrity risk in the product. | **OPEN — P0** |
| G-2 | **No `typecheck` script.** `tsc -b` is reachable only as part of `build`. | Gate 63 requires TypeScript as its own gate. | **OPEN — P0** |
| G-3 | **No adaptivity acceptance harness.** Protocol §52–55 demand a reproducible profile-injection test (TC 48% must outrank Algebra 88%, retry accuracy 80%, Geometry 62→83 must reduce allocation). | The central product claim — "the planner is adaptive, not a static task list" — is currently **unproven**. | **OPEN — P0** |
| G-4 | **`prescription.ts` hardcodes `exam: 'gre'` for the error-review block and infers `section` by `skillId.includes('algebra')` string matching**; `priority.ts` has no `explainPriority()`. | TOEFL blocks can be mislabelled GRE/verbal; §25 requires `explainPriority()`. | **OPEN — P0** |
| G-5 | **`calculateSkillPriority` computes `accuracy` from raw unweighted attempts** while `mastery` is evidence-weighted; the two disagree, and the priority "Recent accuracy" reason prints the unweighted value. | Priority can rank a low-evidence skill above a genuinely weak one, and the explanation can contradict the score. | **OPEN — P0** |
| G-6 | **No `UserQuestionState` persistence.** Per-question personal state is derived on the fly, never stored. | §15 lists it as required; without it, per-question history cannot survive a question edit or revision. | **OPEN — P1** |
| G-7 | **Reference-only flow is incomplete in the UI.** `Capture.tsx` can create a reference question, but the only low-friction entry is the Error Lab "补充题号与错因" path, and the import preview lacks an explicit rights-aware confirm gate. | §19 requires reference-mode entries to reach Error Lab → Mastery → Priority → Prescription. | **OPEN — P1** |
| G-8 | **No score trajectory / rolling replanning surface.** `ScoreCheckpoint` is stored but baseline/latest/target/gap/trajectory is never computed or displayed, and the §28 7-day rolling window is not derived. | The user cannot see how much ground remains, and the macro plan never adapts. | **OPEN — P0** |
| G-9 | **Dashboard does not answer the §14 five questions.** `Today` shows a priority card but not "current score / gap / most dangerous skill / first action / why" as a coherent first screen. | §56 defines product quality by exactly these answers. | **OPEN — P0** |
| G-10 | **Mobile UX unverified.** Responsive CSS exists in `App.css`, but there is no evidence of a mobile pass over Today / Quick Error / Focus Session / Vocabulary / Retry. | §15 of the phase list is unverified. | **OPEN — P2** |
| G-11 | **`storage.ts migrateState` does not validate the V1 shape before casting.** `raw.profile as unknown as UserProfile` accepts anything, and `storage.load()` swallows a Zod failure into an empty state. | §37 forbids silent data loss; a malformed blob could discard a user's entire history. | **OPEN — P1** |
| G-12 | **Missing protocol §49 documents.** Present: `V2_GAP_ANALYSIS`, `V2_ARCHITECTURE`, `V2_SCORING_AND_MASTERY`, `V2_ADAPTIVE_PLANNER`, `V2_TESTING`, `V2_USER_GUIDE`, `QUESTION_DATABASE_AUDIT`, `QUESTION_DATABASE_USER_GUIDE`. Missing: `QUESTION_BANK_GAP_ANALYSIS`, `AGENT_TEAM_EXECUTION_PLAN`, `QUESTION_DATABASE`, `DATA_PROVENANCE`, `V2_TESTING` update, `AGENT_TEAM_EXECUTION_REPORT`, `AGENT_TEAM_FINAL_REPORT`. | Documentation gate. | **OPEN — P0** |

## 4. Non-Gaps (verified as already satisfied — do NOT rebuild)

- TOEFL 2026 and GRE question-type coverage in `CURRENT_TYPES` is complete against §13/§14.
- Duplicate protection via `UNIQUE(sourceId, sourceQuestionId)` locator plus `contentHash`
  fallback is implemented, and never auto-deletes (surfaces `possible_duplicate`).
- Answer conflict → `verificationStatus = disputed` plus `excludeFromMastery = true` is
  implemented in `mergeQuestionImport`.
- Source tier A/B/C/D, rights status, and the "false official" guard (`isOfficialSource`,
  requiring `sourceType === 'official'`, `publisher === 'ETS'`, `verified`, and an `ets.org`
  URL) are implemented.
- Freshness is computed from `examVersion` + format compatibility, **not** `createdAt`.
- Spaced review 1d/3d/7d/14d with reopen-on-failure is implemented in `learning.ts`.
- Mastery already refuses `2/2 → 100` via `sampleCap` (55 / 78 / 90 / 100).

## 5. Data Migration Risks

1. **Dual-store drift (G-1)** — highest risk. `attempts`/`errorRecords` in localStorage
   reference `questionId` values owned by IndexedDB. Migration must reconcile, never overwrite.
2. **V1 score scale collision** — V1 TOEFL targets may be 0–120 strings. `createExamProfiles`
   coerces >6 to 5.5 and drops the baseline, marking `baselineSource: 'legacy'`. This must stay
   explicit and must never present a legacy value as an official TOEFL 1–6 score.
3. **Aggregate → individual fabrication** — V1 `PracticeEntry` aggregates must **never** be
   expanded into individual `Attempt` records. They stay in `legacyPracticeEntries`.
4. **Free-text `errorTags`** — map known labels to `ErrorType`; anything else becomes
   `unknown` with the original text preserved.
5. **Task ID stability** — `StudyTask.id` and `completedAt` must survive migration so task
   history is not destroyed.
6. **Malformed V2 blob** — `parseWorkbenchState` throws on Zod failure and `storage.load()`
   catches to `null`, which renders an empty state. Must fail safe into an explicit recovery
   path rather than silently discarding history (G-11).

## 6. Decisions Taken by the Captain (autonomous; user unavailable)

| # | Decision | Rationale |
| --- | --- | --- |
| D-1 | Keep the existing localStorage workbench state as the single source of truth for attempts/errors/mastery/vocabulary/checkpoints; treat IndexedDB strictly as the question-bank store reached only through `QuestionRepository`. | Lowest-risk path. A full storage rewrite risks user data and is not justified by any reviewer finding. |
| D-2 | Add a `typecheck` npm script rather than inventing a new toolchain. | §42 requires real commands; adding the missing one is additive and safe. |
| D-3 | Prove adaptivity with a Vitest acceptance test over the real `planForDate` pipeline, not a browser E2E framework. | The repo has no E2E infrastructure; building one would be inventing infrastructure and would delay P0. A test over the real pipeline is verifiable evidence. |
| D-4 | Add `explainPriority()` as a pure function returning structured reasons, reusing the existing `reasons: string[]` shape. | Satisfies §25 without breaking the existing UI contract. |
| D-5 | No production deployment, no push, no paid services. | §44, §45. |

## 7. Acceptance Method

Each phase must pass the real repository gates:

```bash
npm run lint
npx tsc -b
npm test
npm run build
```

Plus phase-specific tests executed against real domain functions. Browser verification of
onboarding, checkpoint entry, batch practice, error retry, prescription time limits, refresh
persistence and import/export is required before the final gate. Any surface that cannot be
verified in a browser must be recorded as an explicit known limitation rather than claimed
as passing.
