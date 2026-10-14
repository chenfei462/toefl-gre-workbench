# GRE PREP TOOL upstream audit

Checked: 2026-10-14 (Asia/Tokyo). [Repository](https://github.com/pycoder2000/GRE-Prep-Tool).

## Evidence

Live GitHub REST metadata and recursive default-branch file tree were fetched. Branch: main; tree SHA: `038f74c522de73e1d0847a57cea88e3b933cf052`; tree truncated: false; last push reported: 2024-05-21T05:40:43Z. Tree SHA identifies a tree, not a commit. File links below track the checked default branch and can change. Selected README/manifests/license/source were read; no upstream app was installed or run.

- [Metadata API](https://api.github.com/repos/pycoder2000/GRE-Prep-Tool)
- [Tree API](https://api.github.com/repos/pycoder2000/GRE-Prep-Tool/git/trees/038f74c522de73e1d0847a57cea88e3b933cf052?recursive=1)

## What it does

Python terminal GRE vocabulary learning, MCQ/written tests, learned-word tracking, test score/time statistics and streaks according to README.

## License

MIT verified in GitHub metadata and the [LICENSE text](https://github.com/pycoder2000/GRE-Prep-Tool/blob/main/LICENSE). Preserve copyright and permission notice for any future substantial code reuse; independently assess third-party content.

## Technology

Python CLI; requirements.txt and main.py exist; persistence files include JSON, CSV and text.

## Useful modules

Vocabulary lifecycle, learned/random quiz modes, review and performance history. Data file names illustrate separation; their contents are not imported.

## Actual files worth studying

- [main.py](https://github.com/pycoder2000/GRE-Prep-Tool/blob/main/main.py)
- [README.md](https://github.com/pycoder2000/GRE-Prep-Tool/blob/main/README.md)
- [TestedWords.json](https://github.com/pycoder2000/GRE-Prep-Tool/blob/main/TestedWords.json)
- [TestScores.csv](https://github.com/pycoder2000/GRE-Prep-Tool/blob/main/TestScores.csv)
- [Stats.txt](https://github.com/pycoder2000/GRE-Prep-Tool/blob/main/Stats.txt)

These paths were verified in the live tree. Reading selected files does not establish runtime correctness of every listed module.

## Things NOT to copy

No Python CLI, scraper, percentile claims or upstream wordlists. README explicitly attributes lists to vocabulary.com; MIT code license does not establish permission for third-party definitions or branded lists.

## Mapping to our architecture

VocabularyCard preserves user word/meaning/source, adds FSRS state and review history; Error Lab unknown words should link back to originating question and skill.

## Integration risk

Medium: flat-file lifecycle and streak do not demonstrate durable browser storage or scheduling quality. Last metadata push 2024-05-21.

## Recommended adoption

Reimplement lifecycle UX; use user-owned/original vocabulary and ts-fsrs, not upstream scheduling or content.

This audit copies no upstream source or learning content. Implementation and validation status belong in local phase evidence, not in upstream feature claims.
