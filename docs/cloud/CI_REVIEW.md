# Independent CI gate review

Reviewed 2026-10-14 by an independent agent. Scope: `.github/workflows/ci.yml`, package scripts and lockfile engine requirements, Playwright/Vite configuration, the local cloud environment/security scripts, Supabase configuration, all three repository migrations, and the development/production offline cloud assertions. Only this report was written. No build, test suite, local service command, remote mutation, or Actions run was performed by this reviewer.

## Result

No concrete P0/P1 source or current-runner blocker found. The workflow is suitable to submit to an actual GitHub Actions run. This review is not `CI CLOUD PASS`; that requires the successful run URL and exact tested source SHA.

- `verify` retains clean installation, typecheck, lint, unit tests, production build, Chromium installation, development E2E and a separate production offline invocation. The production invocation sets `PLAYWRIGHT_PREVIEW=1`, so the offline tests execute rather than silently skip. Ordinary verification does not claim real-cloud coverage.
- `cloud` starts an isolated local Supabase stack, generates public browser configuration before either Vite server/build, runs real-service A/B security checks, exercises development restore/conflict, and then builds and exercises production offline/reconnect/fresh restore with `CLOUD_E2E=1`. Cleanup is scheduled even on failure. No hosted project credentials are required by this job.
- `local-cloud-env.mjs` consumes status privately, checks loopback, selects the publishable key or validates an anon JWT, writes only public browser variables, and uses exclusive creation. `.env.local` is ignored. Fresh Actions checkouts make the exclusive-write assumption valid; rerunning that script in a reused local checkout intentionally fails instead of overwriting configuration.
- `cloud-security.mjs` retains anonymous/cross-user denial, private object read/write/upsert/signed-URL/delete isolation, own-user cleanup, and the assertion of exactly one CAS winner plus one `PT409`/HTTP 409 loser. The browser reconnect gate retains the full business-state comparison and portable bank comparison in a fresh context. No assertion weakening was observed.
- Exactly migrations `202610140001` through `202610140003` are present. Migration 3 replaces the intentional conflict errors while preserving the table, ownership policies, invoker behavior, empty search paths and grants. Local email confirmation is disabled, matching signup tests that require a session immediately.

## Runner assumptions checked against primary sources

The [official Supabase CLI 2.120.0 release](https://github.com/supabase/cli/releases/tag/v2.120.0) exists; its npm metadata was also retrieved read-only. [The setup action](https://raw.githubusercontent.com/supabase/setup-cli/v3/action.yml) accepts a fixed npm version and requires a compatible Node runtime. The pinned CLI's [status fields](https://raw.githubusercontent.com/supabase/cli/v2.120.0/apps/cli/src/command-internal/status-values.ts) include the fields consumed by both scripts; its [status handler](https://raw.githubusercontent.com/supabase/cli/v2.120.0/apps/cli/src/commands/status/status.handler.ts) emits the plain object for `-o json`. Its [database bootstrap](https://raw.githubusercontent.com/supabase/cli/v2.120.0/apps/cli/src/command-internal/db-bootstrap/start-database.ts) runs pending migrations on a fresh volume, matching a fresh hosted runner.

The lockfile's strictest relevant Node 22 floor is `22.22.2` (jsdom and related packages). The [current Ubuntu 24.04 runner inventory](https://raw.githubusercontent.com/actions/runner-images/main/images/ubuntu/Ubuntu2404-Readme.md) lists cached Node `22.23.3` and Docker, so the current `node-version: 22`/`ubuntu-latest` configuration satisfies that floor. This remains a moving runner assumption: record the actual resolved Node and Ubuntu versions from Actions. The inventory announces that `ubuntu-latest` will move to Ubuntu 26.04 in November 2026.

## Evidence boundaries and minor follow-up

Actual cold Docker image pulls, startup health checks, Linux browser behavior and the 20-minute cloud job budget remain unproven until Actions executes. Local or hosted acceptance results maintained by the controller are separate evidence, not results produced by this review. The cloud job currently lacks failure-artifact upload; adding it would improve browser-failure diagnosis but is not a correctness blocker. Preserve the existing assertions if a run fails and repair the underlying runner/application issue.
