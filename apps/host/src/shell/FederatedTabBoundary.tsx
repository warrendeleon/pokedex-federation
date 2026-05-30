import React, {Suspense} from 'react';

import {ErrorState,LoadingState} from '@pokedex/ui';

import {forceReloadRemote} from './scriptManager';

// --- Owns the lifecycle of one federated mount point. Three responsibilities:
//
// 1. Suspense + lazy + retry. Wraps the React.lazy slot; on failure shows ErrorState with a
//    retry button; on retry it bumps `attempt`, which keys the inner slot so React unmounts +
//    remounts and creates a fresh React.lazy that re-invokes the loader (a cached failure
//    would otherwise stick).
// 2. Explicit export validation. MF V2's runtime sometimes resolves a failed manifest fetch to
//    a module that lacks the expected export instead of rejecting. The loader validates the
//    component is a function and throws a clear, attributable error if not.
// 3. (Hook point) health reporting; the operational layer adds success/failure reporting here
//    so a repeatedly-failing remote version gets auto-rolled-back on next launch. ---

interface Props {
  name: string;
  remoteName: string;
  load: () => Promise<{default: React.ComponentType<any>}>;
  variant?: 'light' | 'dark';
  /** Forwarded to the loaded component (e.g. route/navigation props). */
  componentProps?: Record<string, unknown>;
}

interface State {
  error: Error | null;
  attempt: number;
}

export class FederatedTabBoundary extends React.Component<Props, State> {
  state: State = {error: null, attempt: 0};

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {error};
  }

  componentDidCatch(error: Error) {
    console.error(`[FederatedTabBoundary:${this.props.name}]`, error);
  }

  private retry = async () => {
    await forceReloadRemote(this.props.remoteName);
    this.setState(s => ({error: null, attempt: s.attempt + 1}));
  };

  render() {
    const {error} = this.state;
    const {name, variant = 'light', load, componentProps} = this.props;

    if (error) {
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
      />
    );
  }
}

function FederatedSlot({
  load,
  name,
  variant,
  componentProps,
}: {
  load: Props['load'];
  name: string;
  variant: 'light' | 'dark';
  componentProps?: Record<string, unknown>;
}) {
  const Lazy = React.useMemo(
    () =>
      React.lazy(async () => {
        const m = await load();
        const Component = (m as {default?: React.ComponentType<any>}).default;
        if (typeof Component !== 'function') {
          throw new Error(
            `Federated module "${name}" loaded but did not export a component (the manifest fetch likely failed and MF returned a partial module).`,
          );
        }
        return {default: Component};
      }),
    // The boundary's `key` change forces a remount, so this only ever runs once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  return (
    <Suspense fallback={<LoadingState variant={variant} caption={`Loading ${name}…`} />}>
      <Lazy {...(componentProps ?? {})} />
    </Suspense>
  );
}
