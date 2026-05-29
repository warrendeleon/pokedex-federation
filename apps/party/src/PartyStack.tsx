import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useDispatch, useSelector} from 'react-redux';
import {
  ScreenContainer,
  PokemonGrid,
  Box,
  Center,
  Text,
  Button,
  ButtonText,
  type PokemonGridEntry,
} from '@pokedex/ui';
import {shellNavigate, CROSS_MODULE_ACTIONS} from '@pokedex/contracts';

// --- partyApp's exposed stack: the party manager. Dark-themed (ScreenContainer variant) to give
// the tab a strong visual identity. It renders the host-owned party slice (members added from the
// Detail screen via a cross-module action), proving cross-module state: a remote reads state that
// another remote wrote, through the host store, with no direct coupling. The Quick Battle button
// is the native loop: shell.navigateTo to a NATIVE destination, the SwiftUI screen returns a
// winner, and the result is dispatched back as a contract action the host slice reduces. ---

const Stack = createNativeStackNavigator();

interface PartyMember {
  id: number;
  name: string;
  types: string[];
  spriteUri?: string;
}
interface PartySliceShape {
  party?: {members: PartyMember[]; lastBattleWinnerId: number | null};
}

function PartyMainScreen() {
  const dispatch = useDispatch();
  const members = useSelector((s: PartySliceShape) => s.party?.members ?? []);
  const winnerId = useSelector((s: PartySliceShape) => s.party?.lastBattleWinnerId ?? null);
  const winnerName = members.find(p => p.id === winnerId)?.name;

  const onQuickBattle = async () => {
    // RN -> Native: hand the native flow the current party as input.
    const result = await shellNavigate('QuickBattle', {
      party: members.map(p => ({id: p.id, name: p.name})),
    });
    // Native -> RN: dispatch the returned winner as a contract action; the host party slice
    // owns the reducer, so partyApp stays decoupled from the host's slice file.
    if (result && typeof result.winnerId === 'number') {
      dispatch({type: CROSS_MODULE_ACTIONS.party.battleResult, payload: result});
    }
  };

  const data: PokemonGridEntry[] = members.map(m => ({
    id: m.id,
    name: m.name,
    types: m.types,
    spriteUri: m.spriteUri,
  }));

  return (
    <ScreenContainer variant="dark">
      <Box className="p-3">
        <Button onPress={onQuickBattle} size="lg" className="bg-type-electric" isDisabled={members.length === 0}>
          <ButtonText className="text-black">Quick Battle</ButtonText>
        </Button>
        {winnerName ? (
          <Text className="text-white mt-3 text-center">Last battle winner: {winnerName}</Text>
        ) : null}
      </Box>
      {members.length === 0 ? (
        <Center className="flex-1 px-8">
          <Text className="text-white text-center text-lg">Your party is empty</Text>
          <Text className="text-midGrey text-center mt-2">
            Open a Pokémon from the Pokédex and tap Add to Party.
          </Text>
        </Center>
      ) : (
        <Box className="flex-1">
          <PokemonGrid
            data={data}
            numColumns={2}
            onPressItem={entry => shellNavigate('PokemonDetail', {id: entry.id})}
          />
        </Box>
      )}
    </ScreenContainer>
  );
}

export function PartyStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="PartyMain"
        component={PartyMainScreen}
        options={{title: 'My Party'}}
      />
    </Stack.Navigator>
  );
}
