import {createMMKV, type MMKV} from 'react-native-mmkv';

// --- Single storage engine for the whole host: MMKV (JSI/Nitro-backed, synchronous, far
// faster than AsyncStorage). One MMKV instance backs both redux-persist and Re.Pack's
// ScriptManager script cache, and the health store added with the operational layer.
//
// MMKV 4 is Nitro-based: `MMKV` is a type, and instances are created via the createMMKV()
// factory (there is no `new MMKV()` constructor any more).
//
// MMKV's API is synchronous; both redux-persist and Re.Pack's ScriptManager expect a
// Promise-returning Storage interface (getItem/setItem/removeItem). We wrap the sync calls in
// resolved promises; the work is already done by the time the promise settles, so there's no
// real async cost, just interface conformance. ---

const mmkv: MMKV = createMMKV({id: 'pokedex-host'});

export interface AsyncKeyValueStorage {
  getItem: (key: string) => Promise<string | null | undefined>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

// --- Conforms to both redux-persist's Storage and Re.Pack's StorageApi (identical shapes). ---
export const mmkvStorage: AsyncKeyValueStorage = {
  getItem: key => {
    const value = mmkv.getString(key);
    return Promise.resolve(value ?? null);
  },
  setItem: (key, value) => {
    mmkv.set(key, value);
    return Promise.resolve();
  },
  removeItem: key => {
    mmkv.remove(key);
    return Promise.resolve();
  },
};

// --- Direct synchronous access for code that doesn't need the async interface (the health
// store reads/writes a single JSON blob at boot, where sync is simpler and faster). ---
export const mmkvSync = mmkv;
