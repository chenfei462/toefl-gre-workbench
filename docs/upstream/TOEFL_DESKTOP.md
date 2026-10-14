# TOEFL DESKTOP upstream audit

Checked: 2026-10-14 (Asia/Tokyo). [Repository](https://github.com/fazrimaulana1230/toefl-desktop-app).

## Evidence

Live GitHub REST metadata and recursive default-branch file tree were fetched. Branch: main; tree SHA: `82238022ddf742d4c292548073056b40229133c4`; tree truncated: false; last push reported: 2026-04-17T04:17:21Z. Tree SHA identifies a tree, not a commit. File links below track the checked default branch and can change. Selected README/manifests/license/source were read; no upstream app was installed or run.

- [Metadata API](https://api.github.com/repos/fazrimaulana1230/toefl-desktop-app)
- [Tree API](https://api.github.com/repos/fazrimaulana1230/toefl-desktop-app/git/trees/82238022ddf742d4c292548073056b40229133c4?recursive=1)

## What it does

Desktop TOEFL ITP/PBT examination app, including camera monitoring, screenshots and Google Sheets integration according to repository metadata.

## License

MIT verified in GitHub metadata and the [LICENSE text](https://github.com/fazrimaulana1230/toefl-desktop-app/blob/main/LICENSE). Preserve copyright and permission notice for any future substantial code reuse; independently assess third-party content.

## Technology

React 19, TypeScript, Vite, Zustand, Tailwind and Electron verified in package.json.

## Useful modules

Exam controller, answer state, navigation, timer visibility and submission confirmation. Timer source ticks a store once per second.

## Actual files worth studying

- [src/components/exam/ExamController.tsx](https://github.com/fazrimaulana1230/toefl-desktop-app/blob/main/src/components/exam/ExamController.tsx)
- [src/components/exam/Timer.tsx](https://github.com/fazrimaulana1230/toefl-desktop-app/blob/main/src/components/exam/Timer.tsx)
- [src/store/examStore.ts](https://github.com/fazrimaulana1230/toefl-desktop-app/blob/main/src/store/examStore.ts)
- [src/pages/ReadingSection.tsx](https://github.com/fazrimaulana1230/toefl-desktop-app/blob/main/src/pages/ReadingSection.tsx)
- [src/components/ConfirmationModal.tsx](https://github.com/fazrimaulana1230/toefl-desktop-app/blob/main/src/components/ConfirmationModal.tsx)
- [src/pages/ResultPage.tsx](https://github.com/fazrimaulana1230/toefl-desktop-app/blob/main/src/pages/ResultPage.tsx)
- [src/utils/scoring.ts](https://github.com/fazrimaulana1230/toefl-desktop-app/blob/main/src/utils/scoring.ts)

These paths were verified in the live tree. Reading selected files does not establish runtime correctness of every listed module.

## Things NOT to copy

No ITP/PBT structure, 310–677 conversion, question banks, proctoring, image upload, Google Sheets or Electron packaging. Read scoring only to identify the boundary to reject.

## Mapping to our architecture

PracticeSession wraps existing QuestionRepository and commits one Attempt per question plus ErrorRecord for wrong/unanswered responses. Result is practice accuracy and elapsed time, never an official iBT score.

## Integration risk

Medium: interval ticks alone do not prove refresh-safe or background-safe timing. Use persisted timestamps and idempotent submission in our own implementation.

## Recommended adoption

Study interaction decomposition; independently implement browser player and refresh-safe deadline.

This audit copies no upstream source or learning content. Implementation and validation status belong in local phase evidence, not in upstream feature claims.
