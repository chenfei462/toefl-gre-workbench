# Independent cloud safety review

Date: 2026-10-14. Reviewer: independent read-only cloud-review agent.

## Result and scope

The local-first safety repairs below passed the final source review, with no unresolved P0/P1 source issue observed. A subsequent hosted CAS check identified a P1 conflict-response retry issue; the additive repair also passed independent source review, but applied-schema verification and the hosted rerun remain release gates. This source review does not establish hosted-service, deployment, CI, or seven-day-pilot acceptance.

Reviewed snapshot/CAS transport, account UI, scoped Supabase clients, binary transfer and local stores, restore journal and startup recovery, revision metadata, question-bank export/replacement, business/schema validation, SQL ownership policies, feedback persistence, and their relevant regression tests. Implementation changes were made by the main agent and offline-gate agent. This reviewer only created this report.

## Findings repaired during review

- Reset reused local revisions and accepted stale editor writes. The atomic monotonic reset marker and guarded reset prevent that ABA case.
- Startup loading rewrote stale learning JSON with another tab's newer revision. Loading is now read-only, and `loadRecord()` captures state and revision from the same raw record. App initialization uses that captured revision.
- A delayed account-A conflict or preview could reappear after switching to account B. User-bound conflict records and account-generation checks discard stale results.
- The shared Supabase client could verify account A, then send its snapshot RPC with account B's session token. Each operation now uses a captured-token client and `getUser(capturedToken)`, including focus reads. Operation clients are disposed after use.
- Question-bank writes bypassed the restore lock, allowing unseen imports to be erased. Public bank and binary mutators now share the local-write boundary; restore compares the bank captured by the preview. Export reads all six bank stores in one transaction and stabilizes source ordering.
- Assets were imported before stale-preview, account, and recovery checks. Downloads now finish outside the local-write lock; fresh collision checks and token-tagged additions commit under the lock after journal creation. Rollback removes only that restore's additions.
- Already-open tabs could save after a restoring tab crashed, then lose those writes during startup rollback. A durable pending marker precedes journal creation and guards saves, resets, bank changes, and binary changes. Handled initial journal-write failure clears the marker without blocking later local saves.
- Invalid calendar values and duplicate bank/manifest IDs passed integrity validation. Calendar and uniqueness checks now reject those values before replacement.
- Bank-only edits could continue displaying Synced. A separate write-ahead bank version now participates in checkpoints. Sync captures it with the bank under the local-write lock and acknowledges that captured version after uploads, so later bank changes remain pending.

Feedback validation and backup roundtrip retain the actual recommended skill/minutes without changing learning evidence or recommendation weights.

## Independent evidence

The reviewer ran four read-only reproductions against actual implementation modules or the installed SDK:

1. Before the reset repair, revision 1 was reused after reset/onboarding and an old tab successfully overwrote the new plan.
2. The installed Supabase SDK selected the session token at request time. An actual transport call authorized A but sent `Bearer token-B`; the row parser only rejected the acknowledgement afterward. Explicit captured Authorization sent token A for both Auth verification and RPC.
3. Before the startup repair, an interleaved save of 90 minutes/revision 2 was replaced by an older loaded 45-minute state stamped revision 2. After the repair, `loadRecord()` retained the captured revision 1, preserved the newer 90-minute/revision-2 record, and its stale save was rejected.
4. With the bank-checkpoint repair, a current-bank acknowledgement reports Synced. A delayed acknowledgement of an older bank at the same cloud revision reports Pending rather than falsely reporting Synced. An older cloud revision is ignored. The snapshot checksum fast path can repair a conservative pending stamp without creating a new cloud revision.

A malformed task calendar value also passed the previous business schema and caused the existing date-fns plan renderer to throw; the revised calendar tests cover that case.

The relevant regression tests now include delayed account results, actual SDK Authorization behavior, reset/stale-reset, exact bank-preview changes, imports queued during restore, local saves during download staging, pending recovery guards, journal quota failure, token-owned partial binary rollback, duplicate IDs, calendar validation, feedback backup roundtrip, bank-only pending status, write-ahead stamp failure, and bank changes during both sync and keep-local uploads. The offline-gate agent reported 50 targeted tests passing. The main agent owns full-suite and browser verification; this reviewer did not rerun the full suite.

## Limits

The bank-only status observation is resolved. A delayed acknowledgement at the same cloud revision can conservatively show Pending for an already-synced bank; the next explicit sync repairs that checkpoint through checksum comparison. No false-Synced result was observed in the independent delayed-acknowledgement reproduction.

The main agent reported a hosted same-base CAS loser request hanging. The original functions intentionally raise SQLSTATE `40001`; Supabase documents an infinite-retry bug for that code in PostgREST 14 and recommends an HTTP-mapped `PT409` exception. Additive migration `202610140003_conflict_http_status.sql` passed independent source review: it replaces both guard/RPC bodies, changes all intentional revision conflicts to `PT409`, and retains signatures, invoker security, empty search paths, ownership/CAS predicates, row identity, timestamps, and RPC grants. The client accepts `PT409` and legacy `40001`, rereads the winner, and durably preserves both snapshots. Parameterized tests retain those winner assertions. The real-stack script now bounds both competing RPCs to 15 seconds and requires one success and one `PT409`/HTTP-409 loser. Applied-schema and hosted rerun evidence are pending. Existing in-flight retrying requests require separate backend cleanup; replacing the function alone does not stop them. [Official Supabase guidance, edited 2026-10-13](https://supabase.com/docs/guides/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b).

No SQL ownership-policy bypass was identified by source inspection. The existing security script exercises actual local-stack Auth, CAS races, and cross-user private storage. Those results do not establish a hosted project's policies. Browser crash timing, real expired-session behavior, service-unavailable cases, and hosted deployment need their own execution evidence. The OCR CLI's configured LLM check returned HTTP 403, so this review used direct code inspection and local reproductions rather than its remote model.
