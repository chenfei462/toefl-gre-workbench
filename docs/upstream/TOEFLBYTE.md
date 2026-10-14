# TOEFLBYTE upstream audit

Checked: 2026-10-14 (Asia/Tokyo). [Repository](https://github.com/jungmokk/Toeflbyte).

## Evidence

Live GitHub REST metadata and recursive default-branch file tree were fetched. Branch: main; tree SHA: `1301c4048ea2a99e21f01ca1eeb7901c468e1393`; tree truncated: false; last push reported: 2026-09-21T11:47:19Z. Tree SHA identifies a tree, not a commit. File links below track the checked default branch and can change. Selected README/manifests/license/source were read; no upstream app was installed or run.

- [Metadata API](https://api.github.com/repos/jungmokk/Toeflbyte)
- [Tree API](https://api.github.com/repos/jungmokk/Toeflbyte/git/trees/1301c4048ea2a99e21f01ca1eeb7901c468e1393?recursive=1)

## What it does

TOEFL reading practice product. Inspected PRD explicitly describes distractor_logic with Word Salad and Not Mentioned examples; controller requests distractor rules and summarizes incorrect answers.

## License

No explicit license verified: GitHub license field is null and the inspected recursive tree has no LICENSE file. Public visibility grants no general code-reuse permission. Design study only.

## Technology

Client package verifies Expo, React Native, React and Zustand; JavaScript server tree includes Prisma and Supabase-related files.

## Useful modules

Concept of explaining why each distractor is wrong, and grouping repeated traps. PRD is a design document, not proof all described behavior ships.

## Actual files worth studying

- [PRD.md](https://github.com/jungmokk/Toeflbyte/blob/main/PRD.md)
- [architecture.md](https://github.com/jungmokk/Toeflbyte/blob/main/architecture.md)
- [client/src/screens/Review/ReviewDetail.js](https://github.com/jungmokk/Toeflbyte/blob/main/client/src/screens/Review/ReviewDetail.js)
- [client/src/screens/Test/Test.js](https://github.com/jungmokk/Toeflbyte/blob/main/client/src/screens/Test/Test.js)
- [server/src/controllers/testController.js](https://github.com/jungmokk/Toeflbyte/blob/main/server/src/controllers/testController.js)
- [server/prisma/schema.prisma](https://github.com/jungmokk/Toeflbyte/blob/main/server/prisma/schema.prisma)

These paths were verified in the live tree. Reading selected files does not establish runtime correctness of every listed module.

## Things NOT to copy

No source, prompts, scraped question data, PDFs, assets, monetization, AI generation or legacy exam taxonomy. Do not treat generated questions as official.

## Mapping to our architecture

Extend ErrorRecord with TrapType, my reason, correct reason and better strategy; retain separate skill/error/trap dimensions and existing mastery and retry identifiers.

## Integration risk

High licensing/content risk: API license null, recursive tree no license file, and tree contains scraped data/PDF sources. Trap labels are learner analysis, not independently verified official ETS categories.

## Recommended adoption

Design concepts only; independently implement typed traps and repeated-trap aggregation over existing errors.

This audit copies no upstream source or learning content. Implementation and validation status belong in local phase evidence, not in upstream feature claims.
