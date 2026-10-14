# Cloud acceptance — 2026-10-14

**Status: CLOUD_ACCEPTED. Real seven-day learner pilot remains NOT_STARTED.**

The original controller is preserved in [USER_REQUIREMENTS.md](USER_REQUIREMENTS.md). Local, hosted, actual GitHub Actions and Production application gates have passed. Automated acceptance is not seven actual learner days.

| Gate | Fresh evidence | Result |
| --- | --- | --- |
| Typecheck / lint | Final pending-save guard tree | PASS |
| Unit / integration | 56 files, 247 tests; 17:53 JST, 31.15 s | PASS |
| Build | JS 816.76 kB / gzip 238.98 kB; PWA seven entries; existing size warning P2 | PASS |
| Development browser | Real local Supabase, 14 passes, two production-only cases explicitly skipped; 1.1 min | PASS |
| Production offline browser | Two passes, 25.0 s; 20 questions, 13 correct/7 wrong, three retries, 20 vocab reviews; reload, reconnect sync and exact fresh restore | PASS |
| Local security | Real Auth A/B, own/cross-user/anonymous CRUD, CAS, audio/material RLS | PASS |
| Hosted security | Same actual A/B gates; one winner and one PT409/HTTP409 loser; private buckets | PASS |
| Independent review | [Safety review](INDEPENDENT_REVIEW.md), [pending-save review](PENDING_SAVE_REVIEW.md) | No unresolved reviewed P0/P1 |
| Latest hosted browser | Two passes, 1.1 min, on exact Preview below | PASS |
| Git diff whitespace | Fresh exact tree check | PASS |
| GitHub Actions | [Actual successful run](https://github.com/chenfei462/toefl-gre-workbench/actions/runs/38541864819), both verify/cloud jobs; code SHA 96108fc33c3ff99d7239a8ae1819ef32d9400455 | PASS |
| Production | dpl_HqAkWBKTsikCBgw1N1xkk9KfgACa; READY, exact CI code SHA; two full staged browser cases and both complete canonical-domain cases passed, 1.2 min | PASS |
| Real seven-day pilot | [PILOT_LOG.md](PILOT_LOG.md), actual learner rows still empty | OPEN |

## Exact hosted target

Vercel Hobby project `prj_wYsMcfoSI6Du1eZJ8N6uksRaB4fH`, team `hahayulu`. Latest verified Preview:
[Open Preview](https://toefl-gre-workbench-l4yf6lnhk-hahayulu.vercel.app), deployment `dpl_48nmVndhFjhbWbxKpYk9Nkd9D2Yc`, READY / Preview. Authentication protection remains enabled. Two unintended bootstrap Production deployments were removed; their first-deployment behavior is recorded in [deployment notes](VERCEL_DEPLOYMENT.md).

Supabase Free project `vcfpdxpprugrgmmilahm`, Tokyo `ap-northeast-1`, organization `qbiwuksbgkgymwoytidr`. Empty inventory was inspected before applying exact migration files 1–3; history versions match the repository. Snapshot RLS is enabled and both buckets are private. Email confirmation remains required. Site URL is the stable Production URL; redirects include that origin and the latest Preview. Hosted browser accounts were administratively confirmed test fixtures; actual learner confirmation-mail delivery was not exercised.

Production: [toefl-gre-workbench.vercel.app](https://toefl-gre-workbench.vercel.app), deployment `dpl_HqAkWBKTsikCBgw1N1xkk9KfgACa`, created 18:28 JST. The staged Production build carried clean code SHA `96108fc33c3ff99d7239a8ae1819ef32d9400455`. It passed both hosted cases (1.2 min), then was promoted; alias inspection maps the canonical domain to that exact deployment. Anonymous canonical HTTP200, mobile/offline and full canonical cloud/restore/conflict cases passed. Preview authentication protection remains enabled. Transient fixture-login connectivity failures were checked against service reachability/CORS, hosted security and successful complete reruns rather than removing assertions.

Publishing used the connected chenfei462 account. The remote code tree `7c05f6a1a8319265c6b0be2c9b41978d0fe089d0` exactly matched the tested local commit `253b7b1061ee396922b4980b99265dbdcf290481`. Original local Study OS history remains on `codex/study-os-integration`; the published development branch is `codex/cloud-release`, [draft PR #1](https://github.com/chenfei462/toefl-gre-workbench/pull/1). Main was not rewritten or merged.

## Browser evidence and limits

The hosted production UI imports twenty user-authored questions, submits thirteen correct/seven wrong, retries an error, reviews three vocabulary cards, records a clearly labeled mock checkpoint, imports a private TXT and records simulated Chromium microphone audio. It uploads to actual hosted services, logs in from a fresh context, explicitly confirms restore, compares study arrays including question states and complete question bundles, opens private text, and plays downloaded audio.

The same hosted test verifies cloud upload failure leaves local playback available, simulated expired-token HTTP401 leaves local settings/history intact, and actual separate devices modifying the same base surface a conflict and explicitly restore the cloud winner. Its separate mobile/local-only test covers 390×844 layout and offline reload. Network/auth faults are browser-injected responses, not naturally expired sessions or proof of a real provider outage. Audio uses a synthetic microphone, not the user's physical microphone.

Full offline twenty-question/three-retry/twenty-vocabulary reconnect evidence uses the production build with the real local Supabase backend. A separate hosted full offline study/reconnect case is not inferred from hosted shell reload.

Checksum, malformed schemas/dates, duplicate IDs, account-switch request identity, stale tabs/reset, bank edits during uploads, interrupted restore and token-owned partial binary rollback have regression coverage. The pending-save guard is advisory: it protects normal navigation while writes are pending or failed edits remain in memory, not forced process/OS termination.

## Hosted conflict repair

Intentional SQLSTATE40001 caused hosted PostgREST to retry a losing CAS indefinitely. The additive third migration uses PT409 in both guard and RPC, preserving ownership, signatures and CAS. Original migrations 1–2 remain unchanged. Bounded local and hosted security races passed after the repair. [Official Supabase guidance](https://supabase.com/docs/guides/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b).

## Remaining actual-use requirement

Seven actual dated learner sessions remain unfilled in [PILOT_LOG.md](PILOT_LOG.md). Feedback collection is implemented and algorithm weights remain unchanged. The bundle-size warning remains a non-blocking P2; full binary ZIP backup is optional and not implemented.

A database password briefly entered tool output during inspection. It was rotated on the actual hosted project and only the ignored local secret file was updated. No credential is included in source, Git, browser configuration or shared traces.

A later Playwright failure context included a disposable test-account password. Both isolated fixture passwords were rotated on the hosted Auth service, and the hosted test now clears the password UI immediately after submission before an assertion can generate a failure snapshot. Final documentation and fixture snapshot hygiene are a separate follow-up to the verified application commit; they do not alter the deployed application code. Both canonical-domain hosted tests passed after this test change.
