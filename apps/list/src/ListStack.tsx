// Load this remote's compiled Tailwind into the shared cssInterop registry. The build entry
// (src/index.js) imports it too, but that entry is not in the graph the host pulls when it
// federates this exposed stack, so without this import the remote's own classNames would silently
// no-op on the host-provided Gluestack singletons (same fix as detail/regions).
import '../global.css';

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { shellNavigate } from '@pokedex/contracts';
import { Box, ErrorState, LoadingState, PokemonGrid, ScreenContainer } from '@pokedex/ui';

import { useGetPokemonListInfiniteQuery } from './listApi';

// --- listApp's exposed navigation stack: the Pokédex grid, loaded into the host's tab via Module
// Federation. It composes the shared @pokedex/ui design system (FlashList-backed PokemonGrid),
// fetches real PokéAPI data through an endpoint it injects into the host's shared RTK Query
// baseApi, reads the host-owned party count, and navigates cross-feature via shell.navigateTo to
// the detailApp remote, all resolved from the host's singleton instances. The header is plain RN
// (screen chrome), matching the reference. ---

const Stack = createNativeStackNavigator();

interface PartySliceShape {
  party?: { members: { id: number }[] };
}
const MAX_PARTY = 6;

function ListMainScreen() {
  const partyCount = useSelector((s: PartySliceShape) => s.party?.members.length ?? 0);
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useGetPokemonListInfiniteQuery();
  // RTK Query keeps each fetched page; flatten them into the single list FlashList renders.
  const pokemon = data?.pages.flat() ?? [];

  const onEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

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
            data={pokemon}
            numColumns={3}
            onPressItem={entry => shellNavigate('PokemonDetail', { id: entry.id })}
            onEndReached={onEndReached}
            isFetchingNextPage={isFetchingNextPage}
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
  title: { fontSize: 28, fontWeight: '700', color: '#2E3138' },
  partyCount: { fontSize: 16, fontWeight: '600', color: '#3A86FF' },
  subtitle: {
    fontSize: 14,
    color: '#515151',
    paddingHorizontal: 16,
    marginTop: 2,
    marginBottom: 10,
  },
});

export function ListStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="ListMain" component={ListMainScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
