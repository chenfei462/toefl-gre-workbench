# Independent pending-save guard review

Date: 2026-10-14. Reviewer: requirements/release audit subagent, which did not implement the App save queue or unload guard.

Scope: the pending-write and failed-save changes in `src/App.tsx`, their regression cases in `src/app.profile.test.tsx`, and the existing local write-lock/revision contract. This is acceptance of that narrow change, not the complete cloud release, hosted Preview or seven-day pilot.

## Findings and repair

The initial pending-only guard stopped warning once a rejected save finished, although the edited state remained only in memory. The final implementation includes a separate `unsavedEdits` ref: failed save/reset paths set it, successful persisted full-state writes or a successful reset clear it, and the unload handler warns while either pending writes or unsaved edits remain. This closes the identified failure-path gap.

The pending counter increments synchronously when an update/reset is queued, before its promise callback or Web Lock runs. It therefore covers an immediate reload between the user's action and the first persistence microtask. Each chain decrements in `finally`, including obsolete updates skipped by the reset generation; multiple queued operations retain the warning until the queue settles. A failure keeps the independent unsaved flag set after that counter reaches zero. Local CAS/revision and reset-tombstone protection remain in their existing storage functions.

The effect registers one named callback per App mount and removes that exact callback during cleanup. The handler reads refs rather than a captured render value, so re-renders do not create listeners or stale pending-state closures. A successful older queued write cannot release the warning while a newer operation remains queued because the pending count still covers it. Failed writes retain the existing visible error and current-data export path.

No blocking defect was found in the final reviewed guard. Product source was not edited by this reviewer.

## Fresh evidence

Independent command:

```text
npx vitest run src/app.profile.test.tsx
```

Result: exit 0; one file, five tests passed; test duration 4.26 seconds (17:52:49 JST). The cases exercise an explicitly blocked Web Lock and prove unload cancellation before persistence plus release after successful persistence; reject a write and retain the warning with memory-only edits; and retain the existing onboarding/settings/backup target behavior. The author separately observed the relevant new cases fail before implementation; this reviewer inspected the current assertions and independently reran the final cases.

Listener cleanup was reviewed directly in the implementation. This command is not a full unit/browser regression and does not prove actual browser dialog rendering.

## Practical boundary

`beforeunload` is an advisory browser warning. It does not persist in-memory data itself, guarantee protection after a user elects to leave, or prevent browser/OS termination; browser policies can suppress a dialog. A visible save failure still requires export/recovery, and application release claims require the final complete gates. Earlier hosted Preview smoke exercised the build before this guard was added, so the updated deployment needs its own smoke evidence.
