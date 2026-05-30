import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';

import { FederatedTabBoundary } from './FederatedTabBoundary';
import type { RootStackParamList, RootTabParamList } from './navigationTypes';

// --- The host shell's navigation. A root native-stack sits over the bottom tabs so that the
// cross-cutting PokemonDetail screen (federated from detailApp) can be pushed from ANY tab via
// shell.navigateTo('PokemonDetail', {id}) and dismissed back to wherever the user was. This is
// why detailApp is a federated remote but NOT a tab; it's reachable from list, party, and
// regions alike, and the routing table (ROUTE_REGISTRY) is the single place that knows it. ---

// --- Federated loaders. Each import specifier matches the remote's MF `name` + exposed key
// (see mf-modules.d.ts and each remote's rspack `exposes`). ---
const loadList = () =>
  import('listApp/ListStack').then(m => ({ default: m.ListStack }));
const loadParty = () =>
  import('partyApp/PartyStack').then(m => ({ default: m.PartyStack }));
const loadRegions = () =>
  import('regionsApp/RegionsStack').then(m => ({ default: m.RegionsStack }));
const loadDetail = () =>
  import('detailApp/PokemonDetailScreen').then(m => ({
    default: m.PokemonDetailScreen,
  }));

const Tab = createBottomTabNavigator<RootTabParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

function PokedexTabScreen() {
  return (
    <FederatedTabBoundary name="Pokédex" remoteName="listApp" load={loadList} />
  );
}
function PartyTabScreen() {
  return (
    <FederatedTabBoundary
      name="Party"
      remoteName="partyApp"
      load={loadParty}
      variant="dark"
    />
  );
}
function RegionsTabScreen() {
  return (
    <FederatedTabBoundary
      name="Regions"
      remoteName="regionsApp"
      load={loadRegions}
    />
  );
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false, tabBarActiveTintColor: '#3A86FF' }}
    >
      <Tab.Screen
        name="PokedexTab"
        component={PokedexTabScreen}
        options={{ title: 'Pokédex', tabBarIcon: () => <Text>🔍</Text> }}
      />
      <Tab.Screen
        name="PartyTab"
        component={PartyTabScreen}
        options={{ title: 'Party', tabBarIcon: () => <Text>🎒</Text> }}
      />
      <Tab.Screen
        name="RegionsTab"
        component={RegionsTabScreen}
        options={{ title: 'Regions', tabBarIcon: () => <Text>🗺️</Text> }}
      />
    </Tab.Navigator>
  );
}

function PokemonDetailScreen(
  props: NativeStackScreenProps<RootStackParamList, 'PokemonDetail'>,
) {
  return (
    <FederatedTabBoundary
      name="Detail"
      remoteName="detailApp"
      load={loadDetail}
      componentProps={props}
    />
  );
}

export function AppNavigator() {
  return (
    <RootStack.Navigator>
      <RootStack.Screen
        name="Tabs"
        component={Tabs}
        options={{ headerShown: false }}
      />
      <RootStack.Screen
        name="PokemonDetail"
        component={PokemonDetailScreen}
        options={{ presentation: 'modal', title: 'Pokémon' }}
      />
    </RootStack.Navigator>
  );
}
