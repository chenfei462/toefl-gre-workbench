# RLS security evidence

Updated 2026-10-14. Both the real local stack and the dedicated hosted Supabase target passed the security script. These are service-level tests, separate from hosted Preview/browser and CI acceptance.

## Targets and reproducible checks

| Target | Command | Result |
| --- | --- | --- |
| Actual local Auth, PostgreSQL/PostgREST and Storage | `node scripts/cloud-security.mjs` | PASS |
| Free hosted project `vcfpdxpprugrgmmilahm` | `node scripts/cloud-security.mjs --hosted` | Fresh PASS after migration 3 |

The hosted project is in organization `qbiwuksbgkgymwoytidr`, region `ap-northeast-1`, API `https://vcfpdxpprugrgmmilahm.supabase.co`. Pre-migration inspection found no workbench tables/functions, buckets or relevant policies. All three exact repository migration files and hosted history versions `202610140001`–`202610140003` were confirmed. Hosted inspection confirmed `workbench_snapshots` RLS enabled and both storage buckets private. The acceptance accounts are two isolated test accounts, not learner accounts.

The script authenticates A/B with the public client and their own sessions. Access assertions do not use a service-role bypass. Local configuration is retrieved into memory; hosted mode reads ignored target/public configuration and isolated test credentials privately, verifies the exact project/account IDs, and never prints credential values. Hosted reruns remove only those test users' snapshot rows and test-owned objects, so use that mode only against the verified dedicated fixture target. If a run fails before cleanup, inspect and remove only its identified fixture artifacts; the script does not guarantee cleanup in a finally block.

## Executed assertions

- A/B can create/read/update through CAS and delete their own snapshots; owner deletion is verified by read-back.
- A cannot select, insert as, update or delete B's snapshot. Anonymous snapshot SELECT and RPC access are denied. A filtered RLS read/update/delete can return an empty result rather than an HTTP error; assertions check the data outcome.
- Two bounded simultaneous RPC writes at the same base produce exactly one success and one **PT409 / HTTP 409** conflict; the loser does not silently overwrite the winner.
- In both `speaking-recordings` and `study-materials`, A cannot download or generate a signed URL for B's file, upload into B's prefix, update it or upsert over it. Anonymous download is denied.
- Attempted unauthorized deletion leaves B's object present, with its original bytes. Owner upload/download/delete succeeds, and deletion is confirmed by a failed read-back.

The fixture payload checks SQL envelope/ownership/CAS rules. It is not a full study snapshot and does not replace the application's checksum, schema or business validation tests.

## Hosted conflict repair

The original deliberate `40001` exception triggered a hosted retry/hang. Supabase documents this PostgREST 14 issue and recommends HTTP-mapped `PT` exceptions; existing looping backends require separate cleanup. [Official Supabase guidance](https://supabase.com/docs/guides/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b).

`202610140003_conflict_http_status.sql` replaces the trigger/RPC function bodies with **PT409** for intentional revision conflicts while retaining ownership predicates, invoker security, empty search paths, row identity/timestamps and grants. Migrations 1 and 2 remain unchanged. The client also recognizes legacy `40001`, rereads the winner and preserves both snapshots. Independent source review accepted this repair; the fresh hosted HTTP-409 race result verifies the applied behavior.

## Evidence limits

This proves the tested policies and concurrency on the specified service targets. It does not certify a different Supabase project, physical microphone, complete hosted app acceptance, real GitHub Actions run or seven-day learner use. Keep those gates open in [FINAL_ACCEPTANCE.md](FINAL_ACCEPTANCE.md).
