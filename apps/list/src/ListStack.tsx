import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {ScreenContainer, PokemonGrid, type PokemonGridEntry} from '@pokedex/ui';
import {shellNavigate} from '@pokedex/contracts';
import {artworkUri} from './pokeApi';

// --- listApp's exposed navigation stack: the Pokédex grid. Loaded into the host's tab via
// Module Federation. Proves the federation boundary end-to-end: the remote composes the shared
// @pokedex/ui design system (PokemonGrid is FlashList-backed, and FlashList's native view is a
// host-provided singleton), navigates cross-feature through shell.navigateTo (to the detailApp
// remote), and styles via the shared NativeWind registry, all resolved from the host's singleton
// instances. Real PokéAPI list data + party integration arrive next. ---

const Stack = createNativeStackNavigator();

// A small static slice of Gen-1 so the grid renders meaningfully before the API is wired.
const DEMO: PokemonGridEntry[] = [
  {id: 1, name: 'Bulbasaur', types: ['grass', 'poison'], spriteUri: artworkUri(1)},
  {id: 4, name: 'Charmander', types: ['fire'], spriteUri: artworkUri(4)},
  {id: 7, name: 'Squirtle', types: ['water'], spriteUri: artworkUri(7)},
  {id: 25, name: 'Pikachu', types: ['electric'], spriteUri: artworkUri(25)},
  {id: 39, name: 'Jigglypuff', types: ['normal', 'fairy'], spriteUri: artworkUri(39)},
  {id: 94, name: 'Gengar', types: ['ghost', 'poison'], spriteUri: artworkUri(94)},
];

function ListMainScreen() {
  return (
    <ScreenContainer>
      <PokemonGrid
        data={DEMO}
        numColumns={3}
        onPressItem={entry => shellNavigate('PokemonDetail', {id: entry.id})}
      />
    </ScreenContainer>
  );
}

export function ListStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ListMain"
        component={ListMainScreen}
        options={{title: 'Pokédex'}}
      />
    </Stack.Navigator>
  );
}
