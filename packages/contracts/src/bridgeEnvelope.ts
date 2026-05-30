// --- Envelope: every payload sent over the RN → Native bridge wears this shape. The native
// side only ever sees `dataKey` (a stable bridge key) and `payload`; the moduleId is metadata
// for debugging + analytics. Versioned so a future schema bump is detectable.
//
// BRIDGE_QUERY_BINDINGS maps RTK Query endpoint *names* to stable bridge keys. The native
// bridge middleware reads fulfilled queries and pushes the matched ones. Renaming an endpoint
// = one row update here; native subscribers keep working. ---

import { BRIDGE_KEYS, type BridgeKey } from './bridgeKeys';
import { type ModuleId } from './modules';

export interface BridgeEnvelope<TPayload = unknown> {
  version: 1;
  moduleId: ModuleId;
  dataKey: BridgeKey;
  payload: TPayload;
}

/** Map RTK Query endpoint names to the bridge key the bridge middleware pushes them under. */
export const BRIDGE_QUERY_BINDINGS: Partial<Record<string, BridgeKey>> = {
  // --- listApp endpoints ---
  getPokemonList: BRIDGE_KEYS.list.loadedCount,
  // --- detailApp endpoints —
  // (Detail data is shown in RN only; nothing pushed natively, so no binding here.)
};
