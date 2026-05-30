import type { NavigatorScreenParams } from '@react-navigation/native';

// --- Typed navigation surface for the host's root stack. Both the navigationRef (used by
// shellNavigation to drive navigation from outside React) and the screen components reference
// these so navigate() calls and route params are type-checked. ---

export type RootTabParamList = {
  PokedexTab: undefined;
  PartyTab: undefined;
  RegionsTab: undefined;
};

export type RootStackParamList = {
  // The bottom tabs live nested under this root-stack screen; NavigatorScreenParams lets the
  // shell navigate to a specific tab via navigate('Tabs', {screen: 'PartyTab'}).
  Tabs: NavigatorScreenParams<RootTabParamList>;
  // uid is present only when opened from the party tab (the party slot's uid). The detail screen
  // uses its presence to show an "in party" indicator instead of Add to Party.
  PokemonDetail: { id: number; uid?: number };
};
