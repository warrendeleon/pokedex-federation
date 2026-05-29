// --- Re-export of the underlying Gluestack v2 primitives. The design system is the single
// import surface for the whole federation: remotes use the Pokédex-domain components
// (PokemonCard, TypeBadge, ScreenContainer, …) for common cases and these primitives for
// custom layouts, all resolved from the host's shared @pokedex/ui singleton so every remote
// renders against the same Gluestack provider + cssInterop registry. ---

export {Box} from './components/ui/box';
export {Text} from './components/ui/text';
export {Heading} from './components/ui/heading';
export {Card} from './components/ui/card';
export {Pressable} from './components/ui/pressable';
export {Center} from './components/ui/center';
export {Spinner} from './components/ui/spinner';
export {Image} from './components/ui/image';
export {SafeAreaView} from './components/ui/safe-area-view';

// --- FlashList: the recycling list engine, re-exported so remotes consume it through the
// design system rather than depending on @shopify/flash-list directly. Its native view is
// compiled into the host and shared as a federation singleton; this re-export is the JS surface.
export {FlashList, type FlashListProps} from '@shopify/flash-list';
export {
  Button,
  ButtonText,
  ButtonSpinner,
  ButtonIcon,
  ButtonGroup,
} from './components/ui/button';
