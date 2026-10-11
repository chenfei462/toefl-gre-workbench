# V2 Architecture

V2 keeps the existing React shell and local storage boundary, then adds a domain-first adaptive layer. React renders projections of state; algorithms do not live in components.

## Flow

```text
Attempt / checkpoint input
  -> versioned WorkbenchState
  -> mastery aggregation
  -> priority explanations
  -> time-budgeted daily prescription
  -> focus session / practice result
  -> error queue and retry
  -> next prescription
```

## Boundaries

- `src/types.ts` is the public domain contract.
- `src/storage.ts` owns parsing, schema versioning, migration, import and export.
- `src/algorithms/` contains deterministic mastery, priority, prescription and spaced-review functions.
- `src/domain.ts` retains the V1 macro plan generator.
- `src/App.tsx` owns navigation and composes domain outputs; it does not calculate mastery or priority.

V1 aggregate practice records remain in `practiceEntries` and `legacyPracticeEntries`. They are never fabricated into question-level attempts.
