import React from 'react';
import {ScrollView} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {
  bgClassForType,
  Box,
  Button,
  ButtonText,
  ErrorState,
  Heading,
  Image,
  InfoRow,
  LoadingState,
  ScreenContainer,
  StatBar,
  Text,
  TypeBadge,
} from '@pokedex/ui';
import {CROSS_MODULE_ACTIONS} from '@pokedex/contracts';
import {useGetPokemonDetailQuery} from './detailApi';

// --- detailApp's exposed screen: a single Pokémon's detail, fetched from the host's shared RTK
// Query baseApi (an endpoint detailApp injects). A federated remote reachable from any micro-app
// via shell.navigateTo('PokemonDetail', {id}). Visual design mirrors the reference: type-coloured
// hero, Info section, Base Stats, full-width Add-to-Party. "Add to Party" proves the cross-module
// write: detailApp dispatches a @pokedex/contracts action the host party slice reduces, and
// partyApp re-renders from that store. ---

interface Props {
  route?: {params?: {id?: number}};
}

interface PartySliceShape {
  party?: {members: {id: number}[]};
}
const MAX_PARTY = 6;

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defence',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

export function PokemonDetailScreen({route}: Props) {
  const id = route?.params?.id ?? 1;
  const {data, isLoading, isError, refetch} = useGetPokemonDetailQuery(id);
  const dispatch = useDispatch();
  const partyCount = useSelector((s: PartySliceShape) => s.party?.members.length ?? 0);
  const isFull = partyCount >= MAX_PARTY;

  if (isLoading) {
    return (
      <ScreenContainer>
        <LoadingState caption="Loading Pokémon…" />
      </ScreenContainer>
    );
  }
  if (isError || !data) {
    return (
      <ScreenContainer>
        <ErrorState onRetry={refetch} />
      </ScreenContainer>
    );
  }

  const primary = data.types[0];
  const onAddToParty = () => {
    dispatch({
      type: CROSS_MODULE_ACTIONS.detail.addToPartyFromDetail,
      payload: {id: data.id, name: data.name, types: data.types, spriteUri: data.spriteUri},
    });
  };

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Box className={`items-center pt-4 pb-6 ${bgClassForType(primary)}`}>
          <Image
            source={{uri: data.spriteUri}}
            alt={data.name}
            size="2xl"
            resizeMode="contain"
          />
          <Heading size="2xl" className="capitalize text-black">
            {data.name}
          </Heading>
          <Text size="sm" bold className="text-black mt-0.5 mb-2">
            #{String(data.id).padStart(3, '0')}
          </Text>
          <Box className="flex-row gap-2">
            {data.types.map(t => (
              <TypeBadge key={t} type={t} size="md" />
            ))}
          </Box>
        </Box>

        <Box className="px-5">
          <Box className="mt-6">
            <Heading size="lg" className="text-black mb-3">
              Info
            </Heading>
            <InfoRow label="Height" value={`${data.heightMeters.toFixed(1)} m`} />
            <InfoRow label="Weight" value={`${data.weightKg.toFixed(1)} kg`} />
            <InfoRow label="Abilities" value={data.abilities.join(', ')} />
          </Box>

          <Box className="mt-6">
            <Heading size="lg" className="text-black mb-3">
              Base Stats
            </Heading>
            {data.stats.map(s => (
              <StatBar key={s.name} label={STAT_LABELS[s.name] ?? s.name} value={s.value} colourType={primary} />
            ))}
          </Box>

          <Button
            onPress={onAddToParty}
            isDisabled={isFull}
            size="lg"
            className="bg-navy rounded-xl mt-8 mb-6"
            style={{alignSelf: 'stretch'}}
          >
            <ButtonText className="text-white">
              {isFull ? 'Party Full' : 'Add to Party'}
            </ButtonText>
          </Button>
        </Box>
      </ScrollView>
    </ScreenContainer>
  );
}
