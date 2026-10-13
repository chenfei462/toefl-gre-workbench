# Data Provenance

Every imported question carries a registered source ID, publisher/provider metadata, source type and tier, exam version, rights status, verification state, and retrieval metadata when available. The source catalog is in `data/official-sources/sources.json` and is seeded through `src/questionDatabase/sources.ts`.

Official-source validation requires `sourceType = official`, `publisher = ETS`, `verified = true`, and an HTTPS URL on `ets.org`. Official metadata does not grant permission to copy protected question text. The seeded ETS rows therefore use `rightsStatus = reference_only`; the app keeps locators and answer/provenance records while the learner opens the original source.

Live verification on 2026-10-12 used `curl.exe -sS -L -o NUL -w '%{http_code}|%{url_effective}' --max-time 15` for every URL in `data/official-sources/sources.json`. All 17 requests returned HTTP 200. ETS redirected the two TOEFL 2026 PDF paths to `https://www.ets.org/pdfs/toefl/...`; all final URLs remained on ETS.

Verified IDs: `ets-toefl-test-content`, `ets-toefl-testready`, `ets-toefl-free-practice`, `ets-toefl-activity`, `ets-toefl-section-test`, `ets-toefl-section-practice`, `ets-toefl-focused`, `ets-toefl-overview`, `ets-gre-verbal-samples`, `ets-gre-quant-samples`, `ets-gre-powerprep-preview`, `ets-gre-powerprep-1`, `ets-gre-powerprep-2`, `ets-gre-diagnostic`, `ets-gre-math-review`, `ets-toefl-2026-practice-1`, and `ets-toefl-2026-practice-2`.

No login was bypassed, no paywall was accessed, and no paid or copyrighted question bank content was downloaded or saved.
