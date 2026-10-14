# TS FSRS upstream audit

Checked: 2026-10-14 (Asia/Tokyo). [Repository](https://github.com/open-spaced-repetition/ts-fsrs).

## Evidence

Live GitHub REST metadata and recursive default-branch file tree were fetched. Branch: main; tree SHA: `c8ca282edc3fe1cdfa1c24912437938b63a25cb3`; tree truncated: false; last push reported: 2026-10-11T08:29:20Z. Tree SHA identifies a tree, not a commit. File links below track the checked default branch and can change. Selected README/manifests/license/source were read; no upstream app was installed or run.

- [Metadata API](https://api.github.com/repos/open-spaced-repetition/ts-fsrs)
- [Tree API](https://api.github.com/repos/open-spaced-repetition/ts-fsrs/git/trees/c8ca282edc3fe1cdfa1c24912437938b63a25cb3?recursive=1)

## What it does

TypeScript Free Spaced Repetition Scheduler package. Inspected package manifest version 5.4.2, Node >=20, ESM/CommonJS/UMD exports.

## License

MIT verified in GitHub metadata and the [LICENSE text](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/LICENSE). Preserve copyright and permission notice for any future substantial code reuse; independently assess third-party content.

## Technology

TypeScript scheduler package in a monorepo; optional Rust bindings are separate. Use ts-fsrs published dependency.

## Useful modules

Card state, Again/Hard/Good/Easy review scheduling and review logs. Models define New/Learning/Review/Relearning, due dates, difficulty/stability and learning steps.

## Actual files worth studying

- [packages/fsrs/package.json](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/package.json)
- [packages/fsrs/src/models.ts](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/src/models.ts)
- [packages/fsrs/src/fsrs.ts](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/src/fsrs.ts)
- [packages/fsrs/src/default.ts](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/src/default.ts)
- [packages/fsrs/__tests__/rollback.test.ts](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/__tests__/rollback.test.ts)
- [packages/fsrs/__tests__/elapsed_days.test.ts](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/__tests__/elapsed_days.test.ts)

These paths were verified in the live tree. Reading selected files does not establish runtime correctness of every listed module.

## Things NOT to copy

Do not vendor algorithm source, add native optimizer bindings or assume FSRS retention is exam proficiency. Avoid recreating 1/3/7/14 intervals under an FSRS label.

## Mapping to our architecture

Small scheduler adapter maps persisted VocabularyCard dates to library Date objects, records each rating, preserves legacy cards and feeds existing vocabulary evidence into mastery.

## Integration risk

Medium: serialization, invalid dates, timezone boundaries, parameter/version changes and replay determinism require tests. Upstream tests were inspected as paths, not executed.

## Recommended adoption

Integrate npm ts-fsrs with lockfile and license notice; test 100 cards with 20 Again/20 Hard/50 Good/10 Easy and distinct sensible due times plus legacy migration.

This audit copies no upstream source or learning content. Implementation and validation status belong in local phase evidence, not in upstream feature claims.
