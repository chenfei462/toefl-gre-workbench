# DSH-only Transition

**2026-10-13 reconciliation:** This document preserves the earlier DSH handoff record, including its recorded future date below. The durable AgentTeams event timestamps place the recorded runtime probes on 2026-10-12. The user has now authorized Codex continuation. Current local acceptance is **CODEX_ACCEPTED**; see [CODEX_FOLLOW_THROUGH.md](../CODEX_FOLLOW_THROUGH.md). The historical catalog-route failure is not a dependency of that continuation, and no working DeepSeek route is claimed.

**Transition date:** 2026-11-01
**Historical handoff status:** AgentTeams functionality and baseline gates PASS; the catalog Model Route Gate remains unproven because the recorded probe failed with `MISSING_CREDENTIAL`.

## Ownership change

- **Before:** Project history includes Codex-led implementation and review records. Those records remain historical evidence and are not retroactively rewritten.
- **After (policy):** DSH Captain owns planning, scope, task DAG, and final gates. Implementers perform scoped work; a separate DSH Reviewer independently reviews it; QA/Regression runs the relevant gates. An implementer must not approve their own implementation.
- Codex is no longer intended to be a required planner, implementer, or reviewer for future work. Actual DSH-only execution remains conditional on passing the runtime gates below.

## Runtime gates

1. Runtime audit: **RECORDED** with installed profile evidence, demonstrated AgentTeams functionality, and the catalog credential failure. The recorded DSH bundle was 0.2.0-rc.2, desktop profile pinned AgentTeams 0.1.22, and software-development preset was selected as the profile default. Catalog route was `deepseek-official` / `deepseek-flash`; the runtime audit's latest configuration snapshot superseded the earlier `xiaobai / deepseek-v4.1-flash` snapshot with `workbuddy-ai / gpt-6-luna`. These are historical observations; see [RUNTIME_AUDIT.md](runtime/RUNTIME_AUDIT.md).
2. Read-only DeepSeek Model Route Gate: **BLOCKED — MISSING_CREDENTIAL**. An explicit AgentTeams member assigned to catalog route `deepseek-official` / `deepseek-flash` started a session but failed before reading `package.json`: `llm-deepseek: no API key for provider route "deepseek-official"; store DEEPSEEK_API_KEY through the credentials service (the web Models page writes it), or export DEEPSEEK_API_KEY in the launching environment (code MISSING_CREDENTIAL)`. Retried eight times since (attempts 2, 3, 5, 7, 9, 11, 13, 15), including after model switches, with identical results, so this is a stable credential blocker. No key was read or written, no fallback was used, no model API call occurred. Earlier `white / deepseek-v4.1-flash` member work succeeded but does not prove the catalog route. This blocker is user-managed and must be resolved on the DSH Models page before the gate can pass.
3. AgentTeams runtime gate: **PASS (functionality); route caveat remains**. Team creation, member dispatch, task claim/update/completion, captain result delivery, independent t2 review, and bidirectional peer messaging (token `TEAMS-COMM-TEST-7F3A91C4`) were demonstrated. See [RUNTIME_AUDIT.md](runtime/RUNTIME_AUDIT.md).
4. Existing `score-os-v2` task/attempt evidence is preserved in place. On 2026-10-13 both team files received additive `localAcceptance` markers for the user-authorized Codex follow-through; failed DeepSeek task statuses, outputs, providers, models, attempts, and timestamps remain unchanged. No historical team archive operation has been performed.
5. Baseline re-acceptance: **PASS** for existing typecheck, lint, unit tests, build, and diff checks; evidence in [DSH_ONLY_BASELINE.md](baseline/DSH_ONLY_BASELINE.md). P6 implementation remains **NOT STARTED** because catalog-specific Model Route Gate has not passed.

## Evidence and constraints

The prior [BLOCKED_MODEL_RUNTIME.md](reports/BLOCKED_MODEL_RUNTIME.md) report records historical route failures. This transition does not reuse or retry those failing guessed model configurations. No alternate provider/model was silently selected. No business code was changed as part of this transition.

Installed bundle/profile evidence and the AgentTeams runtime results are documented in [RUNTIME_AUDIT.md](runtime/RUNTIME_AUDIT.md). AgentTeams functionality and the existing baseline gates are demonstrated. The blocking item is narrow and external: the installed catalog route `deepseek-official` / `deepseek-flash` has no API key on this machine (DSH suggests the Web Models page or `DEEPSEEK_API_KEY` in the launching environment). No agent can work around a missing credential, and no alternate provider was substituted. Until that credential exists and the catalog route passes a real read-only agent run, no subsequent implementation can truthfully be attributed to a functioning DSH DeepSeek catalog chain.
