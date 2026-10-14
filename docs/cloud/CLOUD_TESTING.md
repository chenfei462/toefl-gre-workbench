# Cloud test procedure and evidence boundaries

Latest full local verification: **2026-10-14 17:30 JST**. Typecheck/lint/build PASS; Vitest **56 files / 245 tests PASS**; real-local-service development E2E **14 PASS / 2 production-only skips** (57.2 s); production offline E2E **2 PASS** (26.4 s). JavaScript build output is 816.40 kB / 238.84 kB gzip, retaining the P2 size warning.

These complete gates precede the later pending-save/unload guard. Its independent targeted review passed five tests at 17:52:49 JST; final complete gates and updated Preview evidence must be rerun for the changed tree. See [PENDING_SAVE_REVIEW.md](PENDING_SAVE_REVIEW.md).

## Local static and unit gates

Run from the repository root with a supported Node version:

```powershell
npm ci
npm run typecheck
npm run lint
npm test
npm run build
git diff --check
```

Focused cloud unit tests:

```powershell
npx vitest run src/cloud
```

Coverage includes public/missing/privileged configuration, auth rejection, canonical checksum, supported migration, malformed state/question data, revision/reset/stale writers, account-bound checkpoints/previews, CAS/conflict recovery, failed storage, binary collisions, journal rollback and interrupted restore, bank-only pending state, and feedback/manual-backup roundtrip. Mocked tests do not prove PostgreSQL RLS or hosted configuration.

## Real local services and development browser gate

With Docker and the project's isolated local Supabase stack running:

```powershell
supabase start
node scripts/local-cloud-env.mjs
node scripts/cloud-security.mjs
$env:CLOUD_E2E = '1'
$env:PLAYWRIGHT_PORT = '4187'
npm run test:e2e
Remove-Item Env:CLOUD_E2E, Env:PLAYWRIGHT_PORT -ErrorAction SilentlyContinue
```

The environment helper creates ignored `.env.local` with only the local public endpoint/key and refuses to overwrite it. If already present, privately verify the target and skip creation. Each Playwright run owns a strictly bound server port and a unique artifact directory; run separate invocations sequentially.

The development suite passed 14 tests. Its two offline tests explicitly skip without `PLAYWRIGHT_PREVIEW=1`; those skips are not offline acceptance. The real-service cloud case uses learning-module fixture seeding through dev-server `/src` imports, so it cannot run unchanged against a built hosted Preview.

That cloud case covers profile/tasks, 20 practice attempts/7 errors, three vocabulary reviews, a user-entered mock/checkpoint, question states, study records, TXT material and a valid generated WAV. A fresh context restores them; the material opens and audio reaches playback readiness. Two contexts of the same account edit a shared base, then expose a conflict and explicitly choose the cloud version. Browser-routed HTTP 401 and aborted storage requests simulate auth/storage failure and verify preserved local work/playback. These are not a naturally expired token, live service outage, physical microphone or real learner session.

## Production-build offline and reconnect gate

After building with public configuration for the real local test stack:

```powershell
npm run build
$env:PLAYWRIGHT_PREVIEW = '1'
$env:CLOUD_E2E = '1'
$env:PLAYWRIGHT_PORT = '4189'
npm run test:e2e -- tests/e2e/offline.spec.ts
Remove-Item Env:PLAYWRIGHT_PREVIEW, Env:CLOUD_E2E, Env:PLAYWRIGHT_PORT -ErrorAction SilentlyContinue
```

Both tests passed. One verifies the installed app shell and settings offline reload. The full test uses visible production UI to import 20 user-authored questions, answer 13 correctly/7 incorrectly, retry three distinct errors and review 20 vocabulary items. It verifies **40 total attempts / 33 correct / 7 errors / 3 retries / 20 vocabulary reviews**, retained FSRS due/history, completed session/question states and the visible persistent study history after offline reload.

After reconnect it explicitly syncs to the real local service, restores in a fresh browser and compares every business field and the portable question bank. `_localRevision` is intentionally a browser-local counter and is checked separately. Omitting `CLOUD_E2E=1` runs local offline persistence only and does not certify reconnect/cloud restore.

## Real hosted security gate

```powershell
node scripts/cloud-security.mjs --hosted
```

This command freshly passed against dedicated project `vcfpdxpprugrgmmilahm` after exact migration 3/history verification. It uses two pre-created isolated acceptance users and confirms own/cross-user/anonymous snapshot access, one same-base CAS winner plus one PT409/HTTP 409 loser, and private audio/material read/write/upsert/delete/signed-URL isolation. It mutates only those fixture snapshots/objects; never reuse its fixture credentials for learner data. See [RLS_SECURITY.md](RLS_SECURITY.md).

## Hosted Preview and actual CI

The true protected Preview is [toefl-gre-workbench-g50o93og4-hahayulu.vercel.app](https://toefl-gre-workbench-g50o93og4-hahayulu.vercel.app), deployment `dpl_DYerWXx5sKQGGaf3q5CsFbmwKvCB`, READY. The local-only mobile 390×844/offline-reload case passed (6.6 s). Full cloud UI/auth/restore/storage/conflict acceptance is still pending; a READY build is not that evidence. Keep Vercel Authentication protection enabled and use authorized test access described in [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md).

The existing workflow was extended with install/static/unit/build/development E2E, production offline E2E, and a separate real local Supabase security/restore/offline-reconnect job using CLI 2.120.0. It has not executed on the updated implementation. Record an actual successful Actions URL and exact source SHA before writing `CI CLOUD PASS`; local commands prove only local gates.

Record final results in [FINAL_ACCEPTANCE.md](FINAL_ACCEPTANCE.md). Seven dated fixtures or simulated histories cannot complete the [real pilot](PILOT_LOG.md).
