import {createApi, fetchBaseQuery} from '@reduxjs/toolkit/query/react';

// --- The single RTK Query API instance for the whole federation. The host owns it; federated
// remotes add their endpoints at load time via `baseApi.injectEndpoints({...})`. One instance
// means one shared HTTP cache, one dedup pipeline, one tag-invalidation graph across every
// remote; the federation-killer-feature RTK Query has and TanStack Query does not (a remote
// loaded weeks after the shell can register new queries against this same cache; TanStack
// would need every query key known at the shell's build time).
//
// `baseApi` ships with zero endpoints. The list/detail/regions remotes inject their own. ---

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({baseUrl: 'https://pokeapi.co/api/v2/'}),
  // --- Tag types are declared up front so any remote can use them for cache invalidation
  // without re-declaring. Remotes reference these via @pokedex/contracts. ---
  tagTypes: ['Pokemon', 'PokemonList', 'Region'],
  endpoints: () => ({}),
});
