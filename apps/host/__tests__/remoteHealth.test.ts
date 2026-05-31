import {
  FAILURE_THRESHOLD,
  nextHealthOnFailure,
  nextHealthOnSuccess,
  shouldRollBackVersion,
  type RemoteHealth,
} from '../src/shell/remoteHealth';

// The cross-launch auto-rollback decision: a remote whose pinned CDN version fails
// FAILURE_THRESHOLD launches in a row is rolled back to its embedded copy on the next launch. These
// are the pure transitions behind it; scriptManager persists the result in MMKV between launches and
// FederatedTabBoundary clears the count on a successful render.

describe('nextHealthOnFailure', () => {
  it('starts a fresh count on the first failure', () => {
    expect(nextHealthOnFailure(null, '1.1.0')).toEqual({
      version: '1.1.0',
      fails: 1,
    });
  });

  it('increments consecutive failures of the same version', () => {
    const after1 = nextHealthOnFailure(null, '1.1.0');
    const after2 = nextHealthOnFailure(after1, '1.1.0');
    expect(after2).toEqual({ version: '1.1.0', fails: 2 });
  });

  it('starts over when the version changes (a new release)', () => {
    const old: RemoteHealth = { version: '1.1.0', fails: 5 };
    expect(nextHealthOnFailure(old, '1.2.0')).toEqual({
      version: '1.2.0',
      fails: 1,
    });
  });
});

describe('nextHealthOnSuccess', () => {
  it('clears the count to zero on a clean CDN render', () => {
    expect(
      nextHealthOnSuccess({ version: '1.1.0', fails: 1 }, '1.1.0', false),
    ).toEqual({ version: '1.1.0', fails: 0 });
  });

  it('clears from no prior record (first ever render)', () => {
    expect(nextHealthOnSuccess(null, '1.1.0', false)).toEqual({
      version: '1.1.0',
      fails: 0,
    });
  });

  it('does NOT clear when the remote fell back to its embedded copy', () => {
    // The successful render is the embedded version, so the CDN version's failure still stands.
    // This is the guard that lets a consistently-broken version actually reach the threshold.
    expect(
      nextHealthOnSuccess({ version: '1.1.0', fails: 1 }, '1.1.0', true),
    ).toBeNull();
  });

  it('does nothing when there is no resolved version', () => {
    expect(nextHealthOnSuccess(null, undefined, false)).toBeNull();
  });

  it('skips a redundant write when the count is already zero', () => {
    expect(
      nextHealthOnSuccess({ version: '1.1.0', fails: 0 }, '1.1.0', false),
    ).toBeNull();
  });

  it('clears for a newly resolved version even if an old version was at zero', () => {
    expect(
      nextHealthOnSuccess({ version: '1.1.0', fails: 0 }, '1.2.0', false),
    ).toEqual({ version: '1.2.0', fails: 0 });
  });
});

describe('shouldRollBackVersion', () => {
  it('does not roll back with no recorded health', () => {
    expect(shouldRollBackVersion(null, '1.1.0')).toBe(false);
  });

  it('does not roll back below the threshold', () => {
    expect(
      shouldRollBackVersion(
        { version: '1.1.0', fails: FAILURE_THRESHOLD - 1 },
        '1.1.0',
      ),
    ).toBe(false);
  });

  it('rolls back at the threshold', () => {
    expect(
      shouldRollBackVersion(
        { version: '1.1.0', fails: FAILURE_THRESHOLD },
        '1.1.0',
      ),
    ).toBe(true);
  });

  it('rolls back above the threshold', () => {
    expect(
      shouldRollBackVersion(
        { version: '1.1.0', fails: FAILURE_THRESHOLD + 3 },
        '1.1.0',
      ),
    ).toBe(true);
  });

  it('does not roll back when the resolved version differs from the failed one', () => {
    // A redeploy to a new version must not be blocked by the old version's failures.
    expect(shouldRollBackVersion({ version: '1.1.0', fails: 9 }, '1.2.0')).toBe(
      false,
    );
  });

  it('honours a custom threshold', () => {
    expect(
      shouldRollBackVersion({ version: '1.1.0', fails: 1 }, '1.1.0', 1),
    ).toBe(true);
  });
});

describe('consecutive-failure rollback (end to end)', () => {
  it('rolls back after exactly FAILURE_THRESHOLD consecutive failures, not before', () => {
    let health: RemoteHealth | null = null;
    for (let i = 1; i < FAILURE_THRESHOLD; i++) {
      health = nextHealthOnFailure(health, '1.1.0');
      expect(shouldRollBackVersion(health, '1.1.0')).toBe(false);
    }
    health = nextHealthOnFailure(health, '1.1.0');
    expect(shouldRollBackVersion(health, '1.1.0')).toBe(true);
  });

  it('a clean CDN render between failures stops the rollback', () => {
    // A success clears the count to 0; a single later failure is below the threshold.
    let health: RemoteHealth | null = nextHealthOnFailure(null, '1.1.0');
    health = nextHealthOnSuccess(health, '1.1.0', false);
    health = nextHealthOnFailure(health, '1.1.0');
    expect(shouldRollBackVersion(health, '1.1.0')).toBe(false);
  });

  it('an embedded-fallback render does NOT stop the rollback', () => {
    // The fallback render is the embedded copy, so the CDN version keeps accumulating failures.
    let health: RemoteHealth | null = nextHealthOnFailure(null, '1.1.0');
    health = nextHealthOnSuccess(health, '1.1.0', true) ?? health; // fellBack -> null, count holds
    health = nextHealthOnFailure(health, '1.1.0');
    expect(shouldRollBackVersion(health, '1.1.0')).toBe(true);
  });
});
