# Agent Team Execution Plan

> PHASE 0 deliverable. Dependency-aware execution plan derived from
> `docs/V2_GAP_ANALYSIS.md` and `docs/QUESTION_BANK_GAP_ANALYSIS.md`.
> Execution mode: `AUTONOMOUS_AGENT_TEAM_MODE`, approval `automatic`.

## 1. Operating Constraints

- The repository is **not** greenfield. A working V1 + partial V2 exists and is reused
  (`docs/V2_GAP_ANALYSIS.md` §2 and §4). No delete-and-rewrite.
- All gates use commands that really exist in `package.json`. One is added by this plan
  (`npm run typecheck`, decision D-2) because gate 63 requires it as an isolated gate.
- No `git add .`, no `git add -A`, no `reset --hard`, no `clean -fd`, no force push, no
  rebase, no remote merge. Commits use explicit file paths.
- Never push. Never deploy to production. No paid services. No credentials.
- User is unavailable. Only HARD BLOCKER conditions (§46) may stop a task, and a blocked
  task never blocks the rest of the graph (§47).

## 2. Team Roster

| Member | Role | Owns |
| --- | --- | --- |
| `architect` | Repository / Architecture | Cross-cutting integration, storage boundary, final wiring, docs |
| `domain` | Domain / Algorithms | Mastery, Priority (+ `explainPriority`), Prescription, Replanning |
| `data` | Data / Storage | Migration safety, `UserQuestionState`, question↔attempt reconciliation |
| `frontend` | Frontend / UX | Dashboard five questions, Error Lab, Focus Session, Vocabulary, mobile |
| `evidence` | Question / Evidence Pipeline | Import pipeline, reference mode, source seed verification |
| `qa` | Tests / QA | Adaptivity acceptance harness, edge cases, regression |
| `reviewer` | Independent Reviewer | Independent review of every P0 implementation; never reviews own code |

Members are reused across phases. The roster is not expanded unless a phase genuinely needs
a capability that is absent, and no member spawns its own sub-team (§8).

## 3. Dependency DAG

`→` means "must complete before". Tasks with no shared dependency run concurrently.

```
PHASE 0  audit + baseline commit ...................... DONE (captain)
   │
   ├─→ P0.2  typecheck script (D-2) ................... qa
   │
PHASE 1 (P0 — correctness first, all independent)
   ├─→ P1.1  priority evidence-weight alignment (G-5) .. domain
   ├─→ P1.2  prescription exam/section correctness (G-4) domain
   ├─→ P1.3  explainPriority() (G-4) ................... domain
   │        (P1.1, P1.2, P1.3 same file owner → serialized: P1.1 → P1.2 → P1.3)
   ├─→ P1.4  migration hardening (G-11) ................ data
   └─→ P1.5  question↔attempt reconciliation (G-1) ..... data, after P1.4
   │
PHASE 2 (P0 — proof of adaptivity)
   └─→ P2.1  adaptivity acceptance harness (G-3) ....... qa, after P1.1+P1.2+P1.3+P1.5
   │
PHASE 3 (P0 — surfaces)
   ├─→ P3.1  score trajectory + rolling 7-day (G-8) .... domain, after P1.3
   ├─→ P3.2  dashboard five questions (G-9) ............ frontend, after P3.1 + P2.1
   └─→ P3.3  reference-mode capture completion (G-7) ... evidence, after P1.5
   │
PHASE 4 (P1/P2)
   ├─→ P4.1  UserQuestionState (G-6/QB-2) .............. data, after P3.3
   ├─→ P4.2  source seed verification (QB-6) ........... evidence (network)
   └─→ P4.3  mobile UX pass (G-10) ..................... frontend, after P3.2
   │
PHASE 5 (review + regression)
   ├─→ P5.1  independent review of P0 chain ............ reviewer, after P2.1+P3.2
   ├─→ P5.2  P1 review ................................ reviewer, after P4.1+P4.2+P4.3
   └─→ P5.3  full regression + docs (G-12) ............. qa + architect, after P5.1+P5.2
```

## 4. Phase Detail

### PHASE 0 — Repository Audit (complete)

Deliverables produced: this plan, `docs/V2_GAP_ANALYSIS.md`,
`docs/QUESTION_BANK_GAP_ANALYSIS.md`. Git initialised and a baseline commit created so every
later change is reviewable and revertible.

