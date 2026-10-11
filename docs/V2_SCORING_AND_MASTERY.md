# V2 Scoring and Mastery

V2 never presents practice accuracy as an official TOEFL or GRE score. Checkpoints carry `sourceType` (`official`, `practice`, `estimated`, or `manual`) and the UI labels the source.

TOEFL profiles use the current 1.0–6.0 band model. Old 0–120 values are retained only as legacy history and are not silently converted.

Mastery is a transparent weighted heuristic:

- accuracy: 40%
- recent accuracy: 25%
- retry accuracy: 20%
- consistency/sample signal: 10%
- time efficiency: 5%
- unresolved error penalty: 8 points per unresolved error

The result is clamped to 0–100. Sample caps prevent false precision: fewer than 5 attempts cap mastery at 78, 5–15 at 90, and confidence is low/medium/high at `<5`, `5–15`, and `>15` attempts. Every component is independently testable in `src/algorithms/mastery.ts`.
