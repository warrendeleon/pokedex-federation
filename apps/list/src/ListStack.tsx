import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useSelector} from 'react-redux';
import {ScreenContainer, PokemonGrid, Box, type PokemonGridEntry} from '@pokedex/ui';
import {shellNavigate} from '@pokedex/contracts';
import {artworkUri} from './pokeApi';

// --- listApp's exposed navigation stack: the Pokédex grid. Loaded into the host's tab via
// Module Federation. Proves the federation boundary end-to-end: the remote composes the shared
// @pokedex/ui design system (PokemonGrid is FlashList-backed, a host-provided singleton),
// navigates cross-feature through shell.navigateTo (to the detailApp remote), reads the
// host-owned party count, and styles via the shared NativeWind registry, all resolved from the
// host's singleton instances. The header is plain RN + StyleSheet (screen chrome, not design-
// system components), matching the reference. Real PokéAPI list data arrives next. ---

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

interface PartySliceShape {
  party?: {members: {id: number}[]};
}
const MAX_PARTY = 6;

function ListMainScreen() {
  const partyCount = useSelector((s: PartySliceShape) => s.party?.members.length ?? 0);
  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Pokédex</Text>
        <Text style={styles.partyCount}>
          My Party {partyCount}/{MAX_PARTY}
        </Text>
      </View>
      <Text style={styles.subtitle}>Add up to 6 Pokémon to your party</Text>
      <Box className="flex-1">
        <PokemonGrid
          data={DEMO}
          numColumns={3}
          onPressItem={entry => shellNavigate('PokemonDetail', {id: entry.id})}
        />
      </Box>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  title: {fontSize: 28, fontWeight: '700', color: '#2E3138'},
  partyCount: {fontSize: 16, fontWeight: '600', color: '#3A86FF'},
  subtitle: {fontSize: 14, color: '#515151', paddingHorizontal: 16, marginTop: 2, marginBottom: 10},
});

export function ListStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="ListMain" component={ListMainScreen} options={{headerShown: false}} />
    </Stack.Navigator>
  );
}
