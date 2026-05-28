import {createSlice, type PayloadAction} from '@reduxjs/toolkit';

// --- Host-owned, cross-cutting state: the player's party of up to 6 Pokémon. Lives in the
// host store from boot (not injected by a remote) because three different remotes read or
// write it: listApp shows an "in party" affordance, detailApp adds/removes, partyApp manages.
// Host-ownership means listApp can read party state on first launch without partyApp having
// loaded yet.
//
// Remotes mutate this slice by dispatching the action *creators* exported here when they can
// import them, or by plain action-type strings from @pokedex/contracts when they must stay
// decoupled. Both routes hit the same reducer. ---

export const MAX_PARTY = 6;

export interface PartyMember {
  id: number;
  name: string;
  types: string[];
  spriteUri?: string;
}

interface PartyState {
  members: PartyMember[];
  /** Set by the native QuickBattle handoff result; surfaced in the UI + pushed to native. */
  lastBattleWinnerId: number | null;
}

const initialState: PartyState = {
  members: [],
  lastBattleWinnerId: null,
};

const partySlice = createSlice({
  name: 'party',
  initialState,
  reducers: {
    addToParty(state, action: PayloadAction<PartyMember>) {
      // --- Party is capped; adding at capacity is a graceful no-op, never a crash.
      // Duplicates are allowed (two Pikachus is fine) per the brief. ---
      if (state.members.length >= MAX_PARTY) return;
      state.members.push(action.payload);
    },
    removeFromParty(state, action: PayloadAction<{index: number}>) {
      state.members.splice(action.payload.index, 1);
    },
    clearParty(state) {
      state.members = [];
    },
    setLastBattleWinner(state, action: PayloadAction<number | null>) {
      state.lastBattleWinnerId = action.payload;
    },
  },
  selectors: {
    selectParty: state => state.members,
    selectPartyCount: state => state.members.length,
    selectIsPartyFull: state => state.members.length >= MAX_PARTY,
    selectLastBattleWinnerId: state => state.lastBattleWinnerId,
  },
});

export const {addToParty, removeFromParty, clearParty, setLastBattleWinner} =
  partySlice.actions;
export const {
  selectParty,
  selectPartyCount,
  selectIsPartyFull,
  selectLastBattleWinnerId,
} = partySlice.selectors;

export default partySlice;
