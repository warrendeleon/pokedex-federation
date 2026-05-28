import React from 'react';
import {ScrollView, View} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {ScreenContainer, PokemonCard} from '@pokedex/ui';
import {shellNavigate} from '@pokedex/contracts';
import {artworkUri} from './pokeApi';

// --- listApp's exposed navigation stack: the Pokédex grid. Loaded into the host's tab via
// Module Federation. Proves the federation boundary end-to-end: the remote composes the shared
// @pokedex/ui design system, navigates cross-feature through shell.navigateTo (to the
// detailApp remote), and styles via the shared NativeWind registry — all resolved from the
// host's singleton instances. Real PokéAPI list data + party integration arrive next. ---

const Stack = createNativeStackNavigator();

// A small static slice of Gen-1 so the grid renders meaningfully before the API is wired.
const DEMO: {id: number; name: string; types: string[]}[] = [
  {id: 1, name: 'Bulbasaur', types: ['grass', 'poison']},
  {id: 4, name: 'Charmander', types: ['fire']},
  {id: 7, name: 'Squirtle', types: ['water']},
  {id: 25, name: 'Pikachu', types: ['electric']},
  {id: 39, name: 'Jigglypuff', types: ['normal', 'fairy']},
  {id: 94, name: 'Gengar', types: ['ghost', 'poison']},
];

function ListMainScreen() {
  return (
    <ScreenContainer>
      <ScrollView contentContainerClassName="p-3">
        <View className="flex-row flex-wrap justify-between">
          {DEMO.map(p => (
            <View key={p.id} className="w-[31%] mb-3">
              <PokemonCard
                id={p.id}
                name={p.name}
                types={p.types}
                spriteUri={artworkUri(p.id)}
                onPress={() => shellNavigate('PokemonDetail', {id: p.id})}
              />
            </View>
          ))}
        </View>
      </ScrollView>
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
