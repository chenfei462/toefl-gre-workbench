# Operations runbook

## Normal daily use

Learning is saved in this browser first. Use the installed/previously loaded app offline, then return online and select **立即同步** in Settings. Keep periodic downloadable JSON backups and separate important recordings/material files. A fresh device should sign in and preview/confirm its cloud backup before creating another plan.

Manual learning JSON backup reuses the state parser and migration. Question-bank export/import is separately available in the question page. Cloud snapshots embed the portable bank and reference uploaded binary objects; local JSON alone does not contain recording/PDF/DOCX bytes. Do not describe a metadata export as a full binary archive.

## Failure response

| Symptom | Safe action |
| --- | --- |
| Missing cloud configuration | Continue local learning; verify the two public Vite build variables and rebuild the intended deployment. |
| Offline or Supabase outage | Continue local work and playback; retry explicit sync once the intended service returns. |
| Expired auth | Keep local data, sign in again, then retry preview/sync. Never clear data to fix authentication. |
| Conflict | Download both study backups, retain local binaries, then choose the viewed local/cloud winner explicitly. |
| Stale editor or blocked IndexedDB | Export current edits, close older workbench tabs, refresh the active browser and retry. |
| Bad checksum/unsupported schema | Preserve the downloaded payload and local state; investigate the source/version before restore. |
| Interrupted restore | Allow startup rollback before editing; close other tabs and retry recovery. |
| Failed binary upload or quota | Keep local playback/files, record the failure, retry on a working service or use a smaller owned file. Do not delete local bytes or upgrade billing implicitly. |
| Same-ID/different-byte asset | Export the local file and restore into a fresh profile; never silently replace the existing bytes. |

Errors/recovery records can contain learning history and private material references. Share only the minimum error/revision/environment information needed for diagnosis; keep tokens, passwords and signed URLs private.

## Release safety

Before deploying, inspect the exact Git diff and target ownership; run the complete gates and independent security review. Confirm no privileged key/admin endpoint is shipped, snapshots have RLS, both buckets are private and hosted two-user denials pass. See [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md).

Apply only reviewed repository migration files after inspecting existing data, buckets, policies and migration history. The dedicated hosted target has all three migration versions confirmed and its real A/B security tests passed. Do not use `drop`, `truncate`, reset, force push or broad Git staging to make a release pass. Local Docker resets and hosted database resets have very different consequences; no reset is part of the normal release procedure.

For intentional revision conflicts, require `PT409` / HTTP 409 after migration 3. A hosted `40001` retry/hang is not an ordinary client conflict: preserve local data, verify the applied function definitions and inspect only the identified looping backend. Do not repeatedly submit the same request or reset learner data. See [RLS_SECURITY.md](RLS_SECURITY.md).

Vercel's first deployment of a new project can select Production even when Preview was requested. Inspect the actual target/READY status before declaring Preview evidence. The confirmed protected Preview and the two removed bootstrap artifacts are recorded in [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md). Production has not been accepted.

A Vercel rollback changes application assets, not the learner database. Keep schema backward compatibility and preserve snapshots/materials during rollback. When a migration/runtime error repeats, isolate and redesign the failing path instead of repeatedly applying destructive repairs.

## Data retention and account scope

Sign-out ends the browser's cloud session while local learning data remains usable. The local reset control returns to onboarding and advances the local revision tombstone; it does not delete the Auth account or certify deletion of cloud snapshots/binary objects. The app currently has no verified account-wide deletion workflow. Browser/site-data clearing can remove local state, audio/materials and recovery records, so take backups first.

Private bucket policies protect access by authenticated user prefix. HTTPS and signed URLs protect transport/access; this is not end-to-end encryption against the hosting operator. Browser users sharing the same OS/profile can access that profile's local learning data.

## Seven-day real pilot

Status: **NOT_STARTED**. After cloud release acceptance, collect seven actual dated learner sessions and recommendation feedback in [PILOT_LOG.md](PILOT_LOG.md). Check no missing data, phone/computer consistency, due errors returning, sensible vocabulary due dates, changed priorities/prescriptions and mock influence on later plans. Record recommendation skill/minutes, rating, verdict and optional note. Collect evidence before calibrating weights; do not change mastery/priority weights from one or two days of feedback.

The feedback schema, Today form and manual JSON backup roundtrip are tested. Only a recommendation with a known prescribed skill is offered for feedback, and explicit rating/verdict selections are required. This implementation does not change mastery, priority or prescription algorithms. No scheduled reminder or automation is required to record the pilot.

## Credential incident response record

On 2026-10-14 a terminal inspection accidentally exposed the database password from an ignored local credential file in the session output. The actual hosted server password was rotated immediately at 17:34 JST and the ignored local value updated. No credential value is retained in this document, and no credential was committed to Git. For a future incident, stop printing the affected file, rotate the actual server credential and privately update dependent local configuration; editing a local file alone does not revoke the old password.

Fixtures, mock media, automated review histories and simulated seven-day dates remain test evidence only. The pilot cannot be marked complete until an actual learner has used the system for seven days. No official score or guaranteed improvement claim follows from successful deployment or tests.
