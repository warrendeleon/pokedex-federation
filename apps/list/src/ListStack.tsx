import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useSelector} from 'react-redux';
import {
  ScreenContainer,
  PokemonGrid,
  Box,
  LoadingState,
  ErrorState,
} from '@pokedex/ui';
import {shellNavigate} from '@pokedex/contracts';
import {useGetPokemonListQuery} from './listApi';

// --- listApp's exposed navigation stack: the Pokédex grid, loaded into the host's tab via Module
// Federation. It composes the shared @pokedex/ui design system (FlashList-backed PokemonGrid),
// fetches real PokéAPI data through an endpoint it injects into the host's shared RTK Query
// baseApi, reads the host-owned party count, and navigates cross-feature via shell.navigateTo to
// the detailApp remote, all resolved from the host's singleton instances. The header is plain RN
// (screen chrome), matching the reference. ---

const Stack = createNativeStackNavigator();

interface PartySliceShape {
  party?: {members: {id: number}[]};
}
const MAX_PARTY = 6;

function ListMainScreen() {
  const partyCount = useSelector((s: PartySliceShape) => s.party?.members.length ?? 0);
  const {data, isLoading, isError, refetch} = useGetPokemonListQuery();

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
        {isLoading ? (
          <LoadingState caption="Loading Pokédex…" />
        ) : isError || !data ? (
          <ErrorState onRetry={refetch} />
        ) : (
          <PokemonGrid
            data={data}
            numColumns={3}
            onPressItem={entry => shellNavigate('PokemonDetail', {id: entry.id})}
          />
        )}
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
