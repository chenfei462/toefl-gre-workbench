# Upstream adoption matrix

Checked 2026-10-14 (Asia/Tokyo). This is an evidence-based design audit, not a claim that any upstream app was executed. All eleven named repository metadata/tree requests succeeded. Eight product/library reports link the actual files and tree SHA. Source/content copying: none.

| Reference | Verified license | Adopt | Boundary | Workbench phase |
| --- | --- | --- | --- | --- |
| [ISTS](ISTS.md) | MIT text + metadata | Daily loop, durable history, mistake queue, mock and backup concepts | No Next.js migration, IELTS scoring or AI coach | 5, 6 |
| [TOEFL Desktop](TOEFL_DESKTOP.md) | MIT text + metadata | Player controls and timer presentation | No ITP/PBT exam model, score conversion or proctoring | 1 |
| [Mock-Test-UI](MOCK_TEST_UI.md) | MIT text + metadata | Speaking countdown and transcript UX | Preact/Web Speech demo; no verified durable audio recorder | 2 |
| [LangHelper](LANGHELPER.md) | MIT text + metadata | Separate speech pipeline stages | Rust/Tauri plus Python, old provider dependencies; no code transplant | 2 |
| [GRE Prep Tool](GRE_PREP_TOOL.md) | MIT text + metadata | Vocabulary lifecycle and history | Third-party vocabulary.com content excluded | 3 |
| [ts-fsrs](TS_FSRS.md) | MIT text + metadata | Published scheduler package | Preserve card dates, log reviews, test migrations; no mastery replacement | 3 |
| [AI TOEFL Coach](AI_TOEFL_COACH.md) | No explicit license found | Score gap and next-action design | No source/assets; no predicted-score claim without evidence | 5, 7 |
| [Toeflbyte](TOEFLBYTE.md) | No explicit license found | Distractor reasoning concept | No source/prompts/PDFs/scraped content | 4 |
| [AI Learning Coach](DEVELOPMENT_WORKFLOW.md) | MIT text + metadata | Evidence and cross-session development workflow | Development only; not a product AI coach | 10 |
| [Playwright](https://github.com/microsoft/playwright) | Apache-2.0 metadata | Official browser test dependency | Prove local flows; upstream support is not a local passing test | 8 |
| [setup-node](https://github.com/actions/setup-node) | MIT metadata | Official Actions dependency | Specify runtime; cache does not replace npm ci | 9 |

## Corrections to initial assumptions

Mock-Test-UI is configured with Preact, and its single main file uses Web Speech rather than MediaRecorder. LangHelper's language statistic hides a Python speech helper. Toeflbyte and AI TOEFL Coach still have no explicit license in the inspected tree. Stars/forks were deliberately not used as adoption evidence: popularity does not validate content rights, correctness or exam currency.

## Integration contract

Keep Question Bank → Attempt → Error → Retry → Mastery → Weakness → Priority → Daily Prescription → Checkpoint → Replanning as the single business pipeline. No parallel mastery or priority model. New sessions must emit existing domain evidence, be resumable, and submit idempotently. Existing data is preserved by additive/defaulted fields and round-trip backup tests. User-created, public-domain or explicitly authorized learning content only.

Correctness gates follow USER_REQUIREMENTS.md: 20 questions / 13 correct produces 20 Attempts and 7 Errors; recording allow/deny/error/replay/reload; 100-word FSRS rating distribution; repeated traps; independent MockSession evidence; final-week boundary at seven days; six critical browser flows. These are requirements, not claims of tests already passing.

## Official testing and CI references

Playwright metadata/tree checked: main tree `a69a313712e43e09a53c57ae04ed6f110621875d`, Apache-2.0 metadata; [API](https://api.github.com/repos/microsoft/playwright). Its [README](https://github.com/microsoft/playwright/blob/main/README.md) was read and confirms Chromium, Firefox, WebKit, isolated tests and web-first assertions. [Official CI guide](https://playwright.dev/docs/ci) is the follow-up implementation reference. Install the browser version matching the lockfile; retain failing traces and assert user-visible outcomes and persisted effects. Use role/label selectors and a 390×844 project for the required mobile flow. Fake microphone automation must be identified as simulated, with real-device permission/replay verification separately recorded.

setup-node metadata/tree checked: main tree `949feb2413d6458794dcd2491c4babbbce0c15c1`, MIT metadata; [API](https://api.github.com/repos/actions/setup-node). Read [action.yml](https://github.com/actions/setup-node/blob/main/action.yml) and [README](https://github.com/actions/setup-node/blob/main/README.md): node-version, cache and cache-dependency-path are real inputs; action runtime is node24, distinct from the project Node version input. CI should use an explicitly supported Node version, npm cache keyed by package-lock.json, npm ci, typecheck, lint, tests, build, browser install and test:e2e on push/PR. Do not describe an authored workflow as a successful remote Actions run.

## Limitations and maintenance

Metadata and main links are snapshots of a moving branch, not pinned release guarantees. Tree SHA is not commit SHA. License text was directly read for all six MIT product/library references and AI Learning Coach; Playwright/setup-node license identification used metadata. Selected sources were inspected, not exhaustively reviewed. No runtime, provider, official exam specification, learning efficacy or third-party content license was independently validated. Recheck exact release and attribution before future source reuse.