Gate: repo understood, real commands identified, migration risks identified. **PASS.**

### PHASE 1 — P0 Correctness (algorithms + data safety)

| Task | Objective | Gate |
| --- | --- | --- |
| P1.1 | Make `calculateSkillPriority` consume evidence-weighted accuracy so the printed reason cannot contradict the mastery it derives from. | `npm test`, `npx tsc -b` |
| P1.2 | Remove hardcoded `exam: 'gre'` and `skillId.includes(...)` section inference from `prescription.ts`; derive exam/section from the real `Skill`. | `npm test` with a TOEFL-only fixture asserting no GRE block appears |
| P1.3 | Add `explainPriority()` returning structured, ordered reasons. | unit test asserts the §25 example shape |
| P1.4 | Harden `migrateState` against malformed V1 input; never silently discard; record what could not be inferred. | migration tests incl. garbage input |
| P1.5 | Reconcile question↔attempt references so an attempt citing a missing question is explicit, not silent. | test with a dangling `questionId` |

### PHASE 2 — Adaptivity Proof (P0)

| Task | Objective | Gate |
| --- | --- | --- |
| P2.1 | Inject the §52 acceptance profile (TOEFL 4.0→5.5, GRE 310→330, 30 days, 480 min) and the §52 skill accuracies; assert GRE TC / RC / TOEFL Speaking / Geometry outrank GRE Algebra. | `npm test` |

This converts the central product claim from a proposal into executed evidence.

### PHASE 3 — P0 Surfaces

| Task | Objective | Gate |
| --- | --- | --- |
| P3.1 | Compute baseline/latest/target/gap/trajectory and a rolling 7-day window; new attempts must change the plan. | `npm test` incl. §55 adaptive assertions |
| P3.2 | Dashboard first screen answers: current score, gap, most dangerous skill, first action today, why. | `npm test` + `npm run build` |
| P3.3 | Reference-only capture reaches Error Lab → Mastery → Priority → Prescription; 20–30s entry target. | `npm test` |

### PHASE 4 — P1/P2 Completion

P4.1 `UserQuestionState` persistence. P4.2 verify official source metadata against live
ETS resources (network permitted; no paywall bypass). P4.3 mobile pass over Today / Quick
Error / Focus Session / Vocabulary / Retry.

### PHASE 5 — Independent Review and Regression

P5.1 and P5.2 are executed by `reviewer`, who must not have implemented the code under
review. P5.3 runs the full gate set and writes the reporting documents including
`docs/AGENT_TEAM_FINAL_REPORT.md`.

## 5. Final Gate (must all pass, real commands only)

```bash
npm run typecheck   # tsc -b
npm run lint        # oxlint
npm test            # vitest run
npm run build       # tsc -b && vite build
```

Plus: migration PASS, refresh persistence PASS, import/export PASS, adaptivity acceptance
PASS. Any gate that cannot run must be recorded with its real cause — a gate that was not
executed is never reported as PASS (§41).

## 6. Risk Register

| Risk | Mitigation |
| --- | --- |
| Storage rewrite destroys user data | D-1: keep the existing localStorage schema; changes are additive and migration-tested |
| Rewriting working V2 code | Reuse mandate in `V2_GAP_ANALYSIS.md` §2/§4; reviewer rejects unexplained rewrites |
| Reviewer rubber-stamping | Reviewer is a distinct member from every implementer and must produce findings or an explicit no-finding justification per artifact |
| Inventing infrastructure | Plan deliberately excludes E2E frameworks (D-3); only real commands are used |
| Adaptive planner overfits a fixture | P2.1 asserts both the §52 ranking and the §55 direction change |

## 7. Documentation Deliverables

Required by §49: `V2_GAP_ANALYSIS.md` ✅, `QUESTION_BANK_GAP_ANALYSIS.md` ✅,
`V2_ARCHITECTURE.md`, `V2_SCORING_AND_MASTERY.md`, `V2_ADAPTIVE_PLANNER.md`,
`QUESTION_DATABASE.md`, `DATA_PROVENANCE.md`, `V2_TESTING.md`, `V2_USER_GUIDE.md`,
`AGENT_TEAM_EXECUTION_REPORT.md`. Final report `AGENT_TEAM_FINAL_REPORT.md` per §64.
