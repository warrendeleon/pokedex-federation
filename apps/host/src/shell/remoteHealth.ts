// --- Pure cross-launch health logic behind the federation auto-rollback. No React Native or
// storage dependencies, so it is unit-testable on its own (see __tests__/remoteHealth.test.ts).
// scriptManager.ts persists the count in MMKV and wires these into the boot probe (rollback) and the
// fallback path (record a failure); FederatedTabBoundary clears the count on a successful render. ---

export interface RemoteHealth {
  /** the CDN version the failure count is for */
  version: string;
  /** consecutive failed loads of that version */
  fails: number;
}

/** A remote whose pinned CDN version fails this many launches in a row is rolled back to its
 *  embedded copy on the next launch. */
export const FAILURE_THRESHOLD = 2;

/** Next health after a failed load. A failure of the same version increments the count; a failure
 *  of a different version (a new release) starts the count over at 1. */
export function nextHealthOnFailure(
  prev: RemoteHealth | null,
  version: string,
): RemoteHealth {
  return prev && prev.version === version
    ? { version, fails: prev.fails + 1 }
    : { version, fails: 1 };
}

/** Whether the resolved version has failed enough consecutive launches to roll back to the embedded
 *  copy. Only the version currently being resolved counts, so a fixed redeploy (new version string)
 *  is never blocked by an old version's failures. */
export function shouldRollBackVersion(
  health: RemoteHealth | null,
  resolvedVersion: string,
  threshold: number = FAILURE_THRESHOLD,
): boolean {
  return (
    !!health && health.version === resolvedVersion && health.fails >= threshold
  );
}
