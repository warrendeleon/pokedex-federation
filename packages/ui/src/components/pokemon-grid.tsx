import React from 'react';
import {FlashList} from '@shopify/flash-list';
import {Box} from './ui/box';
import {PokemonCard} from './pokemon-card';

// --- The Pokédex / Party card grid. Built on FlashList rather than a ScrollView: it recycles
// rows and only renders what's on screen, so it scales to the full Pokédex (1000+ entries)
// without mounting every card up front. FlashList is a shared federation singleton provided by
// the host (its native view is compiled into the host binary); remotes render against that one
// instance. Owning the grid in the design system means the remotes don't each reimplement the
// layout, and swapping the list engine later (Legend List, etc.) touches this one file.
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
}

export function PokemonGrid({data, onPressItem, numColumns = 3}: PokemonGridProps) {
  return (
    <FlashList
      data={data}
      numColumns={numColumns}
      keyExtractor={entry => String(entry.id)}
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
