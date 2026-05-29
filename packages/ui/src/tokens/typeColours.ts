// --- Per-Pokémon-type colour tokens. Two consumption paths:
//
//   1. className-based (preferred). Use bgClassForType(), textOnTypeClass(), tintBgClassForType().
//      These return strings like "bg-type-fire" / "text-white" / "bg-type-fire/30". The
//      Tailwind preset (tailwind.preset.js) defines the matching colour scale.
//
//   2. Hex map (escape hatch for runtime needs that can't be expressed as classes: status
//      bar tint colour, native bridge payloads, gradient stops). Lower-cased keys match the
//      type names returned by PokéAPI so look-ups don't need transformation.
//
// Keep both in sync with tailwind.preset.js's `type` colour namespace. ---

export const TYPE_NAMES = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison',
  'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark',
  'steel', 'fairy',
] as const;

export type PokemonType = (typeof TYPE_NAMES)[number];

// --- Hex values; matches tailwind.preset.js exactly. Use only when you genuinely need a hex
// at runtime (status bar tint, native bridge payload). For rendering, use the class helpers. ---
export const typeColours: Record<string, string> = {
  normal:   '#C5B1A1',
  fire:     '#F78E69',
  water:    '#3A86FF',
  electric: '#F7D02C',
  grass:    '#A6D3A0',
  ice:      '#A3D9FF',
  fighting: '#6C0E23',
  poison:   '#ECB0E1',
  ground:   '#E2BF65',
  flying:   '#F5CAC3',
  psychic:  '#E75A7C',
  bug:      '#A8A77A',
  rock:     '#775B59',
  ghost:    '#735797',
  dragon:   '#6F35FC',
  dark:     '#1C2321',
  steel:    '#797270',
  fairy:    '#D685AD',
};

/** Fallback for unknown types; tinted neutral grey. */
export function colourForType(type: string): string {
  return typeColours[type.toLowerCase()] ?? '#9A9AB0';
}

// --- Pre-baked text-on-type colour class. Decided once per type from perceived luminance so
// designers don't run a contrast calculation per render. White on the dark / saturated types;
// black on the pale ones. ---
const TYPE_TEXT_ON_BG: Record<string, 'text-white' | 'text-black'> = {
  normal:   'text-black',
  fire:     'text-black',
  water:    'text-white',
  electric: 'text-black',
  grass:    'text-black',
  ice:      'text-black',
  fighting: 'text-white',
  poison:   'text-black',
  ground:   'text-black',
  flying:   'text-black',
  psychic:  'text-white',
  bug:      'text-black',
  rock:     'text-white',
  ghost:    'text-white',
  dragon:   'text-white',
  dark:     'text-white',
  steel:    'text-white',
  fairy:    'text-black',
};

const KNOWN = new Set<string>(TYPE_NAMES);

function normaliseType(type: string): PokemonType {
  const t = type.toLowerCase();
  return KNOWN.has(t) ? (t as PokemonType) : 'normal';
}

// --- Literal class maps, NOT template strings. Tailwind/NativeWind generate a class only when
// its full name appears verbatim in scanned source; a constructed `bg-type-${t}` is invisible to
// the scanner, so the colour silently never ships. Spelling every class out here is the standard
// Tailwind answer to dynamic class names and keeps the whole type palette in one auditable place.
const TYPE_BG_CLASS: Record<PokemonType, string> = {
  normal: 'bg-type-normal',     fire: 'bg-type-fire',         water: 'bg-type-water',
  electric: 'bg-type-electric', grass: 'bg-type-grass',       ice: 'bg-type-ice',
  fighting: 'bg-type-fighting', poison: 'bg-type-poison',     ground: 'bg-type-ground',
  flying: 'bg-type-flying',     psychic: 'bg-type-psychic',   bug: 'bg-type-bug',
  rock: 'bg-type-rock',         ghost: 'bg-type-ghost',       dragon: 'bg-type-dragon',
  dark: 'bg-type-dark',         steel: 'bg-type-steel',       fairy: 'bg-type-fairy',
};

const TYPE_TINT_CLASS: Record<PokemonType, string> = {
  normal: 'bg-type-normal/30',     fire: 'bg-type-fire/30',         water: 'bg-type-water/30',
  electric: 'bg-type-electric/30', grass: 'bg-type-grass/30',       ice: 'bg-type-ice/30',
  fighting: 'bg-type-fighting/30', poison: 'bg-type-poison/30',     ground: 'bg-type-ground/30',
  flying: 'bg-type-flying/30',     psychic: 'bg-type-psychic/30',   bug: 'bg-type-bug/30',
  rock: 'bg-type-rock/30',         ghost: 'bg-type-ghost/30',       dragon: 'bg-type-dragon/30',
  dark: 'bg-type-dark/30',         steel: 'bg-type-steel/30',       fairy: 'bg-type-fairy/30',
};

/** Background class at full saturation: 'bg-type-fire'. */
export function bgClassForType(type: string): string {
  return TYPE_BG_CLASS[normaliseType(type)];
}

/** Background class faded to 30% (sprite-tint pattern): 'bg-type-fire/30'. */
export function tintBgClassForType(type: string): string {
  return TYPE_TINT_CLASS[normaliseType(type)];
}

/** Foreground text class chosen for contrast against bgClassForType: 'text-white' or 'text-black'. */
export function textOnTypeClass(type: string): 'text-white' | 'text-black' {
  return TYPE_TEXT_ON_BG[normaliseType(type)];
}
