# Vercel deployment

The app remains Vite + React. `vercel.json` specifies framework `vite`, build `npm run build`, output `dist` and a catch-all `/index.html` rewrite for BrowserRouter deep links. CI uses Node 22. See [Vercel's Vite SPA guidance](https://vercel.com/docs/frameworks/frontend/vite#using-vite-to-make-spas).

## Confirmed target and environment

On 2026-10-14 the dedicated Hobby project `prj_wYsMcfoSI6Du1eZJ8N6uksRaB4fH` was created and correctly linked under team `hahayulu`. The ignored `.vercel/` binding is local configuration, not a release result. Confirm the intended owner/project before a release action:

```powershell
vercel whoami --format json
vercel project inspect --non-interactive
```

Both Preview and Production have these public build-time variables configured for hosted Supabase project `vcfpdxpprugrgmmilahm`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Vite embeds these values into browser assets. Never place service-role keys, database passwords, Management API tokens or private credentials under `VITE_*`. Rebuild when public configuration changes. Ignored `.env.local` remains the local test target; ignored `.env.hosted.local` is the separate hosted public target. Neither belongs in Git.

Hosted Supabase Auth uses the confirmed Preview as site URL and allows that URL plus the intended future `https://toefl-gre-workbench.vercel.app` URL. **Email confirmation remains required**; the hosted fixture uses two dedicated confirmed test accounts. Do not disable confirmation to match local test signup.

## First-deployment behavior and current Preview

Vercel documents that the first deployment of a new project is always Production, even without `--prod` or from a non-production branch. Inspect the actual returned environment instead of treating the command's requested target as proof. [Official first-deployment documentation](https://vercel.com/docs/deployments/environments#first-deployment).

Two bootstrap attempts here were returned as Production, including an explicit Preview request. The third deployment was confirmed as a true **Preview / READY**:

- Deployment: `dpl_DYerWXx5sKQGGaf3q5CsFbmwKvCB`
- URL: [toefl-gre-workbench-g50o93og4-hahayulu.vercel.app](https://toefl-gre-workbench-g50o93og4-hahayulu.vercel.app)
- Protection: Vercel Authentication remains enabled.
- Hosted local-only mobile 390×844/offline-reload smoke: PASS, 6.6 seconds.
- Complete hosted cloud UI smoke: pending.
- Source commit/Actions linkage for this implementation: pending.

This Preview's earlier evidence predates the subsequently added pending-save/unload guard. The changed build requires deployment and smoke evidence again; the guard's five targeted tests do not substitute for that. See [PENDING_SAVE_REVIEW.md](PENDING_SAVE_REVIEW.md).

Only after that true Preview was confirmed were the two exact unwanted bootstrap Production artifacts removed. There is currently no Production deployment target; no Production acceptance or learner release is claimed.

For a project that has completed bootstrap, request Preview and then inspect the returned deployment:

```powershell
vercel deploy --target preview --non-interactive
vercel inspect <returned-deployment-url> --non-interactive
```

A changed deployment URL requires its own evidence. Preserve deployment ID, actual environment, READY status, source SHA where available and browser results.

## Protected hosted smoke

The hosted tests exercise the built app through public UI, without dev-only source imports. The runner uses the connected Vercel CLI to obtain an origin-scoped authentication cookie; ignored `.vercel/` files hold it and traces are disabled. The cookie is never sent to Supabase. Keep deployment protection enabled:

```powershell
$env:HOSTED_URL = 'https://toefl-gre-workbench-g50o93og4-hahayulu.vercel.app'
node scripts/run-hosted-smoke.mjs
Remove-Item Env:HOSTED_URL -ErrorAction SilentlyContinue
```

Use only the dedicated acceptance accounts/files. Verify direct route loads/reloads, app shell/service worker, local-only onboarding, email sign-in/session controls, sync, fresh-context confirmed restore, portable question bank, recording/material transfer, explicit conflicts and mobile layout. Assess offline/reconnect and auth/storage failure evidence separately. READY status or homepage rendering alone cannot close those gates. Results belong in [FINAL_ACCEPTANCE.md](FINAL_ACCEPTANCE.md).

## CI, Production and rollback

The actual updated GitHub Actions run is still absent. The previous connector account lacked push access and was removed; connection to intended repository owner `chenfei462` is pending. Do not label the local workflow equivalent `CI CLOUD PASS` or invent a run URL/SHA.

Production requires every critical gate, full tested Preview, verified hosted RLS/private buckets, correct environment, independent safety review and real successful CI. Once those are recorded, inspect the bound project again before using `vercel deploy --prod --non-interactive`; then verify the returned production URL and source/deployment record.

Rollback changes app assets, not the learner database. Roll back only to a compatible build; preserve additive schema, snapshots, audio and material objects. A production domain allowlist entry or configured Production variables do not mean Production is live.
