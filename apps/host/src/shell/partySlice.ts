import {createAction, createSlice, type PayloadAction} from '@reduxjs/toolkit';
import {CROSS_MODULE_ACTIONS} from '@pokedex/contracts';

// --- Typed action creator for the cross-module QuickBattle result. createAction binds the
// contract's string type to a payload shape so extraReducers gets full typing; partyApp can
// still dispatch the plain {type, payload} object (identical shape) without importing this. ---
interface BattleResultPayload {
  winnerId: number;
  leftId: number;
  rightId: number;
  ko: boolean;
}
const battleResult = createAction<BattleResultPayload>(
  CROSS_MODULE_ACTIONS.party.battleResult,
);

// --- Cross-module add-to-party. detailApp and listApp dispatch these contract actions with the
// full member; the host-owned slice adds it. Same decoupling as battleResult: the remotes never
// import this slice, only the action-type strings from @pokedex/contracts. ---
const addFromDetail = createAction<PartyMember>(
  CROSS_MODULE_ACTIONS.detail.addToPartyFromDetail,
);
const addFromList = createAction<PartyMember>(CROSS_MODULE_ACTIONS.list.addToParty);

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
  extraReducers: builder => {
    // --- Cross-module: the native QuickBattle flow (partyApp -> shell.navigateTo -> native
    // screen -> back) dispatches this contract action with the winner. Handling it here, instead
    // of partyApp importing setLastBattleWinner, keeps the remote decoupled: it dispatches the
    // string-typed action from @pokedex/contracts and this host-owned slice reacts. ---
    builder.addCase(battleResult, (state, action) => {
      state.lastBattleWinnerId = action.payload.winnerId;
    });
    const add = (state: PartyState, action: PayloadAction<PartyMember>) => {
      if (state.members.length >= MAX_PARTY) return; // capped; graceful no-op
      state.members.push(action.payload);
    };
    builder.addCase(addFromDetail, add);
    builder.addCase(addFromList, add);
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
