import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useDispatch, useSelector} from 'react-redux';
import {
  ScreenContainer,
  PokemonGrid,
  Box,
  Text,
  Button,
  ButtonText,
  type PokemonGridEntry,
} from '@pokedex/ui';
import {shellNavigate, CROSS_MODULE_ACTIONS} from '@pokedex/contracts';
import {artworkUri} from './pokeApi';

// --- partyApp's exposed stack: the party manager. Dark-themed (ScreenContainer variant) to give
// the tab a strong visual identity. Renders the FlashList-backed PokemonGrid at two columns, and
// launches the native Quick Battle flow. That button is the full strategy loop in one tap: a
// federated RN remote calls shell.navigateTo for a NATIVE destination, the native SwiftUI screen
// runs and returns a winner, and the remote dispatches the result as a contract action into the
// host-owned party slice (which then mirrors back to native via the store-observer bridge). ---

const Stack = createNativeStackNavigator();

const DEMO_PARTY: PokemonGridEntry[] = [
  {id: 3, name: 'Venusaur', types: ['grass', 'poison'], spriteUri: artworkUri(3)},
  {id: 9, name: 'Blastoise', types: ['water'], spriteUri: artworkUri(9)},
  {id: 6, name: 'Charizard', types: ['fire', 'flying'], spriteUri: artworkUri(6)},
];

interface PartySliceShape {
  party?: {lastBattleWinnerId: number | null};
}

function PartyMainScreen() {
  const dispatch = useDispatch();
  const winnerId = useSelector(
    (s: PartySliceShape) => s.party?.lastBattleWinnerId ?? null,
  );
  const winnerName = DEMO_PARTY.find(p => p.id === winnerId)?.name;

  const onQuickBattle = async () => {
    // RN -> Native: hand the native flow the current party as input.
    const result = await shellNavigate('QuickBattle', {
      party: DEMO_PARTY.map(p => ({id: p.id, name: p.name})),
    });
    // Native -> RN: dispatch the returned winner as a contract action; the host party slice
    // owns the reducer, so partyApp stays decoupled from the host's slice file.
    if (result && typeof result.winnerId === 'number') {
      dispatch({type: CROSS_MODULE_ACTIONS.party.battleResult, payload: result});
    }
  };

  return (
    <ScreenContainer variant="dark">
      <Box className="p-3">
        <Button onPress={onQuickBattle} size="lg">
          <ButtonText>Quick Battle</ButtonText>
        </Button>
        {winnerName ? (
          <Text className="text-white mt-3 text-center">
            Last battle winner: {winnerName}
          </Text>
        ) : null}
      </Box>
      <Box className="flex-1">
        <PokemonGrid
          data={DEMO_PARTY}
          numColumns={2}
          onPressItem={entry => shellNavigate('PokemonDetail', {id: entry.id})}
        />
      </Box>
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
