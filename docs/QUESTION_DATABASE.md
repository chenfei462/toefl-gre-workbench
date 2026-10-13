# Question Database

The question bank is an IndexedDB-backed repository (`toefl-gre-question-bank`) with explicit stores for questions, sources, passages, explanations, media, and revisions. The React pages use the repository abstraction; localStorage stores only the workbench learning state and its question-state references.

Question imports are normalized and validated row by row. A full question requires storage rights (`licensed`, `public`, or `user_owned`). A source that only permits citation must be imported as `reference_only`, which stores a locator and provenance without copying protected text. Duplicate IDs, locators, and full-question content hashes produce `possible_duplicate` notices and do not delete an existing record. Answer conflicts mark the record disputed and preserve a revision snapshot.

Question-backed attempts are reconciled with `reconcileQuestionReferences()`. Missing IDs are returned as explicit orphan references. Batch summaries and reference-only attempts are excluded from the durable-row requirement because their provenance is intentionally aggregate or locator-based.

The Question Bank exposes search, import preview/cancel/confirm, source metadata, question detail, record-attempt, personal difficulty, and bookmark controls. `UserQuestionState` is migrated as an additive schema-v2 collection and updated through `src/questionDatabase/userState.ts`.

Verification commands:

`npm test` -> 18 test files passed, 80 tests passed, exit 0.

`npm run typecheck` -> `tsc -b` completed without diagnostics, exit 0.

`npm run lint` -> `oxlint` completed without diagnostics, exit 0.

`npm run build` -> Vite transformed 2342 modules and built `dist/`, exit 0.
