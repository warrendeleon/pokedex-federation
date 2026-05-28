import React from 'react';
import {type ImageSourcePropType} from 'react-native';
import {Card} from './ui/card';
import {Box} from './ui/box';
import {Text} from './ui/text';
import {Image} from './ui/image';
import {Pressable} from './ui/pressable';
import {TypeBadge} from './type-badge';
import {tintBgClassForType} from '../tokens/typeColours';

// --- The Pokédex grid's primary card. White rounded background, hashed ID, circular tinted
// sprite area (background tint is the primary type's colour at 30% opacity so the sprite
// stays the focal point), name in semibold, type badges in a row at the bottom. Tapping the
// card runs onPress (typically routes to Detail via shell.navigateTo).
//
// Composed from Gluestack primitives only: Pressable wraps Card; the sprite background is a
// Box with a tint-class from the token preset; the sprite itself is Gluestack Image; name +
// ID are Text; type pills are TypeBadge (which composes Box + Text). No inline styles. ---

export interface PokemonCardProps {
  id: number;
  name: string;
  types: string[];
  spriteUri?: string;
  spriteSource?: ImageSourcePropType;
  onPress?: () => void;
}

export function PokemonCard({
  id,
  name,
  types,
  spriteUri,
  spriteSource,
  onPress,
}: PokemonCardProps) {
  const primaryType = types[0] ?? 'normal';
  const tintBg = tintBgClassForType(primaryType);
  const idLabel = `#${String(id).padStart(3, '0')}`;
  const source: ImageSourcePropType | undefined =
    spriteSource ?? (spriteUri ? {uri: spriteUri} : undefined);

  return (
    <Pressable onPress={onPress} className="active:opacity-80">
      <Card className="bg-white rounded-2xl p-3 items-center">
        <Text size="xs" className="text-midGrey self-start mb-1">
          {idLabel}
        </Text>
        <Box className={`w-16 h-16 rounded-full items-center justify-center mb-2 ${tintBg}`}>
          {source ? (
            <Image source={source} resizeMode="contain" className="w-12 h-12" alt={name} />
          ) : null}
        </Box>
        <Text bold size="md" className="mb-1.5 text-center">
          {name}
        </Text>
        <Box className="flex-row gap-1 flex-wrap justify-center">
          {types.map(t => (
            <TypeBadge key={t} type={t} />
          ))}
        </Box>
      </Card>
    </Pressable>
  );
}
