# Question database audit and continuation plan — 2026-10-11

The user has authorized the full ingestion and adaptive learning specification in the previous chat. This continues that implementation in the existing desktop directory; it is not a Git checkout.

## Current state and gaps

React/Vite, Zod and 17 passing domain tests exist. Questions have a separate IndexedDB store, but transaction completion is not awaited, sources are empty inside the repository, and duplicate detection trusts incoming hashes. Import can crash on malformed rows. Reference-only rows without prompts collide. Attempt schema strips question/source/session/answer fields during reload. Batch entries label unspecified sources official. Retry unconditionally resolves an error. Mastery uses array insertion order and ignores evidence quality. Search, details, source catalog and practice generation are incomplete.

## Migration risk and storage recommendation

Retain schema version 2 and all existing fields. Add optional question answer variants, provenance and evidence fields. Default new collections on older backups. Keep user profile and current learning history behind the existing storage adapter; put question payloads, source catalogs, passages, explanations, media and revisions in IndexedDB. Do not copy large question bodies into localStorage. Import/export the question database separately.

## Files, phase plan and acceptance

1. `questionDatabase/schema.ts`, `domain.ts`: validate rows individually, canonicalize supported aliases and answer variants, recompute hashes, preserve reference locators and show actionable issues. Tests: malformed records, duplicates, unknown sources, format and official labels.
2. `repository.ts`, `indexedDbRepository.ts`: shared filters, durable transactions, catalog and dependent entity persistence, revision snapshots and answer conflicts. Test duplicate ID handling and database reopen.
3. `ingestion.ts`, `sources.ts`, `data/official-sources`: JSON/CSV/paste/manual preview, verified public source URLs and reference templates. Respect reference-only storage.
4. `learning.ts`, `storage.ts`, mastery/priority/prescription: question attempts, batch sessions, wrong-answer details, failed/successful retries, evidence weighting and next-day planning. Acceptance: 20 attempts, 10 errors, 7 vocabulary/2 logic/1 careless, then 8/10 retry success.
5. `QuestionBank.tsx`, `Capture.tsx`, `App.tsx`: global quick capture, searchable question details, latest catalog, explained practice sets and real retry forms. Component tests exercise preview/cancel/confirm and learning workflow.
6. Run unit/integration tests, TypeScript build, lint and browser verification. Record observed limits in the guide; do not call sample links a full mock or invent official scores.
