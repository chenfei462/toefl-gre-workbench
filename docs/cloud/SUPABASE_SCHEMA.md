# Supabase schema and installation

The repository's versioned migration files are the source of truth. They are part of the current implementation working tree; this does not claim a commit or remote push:

- `supabase/migrations/202610140001_workbench_snapshots.sql`
- `supabase/migrations/202610140002_private_storage.sql`
- `supabase/migrations/202610140003_conflict_http_status.sql`

## Latest snapshot per account

`public.workbench_snapshots` contains one row per authenticated user, enforced by a unique `user_id` referencing `auth.users`. Columns are `id`, `user_id`, `schema_version`, `revision`, `base_revision`, `device_id`, `checksum`, `state`, `created_at` and `updated_at`. Revisions are positive JavaScript-safe integers; `base_revision` is nonnegative and less than the next revision. Checksums are 64 lowercase hexadecimal characters and state is a JSON object. The primary and unique constraints provide their backing indexes.

RLS permits authenticated users to select, insert, update and delete only rows where `user_id = auth.uid()`. Anonymous table access is revoked. Deleting an Auth user cascades to their snapshot; Auth-account deletion is an administrative operation, not the app's local reset.

`public.push_workbench_snapshot(expected_revision, next_revision, snapshot_schema, source_device, snapshot_checksum, snapshot_state)` runs as `security invoker` with an empty search path. It inserts only at base zero or updates the current user's row only when its revision equals the expected revision. After additive migration 3, an unsuccessful comparison raises `PT409`, mapped by PostgREST to HTTP 409. Execution is granted only to `authenticated`. The client recognizes both `PT409` and the legacy `40001` code.

The table trigger also validates revisions for direct REST writes, preserves row identity and creation time, and updates `updated_at`. Client restore performs checksum and business validation; SQL validates the envelope, account ownership and concurrency, not the entire study-domain schema.

## Binary storage

`speaking-recordings` and `study-materials` are private buckets. SELECT/INSERT/UPDATE/DELETE policies restrict access to these buckets and the authenticated user's first path component. Paths used by the application are `<userId>/<assetId>/<sha256>`; the object is uploaded without upsert. The JSON manifest records bucket, cloud path, checksum, MIME type and byte length, plus material metadata.

The application accepts individual local transfer candidates up to 100 MiB. A hosted plan may impose a lower limit: the connected Free organization reported 50 MiB on 2026-10-14. Exceeding a hosted upload quota must remain a visible failed/pending backup while local bytes remain available. Do not upgrade billing or change quotas as an implicit repair.

## Local development

With Docker running, execute from the repository root:

```powershell
supabase start
node scripts/cloud-security.mjs
```

Copy `.env.example` to ignored `.env.local`, then populate only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` with the local API endpoint and public anon/publishable key. Read credentials into memory or an ignored local file; do not print privileged CLI status fields into shared logs.

The local config enables the services needed for tests. Local email signup tests expect an immediate session; that test assumption must not silently disable email verification on an existing hosted learner project.

## Hosted installation

First identify the intended organization/project and inspect its existing tables, functions, migration history, buckets and policies. These migrations intentionally do not drop or truncate existing data. A preexisting table, function or bucket with the same name requires an explicit compatibility review; do not replace it to make the migration succeed.

After the intended target has been confirmed, the normal CLI sequence is:

```powershell
supabase link --project-ref <confirmed-project-ref>
supabase migration list
supabase db push --dry-run
supabase db push
```

Use the project's database credential through a private prompt or environment rather than checked-in command text. Inspect the dry-run before applying. Then verify RLS, bucket privacy and Auth settings on that hosted target and repeat the two-account isolation tests there. The current script has a target-checked `--hosted` mode for the dedicated fixture project; do not point it at an unrelated or learner project.

## Dedicated hosted installation record

On 2026-10-14 a dedicated Free project `vcfpdxpprugrgmmilahm` was created in `ap-northeast-1`. Pre-migration inspection found no public tables, buckets, relevant policies or workbench functions. The CLI was bound to this exact project, but direct PostgreSQL transport terminated on this machine during the dry-run. No migration was applied by that failed dry-run.

The exact repository migration files were applied through Supabase's [official migration API](https://supabase.com/docs/reference/api/v1-apply-a-migration). The history was aligned and read back with versions `202610140001` (`workbench_snapshots`), `202610140002` (`private_storage`) and `202610140003` (`conflict_http_status`). The dedicated project belongs to organization `qbiwuksbgkgymwoytidr`, with API `https://vcfpdxpprugrgmmilahm.supabase.co`.

Migration 3 is additive: the first two files were not rewritten. The hosted PostgREST 14 service retried the original intentional `40001` conflict; the replacement trigger/RPC returns `PT409` without changing CAS or ownership requirements. Hosted inspection confirmed snapshot RLS enabled, both buckets private and the expected eight own-user policies. `node scripts/cloud-security.mjs --hosted` then freshly passed own/cross-user/anonymous checks, the HTTP-409 race and both buckets' isolation using two isolated test accounts. See [RLS_SECURITY.md](RLS_SECURITY.md).

Hosted Auth's site URL is the confirmed [Preview](https://toefl-gre-workbench-g50o93og4-hahayulu.vercel.app); the allowlist also includes the intended future `https://toefl-gre-workbench.vercel.app` URL. Email confirmation remains required. Full hosted Preview flows and a real CI run remain release gates in [FINAL_ACCEPTANCE.md](FINAL_ACCEPTANCE.md).
