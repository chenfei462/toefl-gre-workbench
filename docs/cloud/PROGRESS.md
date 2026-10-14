# Cloud implementation progress

Latest final-tree update: 2026-10-14, 247 tests / 56 files PASS; typecheck, lint and build PASS (816.76 kB JS / 238.98 kB gzip). Final development E2E: 14 passes plus two explicitly separate production cases; production offline/reconnect tests: 2/2 in 25.0 s. Latest protected Preview `dpl_48nmVndhFjhbWbxKpYk9Nkd9D2Yc` at https://toefl-gre-workbench-l4yf6lnhk-hahayulu.vercel.app passed both hosted UI tests, including private assets, exact complete-bank/user-state restoration, simulated auth/upload faults and real two-device conflict. Real local and hosted security scripts passed with PT409. Git whitespace check passed.

**CLOUD_ACCEPTED:** published code SHA 96108fc33c3ff99d7239a8ae1819ef32d9400455 passed both actual [Actions jobs](https://github.com/chenfei462/toefl-gre-workbench/actions/runs/38541864819). Production dpl_HqAkWBKTsikCBgw1N1xkk9KfgACa passed both hosted UI cases and was promoted to https://toefl-gre-workbench.vercel.app; canonical mobile/offline smoke passed. [PR #1](https://github.com/chenfei462/toefl-gre-workbench/pull/1) remains draft and original local history is retained. Real seven-day learning remains NOT_STARTED. The checkpoints below are historical; current evidence is [FINAL_ACCEPTANCE.md](FINAL_ACCEPTANCE.md).

Updated 2026-10-14. Latest full local regression was verified at 17:30 JST. Release status is **CLOUD_REJECTED** while full Preview acceptance and a real GitHub Actions run remain unverified. See [FINAL_ACCEPTANCE.md](FINAL_ACCEPTANCE.md) and the exact [user controller](USER_REQUIREMENTS.md).

## Verified implementation and local gates

- Typecheck, lint and build: PASS. Vitest: **56 files / 245 tests PASS**.
- Build output: **816.40 kB JavaScript / 238.84 kB gzip**. The existing Vite >500 kB warning remains P2.
- Development browser suite with the real local Supabase stack: **14 PASS / 2 explicitly skipped**, 57.2 seconds. The two skips require the production build and are covered separately below.
- Production-build offline suite with the real local Supabase stack: **2 PASS**, 26.4 seconds. The visible UI imported 20 user-authored questions, submitted 13 correct / 7 wrong, retried three distinct errors and reviewed 20 vocabulary items. The resulting 40 attempts / 33 correct, seven errors, three retries and 20 vocabulary reviews survived offline reload, reconnect, sync and exact business-state restoration in a fresh browser.
- Real local Auth A/B, snapshot ownership/CAS and both private buckets: PASS. A separate cross-device browser case restored the profile, tasks, question states, three vocabulary reviews, mock/checkpoint, TXT material and valid WAV fixture. It also tested explicit conflict resolution, simulated expired-auth rejection and simulated failed storage transfer preserving local playback.

The React/Vite study engine remains local-first. Cloud services, canonical checksums, portable question bundles, account-scoped revision checkpoints, immutable binary transfers, explicit restore/conflict choices, restore journals and stale-tab guards are implemented. Independent source review accepted the data-safety repairs and the additive hosted conflict repair; its scope and limitations are in [INDEPENDENT_REVIEW.md](INDEPENDENT_REVIEW.md).

A later local-save/unload guard was independently reviewed with five targeted tests passing at 17:52:49 JST. It warns for queued writes and failed memory-only edits. That change postdates the 17:30 full gates and earlier Preview build; full final-tree regression/build and an updated Preview smoke must be recorded before release. See [PENDING_SAVE_REVIEW.md](PENDING_SAVE_REVIEW.md).

## Verified hosted service

The dedicated **Free** Supabase project is `vcfpdxpprugrgmmilahm`, organization `qbiwuksbgkgymwoytidr`, region `ap-northeast-1`, API `https://vcfpdxpprugrgmmilahm.supabase.co`. The original inventory was empty of workbench tables/functions, buckets and relevant policies. The exact three repository migration files were applied through the Management API, and history versions `202610140001`–`202610140003` were confirmed. Snapshot RLS is enabled and both buckets are private.

`node scripts/cloud-security.mjs --hosted` freshly passed with the two isolated acceptance accounts: own snapshot CRUD, cross-user and anonymous denial, exactly one successful same-base CAS write plus one **PT409 / HTTP 409** loser, and private recording/material isolation. This certifies that target's tested service rules; it does not prove the built app's full hosted Preview flows.

The original intentional SQLSTATE `40001` caused the hosted PostgREST 14 request to retry rather than return a conflict. Additive migration 3 changes intentional conflicts to `PT409`; migrations 1 and 2 were not rewritten. See [RLS_SECURITY.md](RLS_SECURITY.md).

## Open release and pilot gates

The Vercel Hobby project `prj_wYsMcfoSI6Du1eZJ8N6uksRaB4fH` is linked under team `hahayulu`; both public Supabase variables are configured for Preview and Production. A true Preview is READY: [toefl-gre-workbench-g50o93og4-hahayulu.vercel.app](https://toefl-gre-workbench-g50o93og4-hahayulu.vercel.app), deployment `dpl_DYerWXx5sKQGGaf3q5CsFbmwKvCB`. The local-only mobile 390×844/offline-reload hosted smoke passed in 6.6 seconds; the complete hosted cloud flow remains pending. Vercel Authentication protection remains enabled. Two unintended initial Production artifacts were removed only after this Preview was confirmed; there is currently no Production target. See [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md).

There is no actual pushed implementation, PR or successful Actions run to cite. The previous GitHub connector was for `yuluchen03-dev` without push access and has been removed; connecting the intended `chenfei462` account remains pending. The workflow implementation and local gates cannot be labeled `CI CLOUD PASS`.

Recommendation feedback schema, Today UI and manual-backup roundtrip are tested. Feedback uses a known prescribed skill and explicit rating/verdict; mastery, priority and prescription weights remain unchanged. **The real seven-day pilot has not begun or completed.** Record actual use in [PILOT_LOG.md](PILOT_LOG.md) after release acceptance.
