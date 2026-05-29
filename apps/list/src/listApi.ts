import {
  baseApi,
  artworkUri,
  idFromResourceUrl,
  type PokemonSummary,
} from '@pokedex/contracts';

// --- listApp injects its endpoint into the host's shared baseApi at load. This is the RTK Query
// federation proof: the endpoint + its generated hook register against the one shared cache the
// host store already runs, so the data is fetched once, deduped, and reusable by any other remote
// against the same cache. A TanStack Query equivalent would need every query key known at the
// shell's build time.
//
// PokéAPI's REST list endpoint returns names + resource URLs only, so getPokemonList fetches the
// page then each Pokémon's detail for its types (sprite is derived from the id, no request). One
// RTK Query endpoint, one cache entry; the per-Pokémon fetches run once and are cached. ---

const PAGE_SIZE = 24;

// PokéAPI returns lower-case, hyphenated names ("mr-mime"); title-case each word for display.
const formatName = (name: string) =>
  name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const listApi = baseApi.injectEndpoints({
  endpoints: build => ({
    getPokemonList: build.query<PokemonSummary[], void>({
      async queryFn(_arg, _api, _extra, baseQuery) {
        const page = await baseQuery(`pokemon?limit=${PAGE_SIZE}`);
        if (page.error) return {error: page.error};
        const results = (page.data as {results: {name: string; url: string}[]}).results;
        const details = await Promise.all(
          results.map(r => baseQuery(`pokemon/${idFromResourceUrl(r.url)}`)),
        );
        const data: PokemonSummary[] = [];
        for (const detail of details) {
          if (detail.error) return {error: detail.error};
          const p = detail.data as {
            id: number;
            name: string;
            types: {type: {name: string}}[];
          };
          data.push({
            id: p.id,
            name: formatName(p.name),
            types: p.types.map(t => t.type.name),
            spriteUri: artworkUri(p.id),
          });
        }
        return {data};
      },
      providesTags: ['PokemonList'],
    }),
  }),
});

export const {useGetPokemonListQuery} = listApi;
