// --- PokéAPI helpers. The official-artwork sprite URL is deterministic from the Pokémon id,
// so the grid can show sprites without an API call per card. (Real list/type data is wired via
// RTK Query in a later step; this keeps the federation-loading proof self-contained.) ---

export function artworkUri(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}
