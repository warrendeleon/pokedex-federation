import React, { Suspense } from 'react';

import { ErrorState, LoadingState } from '@pokedex/ui';

import {
  forceReloadRemote,
  markRemoteBundledFallback,
  markRemoteLoadSuccess,
  shouldAttemptBundledFallback,
} from './scriptManager';

// --- Owns the lifecycle of one federated mount point. Responsibilities:
//
// 1. Suspense + lazy + retry. Wraps the React.lazy slot; on retry it bumps `attempt`, which keys
//    the inner slot so React unmounts + remounts and creates a fresh React.lazy that re-invokes
//    the loader (a cached failure would otherwise stick).
// 2. Explicit export validation. MF V2's runtime sometimes resolves a failed manifest fetch to
//    a module that lacks the expected export instead of rejecting. The loader validates the
//    component is a function and throws a clear, attributable error if not.
// 3. Bundled fallback. The first time a CDN-loaded remote throws -- a failed load (retired
//    version, network) OR a runtime crash from code built against a newer shared library than
//    this binary carries -- drop that remote to its embedded copy and reload, showing the loading
//    state, not the error, during the swap. The embedded copy shipped with the app so it is always
//    compatible. Only if the embedded copy ALSO throws does the user see the error. This is what
//    makes "an old app never breaks" hold regardless of what the CDN serves it. ---

interface Props {
  name: string;
  remoteName: string;
  load: () => Promise<{ default: React.ComponentType<any> }>;
  variant?: 'light' | 'dark';
  /** Forwarded to the loaded component (e.g. route/navigation props). */
  componentProps?: Record<string, unknown>;
}

interface State {
  error: Error | null;
  attempt: number;
  /** Set once this remote has been dropped to its embedded copy, so a second failure surfaces. */
  fellBack: boolean;
}

export class FederatedTabBoundary extends React.Component<Props, State> {
  state: State = { error: null, attempt: 0, fellBack: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(`[FederatedTabBoundary:${this.props.name}]`, error);
    // First failure of a CDN remote: switch it to the embedded copy and reload automatically.
    if (
      !this.state.fellBack &&
      shouldAttemptBundledFallback(this.props.remoteName)
    ) {
      markRemoteBundledFallback(this.props.remoteName).then(() => {
        this.setState(s => ({
          error: null,
          attempt: s.attempt + 1,
          fellBack: true,
        }));
      });
    }
  }

  private retry = async () => {
    await forceReloadRemote(this.props.remoteName);
    this.setState(s => ({ error: null, attempt: s.attempt + 1 }));
  };

  render() {
    const { error, fellBack } = this.state;
    const {
      name,
      remoteName,
      variant = 'light',
      load,
      componentProps,
    } = this.props;

    if (error) {
      // An auto-fallback is about to reload this remote from its embedded copy: show loading, not
      // the error, so the swap is invisible to the user.
      if (!fellBack && shouldAttemptBundledFallback(remoteName)) {
        return <LoadingState variant={variant} caption={`Loading ${name}…`} />;
      }
      // No fallback left (already on embedded, or none applicable): this is a real failure.
      return (
        <ErrorState
          variant={variant}
          title={`Couldn't load ${name}`}
          message={error.message}
          onRetry={this.retry}
        />
      );
    }

    return (
      <FederatedSlot
        key={this.state.attempt}
        load={load}
        name={name}
        variant={variant}
        componentProps={componentProps}
        onLoaded={() => markRemoteLoadSuccess(remoteName)}
      />
    );
  }
}

function FederatedSlot({
  load,
  name,
  variant,
  componentProps,
  onLoaded,
}: {
  load: Props['load'];
  name: string;
  variant: 'light' | 'dark';
  componentProps?: Record<string, unknown>;
  onLoaded: () => void;
}) {
  const Lazy = React.useMemo(
    () =>
      React.lazy(async () => {
        const m = await load();
        const Component = (m as { default?: React.ComponentType<any> }).default;
        if (typeof Component !== 'function') {
          throw new Error(
            `Federated module "${name}" loaded but did not export a component (the manifest fetch likely failed and MF returned a partial module).`,
          );
        }
        return { default: Component };
      }),
    // The boundary's `key` change forces a remount, so this only ever runs once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  return (
    <Suspense
      fallback={<LoadingState variant={variant} caption={`Loading ${name}…`} />}
    >
      <Lazy {...(componentProps ?? {})} />
      {/* Sibling of <Lazy> inside Suspense: only mounts once the lazy load resolves, so it is a
          genuine "this remote rendered" signal (a failed load throws to the error boundary and
          this never mounts). Clears the remote's consecutive-failure count. */}
      <LoadSuccessBeacon onLoaded={onLoaded} />
    </Suspense>
  );
}

function LoadSuccessBeacon({ onLoaded }: { onLoaded: () => void }) {
  const fired = React.useRef(false);
  React.useEffect(() => {
    if (!fired.current) {
      fired.current = true;
      onLoaded();
    }
  });
  return null;
}
