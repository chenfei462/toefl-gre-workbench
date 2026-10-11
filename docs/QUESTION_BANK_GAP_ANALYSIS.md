# Question Bank Gap Analysis

> PHASE 0 deliverable. Scope: the Question Database / provenance pipeline only.
> Read from `src/questionDatabase/*`, `src/types.ts`, `data/official-sources/sources.json`.

## 1. What Is Already Built (reuse — do not rewrite)

| Capability | Location | Verified behaviour |
| --- | --- | --- |
| Question domain types | `src/types.ts` | `QuestionSource`, `Question`, `QuestionOption`, `QuestionAnswer`, `AnswerExplanation`, `Passage`, `QuestionMedia`, `QuestionRevision`, `SourceReference` |
| Zod validation | `questionDatabase/schema.ts` | `questionSchema` + `superRefine`: full storage mode requires a prompt; reference-only requires a locator; duplicate option IDs rejected; answers must reference real options |
| Current-format taxonomy | `schema.ts` `CURRENT_TYPES` | TOEFL 2026 reading/listening/writing/speaking and GRE verbal/quant/analytical_writing all covered |
| Source provenance | `sources.ts`, `data/official-sources/sources.json` | `officialSources` seed, plus `user-manual` (tier D) and `community-recall` (tier D, unverified) |
| Normalization | `domain.ts` `normalizeQuestionImport` | Accepts `{questions:[...]}` or a bare array; upgrades legacy `correctAnswer`/`verificationStatus`/`compatibility` shapes |
| Answer verification | `domain.ts` `validateQuestionImport` | Rejects `answer.verification === 'official'` from non-ETS sources (`false_official`); rejects full-storage questions from unlicensed sources (`rights_unknown`) |
| Duplicate detection | `domain.ts` `previewQuestionImport` | ID, source locator and content hash; emits `possible_duplicate`, never deletes |
| Answer conflict | `repository.ts` `mergeQuestionImport` | Differing answers for the same locator → `verification: 'disputed'` + revision snapshot |
| Evidence weighting | `domain.ts` `EVIDENCE_WEIGHTS`, `getQuestionEvidenceWeight` | official 1, verified 0.85, user-owned 0.8, third-party 0.65, community/unknown 0.3, disputed 0 |
| Freshness | `domain.ts` `calculateFreshness` | Derived from `examVersion` + format compatibility, **not** `createdAt` |
| Repository abstraction | `repository.ts` / `indexedDbRepository.ts` | `QuestionRepository` interface; IndexedDB `toefl-gre-question-bank` v2 with stores `questions, sources, passages, explanations, media, revisions`; validation and dedupe execute inside the same readwrite transaction |
| Ingestion parsing | `questionDatabase/ingestion.ts` | JSON and CSV with a `CSV_TEMPLATE` |
| Reference bundle parsing | `questionDatabase/bundle.ts` | Zod parsers for sources, passages, explanations, media, revisions |

## 2. Gaps

| ID | Gap | Impact | Severity |
| --- | --- | --- | --- |
| QB-1 | **The question bank is not reachable from the priority pipeline.** `QuestionBankPage` writes to IndexedDB; `planForDate` reads only localStorage `state.attempts`. Nothing enforces that a question a user practised still exists. | An attempt can cite a deleted/never-stored question and still drive mastery and priority. Provenance is decorative rather than load-bearing. | **P0** |
| QB-2 | **No `UserQuestionState`.** Per-question personal state (times seen, last result, personal difficulty, bookmarked) is recomputed from attempts each render and never stored. | Cannot answer "have I already done this exact question?" reliably, and question edits orphan history. | P1 |
| QB-3 | **Question set / practice-set provenance is thin.** `practiceSet.ts` generates sets, but the generated set is not persisted with its member question IDs and selection rationale. | The user cannot reproduce which questions produced a score checkpoint. | P1 |
| QB-4 | **`passages`, `explanations`, `media` stores are declared and parsed but have no write path from the UI.** Only `revisions` is written (on conflict/edit). | Reference-mode import of a passage is not possible through the interface. | P1 |
| QB-5 | **CSV ingestion has no explicit duplicate/rights confirm gate in the UI.** Preview exists; the confirm step does not state consequences for `rights_unknown` or `disputed` rows. | A user could confirm an import that silently produces disputed rows. | P2 |
| QB-6 | **Source seed coverage is not audited against live ETS resources.** `data/official-sources/sources.json` exists but its URLs and `lastVerifiedAt` values have not been re-verified in this session. | Provenance metadata could be stale. Network access is available; verification is in scope. | P1 |

## 3. Rights and Source Boundary (enforced by code, verified)

Enforced rejection paths:

- `rights_unknown` — a `full` storage-mode question from a source whose `rightsStatus` is not
  in `['licensed', 'public', 'user_owned']` is an **error**, not a warning.
- `false_official` — `answer.verification === 'official'` requires `isOfficialSource()`:
  `sourceType === 'official'`, `publisher === 'ETS'`, `verified === true`, and an `https://*.ets.org/` URL.

Permitted by design: public official samples, the user's own training data, personal
references to material the user owns, official links, and reference-only records.

Explicitly out of scope and never implemented: bypassing login or paywalls, cracking exam
platforms, bulk-copying paid question banks, scraping content the user has no right to, or
downloading official audio without a save licence.

## 4. Reference Mode Contract

Reference-only records must carry: `sourceId`, `sourceSection`, `sourceQuestionId`,
`questionType`, `skillIds`, the user's answer, the correct answer, time, error type, and a note.
They must reach Error Lab, Mastery, Priority and Daily Prescription exactly like a full
question, but with a reduced `evidenceWeight` (user-owned 0.8, unknown 0.3) so they cannot
masquerade as official evidence. `domain.ts` already implements the weighting; the UI gap is QB-4.

## 5. Acceptance Criteria for the Question Bank Work

1. A question that an attempt references either exists in the repository or the attempt is
   explicitly marked as an orphan reference; no silent phantom question IDs.
2. A disputed-answer question never contributes to mastery (already true) and is visible as
   disputed in the UI.
3. Importing a full-storage question from a source without storage rights fails with
   `rights_unknown` and changes nothing in the database.
4. Importing an identical question twice produces exactly one record and one
   `possible_duplicate` notice; no automatic deletion occurs.
5. Two sources disagreeing on an answer produce `verification = 'disputed'` and a revision
   snapshot preserving the previous value.
6. Every persisted question resolves `provider`, `source`, `sourceType`, `sourceTier`,
   `examVersion`, `rightsStatus`, `publishedAt`/`retrievedAt`, `lastVerifiedAt`, and
   `verificationStatus` — or the missing field is explicitly reported, never displayed as
   "网上" or a blank.

## 6. Verification Commands

```bash
npm test -- src/questionDatabase
npm run lint
npx tsc -b
```
