# Cloud baseline

Inspected 2026-10-14. Branch `codex/study-os-integration`; HEAD `08aab5c`. Working tree clean before this phase. No Supabase client, migrations, environment files, or Vercel binding/configuration were found in the workspace. This is not evidence about remote accounts.

Fresh commands: typecheck PASS; lint PASS; Vitest 37 files / 161 tests PASS; production build PASS (570.01 kB JS, 174.10 kB gzip; existing >500 kB warning); Playwright 9/9 PASS in 38.2 seconds; git diff --check PASS. These are local results, not a GitHub Actions run.

The application stores WorkbenchState in localStorage through src/storage.ts, with V1 migration and recovery preservation. Question data and binary assets use IndexedDB. The backup parser must be reused by cloud snapshots. Existing validation has broad record schemas which need scrutiny before trusting remote payloads.

Existing CI runs npm ci, typecheck, lint, test, build and Chromium E2E. Playwright currently shares port 4173 and the default output directory across invocations; run sequentially until isolation is improved. No unrelated user modifications were present.

This is the initial audit/baseline record, not the latest release result. Subsequent verified implementation now has 56 files / 245 unit tests, static/build gates, real-local-stack browser/offline/reconnect/restore gates and dedicated hosted A/B RLS/CAS/private-storage checks passing. A true protected Preview is READY with local/mobile/offline smoke passing. Complete hosted cloud Preview smoke, actual Actions and learner use still require their own evidence; the current **CLOUD_REJECTED** status is recorded in [FINAL_ACCEPTANCE.md](FINAL_ACCEPTANCE.md) and latest progress in [PROGRESS.md](PROGRESS.md).
