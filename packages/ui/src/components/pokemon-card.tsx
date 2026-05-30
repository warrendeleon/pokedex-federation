import React from 'react';
import {type ImageSourcePropType} from 'react-native';

import {tintBgClassForType} from '../tokens/typeColours';

import {Box} from './ui/box';
import {Card} from './ui/card';
import {Image} from './ui/image';
import {Pressable} from './ui/pressable';
import {Text} from './ui/text';
import {TypeBadge} from './type-badge';

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
  /** When set, a remove (✕) badge is shown in the corner; tapping it runs this, not onPress. */
  onRemove?: () => void;
}

export function PokemonCard({
  id,
  name,
  types,
  spriteUri,
  spriteSource,
  onPress,
  onRemove,
}: PokemonCardProps) {
  const primaryType = types[0] ?? 'normal';
  const tintBg = tintBgClassForType(primaryType);
  const paddedId = String(id).padStart(3, '0');
  const idLabel = `#${paddedId}`;
  const source: ImageSourcePropType | undefined =
    spriteSource ?? (spriteUri ? {uri: spriteUri} : undefined);

  // The whole card is one accessible button, so a screen reader announces this name rather than
  // the concatenated child text. Remove is a custom action on that same element, not a nested
  // button: a Pressable sets accessible=true, which on iOS collapses its descendants, so a child
  // button would be unreachable to VoiceOver. The visual ✕ stays for sighted users but is taken
  // out of the a11y tree (the action covers screen-reader users) with a hitSlop-enlarged target.
  const a11yLabel = `${name}, number ${paddedId}, ${types.join(' and ')} type`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint={onPress ? 'Opens details' : undefined}
      accessibilityActions={onRemove ? [{name: 'remove', label: 'Remove from party'}] : undefined}
      onAccessibilityAction={
        onRemove
          ? event => {
              if (event.nativeEvent.actionName === 'remove') onRemove();
            }
          : undefined
      }
      className="active:opacity-80"
    >
      <Card className="bg-white rounded-2xl p-3 items-center">
        {onRemove ? (
          <Pressable
            onPress={onRemove}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
            hitSlop={10}
            className="absolute top-1.5 right-1.5 z-10 h-6 w-6 rounded-full bg-red items-center justify-center active:opacity-70"
          >
            <Text size="xs" bold className="text-white">
              ✕
            </Text>
          </Pressable>
        ) : null}
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
