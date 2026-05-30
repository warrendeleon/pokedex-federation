import type { Middleware } from '@reduxjs/toolkit';

import { BRIDGE_KEYS, type BridgeEnvelope, MODULES } from '@pokedex/contracts';

import StoreObserverModule from '../../specs/NativeStoreObserverModule';

// --- Redux middleware that pushes structured envelopes to the native side after every action.
// Unidirectional (RN → Native): a native status badge reads the live party count + last battle
// winner without a React re-render. This is the same envelope pattern the strategy keeps stable
// through the whole federation migration (auth headers, session heartbeat, feature flags all
// flow this way in a real app).
//
// Guarded: if StoreObserverModule isn't linked yet (e.g. before the native module ships, or on
// a platform where it's absent), the middleware is a transparent pass-through. ---

function push<T>(
  dataKey: BridgeEnvelope['dataKey'],
  moduleId: BridgeEnvelope['moduleId'],
  payload: T,
) {
  // StoreObserverModule resolves via TurboModuleRegistry.get (non-enforcing), so it's null when
  // the module isn't linked and the middleware stays a transparent pass-through.
  if (!StoreObserverModule) return;
  const envelope: BridgeEnvelope<T> = {
    version: 1,
    moduleId,
    dataKey,
    payload,
  };
  StoreObserverModule.updateState(dataKey, JSON.stringify(envelope));
}

// --- Reads the slice of state we mirror to native and pushes any envelopes whose value
// changed since the last action. Kept tiny + allocation-light because it runs on every
// dispatch. ---
let lastCount: number | undefined;
let lastWinner: number | null | undefined;

export const nativeBridgeMiddleware: Middleware = store => next => action => {
  const result = next(action);
  const state = store.getState() as {
    party?: { members: unknown[]; lastBattleWinnerId: number | null };
  };
  const party = state.party;
  if (party) {
    if (party.members.length !== lastCount) {
      lastCount = party.members.length;
      push(BRIDGE_KEYS.party.size, MODULES.party, lastCount);
    }
    if (party.lastBattleWinnerId !== lastWinner) {
      lastWinner = party.lastBattleWinnerId;
      push(BRIDGE_KEYS.party.lastBattleWinnerId, MODULES.party, lastWinner);
    }
  }
  return result;
};
