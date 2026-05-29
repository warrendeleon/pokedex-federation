import React from 'react';
import {ActivityIndicator} from 'react-native';
import {FlashList} from '@shopify/flash-list';
import {Box} from './ui/box';
import {PokemonCard} from './pokemon-card';

// --- The Pokédex / Party card grid. Built on FlashList rather than a ScrollView: it recycles
// rows and only renders what's on screen, so it scales to the full Pokédex (1000+ entries)
// without mounting every card up front, and onEndReached drives infinite paging. FlashList v2 is
// pure JavaScript on the new architecture (no native view), shared as a federation JS singleton so
// host and remotes recycle through one instance. Owning the grid in the design system means the
// remotes don't each reimplement the layout, and swapping the list engine later (Legend List,
// etc.) touches this one file.
//
// FlashList itself is left unstyled by className on purpose: it is not registered with the
// NativeWind cssInterop registry, so it never becomes a CssInterop.ScrollView. Spacing comes
// from per-cell Box padding (token classes), which keeps the grid out of the css-interop tree
// and avoids the setState-during-render churn that a styled scroll container introduces. ---

export interface PokemonGridEntry {
  id: number;
  name: string;
  types: string[];
  spriteUri?: string;
}

export interface PokemonGridProps {
  data: PokemonGridEntry[];
  onPressItem?: (entry: PokemonGridEntry) => void;
  numColumns?: number;
  // Fired when the user nears the end of the list; the screen decides whether to load the next
  // page (it owns hasNextPage / the in-flight guard via the RTK Query infinite hook).
  onEndReached?: () => void;
  // Renders a footer spinner while the next page is in flight.
  isFetchingNextPage?: boolean;
}

export function PokemonGrid({
  data,
  onPressItem,
  numColumns = 3,
  onEndReached,
  isFetchingNextPage = false,
}: PokemonGridProps) {
  return (
    <FlashList
      data={data}
      numColumns={numColumns}
      keyExtractor={entry => String(entry.id)}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isFetchingNextPage ? (
          <Box className="py-4">
            <ActivityIndicator />
          </Box>
        ) : null
      }
      renderItem={({item}) => (
        <Box className="p-1.5">
          <PokemonCard
            id={item.id}
            name={item.name}
            types={item.types}
            spriteUri={item.spriteUri}
            onPress={onPressItem ? () => onPressItem(item) : undefined}
          />
        </Box>
      )}
    />
  );
}
