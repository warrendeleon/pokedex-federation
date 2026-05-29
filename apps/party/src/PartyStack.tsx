import React from 'react';
import {ScrollView, View} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {ScreenContainer, PokemonCard} from '@pokedex/ui';
import {shellNavigate} from '@pokedex/contracts';
import {artworkUri} from './pokeApi';

// --- partyApp's exposed stack: the party manager. Dark-themed (ScreenContainer variant)
// to give the tab a strong visual identity, matching the reference design. For now it renders
// a static party; wiring it to the host-owned party slice (read members, remove, Quick Battle)
// happens in the visual + state pass. ---

const Stack = createNativeStackNavigator();

const DEMO_PARTY: {id: number; name: string; types: string[]}[] = [
  {id: 3, name: 'Venusaur', types: ['grass', 'poison']},
  {id: 9, name: 'Blastoise', types: ['water']},
  {id: 6, name: 'Charizard', types: ['fire', 'flying']},
];

function PartyMainScreen() {
  return (
    <ScreenContainer variant="dark">
      <ScrollView contentContainerClassName="p-3">
        <View className="flex-row flex-wrap justify-between">
          {DEMO_PARTY.map(p => (
            <View key={p.id} className="w-[48%] mb-3">
              <PokemonCard
                id={p.id}
                name={p.name}
                types={p.types}
                spriteUri={artworkUri(p.id)}
                onPress={() => shellNavigate('PokemonDetail', {id: p.id})}
              />
            </View>
          ))}
        </View>
      </ScrollView>
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
