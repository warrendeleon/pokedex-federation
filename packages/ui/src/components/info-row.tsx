import React from 'react';
import {Box} from './ui/box';
import {Text} from './ui/text';

// --- A label/value row with a hairline divider, for the detail screen's Info section
// (Height / Weight / Abilities). In the design system so its divider + text token classes are
// host-compiled and apply to the shared primitives from a remote. ---

export interface InfoRowProps {
  label: string;
  value: string;
}

export function InfoRow({label, value}: InfoRowProps) {
  return (
    <Box className="flex-row justify-between py-3.5 border-b border-lightGrey">
      <Text size="sm" className="text-darkGrey">
        {label}
      </Text>
      <Text size="sm" bold className="text-black">
        {value}
      </Text>
    </Box>
  );
}
