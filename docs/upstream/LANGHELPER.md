# LANGHELPER upstream audit

Checked: 2026-10-14 (Asia/Tokyo). [Repository](https://github.com/NsLearning/LangHelper).

## Evidence

Live GitHub REST metadata and recursive default-branch file tree were fetched. Branch: main; tree SHA: `acb30ca60b2311c545d0006d2a319ea6a5a9cedb`; tree truncated: false; last push reported: 2023-11-23T07:54:29Z. Tree SHA identifies a tree, not a commit. File links below track the checked default branch and can change. Selected README/manifests/license/source were read; no upstream app was installed or run.

- [Metadata API](https://api.github.com/repos/NsLearning/LangHelper)
- [Tree API](https://api.github.com/repos/NsLearning/LangHelper/git/trees/acb30ca60b2311c545d0006d2a319ea6a5a9cedb?recursive=1)

## What it does

Language conversation and pronunciation assessment project; README describes browser/Iflytek recognition, TTS and SpeechSuper/Iflytek assessment.

## License

MIT verified in GitHub metadata and the [LICENSE text](https://github.com/NsLearning/LangHelper/blob/main/LICENSE). Preserve copyright and permission notice for any future substantial code reuse; independently assess third-party content.

## Technology

GitHub primary language Rust, but actual tree includes Tauri/TypeScript desktop shell plus Python speech helper. Inspected LangHelper/main.py imports TTS, pydub and simpleaudio.

## Useful modules

Separation of playback, recognition, assessment and provider configuration.

## Actual files worth studying

- [LangHelper/main.py](https://github.com/NsLearning/LangHelper/blob/main/LangHelper/main.py)
- [LangHelper/recoder.py](https://github.com/NsLearning/LangHelper/blob/main/LangHelper/recoder.py)
- [LangHelper/Recognition/IflytekRec.py](https://github.com/NsLearning/LangHelper/blob/main/LangHelper/Recognition/IflytekRec.py)
- [LangHelper/Assess/SpeechSuper.py](https://github.com/NsLearning/LangHelper/blob/main/LangHelper/Assess/SpeechSuper.py)
- [ChatGPT/src/view/settings/LangHelper.tsx](https://github.com/NsLearning/LangHelper/blob/main/ChatGPT/src/view/settings/LangHelper.tsx)

These paths were verified in the live tree. Reading selected files does not establish runtime correctness of every listed module.

## Things NOT to copy

Do not port Rust/Python, desktop setup, vendor credentials, celebrity voice assets or assessment scores. No provider integration or AI score in this phase.

## Mapping to our architecture

Browser recorder and self-review remain local. Future STT can attach optional transcript evidence without replacing Attempts, Errors or Mastery.

## Integration risk

High: last metadata push 2023-11-23, external speech API contracts and model dependencies may be stale. README claims are not a verified current listening/vocabulary product.

## Recommended adoption

Conceptual workflow reference only; TypeScript implementation of requested local recording lifecycle.

This audit copies no upstream source or learning content. Implementation and validation status belong in local phase evidence, not in upstream feature claims.
