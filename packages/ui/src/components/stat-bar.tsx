import React from 'react';
import {Box} from './ui/box';
import {Text} from './ui/text';
import {bgClassForType} from '../tokens/typeColours';

// --- A single base-stat row: label, a track with a type-coloured fill proportional to the value,
// and the value. Lives in the design system (not the detail remote) so its token classes are
// compiled into the host stylesheet; a remote can't add arbitrary classes to a shared component
// and have them resolve. The fill width is the one inline style: it's a computed percentage with
// no token equivalent (the colour still comes from a token class). ---

export interface StatBarProps {
  label: string;
  value: number;
  /** Pokémon type whose colour fills the bar. */
  colourType: string;
  /**
   * Denominator for the fill fraction. A single base stat can technically reach 255 (Blissey's
   * HP), but almost nothing does, so scaling to 255 leaves every bar looking half-empty. We scale
   * to 200, a practical "elite stat" ceiling: a genuinely strong stat reads as nearly full, the
   * rare 200+ stat clamps to 100% (fair, it is maxed), and the common 40-150 range spreads across
   * a readable 20-75%.
   */
  max?: number;
}

export function StatBar({label, value, colourType, max = 200}: StatBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    // One accessible element so a screen reader announces "Attack, 49" as a value, not three
    // separate text reads. progressbar is the role for a bar showing a magnitude; accessibilityValue
    // carries the spoken number (the visual scaling to `max` is presentation, so we speak the raw
    // value rather than a percentage).
    <Box
      className="flex-row items-center py-2.5"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{text: String(value)}}
    >
      <Text size="sm" className="text-darkGrey w-[72px]">
        {label}
      </Text>
      <Box className="flex-1 h-2 rounded-full bg-lightGrey overflow-hidden mx-3">
        <Box className={`h-full rounded-full ${bgClassForType(colourType)}`} style={{width: `${pct}%`}} />
      </Box>
      <Text size="sm" bold className="text-black w-8 text-right">
        {value}
      </Text>
    </Box>
  );
}
