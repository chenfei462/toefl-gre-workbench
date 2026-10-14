# AI TOEFL COACH upstream audit

Checked: 2026-10-14 (Asia/Tokyo). [Repository](https://github.com/dimonded1/ai-toefl-coach).

## Evidence

Live GitHub REST metadata and recursive default-branch file tree were fetched. Branch: main; tree SHA: `ec6235a27cce501473a99b7ebbd40d5b795e7f3e`; tree truncated: false; last push reported: 2026-09-13T12:18:19Z. Tree SHA identifies a tree, not a commit. File links below track the checked default branch and can change. Selected README/manifests/license/source were read; no upstream app was installed or run.

- [Metadata API](https://api.github.com/repos/dimonded1/ai-toefl-coach)
- [Tree API](https://api.github.com/repos/dimonded1/ai-toefl-coach/git/trees/ec6235a27cce501473a99b7ebbd40d5b795e7f3e?recursive=1)

## What it does

Interactive TOEFL preparation product. Inspected PRODUCT.md connects target score, weak zones, daily practice and explainable next action.

## License

No explicit license verified: GitHub license field is null and the inspected recursive tree has no LICENSE file. Public visibility grants no general code-reuse permission. Design study only.

## Technology

Plain JavaScript frontend files; backend manifest verifies Express, better-sqlite3, JWT and bcrypt. Tree includes Docker and nginx configuration.

## Useful modules

Score-gap explanation, study roadmap, mistake-bank concepts and analytics information hierarchy. File paths are discovery references, not reusable modules.

## Actual files worth studying

- [PRODUCT.md](https://github.com/dimonded1/ai-toefl-coach/blob/main/PRODUCT.md)
- [README.md](https://github.com/dimonded1/ai-toefl-coach/blob/main/README.md)
- [frontend/src/scripts/analyticsModel.js](https://github.com/dimonded1/ai-toefl-coach/blob/main/frontend/src/scripts/analyticsModel.js)
- [frontend/src/scripts/calendar.js](https://github.com/dimonded1/ai-toefl-coach/blob/main/frontend/src/scripts/calendar.js)
- [frontend/src/scripts/scoring.js](https://github.com/dimonded1/ai-toefl-coach/blob/main/frontend/src/scripts/scoring.js)
- [backend/package.json](https://github.com/dimonded1/ai-toefl-coach/blob/main/backend/package.json)

These paths were verified in the live tree. Reading selected files does not establish runtime correctness of every listed module.

## Things NOT to copy

No source, styles, assets, score conversion, generated content or authentication/backend transplant. No current AI plan feature.

## Mapping to our architecture

Dashboard explains current/target/gap with dated evidence and next recommended existing prescription. Unknown score remains unknown; ordinary practice accuracy must not become an official score.

## Integration risk

High licensing boundary: API license null and recursive tree contains no license file. PRODUCT describes intent, not a validated scoring model or proven product outcomes.

## Recommended adoption

Design study only; independently author local UX and keep cloud accounts/sync out of scope.

This audit copies no upstream source or learning content. Implementation and validation status belong in local phase evidence, not in upstream feature claims.
