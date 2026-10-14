# Snapshot sync protocol

Sync operates on a complete validated snapshot. The latest cloud row is a backup/recovery point, not the source of each local keystroke. There is no silent last-write-wins merge.

## Local revision and checkpoints

The persisted learning JSON includes `_localRevision`. A successful changed save increments it in the same localStorage replacement as the data. Identical saves do not increment it; failed writes do not advance it. Editor saves reject a stale expected revision under the shared Web Lock. Reset writes a monotonic tombstone and a new plan continues above that revision.

`workbench:device-id` is stable within the browser. `workbench:cloud-meta:<userId>` separately stores the last acknowledged local revision, remote revision and timestamp. Metadata is scoped to the account; a delayed acknowledgement cannot move an already newer remote checkpoint backwards. The remote and local revision counters may differ after restoring another device's data.

## Push

1. Read the persisted local learning state and its revision; a reset marker is not learning data.
2. Export the question repository and upload referenced local recordings/materials into immutable user-scoped paths. Upload failure leaves the local state and files intact.
3. Validate the portable state, canonicalize its JSON and compute its SHA-256 checksum.
4. Read the current user's cloud row after verifying authentication. Compare its revision with the last acknowledged cloud revision.
5. If they differ, durably save both sides and return a conflict. Otherwise submit a compare-and-swap RPC with the expected base and a strictly greater next revision.
6. Verify the acknowledgement's revision and checksum before storing an account checkpoint. If the RPC loses a race with `PT409` / HTTP 409 (or legacy `40001`), reread the winner, preserve both sides and return a conflict. Migration 3 avoids the hosted PostgREST 14 retry behavior of intentional `40001`; both local and hosted security checks verify one winner and one returned HTTP-409 loser.

A repeated sync with the same validated checksum and acknowledged remote revision does not manufacture a new revision. A network/auth/storage error must not replace local learning state or fabricate success. Pending edits made during an upload remain local work for the next sync.

## Pull and confirmed restore

The user requests a preview. The service fetches the authenticated account's row, checks its checksum and declared schema, migrates supported V1 data using the existing migration, applies V2/business/question-bundle validation, and binds the preview to the account and current local revision/raw state.

Only explicit confirmation replaces study data. At commit the service revalidates the snapshot, checks the account and preview freshness, preserves the prior learning state and bank, and writes an interrupted-restore journal. Question replacement, learning-state persistence and sync acknowledgement complete before the journal is removed. Startup recovery rolls back an incomplete replacement before the app renders. See [CONFLICT_RECOVERY.md](CONFLICT_RECOVERY.md).

Referenced binary downloads are verified before accepting a restore. An existing local asset ID with different bytes causes a visible conflict rather than changing the recording/material behind the user's history. Signed URLs are generated when downloading and are not persisted.

## Trigger and visibility boundaries

The implemented primary trigger is the Settings **立即同步** action. Sync never runs on every answer or form keystroke. Window focus and reconnect read the remote revision using the initiating account's token, while local storage/data-change events refresh the visible checkpoint state. Question-bank changes also participate in the checkpoint, including changes made while an upload is in flight. The UI displays Local only, Sync pending, Synced, Conflict or Sync error and the last successful sync timestamp. These checks never silently replace local edits. A restored cloud row requires the preview/confirmation path.

The production-build browser gate passed offline work, reload, reconnect, explicit sync and exact business-state restoration in a fresh context against the real local Supabase stack. The separate hosted security gate passed RPC ownership/concurrency and private storage rules. These scopes do not establish full hosted Preview flow or real CI acceptance; see [CLOUD_TESTING.md](CLOUD_TESTING.md).
