import React from 'react';
import {StyleSheet, Text as RNText, View} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {ScreenContainer, FlashList, Card, Text, Pressable} from '@pokedex/ui';
import {shellNavigate} from '@pokedex/contracts';

// --- regionsApp's exposed stack: browse the Pokémon regions. This remote earns the routing
// table its keep: a region is a different entity type, and tapping a region's featured Pokémon
// routes to the detailApp remote via shell.navigateTo('PokemonDetail', {id}): cross-feature
// navigation with no direct import. The region card is bespoke (not PokemonGrid), so it renders
// the raw FlashList re-exported from @pokedex/ui. Real per-region Pokémon lists arrive with the
// data pass. ---

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
      <View style={styles.header}>
        <RNText style={styles.title}>Regions</RNText>
        <RNText style={styles.subtitle}>Tap a region to meet its starter</RNText>
      </View>
      <FlashList
        data={REGIONS}
        keyExtractor={region => region.name}
        renderItem={({item}) => (
          <Pressable
            className="mx-3 mt-3 active:opacity-80"
            onPress={() => shellNavigate('PokemonDetail', {id: item.starterId})}>
            <Card className="bg-white rounded-2xl p-4">
              <Text bold size="lg">
                {item.name}
              </Text>
              <Text size="sm" className="text-midGrey">
                {item.gen}
              </Text>
            </Card>
          </Pressable>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4},
  title: {fontSize: 28, fontWeight: '700', color: '#2E3138'},
  subtitle: {fontSize: 14, color: '#515151', marginTop: 2},
});

export function RegionsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="RegionsMain" component={RegionsMainScreen} options={{headerShown: false}} />
    </Stack.Navigator>
  );
}
