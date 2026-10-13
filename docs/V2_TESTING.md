# V2 Testing

Current local follow-through acceptance (2026-10-13): **CODEX_ACCEPTED**. The integrated fixes passed final gates and independent review; current validation is recorded in [CODEX_FOLLOW_THROUGH.md](CODEX_FOLLOW_THROUGH.md). Final root tests passed 24 files / 115 tests; lint, typecheck, and build each exited 0.

Run from the project directory:

- `npm run typecheck` — the isolated TypeScript gate (`tsc -b`).
- `npm run lint` — Oxlint.
- `npm test` — domain, storage, migration, adaptive algorithms and React integration tests.
- `npm run build` — TypeScript compile plus production Vite build.
- `git diff --check` — working-tree whitespace check.

For the adaptive algorithm and acceptance subset, run `npx vitest run src/algorithms src/acceptance.test.ts`. The acceptance harness calls real learning and planning functions and checks both weak-skill ranking and the Geometry allocation change. The execution plan's D-3 decision uses this existing Vitest pipeline for adaptivity evidence.

Automated coverage includes:

- V1 plan behavior, additive migration, retained aggregate history, malformed-data recovery and import/export validation.
- Shared evidence weighting for mastery and priority, neutral no-data scoring, low-sample limits, unresolved-error penalties, retry improvement, explanation score parity and the maintenance floor.
- Recent accuracy that keeps every included same-day batch together, including an older batch after a smaller latest-day sample.
- Pending/orphaned full-question references excluded from learning evidence and due-error scheduling while original history is retained. Missing standalone source references and batch summaries remain eligible; a matching stored reference whose question or answer is disputed is excluded. React integration covers the actual bank-reference notice, restored-reference dispute checking, and reconciliation path.
- Active-exam prescriptions that retain inactive-exam history without assigning its due errors to the current plan; time-budget limits and spaced-review intervals.
- Onboarding, Settings and restored-backup targets synchronized with dashboard/planner targets while checkpoints and baseline history are retained.
- Recovery notice and download-button visibility when stored history cannot be parsed; the first original recovery payload survives later successful loads and subsequent recovery events until explicit data clearing.

Browser evidence is scoped separately. The October 13 manual target check observed custom TOEFL 5 / GRE 325 targets surviving refresh; its [screenshot](evidence/codex-follow-through/targets-after-refresh.png) is recorded in the current closeout. The [eight P4.3 screenshots](evidence/P4.3/manifest.md) preserve the October 12 manual Edge checks at 390 x 844. They are historical evidence, not fresh mobile checks or an automated pixel-regression suite. Historical ETS URL checks are preserved in the source reports; no fresh URL verification is claimed here.

Manual verification remains relevant for full onboarding/migration recovery, checkpoint entry, batch practice, error retry, refresh persistence, separate learning/question-bank import/export, and mobile navigation. Record each observed result and viewport rather than treating this checklist as completed validation.
