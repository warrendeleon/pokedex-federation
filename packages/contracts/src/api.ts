import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// --- The single RTK Query API instance for the whole federation, and the reason it lives in the
// shared @pokedex/contracts package rather than the host: a federated remote can only add its
// endpoints to the SAME instance the host store wired in. Because contracts is a Module Federation
// singleton, the host and every remote import this exact object, so a remote's
// baseApi.injectEndpoints({...}) registers against the one shared cache + middleware the store
// already runs. One instance means one HTTP cache, one dedup pipeline, one tag graph across every
// remote, including remotes shipped long after the shell. baseApi itself declares zero endpoints;
// the list/detail/regions remotes inject their own. ---

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://pokeapi.co/api/v2/' }),
  tagTypes: ['Pokemon', 'PokemonList', 'Region'],
  endpoints: () => ({}),
});

// --- Shared response shapes the remotes' injected endpoints resolve to, so the list and detail
// screens (and anything that reads the cache) agree on the model without re-declaring it. ---
export interface PokemonSummary {
  id: number;
  name: string;
  types: string[];
  spriteUri: string;
}

export interface PokemonStat {
  name: string;
  value: number;
}

export interface PokemonDetailData extends PokemonSummary {
  heightMeters: number;
  weightKg: number;
  abilities: string[];
  stats: PokemonStat[];
}

/** Official-artwork sprite URL, deterministic from the id (no extra request needed). */
export function artworkUri(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

/** PokéAPI resource URLs end with the numeric id: .../pokemon/25/ -> 25. */
export function idFromResourceUrl(url: string): number {
  const match = url.match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : 0;
}
