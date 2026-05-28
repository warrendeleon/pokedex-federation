// --- MF singleton declarations. Imported by every rspack config (host + each remote) so the
// shared-package list stays in one place. The host's MF plugin sets `eager: true`; each remote's
// plugin sets `eager: false`. Mismatched flags throw "Shared module is not available for eager
// consumption" at first import.
//
// Versions are pinned to whatever the host's package.json currently installs. Bumping a version
// here without bumping every consumer's `requiredVersion` against the federation contract is
// what makes federated remotes silently fall back to bundling their own copy. ---
import pkg from './package.json' with {type: 'json'};

const v = name => pkg.dependencies?.[name] ?? pkg.devDependencies?.[name];

export function getMFShared(side /* 'host' | 'remote' */) {
  const eager = side === 'host';
  return {
    react:                              {singleton: true, eager, requiredVersion: v('react')},
    'react-native':                     {singleton: true, eager, requiredVersion: v('react-native')},
    'react/jsx-runtime':                {singleton: true, eager, requiredVersion: v('react')},

    '@react-navigation/native':         {singleton: true, eager, requiredVersion: v('@react-navigation/native')},
    '@react-navigation/native-stack':   {singleton: true, eager, requiredVersion: v('@react-navigation/native-stack')},
    '@react-navigation/bottom-tabs':    {singleton: true, eager, requiredVersion: v('@react-navigation/bottom-tabs')},
    'react-native-screens':             {singleton: true, eager, requiredVersion: v('react-native-screens')},
    'react-native-safe-area-context':   {singleton: true, eager, requiredVersion: v('react-native-safe-area-context')},

    '@reduxjs/toolkit':                 {singleton: true, eager, requiredVersion: v('@reduxjs/toolkit')},
    'react-redux':                      {singleton: true, eager, requiredVersion: v('react-redux')},
    'redux-persist':                    {singleton: true, eager, requiredVersion: v('redux-persist')},
    '@react-native-async-storage/async-storage': {singleton: true, eager, requiredVersion: v('@react-native-async-storage/async-storage')},

    // --- Shared via the local @pokedex/contracts package: the route registry, action strings,
    // bridge keys, MF shared decl. Declared as a singleton so a federated remote sees the same
    // ROUTE_REGISTRY identity as the host. ---
    '@pokedex/contracts':               {singleton: true, eager, requiredVersion: v('@pokedex/contracts')},
    // --- The design system, Gluestack-wrapped, shared across every federated screen so they all
    // render against the same theme + token references at runtime. ---
    '@pokedex/ui':                      {singleton: true, eager, requiredVersion: v('@pokedex/ui')},
  };
}
