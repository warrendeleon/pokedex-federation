// --- Pure deep-link / universal-link URL parsing, split out from shellNavigation so it carries no
// native-module imports and can be unit-tested in isolation (shellNavigation pulls in the
// ShellNavigation TurboModule, which can't load under Jest). resolveDeepLink maps a URL to a shell
// destination + params; the navigation side effect lives in shellNavigation. ---

export function resolveDeepLink(
  url: string,
): { destination: string; params?: Record<string, unknown> } | null {
  // Strip the scheme (pokedex://); for a universal link, also drop a leading "host.tld" segment.
  let rest = url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  const firstSlash = rest.indexOf('/');
  const head = firstSlash === -1 ? rest : rest.slice(0, firstSlash);
  if (head.includes('.')) {
    rest = firstSlash === -1 ? '' : rest.slice(firstSlash + 1);
  }
  const [resource, value] = rest.split('/').filter(Boolean);
  switch (resource) {
    case 'pokemon':
      return value
        ? { destination: 'PokemonDetail', params: { id: Number(value) } }
        : null;
    case 'party':
      return { destination: 'Party' };
    case 'pokedex':
      return { destination: 'Pokedex' };
    case 'regions':
      return { destination: 'Regions' };
    case 'battle':
      return { destination: 'QuickBattle' };
    default:
      return null;
  }
}
