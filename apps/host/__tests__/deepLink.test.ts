import { resolveDeepLink } from '../src/shell/deepLink';

// resolveDeepLink turns a deep link (pokedex://...) or universal link (https://host.tld/...) into a
// shell destination + params. It's pure, so it's tested directly, no native modules or navigation.
describe('resolveDeepLink', () => {
  it('maps a pokemon deep link to PokemonDetail with a numeric id', () => {
    expect(resolveDeepLink('pokedex://pokemon/25')).toEqual({
      destination: 'PokemonDetail',
      params: { id: 25 },
    });
  });

  it('maps the tab and flow destinations', () => {
    expect(resolveDeepLink('pokedex://party')).toEqual({
      destination: 'Party',
    });
    expect(resolveDeepLink('pokedex://pokedex')).toEqual({
      destination: 'Pokedex',
    });
    expect(resolveDeepLink('pokedex://regions')).toEqual({
      destination: 'Regions',
    });
    expect(resolveDeepLink('pokedex://battle')).toEqual({
      destination: 'QuickBattle',
    });
  });

  it('strips the host segment of a universal link', () => {
    expect(resolveDeepLink('https://pokedex.app/pokemon/1')).toEqual({
      destination: 'PokemonDetail',
      params: { id: 1 },
    });
  });

  it('returns null for a pokemon link with no id', () => {
    expect(resolveDeepLink('pokedex://pokemon')).toBeNull();
  });

  it('returns null for an unknown resource', () => {
    expect(resolveDeepLink('pokedex://settings')).toBeNull();
  });

  it('returns null for an empty or schemeless string', () => {
    expect(resolveDeepLink('')).toBeNull();
    expect(resolveDeepLink('not-a-link')).toBeNull();
  });
});
