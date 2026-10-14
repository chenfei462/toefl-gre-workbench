# Conflict and interrupted-restore recovery

A conflict means the remote revision no longer matches this browser's last acknowledged base. Two devices can both edit revision N; the first accepted CAS wins and the second must surface a conflict. Equal content does not bypass a revision conflict.

Before presenting a conflict, `preserveConflict` commits an IndexedDB record containing the validated local snapshot, remote snapshot (or null), device/base/local position, account ID and creation time in `workbench-cloud-recovery`. If recovery cannot be saved, the operation fails closed and does not overwrite the cloud winner. Clearing browser/site storage can remove this recovery store, so download backups before doing so.

## User choices

- **保留本地并覆盖已查看的云端版本**: preserve both sides again, then CAS against the explicitly viewed remote revision. A further concurrent update produces another conflict.
- **使用云端：先预览**: validate the remote backup, show its revision/attempt/error counts, then require explicit restore confirmation. A changed local state or account invalidates that preview.
- **导出双方备份**: download the local learning JSON and remote snapshot state. Binary files remain separate and can be downloaded from their local material/recording controls. The cloud JSON includes the question bundle and binary references; the current local conflict-export JSON should not be described as a complete binary archive.

There is no automatic field merge, automatic deletion of the losing device's learning history, or assumption that the newest timestamp identifies the correct state.

## Restore journal

`workbench-restore-journal` retains the previous raw learning JSON, portable question bundle and account metadata before replacing them. A pending local marker blocks existing editors until recovery/commit completes. The journal also records the IDs of newly introduced binaries before committing them. `recoverInterruptedRestore` restores the prior learning/bank/metadata and removes only those introduced assets; it removes the journal/marker only after recovery succeeds. `main.tsx` runs recovery before rendering; if recovery fails, the app displays a retry instruction rather than rendering a partially restored study state.

The confirmed restore shares the local write lock with editors and question-bank writers. Raw state, revision, bank fingerprint and the active account are rechecked before replacement. Verified files are added without overwriting same-ID/different-byte local assets. Separate IndexedDB stores and localStorage do not provide one cross-store database transaction; the journal supplies rollback across their replacement and newly added assets. Downloads are prepared before commit, and an account change aborts rather than presenting another account's recovery as successful.

## Safe troubleshooting

1. Keep the current browser tab and local data. Export current learning JSON and download important local recordings/materials.
2. Close older workbench tabs if a Web Lock, blocked IndexedDB upgrade or stale editor prevents a save.
3. Retry startup recovery or reopen the restore preview after authentication is restored.
4. If a binary ID conflict remains, keep/export the existing bytes and perform cloud restoration in a fresh browser profile. Do not delete learner files solely to force a green result.
5. Retain the error message, account/remote revision and test evidence without sharing passwords, tokens, signed URLs or question content.

The local **清空所有数据** action is not remote-account deletion. Its revision tombstone protects against stale tabs; it does not constitute a verified purge of cloud objects or every IndexedDB store.
