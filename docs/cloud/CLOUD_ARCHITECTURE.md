# Cloud architecture

The React/Vite study engine remains local-first. Authentication and cloud backup are optional; a failed network request must not prevent saving a practice attempt, error, vocabulary review or plan locally. Existing mastery, priority, prescription, checkpoint and migration functions remain the business authority.

## Storage boundaries

| Data | Local authority | Cloud representation |
| --- | --- | --- |
| Profile, tasks, attempts, errors, reviews, vocabulary, speaking metadata, mocks and checkpoints | `toefl-gre-workbench:v2` in localStorage | Validated JSON snapshot |
| Questions, sources, media metadata, explanations, sets, imports and answer disputes | IndexedDB question repository | Portable `questionBank` bundle within the snapshot |
| Recordings and imported TXT/audio/PDF/DOCX bytes | RecordingStore and MaterialStore in IndexedDB | Private Storage objects and a `cloudAssets` manifest |
| Device identity and account sync checkpoints | localStorage | Device identity accompanies each snapshot write |
| Conflict recovery | `workbench-cloud-recovery` IndexedDB | No automatic deletion or overwrite |
| Interrupted restore recovery | `workbench-restore-journal` IndexedDB | Local rollback journal |

The browser uses the official Supabase JavaScript client. `client.ts` validates the endpoint and public key before constructing its lazy singleton. Missing or invalid public configuration disables cloud controls while preserving local mode. Hosted endpoints require HTTPS; HTTP is accepted only for loopback development. Secret and service-role keys are rejected by the client configuration check.

## Operations

`auth.ts` handles email signup, password login, session restoration and local sign-out. `CloudAccount.tsx` exposes account controls in Settings and before onboarding, so a fresh device can restore before creating a new plan.

`service.ts` orchestrates a portable snapshot, immutable binary uploads, optimistic concurrency and confirmed restore. `snapshot.ts` reuses the existing backup parser/migrations, adds cloud business validation, canonicalizes JSON object keys without rearranging arrays and computes SHA-256. `transport.ts` verifies the current authenticated user before reading a row or invoking the snapshot RPC.

Local editor writes, question repository mutations and restore commits share the `workbench-local-write` Web Lock. Persisted learning state includes a monotonic revision; stale editors fail with an export/reload path. A reset retains a revision tombstone so an older tab cannot regain permission to write after re-onboarding. A pending restore marker prevents already-open editors from superseding an interrupted recovery. Browsers without the required safe write lock fail closed rather than overwriting another editor.

Binary paths are `<userId>/<assetId>/<sha256>`. Upload retries verify an existing immutable object's bytes. Downloads request a short-lived signed URL, verify size and SHA-256, and retain local copies for playback. Signed URLs are never stored in the snapshot. Restore currently downloads referenced files before accepting the restored study state; it is not a streaming or background transfer system.

Cloud operations bind a separate non-persistent client to the initiating session token and account generation, preventing an account switch from reusing a different account's session during an upload. The Settings status reflects local/account checkpoints, conflict and error states, and checks the remote revision on window focus/reconnection without silently replacing local edits.

Recommendation feedback records the prescribed skill, minutes, date, rating, verdict and optional note in the study state. The form skips recommendations without a concrete current skill and requires explicit rating/reason choices. It collects evidence for the future real pilot; it does not adjust mastery or priority weights.

The production PWA precaches the app shell. It does not cache Supabase responses, replace sync, or guarantee that an unvisited external resource is available offline. A first online visit and successful service-worker installation are required before offline reload.

## Acceptance boundaries

Local-stack browser/offline/reconnect evidence and real hosted security evidence are recorded in [RLS_SECURITY.md](RLS_SECURITY.md), [CLOUD_TESTING.md](CLOUD_TESTING.md) and [PROGRESS.md](PROGRESS.md). The dedicated hosted project's three migrations, ownership/CAS rules and private storage passed their service tests. The true Vercel Preview is READY with local-only mobile/offline smoke passing; full hosted cloud flow and an actual GitHub Actions run remain open. Release status is **CLOUD_REJECTED** in [FINAL_ACCEPTANCE.md](FINAL_ACCEPTANCE.md). The [real seven-day pilot](PILOT_LOG.md) has not begun. No official ETS score or improvement guarantee is provided.
