import {artworkUri, baseApi, type PokemonDetailData} from '@pokedex/contracts';

// --- detailApp injects its endpoint into the host's shared baseApi. Because the list already
// populated the shared cache, navigating to a Pokémon the list loaded is instant (RTK Query
// dedup); a Pokémon it didn't is fetched once here. One cache, shared across remotes. ---

const detailApi = baseApi.injectEndpoints({
  endpoints: build => ({
    getPokemonDetail: build.query<PokemonDetailData, number>({
      async queryFn(id, _api, _extra, baseQuery) {
        const res = await baseQuery(`pokemon/${id}`);
        if (res.error) return {error: res.error};
        // Optional arrays guarded: a malformed 200 from PokéAPI shouldn't throw inside the queryFn.
        const p = res.data as {
          id: number;
          name: string;
          height: number;
          weight: number;
          types?: {type: {name: string}}[];
          stats?: {base_stat: number; stat: {name: string}}[];
          abilities?: {ability: {name: string}}[];
        };
        const name = p.name
          .split('-')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        return {
          data: {
            id: p.id,
            name,
            types: (p.types ?? []).map(t => t.type.name),
            spriteUri: artworkUri(p.id),
            heightMeters: p.height / 10,
            weightKg: p.weight / 10,
            abilities: (p.abilities ?? []).map(a => a.ability.name),
            stats: (p.stats ?? []).map(s => ({name: s.stat.name, value: s.base_stat})),
          },
        };
      },
      providesTags: (_result, _error, id) => [{type: 'Pokemon', id}],
    }),
  }),
});

export const {useGetPokemonDetailQuery} = detailApi;
