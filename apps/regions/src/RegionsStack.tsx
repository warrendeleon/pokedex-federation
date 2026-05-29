// --- Load this remote's compiled Tailwind into the shared cssInterop registry. As with the
// detail remote, the build entry (src/index.js) imports global.css, but that entry is not in the
// graph the host pulls when it federates the exposed stack, so without this import the remote's
// own classNames would silently no-op on the host-provided Gluestack singletons. ---
import '../global.css';
import React from 'react';
import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import {
  ScreenContainer,
  PokemonGrid,
  VStack,
  HStack,
  Heading,
  Text,
  Card,
  Pressable,
  Divider,
  LoadingState,
  ErrorState,
  type PokemonGridEntry,
} from '@pokedex/ui';
import {shellNavigate, artworkUri} from '@pokedex/contracts';
import {useGetRegionsQuery, useGetRegionDexQuery} from './regionsApi';

// --- regionsApp's exposed stack: browse the Pokémon regions, then a region's Pokédex. This
// remote earns the routing table its keep twice over: regions are a different entity, navigating
// region -> region-dex is intra-remote (its own native stack), and tapping a Pokédex entry routes
// cross-feature to the detailApp remote via shell.navigateTo('PokemonDetail', {id}) with no direct
// import. All data comes from the host's shared RTK Query baseApi (endpoints regionsApp injects).
// Built from Gluestack primitives; spacing is driven by VStack/HStack `space`. ---

type RegionsParamList = {
  RegionsMain: undefined;
  RegionDex: {regionName: string; label: string};
};

const Stack = createNativeStackNavigator<RegionsParamList>();

function RegionsMainScreen({navigation}: NativeStackScreenProps<RegionsParamList, 'RegionsMain'>) {
  const {data, isLoading, isError, refetch} = useGetRegionsQuery();

  return (
    <ScreenContainer>
      <VStack space="xs" className="px-4 pt-2 pb-3">
        <Heading size="2xl" className="text-black">
          Regions
        </Heading>
        <Text size="sm" className="text-darkGrey">
          Tap a region to browse its Pokédex
        </Text>
      </VStack>
      {isLoading ? (
        <LoadingState caption="Loading regions…" />
      ) : isError || !data ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <VStack space="md" className="px-4 pt-1">
          {data.map(region => (
            <Pressable
              key={region.name}
              className="active:opacity-80"
              onPress={() =>
                navigation.navigate('RegionDex', {regionName: region.name, label: region.label})
              }>
              <Card className="bg-white rounded-2xl p-4">
                <Heading size="lg" className="text-black">
                  {region.label}
                </Heading>
                <Text size="sm" className="text-midGrey">
                  {region.generation}
                </Text>
              </Card>
            </Pressable>
          ))}
        </VStack>
      )}
    </ScreenContainer>
  );
}

function RegionDexScreen({route, navigation}: NativeStackScreenProps<RegionsParamList, 'RegionDex'>) {
  const {regionName, label} = route.params;
  const {data, isLoading, isError, refetch} = useGetRegionDexQuery(regionName);

  const entries: PokemonGridEntry[] = (data ?? []).map(e => ({
    id: e.id,
    name: e.name,
    // No type data without an N+1 fetch per species; the sprite is derived from the id, so the
    // dex still renders with artwork. Tapping through to detail fetches the full record.
    types: [],
    spriteUri: artworkUri(e.id),
  }));

  return (
    <ScreenContainer>
      <HStack className="items-center px-4 pt-2 pb-1">
        <Pressable onPress={() => navigation.goBack()} className="active:opacity-60">
          <Text size="lg" className="text-blue">
            ‹ Regions
          </Text>
        </Pressable>
      </HStack>
      <VStack space="xs" className="px-4 pb-3">
        <Heading size="2xl" className="text-black">
          {label}
        </Heading>
        <Text size="sm" className="text-darkGrey">
          {data ? `${data.length} Pokémon in the regional Pokédex` : 'Regional Pokédex'}
        </Text>
      </VStack>
      {isLoading ? (
        <LoadingState caption="Loading Pokédex…" />
      ) : isError || !data ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <VStack className="flex-1">
          <Divider className="bg-lightGrey" />
          <PokemonGrid
            data={entries}
            numColumns={3}
            onPressItem={entry => shellNavigate('PokemonDetail', {id: entry.id})}
          />
        </VStack>
      )}
    </ScreenContainer>
  );
}

export function RegionsStack() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="RegionsMain" component={RegionsMainScreen} />
      <Stack.Screen name="RegionDex" component={RegionDexScreen} />
    </Stack.Navigator>
  );
}
