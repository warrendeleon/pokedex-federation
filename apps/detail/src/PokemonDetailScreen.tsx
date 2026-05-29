import React from 'react';
import {ScrollView} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {
  bgClassForType,
  Box,
  Button,
  ButtonText,
  Heading,
  Image,
  InfoRow,
  ScreenContainer,
  StatBar,
  Text,
  TypeBadge,
} from '@pokedex/ui';
import {CROSS_MODULE_ACTIONS} from '@pokedex/contracts';
import {artworkUri} from './pokeApi';

// --- detailApp's exposed screen: a single Pokémon's detail. A federated remote reachable from
// any micro-app via shell.navigateTo('PokemonDetail', {id}), rendered from the host's root stack.
// Visual design mirrors the reference: a type-coloured hero (sprite, name, number, types), an Info
// section, a Base Stats panel, and a full-width Add-to-Party action. "Add to Party" proves the
// cross-module write: detailApp dispatches a @pokedex/contracts action the host-owned party slice
// reduces, and partyApp re-renders from that store. Live PokéAPI data replaces the demo set in the
// data pass. ---

interface Props {
  route?: {params?: {id?: number}};
}

interface PartySliceShape {
  party?: {members: {id: number}[]};
}
const MAX_PARTY = 6;

interface DexEntry {
  name: string;
  types: string[];
  height: number;
  weight: number;
  abilities: string[];
  stats: {name: string; value: number}[];
}

// A small Gen-1 slice (real PokéAPI values) so the layout renders meaningfully before the API.
const DEX: Record<number, DexEntry> = {
  1: {name: 'Bulbasaur', types: ['grass', 'poison'], height: 0.7, weight: 6.9, abilities: ['overgrow', 'chlorophyll'], stats: [{name: 'hp', value: 45}, {name: 'attack', value: 49}, {name: 'defense', value: 49}, {name: 'special-attack', value: 65}, {name: 'special-defense', value: 65}, {name: 'speed', value: 45}]},
  4: {name: 'Charmander', types: ['fire'], height: 0.6, weight: 8.5, abilities: ['blaze', 'solar-power'], stats: [{name: 'hp', value: 39}, {name: 'attack', value: 52}, {name: 'defense', value: 43}, {name: 'special-attack', value: 60}, {name: 'special-defense', value: 50}, {name: 'speed', value: 65}]},
  7: {name: 'Squirtle', types: ['water'], height: 0.5, weight: 9.0, abilities: ['torrent', 'rain-dish'], stats: [{name: 'hp', value: 44}, {name: 'attack', value: 48}, {name: 'defense', value: 65}, {name: 'special-attack', value: 50}, {name: 'special-defense', value: 64}, {name: 'speed', value: 43}]},
  25: {name: 'Pikachu', types: ['electric'], height: 0.4, weight: 6.0, abilities: ['static', 'lightning-rod'], stats: [{name: 'hp', value: 35}, {name: 'attack', value: 55}, {name: 'defense', value: 40}, {name: 'special-attack', value: 50}, {name: 'special-defense', value: 50}, {name: 'speed', value: 90}]},
  39: {name: 'Jigglypuff', types: ['normal', 'fairy'], height: 0.5, weight: 5.5, abilities: ['cute-charm', 'competitive'], stats: [{name: 'hp', value: 115}, {name: 'attack', value: 45}, {name: 'defense', value: 20}, {name: 'special-attack', value: 45}, {name: 'special-defense', value: 25}, {name: 'speed', value: 20}]},
  94: {name: 'Gengar', types: ['ghost', 'poison'], height: 1.5, weight: 40.5, abilities: ['cursed-body'], stats: [{name: 'hp', value: 60}, {name: 'attack', value: 65}, {name: 'defense', value: 60}, {name: 'special-attack', value: 130}, {name: 'special-defense', value: 75}, {name: 'speed', value: 110}]},
};

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
  const entry = DEX[id];
  const dispatch = useDispatch();
  const partyCount = useSelector((s: PartySliceShape) => s.party?.members.length ?? 0);
  const isFull = partyCount >= MAX_PARTY;

  if (!entry) {
    return (
      <ScreenContainer>
        <Box className="flex-1 items-center justify-center px-8">
          <Text className="text-darkGrey text-center">Pokémon #{id} is not in the demo set.</Text>
        </Box>
      </ScreenContainer>
    );
  }

  const primary = entry.types[0];
  const onAddToParty = () => {
    dispatch({
      type: CROSS_MODULE_ACTIONS.detail.addToPartyFromDetail,
      payload: {id, name: entry.name, types: entry.types, spriteUri: artworkUri(id)},
    });
  };

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Box className={`items-center pt-4 pb-6 ${bgClassForType(primary)}`}>
          <Image
            source={{uri: artworkUri(id)}}
            alt={entry.name}
            size="2xl"
            resizeMode="contain"
          />
          <Heading size="2xl" className="capitalize text-black">
            {entry.name}
          </Heading>
          <Text size="sm" bold className="text-black mt-0.5 mb-2">
            #{String(id).padStart(3, '0')}
          </Text>
          <Box className="flex-row gap-2">
            {entry.types.map(t => (
              <TypeBadge key={t} type={t} size="md" />
            ))}
          </Box>
        </Box>

        <Box className="px-5">
          <Box className="mt-6">
            <Heading size="lg" className="text-black mb-3">
              Info
            </Heading>
            <InfoRow label="Height" value={`${entry.height.toFixed(1)} m`} />
            <InfoRow label="Weight" value={`${entry.weight.toFixed(1)} kg`} />
            <InfoRow label="Abilities" value={entry.abilities.join(', ')} />
          </Box>

          <Box className="mt-6">
            <Heading size="lg" className="text-black mb-3">
              Base Stats
            </Heading>
            {entry.stats.map(s => (
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
