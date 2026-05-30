import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { PersistGate } from 'redux-persist/integration/react';

import { registerShellNavigateHandler } from '@pokedex/contracts';
import { GluestackUIProvider } from '@pokedex/ui';

import { AppNavigator } from './src/shell/AppNavigator';
import { FederationBanner } from './src/shell/FederationBanner';
import { initializeFederation } from './src/shell/scriptManager';
import {
  navigationRef,
  processInitialDeepLink,
  shellNavigateHandler,
} from './src/shell/shellNavigation';
import { persistor, store } from './src/shell/store';

// --- Wire the shell.navigateTo bridge once at module load, before any remote can call it.
// Federated remotes import shellNavigate from @pokedex/contracts; it proxies through globalThis
// to this handler. Registering here (module scope) guarantees the handler exists before the
// navigator mounts. ---
registerShellNavigateHandler(shellNavigateHandler);

export default function App() {
  // --- Federation gate. The navigator (where the React.lazy federated tabs live) must not
  // mount until initializeFederation has resolved the mode + wired the resolver, or the MF
  // runtime could fire a manifest fetch before the shell's plugins are ready. ---
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initializeFederation().finally(() => setReady(true));
  }, []);

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <GluestackUIProvider mode="light">
          <SafeAreaProvider>
            {ready ? (
              <>
                <NavigationContainer
                  ref={navigationRef}
                  onReady={processInitialDeepLink}
                >
                  <AppNavigator />
                </NavigationContainer>
                <FederationBanner />
              </>
            ) : (
              <View style={{ flex: 1, justifyContent: 'center' }}>
                <ActivityIndicator />
              </View>
            )}
          </SafeAreaProvider>
        </GluestackUIProvider>
      </PersistGate>
    </Provider>
  );
}
