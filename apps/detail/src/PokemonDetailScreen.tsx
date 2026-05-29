// --- Load this remote's compiled Tailwind into the shared cssInterop registry. The build entry
// (src/index.js) imports global.css too, but that entry is NOT in the graph the host pulls when
// it federates this exposed screen, so without this import the remote's own classNames (any class
// not also present in host-scanned host / @pokedex/ui source) never register and silently no-op.
// Importing it from the exposed module guarantees it loads whenever the screen does. ---
import '../global.css';
import React, {useEffect, useState} from 'react';
import {ScrollView} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {
  bgClassForType,
  Box,
  Button,
  ButtonText,
  Center,
  ErrorState,
  Heading,
  HStack,
  Image,
  InfoRow,
  LoadingState,
  ScreenContainer,
  StatBar,
  Text,
  TypeBadge,
  VStack,
} from '@pokedex/ui';
import {CROSS_MODULE_ACTIONS} from '@pokedex/contracts';
import {useGetPokemonDetailQuery} from './detailApi';

// --- detailApp's exposed screen: a single Pokémon's detail, fetched from the host's shared RTK
// Query baseApi (an endpoint detailApp injects). A federated remote reachable from any micro-app
// via shell.navigateTo('PokemonDetail', {id}). Visual design mirrors the reference: type-coloured
// hero, Info section, Base Stats, full-width Add-to-Party. "Add to Party" proves the cross-module
// write: detailApp dispatches a @pokedex/contracts action the host party slice reduces, and
// partyApp re-renders from that store.
//
// Built from Gluestack layout primitives: VStack / HStack / Center own the structure and all the
// spacing comes from their `space` prop (a design-system token scale), not ad-hoc margins. Those
// gap classes are generated from @pokedex/ui source, so they resolve on the shared singletons. ---

interface Props {
  // uid is set only when this screen was opened from the party tab (the slot's uid). Its presence
  // means "already a party member", which is how we show an in-party indicator instead of Add
  // without breaking add-duplicates-from-the-Pokédex (where no uid is passed).
  route?: {params?: {id?: number; uid?: number}};
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
  // Opened from the party tab carries the slot uid; that's our "already in party" signal.
  const fromParty = route?.params?.uid != null;
  const {data, isLoading, isError, refetch} = useGetPokemonDetailQuery(id);
  const dispatch = useDispatch();
  const partyCount = useSelector((s: PartySliceShape) => s.party?.members.length ?? 0);
  const isFull = partyCount >= MAX_PARTY;

  // Add-to-party confirmation. A global Gluestack toast renders in a root portal that sits BEHIND
  // this screen (it's presented as a native-stack modal, a separate view controller), so it would
  // never be seen. Adding only happens here, so the confirmation lives in this screen's own tree,
  // above everything, and auto-dismisses.
  const [justAdded, setJustAdded] = useState(false);
  useEffect(() => {
    if (!justAdded) return;
    const t = setTimeout(() => setJustAdded(false), 2000);
    return () => clearTimeout(t);
  }, [justAdded]);

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
    setJustAdded(true);
  };

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <VStack space="2xl">
          <Center className={`py-8 ${bgClassForType(primary)}`}>
            <VStack space="lg" className="items-center">
              <Image
                source={{uri: data.spriteUri}}
                alt={data.name}
                size="xl"
                resizeMode="contain"
              />
              <VStack space="xs" className="items-center">
                <Heading size="2xl" className="text-black">
                  {data.name}
                </Heading>
                <Text size="sm" bold className="text-black">
                  #{String(data.id).padStart(3, '0')}
                </Text>
              </VStack>
              <HStack space="sm">
                {data.types.map(t => (
                  <TypeBadge key={t} type={t} size="md" />
                ))}
              </HStack>
            </VStack>
          </Center>

          <VStack space="4xl" className="px-5 pb-10">
            <VStack space="md">
              <Heading size="lg" className="text-black">
                Info
              </Heading>
              <VStack>
                <InfoRow label="Height" value={`${data.heightMeters.toFixed(1)} m`} />
                <InfoRow label="Weight" value={`${data.weightKg.toFixed(1)} kg`} />
                <InfoRow label="Abilities" value={data.abilities.join(', ')} />
              </VStack>
            </VStack>

            <VStack space="md">
              <Heading size="lg" className="text-black">
                Base Stats
              </Heading>
              <VStack>
                {data.stats.map(s => (
                  <StatBar key={s.name} label={STAT_LABELS[s.name] ?? s.name} value={s.value} colourType={primary} />
                ))}
              </VStack>
            </VStack>

            {fromParty ? (
              // Opened from the party tab: this Pokémon is already a member, so show a static
              // indicator rather than offering to add it again.
              <Box
                className="bg-lightGreen rounded-xl items-center justify-center py-3.5"
                style={{alignSelf: 'stretch'}}
              >
                <Text bold className="text-darkGreen">
                  ✓ In your party
                </Text>
              </Box>
            ) : (
              <Button
                onPress={onAddToParty}
                isDisabled={isFull}
                size="lg"
                className="bg-navy rounded-xl"
                style={{alignSelf: 'stretch'}}
              >
                <ButtonText className="text-white">
                  {isFull ? 'Party Full' : 'Add to Party'}
                </ButtonText>
              </Button>
            )}
          </VStack>
        </VStack>
      </ScrollView>

      {justAdded ? (
        // Sibling after the ScrollView so it paints on top; absolute so it overlays rather than
        // shifting the layout. Auto-dismisses via the justAdded timer.
        <Box className="absolute top-0 left-0 right-0 items-center pt-3 px-4">
          <Box className="bg-pokemonGreen rounded-2xl px-5 py-3">
            <Text bold className="text-black">
              ✓ {data.name} added to your party
            </Text>
          </Box>
        </Box>
      ) : null}
    </ScreenContainer>
  );
}
