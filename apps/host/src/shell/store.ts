import {combineSlices, configureStore} from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import {baseApi} from '@pokedex/contracts';
import partySlice from './partySlice';
import {nativeBridgeMiddleware} from './nativeBridge';
import {mmkvStorage} from './storage';

// --- The host store. combineSlices (RTK 2.x) gives us runtime slice composition: federated
// remotes call `rootReducer.inject(theirSlice)` at load to register feature-local reducers
// (list's filter, regions' selection) without the host knowing about them at build time. The
// host wires in only the genuinely-shared slices: the party (host-owned) and the baseApi
// (RTK Query). ---

const rootReducer = combineSlices(partySlice, baseApi);
export type RootState = ReturnType<typeof rootReducer>;

// --- Persist only host-owned local state (the party). The RTK Query cache is deliberately
// NOT persisted: it's a cache, and we want fresh Pokémon data on launch. Remote-injected
// slices aren't persisted by this config (a remote that wants persistence wires its own). ---
const persistConfig = {
  key: 'root',
  storage: mmkvStorage,
  whitelist: ['party'],
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
