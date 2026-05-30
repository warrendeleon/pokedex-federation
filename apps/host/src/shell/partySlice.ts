import {
  createAction,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';

import { CROSS_MODULE_ACTIONS } from '@pokedex/contracts';

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
const addFromDetail = createAction<IncomingPartyMember>(
  CROSS_MODULE_ACTIONS.detail.addToPartyFromDetail,
);
const addFromList = createAction<IncomingPartyMember>(
  CROSS_MODULE_ACTIONS.list.addToParty,
);

// --- Cross-module remove. partyApp dispatches this contract action with the member's uid (NOT
// its Pokémon id): the party allows duplicates, so the id is ambiguous; the uid identifies the
// exact slot to drop. ---
const removeByUid = createAction<{ uid: number }>(
  CROSS_MODULE_ACTIONS.party.remove,
);

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
  /** Unique per party slot, assigned on add. Distinct from `id` so two of the same Pokémon are
   *  separate slots (the party allows duplicates) and removal can target one exact slot. */
  uid: number;
  id: number;
  name: string;
  types: string[];
  spriteUri?: string;
  /** Base-stat total, computed by the detail screen at add time. The native Quick Battle weights
   *  its random pick by this, so a stronger Pokémon is likelier to win. Optional: members added
   *  before this existed have none, and the battle treats a missing/zero power as a baseline. */
  power?: number;
}

/** What a remote sends when adding: no uid (the slice assigns it). */
export type IncomingPartyMember = Omit<PartyMember, 'uid'>;

interface PartyState {
  members: PartyMember[];
  /** Monotonic source of party-slot uids; survives persistence so uids never repeat. */
  nextUid: number;
  /** Set by the native QuickBattle handoff result; surfaced in the UI + pushed to native. */
  lastBattleWinnerId: number | null;
}

const initialState: PartyState = {
  members: [],
  nextUid: 1,
  lastBattleWinnerId: null,
};

// --- Shared mutations, used by both the local reducers and the cross-module extraReducers so the
// cap + uid-assignment rule lives in exactly one place. (Immer drafts, so direct mutation.) ---
function addMember(state: PartyState, member: IncomingPartyMember): void {
  // Party is capped; adding at capacity is a graceful no-op. Duplicates are allowed (two Pikachus
  // is fine) per the brief; each gets its own uid.
  if (state.members.length >= MAX_PARTY) return;
  state.members.push({ uid: state.nextUid++, ...member });
}

function removeMemberByUid(state: PartyState, uid: number): void {
  // Remove by uid, not index/id: duplicates share an id, and indices shift as the list changes.
  state.members = state.members.filter(m => m.uid !== uid);
}

const partySlice = createSlice({
  name: 'party',
  initialState,
  reducers: {
    addToParty(state, action: PayloadAction<IncomingPartyMember>) {
      addMember(state, action.payload);
    },
    removeFromParty(state, action: PayloadAction<{ uid: number }>) {
      removeMemberByUid(state, action.payload.uid);
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
    const add = (
      state: PartyState,
      action: PayloadAction<IncomingPartyMember>,
    ) => addMember(state, action.payload);
    builder.addCase(addFromDetail, add);
    builder.addCase(addFromList, add);
    // --- Cross-module remove: partyApp dispatches CROSS_MODULE_ACTIONS.party.remove with a uid. ---
    builder.addCase(removeByUid, (state, action) =>
      removeMemberByUid(state, action.payload.uid),
    );
  },
  selectors: {
    selectParty: state => state.members,
    selectPartyCount: state => state.members.length,
    selectIsPartyFull: state => state.members.length >= MAX_PARTY,
    selectLastBattleWinnerId: state => state.lastBattleWinnerId,
  },
});

export const { addToParty, removeFromParty, clearParty, setLastBattleWinner } =
  partySlice.actions;
export const {
  selectParty,
  selectPartyCount,
  selectIsPartyFull,
  selectLastBattleWinnerId,
} = partySlice.selectors;

export default partySlice;
