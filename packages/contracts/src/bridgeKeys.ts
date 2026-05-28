// --- Stable native-bridge data keys. Native views subscribe by these strings; never by Redux
// state keys or RTK Query cache keys. Renaming a slice or an endpoint is invisible to native;
// only renaming a bridge key forces a native-side change. ---

export const BRIDGE_KEYS = {
  party: {
    /** Number of Pokémon currently in the party. payload: number 0..6 */
    size: 'party.size',
    /** Ordered list of Pokémon IDs in the party. payload: number[] */
    ids: 'party.ids',
    /** ID of the most recent QuickBattle winner. payload: number | null */
    lastBattleWinnerId: 'party.lastBattleWinnerId',
  },
  list: {
    /** Total number of Pokémon loaded into the List cache. payload: number */
    loadedCount: 'list.loadedCount',
  },
} as const;

export type BridgeKey =
  | (typeof BRIDGE_KEYS.party)[keyof typeof BRIDGE_KEYS.party]
  | (typeof BRIDGE_KEYS.list)[keyof typeof BRIDGE_KEYS.list];
