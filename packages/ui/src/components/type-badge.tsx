import React from 'react';
import {Box} from './ui/box';
import {Text} from './ui/text';
import {bgClassForType, textOnTypeClass} from '../tokens/typeColours';

// --- Coloured pill that displays a Pokémon type (Fire, Water, etc). Both background and
// text colour come from token classes (bg-type-<name> + text-white/black) defined in the
// shared Tailwind preset. No inline styles; designers can re-skin the whole type palette by
// editing tailwind.preset.js. Composed from Gluestack Box + Text primitives. ---

export interface TypeBadgeProps {
  type: string;
  size?: 'sm' | 'md';
}

export function TypeBadge({type, size = 'sm'}: TypeBadgeProps) {
  const bg = bgClassForType(type);
  const fg = textOnTypeClass(type);
  const padding = size === 'md' ? 'px-3 py-1.5' : 'px-2 py-1';
  const textSize = size === 'md' ? 'sm' : 'xs';
  return (
    <Box className={`rounded-full self-start ${padding} ${bg}`}>
      <Text size={textSize} bold className={`capitalize ${fg}`}>
        {type}
      </Text>
    </Box>
  );
}
