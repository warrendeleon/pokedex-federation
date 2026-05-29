import {baseApi, idFromResourceUrl} from '@pokedex/contracts';

// --- regionsApp injects its endpoints into the host's shared baseApi, exactly like list and
// detail: same singleton createApi, same cache, same tag graph. Regions are a different entity to
// Pokémon, which is the whole point of the regions remote owning the routing table for them, but
// they still resolve through the one RTK Query instance the host store runs.
//
// Two endpoints:
//   - getRegions: the region index. PokéAPI's /region returns names + URLs only, so a second
//     fetch per region pulls its main generation for the subtitle. ~10 regions, fetched once and
//     cached.
//   - getRegionDex: a region's Pokédex (the species native to it). /region/{name} names the
//     region's pokédexes; /pokedex/{name} lists the entries. The sprite is derived from the id
//     (no request), so the dex renders with artwork off two fetches, no N+1 per species. ---

export interface RegionSummary {
  /** PokéAPI slug, e.g. "kanto"; used as the route arg into the dex. */
  name: string;
  /** Display label, e.g. "Kanto". */
  label: string;
  /** e.g. "Generation I". */
  generation: string;
}

export interface RegionDexEntry {
  id: number;
  /** Position in this region's Pokédex (1-based), not the national number. */
  entryNumber: number;
  name: string;
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// PokéAPI returns lower-case, hyphenated names ("mr-mime"); title-case each word for display.
const formatName = (name: string) =>
  name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

// "generation-iii" -> "Generation III".
const formatGeneration = (slug: string) => {
  const roman = slug.split('-')[1] ?? '';
  return `Generation ${roman.toUpperCase()}`;
};

const regionsApi = baseApi.injectEndpoints({
  endpoints: build => ({
    getRegions: build.query<RegionSummary[], void>({
      async queryFn(_arg, _api, _extra, baseQuery) {
        const index = await baseQuery('region');
        if (index.error) return {error: index.error};
        const results = (index.data as {results?: {name: string; url: string}[]}).results ?? [];
        const details = await Promise.all(results.map(r => baseQuery(`region/${r.name}`)));
        const data: RegionSummary[] = [];
        for (let i = 0; i < details.length; i++) {
          const detail = details[i];
          if (detail.error) return {error: detail.error};
          const region = detail.data as {name: string; main_generation: {name: string} | null};
          data.push({
            name: region.name,
            label: capitalise(region.name),
            generation: region.main_generation
              ? formatGeneration(region.main_generation.name)
              : 'Unknown generation',
          });
        }
        return {data};
      },
      providesTags: ['Region'],
    }),

    getRegionDex: build.query<RegionDexEntry[], string>({
      async queryFn(regionName, _api, _extra, baseQuery) {
        const region = await baseQuery(`region/${regionName}`);
        if (region.error) return {error: region.error};
        const pokedexes = (region.data as {pokedexes?: {name: string}[]}).pokedexes ?? [];
        if (pokedexes.length === 0) return {data: []};
        // A region can carry several pokédexes (e.g. Kanto has "kanto", "letsgo-kanto"); prefer
        // the one named after the region, else the first listed.
        const dexName =
          pokedexes.find(p => p.name === regionName)?.name ?? pokedexes[0].name;
        const dex = await baseQuery(`pokedex/${dexName}`);
        if (dex.error) return {error: dex.error};
        const entries =
          (
            dex.data as {
              pokemon_entries?: {
                entry_number: number;
                pokemon_species: {name: string; url: string};
              }[];
            }
          ).pokemon_entries ?? [];
        const data: RegionDexEntry[] = entries.map(e => ({
          id: idFromResourceUrl(e.pokemon_species.url),
          entryNumber: e.entry_number,
          name: formatName(e.pokemon_species.name),
        }));
        return {data};
      },
      providesTags: ['Region'],
    }),
  }),
});

export const {useGetRegionsQuery, useGetRegionDexQuery} = regionsApi;
