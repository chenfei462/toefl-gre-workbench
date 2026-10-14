# MOCK TEST UI upstream audit

Checked: 2026-10-14 (Asia/Tokyo). [Repository](https://github.com/developer-mezbah/Mock-Test-UI).

## Evidence

Live GitHub REST metadata and recursive default-branch file tree were fetched. Branch: main; tree SHA: `155ca2f9001690e3aae8109b7a3894df42ab5ff0`; tree truncated: false; last push reported: 2025-07-16T11:27:03Z. Tree SHA identifies a tree, not a commit. File links below track the checked default branch and can change. Selected README/manifests/license/source were read; no upstream app was installed or run.

- [Metadata API](https://api.github.com/repos/developer-mezbah/Mock-Test-UI)
- [Tree API](https://api.github.com/repos/developer-mezbah/Mock-Test-UI/git/trees/155ca2f9001690e3aae8109b7a3894df42ab5ff0?recursive=1)

## What it does

Speaking simulation advertised for IELTS/TOEFL/PTE. Inspected app actually presents IELTS speaking Parts 1–3, speech recognition and speech synthesis.

## License

MIT verified in GitHub metadata and the [LICENSE text](https://github.com/developer-mezbah/Mock-Test-UI/blob/main/LICENSE). Preserve copyright and permission notice for any future substantial code reuse; independently assess third-party content.

## Technology

JavaScript, Preact preset, Vite 7, Tailwind 4. package.json lists preact rather than React; app imports React-compatible hooks.

## Useful modules

Preparation/response countdown, transcript state, speaking controls and unsupported-browser feedback.

## Actual files worth studying

- [src/app.jsx](https://github.com/developer-mezbah/Mock-Test-UI/blob/main/src/app.jsx)
- [src/app.css](https://github.com/developer-mezbah/Mock-Test-UI/blob/main/src/app.css)
- [package.json](https://github.com/developer-mezbah/Mock-Test-UI/blob/main/package.json)
- [vite.config.js](https://github.com/developer-mezbah/Mock-Test-UI/blob/main/vite.config.js)

These paths were verified in the live tree. Reading selected files does not establish runtime correctness of every listed module.

## Things NOT to copy

Do not copy IELTS timings, automatic feedback/scoring claims or single-file application. Do not mistake speech-to-text for recorded audio.

## Mapping to our architecture

SpeakingPracticeSession uses prompt → audio → preparation → record → replay → self-review, generating categorized evidence for the existing mastery pipeline.

## Integration risk

High as a recorder reference: full src/app.jsx text scan found SpeechRecognition but no MediaRecorder, getUserMedia or localStorage. Durable audio, permission denial, recording errors and refresh history are not established here.

## Recommended adoption

Interaction reference only. Implement MediaRecorder and IndexedDB blob persistence independently; verify permission allow/deny, stop/replay and reload.

This audit copies no upstream source or learning content. Implementation and validation status belong in local phase evidence, not in upstream feature claims.
