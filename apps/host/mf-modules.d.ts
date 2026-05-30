// --- Ambient module declarations for federated remotes. Each module name matches the `name`
// field in the corresponding remote's rspack config and the key in the host's `remotes: {…}`
// object. ScriptManager fetches the manifest at the URL declared in the host config, then loads
// the container, then resolves the exposed module. ---

declare module 'listApp/ListStack' {
  import type { ComponentType } from 'react';
  export const ListStack: ComponentType;
}

declare module 'partyApp/PartyStack' {
  import type { ComponentType } from 'react';
  export const PartyStack: ComponentType;
}

declare module 'regionsApp/RegionsStack' {
  import type { ComponentType } from 'react';
  export const RegionsStack: ComponentType;
}

declare module 'detailApp/PokemonDetailScreen' {
  import type { ComponentType } from 'react';
  export const PokemonDetailScreen: ComponentType<{
    route: { params: { id: number } };
  }>;
}

// --- Build-time constant injected by each remote's DefinePlugin (set from MF_REMOTE_VERSION).
// Available inside federated remote bundles; undefined in the host bundle (where __MF_CDN_BASE__
// is injected instead). ---
declare const __REMOTE_VERSION__: string;
declare const __MF_CDN_BASE__: string;
