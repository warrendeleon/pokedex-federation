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
// getPokemonList is an infiniteQuery (RTK Query 2.3+): RTK owns the page accumulation, so the
// screen never tracks offsets by hand. Each page hits PokéAPI's REST list endpoint (names +
// resource URLs only), then fetches each Pokémon's detail for its types (the sprite is derived
// from the id, no request). getNextPageParam advances the offset until a short page signals the
// end of the Pokédex, which is what drives hasNextPage / fetchNextPage on the hook. ---

const PAGE_SIZE = 24;

// PokéAPI returns lower-case, hyphenated names ("mr-mime"); title-case each word for display.
const formatName = (name: string) =>
  name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const listApi = baseApi.injectEndpoints({
  endpoints: build => ({
    getPokemonList: build.infiniteQuery<PokemonSummary[], void, number>({
      infiniteQueryOptions: {
        initialPageParam: 0,
        // A page shorter than PAGE_SIZE is the last one; stop paging there.
        getNextPageParam: (lastPage, _allPages, lastPageParam) =>
          lastPage.length < PAGE_SIZE ? undefined : lastPageParam + PAGE_SIZE,
      },
      async queryFn({pageParam}, _api, _extra, baseQuery) {
        const page = await baseQuery(`pokemon?limit=${PAGE_SIZE}&offset=${pageParam}`);
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

export const {useGetPokemonListInfiniteQuery} = listApi;
