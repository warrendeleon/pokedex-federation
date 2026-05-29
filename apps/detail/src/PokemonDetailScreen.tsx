import React from 'react';
import {
  Box,
  Center,
  Heading,
  Image,
  ScreenContainer,
  Text,
  tintBgClassForType,
  TypeBadge,
} from '@pokedex/ui';
import {artworkUri} from './pokeApi';

// --- detailApp's exposed screen: a single Pokémon's detail. It is NOT a tab; it is a federated
// remote reachable from any micro-app via shell.navigateTo('PokemonDetail', {id}) and resolved
// through ROUTE_REGISTRY. This proves the cross-cutting-route half of the strategy: one remote,
// rendered from the host's root stack, shared by list/party/regions alike, and the routing
// table is the single place that knows it. The host passes the React Navigation route as
// componentProps; we read the id from it. Composes the shared @pokedex/ui design system so the
// screen renders against the host's singleton Gluestack + NativeWind registries. Live PokéAPI
// stats + the Add-to-Party cross-module action arrive with the design-fidelity + bridge steps. ---

interface RouteParams {
  id: number;
}

interface Props {
  route?: {params?: Partial<RouteParams>};
}

// A small Gen-1 slice so a tapped card resolves to a real name + types before the API is wired.
const DEX: Record<number, {name: string; types: string[]}> = {
  1: {name: 'Bulbasaur', types: ['grass', 'poison']},
  4: {name: 'Charmander', types: ['fire']},
  7: {name: 'Squirtle', types: ['water']},
  25: {name: 'Pikachu', types: ['electric']},
  39: {name: 'Jigglypuff', types: ['normal', 'fairy']},
  94: {name: 'Gengar', types: ['ghost', 'poison']},
};

export function PokemonDetailScreen({route}: Props) {
  const id = route?.params?.id ?? 1;
  const entry = DEX[id] ?? {name: `Pokémon ${id}`, types: ['normal']};
  const tint = tintBgClassForType(entry.types[0]);

  return (
    <ScreenContainer>
      <Box className={`items-center pt-8 pb-6 ${tint}`}>
        <Text size="lg" bold className="text-darkGrey">
          #{String(id).padStart(3, '0')}
        </Text>
        <Image
          source={{uri: artworkUri(id)}}
          alt={entry.name}
          className="w-48 h-48"
          resizeMode="contain"
        />
      </Box>

      <Center className="px-4 pt-6">
        <Heading size="2xl" className="capitalize text-black">
          {entry.name}
        </Heading>
        <Box className="flex-row gap-2 mt-3">
          {entry.types.map(t => (
            <TypeBadge key={t} type={t} size="md" />
          ))}
        </Box>
      </Center>
    </ScreenContainer>
  );
}
