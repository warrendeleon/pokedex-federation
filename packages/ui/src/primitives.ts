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
// --- Layout primitives: VStack / HStack drive spacing through their `space` prop (a token
// scale, gap-1 … gap-8), Divider is a hairline rule. Their spacing classes live in this
// package's source, so the host's Tailwind scan generates them and they resolve on the shared
// singletons from any remote, with no remote-authored utility classes. ---
export {VStack} from './components/ui/vstack';
export {HStack} from './components/ui/hstack';
export {Divider} from './components/ui/divider';
// --- Toast: re-exported from the design system so remotes call useToast from this shared
// singleton, not their own bundled @gluestack-ui copy. That matters because the host mounts the
// ToastProvider (inside GluestackUIProvider); a remote's useToast must reference the SAME provider
// context to render, which only holds when the hook comes from the shared @pokedex/ui instance. ---
export {useToast, Toast, ToastTitle, ToastDescription} from './components/ui/toast';

// --- FlashList: the recycling list engine, re-exported so remotes consume it through the
// design system rather than depending on @shopify/flash-list directly. FlashList v2 is pure
// JavaScript on the new architecture (no native view); shared as a federation JS singleton.
export {FlashList, type FlashListProps} from '@shopify/flash-list';
export {
  Button,
  ButtonText,
  ButtonSpinner,
  ButtonIcon,
  ButtonGroup,
} from './components/ui/button';
