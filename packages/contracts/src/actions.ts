// --- Cross-module Redux action type strings. Federated remotes react to each other's actions
// via `extraReducers` against these constants instead of importing each other's slice files.
// The slice that *dispatches* an action also owns the constant; the slice that *listens* only
// imports the constant string. No build-time coupling. ---

export const CROSS_MODULE_ACTIONS = {
  list: {
    /** User added a Pokémon to the party from the List screen. payload: {id: number} */
    addToParty: 'list/addToParty',
  },
  party: {
    /** User removed a Pokémon from the party. payload: {id: number} */
    remove: 'party/remove',
    /** Native QuickBattle returned a winner. payload: {winnerId: number, leftId: number, rightId: number, ko: boolean} */
    battleResult: 'party/battleResult',
  },
  detail: {
    /** User added the currently-viewed Pokémon to the party from the Detail screen.
     *  payload: {id: number} */
    addToPartyFromDetail: 'detail/addToParty',
  },
} as const;
