import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {
  Box,
  Button,
  ButtonText,
  Center,
  Heading,
  Image,
  ScreenContainer,
  Text,
  tintBgClassForType,
  TypeBadge,
} from '@pokedex/ui';
import {CROSS_MODULE_ACTIONS} from '@pokedex/contracts';
import {artworkUri} from './pokeApi';

// --- detailApp's exposed screen: a single Pokémon's detail. It is NOT a tab; it is a federated
// remote reachable from any micro-app via shell.navigateTo('PokemonDetail', {id}) and resolved
// through ROUTE_REGISTRY. This proves the cross-cutting-route half of the strategy: one remote,
// rendered from the host's root stack, shared by list/party/regions alike. The host passes the
// React Navigation route as componentProps; we read the id from it. "Add to Party" proves the
// cross-module write half: detailApp dispatches a @pokedex/contracts action that the host-owned
// party slice reduces (no import of the host slice), and partyApp re-renders from that store.
// Live PokéAPI stats arrive with the data pass. ---

interface RouteParams {
  id: number;
}

interface Props {
  route?: {params?: Partial<RouteParams>};
}

interface PartySliceShape {
  party?: {members: {id: number}[]; lastBattleWinnerId: number | null};
}
const MAX_PARTY = 6;

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

  const dispatch = useDispatch();
  const partyCount = useSelector((s: PartySliceShape) => s.party?.members.length ?? 0);
  const isFull = partyCount >= MAX_PARTY;

  const onAddToParty = () => {
    dispatch({
      type: CROSS_MODULE_ACTIONS.detail.addToPartyFromDetail,
      payload: {id, name: entry.name, types: entry.types, spriteUri: artworkUri(id)},
    });
  };

  return (
    <ScreenContainer>
      <Box className={`items-center pt-8 pb-6 ${tint}`}>
        <Text size="lg" bold className="text-darkGrey">
          #{String(id).padStart(3, '0')}
        </Text>
        <Image
          source={{uri: artworkUri(id)}}
          alt={entry.name}
          size="2xl"
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

        <Button
          onPress={onAddToParty}
          isDisabled={isFull}
          size="lg"
          className="mt-8 bg-type-grass"
        >
          <ButtonText className="text-black">
            {isFull ? 'Party is full' : 'Add to Party'}
          </ButtonText>
        </Button>
      </Center>
    </ScreenContainer>
  );
}
