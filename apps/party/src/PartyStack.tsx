import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {ScreenContainer, PokemonGrid, type PokemonGridEntry} from '@pokedex/ui';
import {shellNavigate} from '@pokedex/contracts';
import {artworkUri} from './pokeApi';

// --- partyApp's exposed stack: the party manager. Dark-themed (ScreenContainer variant) to
// give the tab a strong visual identity, matching the reference design. Renders the same
// FlashList-backed PokemonGrid as the Pokédex tab at two columns. For now it shows a static
// party; wiring it to the host-owned party slice (read members, remove, Quick Battle) happens
// in the visual + state pass. ---

const Stack = createNativeStackNavigator();

const DEMO_PARTY: PokemonGridEntry[] = [
  {id: 3, name: 'Venusaur', types: ['grass', 'poison'], spriteUri: artworkUri(3)},
  {id: 9, name: 'Blastoise', types: ['water'], spriteUri: artworkUri(9)},
  {id: 6, name: 'Charizard', types: ['fire', 'flying'], spriteUri: artworkUri(6)},
];

function PartyMainScreen() {
  return (
    <ScreenContainer variant="dark">
      <PokemonGrid
        data={DEMO_PARTY}
        numColumns={2}
        onPressItem={entry => shellNavigate('PokemonDetail', {id: entry.id})}
      />
    </ScreenContainer>
  );
}

export function PartyStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="PartyMain"
        component={PartyMainScreen}
        options={{title: 'My Party'}}
      />
    </Stack.Navigator>
  );
}
