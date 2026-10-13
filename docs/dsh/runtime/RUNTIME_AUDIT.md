# DSH Runtime Audit

**2026-10-13 reconciliation:** This report preserves historical runtime findings and the recorded future audit date below. The durable AgentTeams event timestamps place these runtime probes on 2026-10-12; the future heading is not the date of the current follow-through. The user has authorized Codex continuation, whose local acceptance is **CODEX_ACCEPTED** in [CODEX_FOLLOW_THROUGH.md](../../CODEX_FOLLOW_THROUGH.md). The recorded missing credential is not a dependency of that continuation. No successful DeepSeek route is claimed or newly tested here.

**Audit date:** 2026-11-01  
**Status:** AgentTeams functionality and baseline gates PASS; catalog Model Route Gate BLOCKED on a user-managed credential.  
**Workspace:** `D:\systemDir\Desktop\toefl-gre-workbench` (session-configured workspace; PowerShell `Get-Location` probe failed with `spawn EPERM`).

## Runtime/configuration findings

| Field | Finding | Evidence and limits |
|---|---|---|
| DSH version | Installed bundle labels itself `0.2.0-rc.2` | Bundle search showed UI `general.currentVersion` literal `0.2.0-rc.2`; not an independent query of the running process. |
| Profile | Desktop profile exists at `C:\Users\hacjr\.dsh\profiles\desktop` | Its package manifest identifies `dsh-profile-desktop`; current GUI's loaded profile was not read from a live session. |
| AgentTeams version | `@nanmicoder/dsh-agent-teams` `0.1.22` installed | Desktop profile manifest pins `0.1.22`; plugin process runtime not separately probed. Its compatibility file recommends DSH `0.2.0-rc.2`. |
| Default agent preset | `software-development` (`软件开发`) | Desktop `cordis.patch.yml` defines it and selects it as `selectedDefault`; active session selection not read back. |
| Configured model route | `workbuddy-ai` / `gpt-6-luna` | Current desktop `cordis.patch.yml` lines 2–6 set this route. This supersedes earlier inspected config snapshots that showed `xiaobai / deepseek-v4.1-flash`; team state/members can still snapshot a per-session route. |
| Installed first-party catalog route | `deepseek-official` / `deepseek-flash`, display `DeepSeek-V41-Flash` | Read-only search of installed DSH bundle found exact catalog id/name. An explicit member probe then failed before request with `MISSING_CREDENTIAL`: no API key configured for `deepseek-official`; credentials must be added through the DSH Models page or supplied in the launch environment. No secret was inspected or changed. |
| Active provider/model | Most recent harness route notice: `workbuddy-ai / gpt-6-luna`; team member snapshots: `white / deepseek-v4.1-flash`; one member explicitly routed `deepseek-official / deepseek-flash` (blocked, no credential) | Route notices are direct declared-route evidence, not request-header/API proof. Explicit child selection of `deepseek-official / deepseek-flash` via the subagent tool is rejected: `child model selection is disabled for this tool instance`. The AgentTeams tool path does accept that route and resolves it to a real member session. |
| Reasoning effort | Not verified | No live session/provider response inspection. |
| Paseo provider/profile | Not verified | No Paseo metadata available in this turn. |
| `DSH_HOME` | Files found under `C:\Users\hacjr\.dsh`, the documented default location | Env override could not be queried because shell process spawn failed. |
| Profile/API credentials | Not inspected | No secret/key values were read. No profile config changed. |

## Model Route Gate

**Status: BLOCKED — exact catalog route requires user-managed credentials.** Earlier direct child selection of `deepseek-official / deepseek-flash` was rejected by the child tool. A later explicit AgentTeams member on that exact provider/model started a real session, so the provider/model pair resolves in DSH, but it failed before reading `package.json` with `MISSING_CREDENTIAL`. This has now been retried eight times across route/model changes (attempts 2, 3, 5, 7, 9, 11, 13, and 15) and failed identically every time, so the blocker is stable and not route-transient. No key was read, configured, or bypassed; no model API call occurred and no fallback was used. This is a specific external credential blocker, not evidence that the route is unhealthy or successful. Earlier inherited-route read-only work under `white / deepseek-v4.1-flash` read the correct package name, but provider endpoint and catalog model ID were not independently verified. Current captain/profile route is `workbuddy-ai / gpt-6-luna`; an earlier staged attempt under `aster` failed because `deepseek-v4.1-flash` was not configured there.

## AgentTeams Gate

**Status: PASS for AgentTeams functionality (all functional checks evidenced).** The approved `score-os-dsh-only` team dispatched Explorer, who claimed t1, updated it in_progress and completed, then delivered the result to the captain. Independent Reviewer t2 re-read `package.json` and `src/algorithms/mastery.ts` and verified the report without discrepancies, cross-checking `src/types.ts`. Peer-to-peer message delivery was tested in both directions using token `TEAMS-COMM-TEST-7F3A91C4`, independently confirmed from the receiver's mailbox; member-to-captain delivery also worked. Thus team creation, member dispatch, task-state transition, bidirectional peer messages, and captain result receipt are evidenced. Independent t7 review also confirmed all five baseline commands reported in t5 exited 0. A separate exact-route test t6 failed before model API request because no credential is configured for `deepseek-official`; catalog-route identity/health remains unproven. All checks were read-only; no repository files were modified.

## Existing project team state

The original tasks, attempts, outputs, provider/model snapshots, and timestamps in `.agent-teams/score-os-v2/team.json` and `.agent-teams/score-os-dsh-only/team.json` remain preserved in place. On 2026-10-13 both files received additive `localAcceptance` markers for the user-authorized Codex continuation. No failed runtime attempt was relabeled as a successful DeepSeek execution, and neither team was archived, deleted, or replaced.

## Historical route outcome and route-specific next action

**Historical DSH route status: BLOCKED_MODEL_RUNTIME.** AgentTeams functionality and the existing baseline gates were demonstrated (see [DSH_ONLY_BASELINE.md](../baseline/DSH_ONLY_BASELINE.md)). The catalog probe reported no API key for installed route `deepseek-official / deepseek-flash`; DSH's error directed the operator to store `DEEPSEEK_API_KEY` through the credentials service (Web Models page) or export it in the launch environment. No fallback was attempted and no provider was silently substituted. Verifying that route would require credential provisioning and another t6-style read-only probe. The current Codex continuation does not depend on that route; local acceptance is CODEX_ACCEPTED. Historical team execution evidence remains preserved.
