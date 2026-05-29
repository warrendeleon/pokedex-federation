import React from 'react';
import {ScrollView, View} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {ScreenContainer, Card, Text, Pressable} from '@pokedex/ui';
import {shellNavigate} from '@pokedex/contracts';

// --- regionsApp's exposed stack: browse the Pokémon regions. This remote earns the routing
// table its keep: a region is a different entity type, and tapping a region's featured Pokémon
// routes to the detailApp remote via shell.navigateTo('PokemonDetail', {id}): cross-feature
// navigation with no direct import. Real per-region Pokémon lists arrive with the data pass. ---

const Stack = createNativeStackNavigator();

const REGIONS: {name: string; gen: string; starterId: number}[] = [
  {name: 'Kanto', gen: 'Generation I', starterId: 1},
  {name: 'Johto', gen: 'Generation II', starterId: 152},
  {name: 'Hoenn', gen: 'Generation III', starterId: 252},
  {name: 'Sinnoh', gen: 'Generation IV', starterId: 387},
];

function RegionsMainScreen() {
  return (
    <ScreenContainer>
      <ScrollView contentContainerClassName="p-3">
        {REGIONS.map(r => (
          <Pressable
            key={r.name}
            className="mb-3 active:opacity-80"
            onPress={() => shellNavigate('PokemonDetail', {id: r.starterId})}>
            <Card className="bg-white rounded-2xl p-4">
              <Text bold size="lg">
                {r.name}
              </Text>
              <Text size="sm" className="text-midGrey">
                {r.gen}
              </Text>
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

export function RegionsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="RegionsMain"
        component={RegionsMainScreen}
        options={{title: 'Regions'}}
      />
    </Stack.Navigator>
  );
}
