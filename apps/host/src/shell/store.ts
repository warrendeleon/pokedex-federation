import {combineSlices, configureStore} from '@reduxjs/toolkit';
import {
  createMigrate,
  FLUSH,
  PAUSE,
  PERSIST,
  type PersistedState,
  persistReducer,
  persistStore,
  PURGE,
  REGISTER,
  REHYDRATE,
} from 'redux-persist';

import {baseApi} from '@pokedex/contracts';

import {nativeBridgeMiddleware} from './nativeBridge';
import partySlice from './partySlice';
import {mmkvStorage} from './storage';

// --- The host store. combineSlices (RTK 2.x) gives us runtime slice composition: federated
// remotes call `rootReducer.inject(theirSlice)` at load to register feature-local reducers
// (list's filter, regions' selection) without the host knowing about them at build time. The
// host wires in only the genuinely-shared slices: the party (host-owned) and the baseApi
// (RTK Query). ---

const rootReducer = combineSlices(partySlice, baseApi);
export type RootState = ReturnType<typeof rootReducer>;

// --- Persisted-state migrations. v1: party members gained a per-slot `uid` (so duplicates are
// distinct slots and removal targets one exact slot). Backfill any member stored before that and
// seed nextUid past the highest assigned, so an existing party survives the upgrade with every
// member removable. New installs run this against empty state and no-op. ---
interface PersistedRoot {
  party?: {
    members?: {uid?: number; id: number; name: string; types: string[]; spriteUri?: string}[];
    nextUid?: number;
    lastBattleWinnerId?: number | null;
  };
}

const migrations = {
  1: (state: PersistedState): PersistedState => {
    const root = state as (PersistedState & PersistedRoot) | undefined;
    if (!root?.party) return state;
    let next = typeof root.party.nextUid === 'number' ? root.party.nextUid : 1;
    const members = (root.party.members ?? []).map(m =>
      typeof m.uid === 'number' ? m : {...m, uid: next++},
    );
    return {...root, party: {...root.party, members, nextUid: next}} as PersistedState;
  },
};

// --- Persist only host-owned local state (the party). The RTK Query cache is deliberately
// NOT persisted: it's a cache, and we want fresh Pokémon data on launch. Remote-injected
// slices aren't persisted by this config (a remote that wants persistence wires its own). ---
const persistConfig = {
  key: 'root',
  version: 1,
  storage: mmkvStorage,
  whitelist: ['party'],
  migrate: createMigrate(migrations),
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        // redux-persist dispatches non-serializable lifecycle actions; ignore them.
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    })
      .concat(baseApi.middleware)
      .concat(nativeBridgeMiddleware),
});

export const persistor = persistStore(store);

export type AppDispatch = typeof store.dispatch;

// --- Exposed so federated remotes can inject their reducers + endpoints against the host's
// single store instance (shared at runtime via the @reduxjs/toolkit MF singleton). ---
export {rootReducer};
