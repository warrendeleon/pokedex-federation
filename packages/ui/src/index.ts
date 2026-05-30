// --- The library's public surface. Three buckets:
//
// 1. Design tokens (colours + per-type colour map + class helpers). Used both by NativeWind
//    via the tailwind.preset.js content and by runtime code (status bar tint, native bridge
//    payloads).
// 2. Pokédex-domain components (PokemonCard, TypeBadge, ScreenContainer, LoadingState,
//    ErrorState). Composed entirely from Gluestack v2 primitives, no raw React Native widgets,
//    no inline style props (every colour comes from a Tailwind token class).
// 3. Re-exported Gluestack provider. Consumer apps wrap their root in this so the Gluestack
//    primitives any remote pulls in have a working theme + overlay context. ---

export * from './components';
export * from './primitives';
export * from './tokens';

// --- Gluestack provider re-export. The actual file lives at src/components/ui/gluestack-ui-provider/
// (where the CLI puts it, after we relocated `components/` under src/ so react-native-builder-bob
// builds the lot in one pass). The re-export keeps the import surface stable even if we relocate
// it again later. ---
export {GluestackUIProvider} from './components/ui/gluestack-ui-provider';
