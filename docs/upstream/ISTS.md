# ISTS upstream audit

Checked: 2026-10-14 (Asia/Tokyo). [Repository](https://github.com/aimerfeng/ists).

## Evidence

Live GitHub REST metadata and recursive default-branch file tree were fetched. Branch: main; tree SHA: `1088fe0f11391ec0106d5225c40ae310c57a37ba`; tree truncated: false; last push reported: 2026-07-18T07:12:05Z. Tree SHA identifies a tree, not a commit. File links below track the checked default branch and can change. Selected README/manifests/license/source were read; no upstream app was installed or run.

- [Metadata API](https://api.github.com/repos/aimerfeng/ists)
- [Tree API](https://api.github.com/repos/aimerfeng/ists/git/trees/1088fe0f11391ec0106d5225c40ae310c57a37ba?recursive=1)

## What it does

Single-user IELTS study operating system. README explicitly includes durable study history, mistake review, mock exams, imports, JSON export; speaking is explicitly out of scope.

## License

MIT verified in GitHub metadata and the [LICENSE text](https://github.com/aimerfeng/ists/blob/main/LICENSE). Preserve copyright and permission notice for any future substantial code reuse; independently assess third-party content.

## Technology

Next.js App Router, React, TypeScript, better-sqlite3, Zod and Vitest verified in package.json.

## Useful modules

Daily loop, mistake queue, independent mock history, material provenance and backup UX.

## Actual files worth studying

- [src/components/practice-runner.tsx](https://github.com/aimerfeng/ists/blob/main/src/components/practice-runner.tsx)
- [src/components/review-workspace.tsx](https://github.com/aimerfeng/ists/blob/main/src/components/review-workspace.tsx)
- [src/components/mock-exam.tsx](https://github.com/aimerfeng/ists/blob/main/src/components/mock-exam.tsx)
- [src/server/store.ts](https://github.com/aimerfeng/ists/blob/main/src/server/store.ts)
- [src/server/material-import.ts](https://github.com/aimerfeng/ists/blob/main/src/server/material-import.ts)
- [docs/BACKUP.md](https://github.com/aimerfeng/ists/blob/main/docs/BACKUP.md)
- [src/lib/study-progress.ts](https://github.com/aimerfeng/ists/blob/main/src/lib/study-progress.ts)

These paths were verified in the live tree. Reading selected files does not establish runtime correctness of every listed module.

## Things NOT to copy

Do not replace Vite or the existing repositories with Next.js/SQLite. Do not import IELTS band calculations, AI coach, Notion integration or sample material.

## Mapping to our architecture

Today and Review should derive from durable Attempts and ErrorRecords; Mock feeds Checkpoint; preserve src/algorithms/mastery.ts, priority.ts and prescription.ts.

## Integration risk

Medium: server filesystem uploads do not translate directly to browser IndexedDB; imports and audio blobs need separate validation and backup coverage. README feature claims were not runtime-tested.

## Recommended adoption

Reimplement workflow ideas in existing TypeScript domain; first prioritize practice → error → retry.

This audit copies no upstream source or learning content. Implementation and validation status belong in local phase evidence, not in upstream feature claims.
