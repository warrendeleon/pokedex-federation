import React from 'react';

import {Center} from './ui/center';
import {Spinner} from './ui/spinner';
import {Text} from './ui/text';

// --- Centred spinner with an optional caption. Composed from Gluestack Center + Spinner +
// Text. Variant: 'light' tints the spinner blue against an off-white screen; 'dark' tints it
// white against the navy Party tab background. ---

export interface LoadingStateProps {
  caption?: string;
  variant?: 'light' | 'dark';
}

export function LoadingState({caption, variant = 'light'}: LoadingStateProps) {
  const spinnerClass     = variant === 'dark' ? 'text-white'     : 'text-blue';
  const captionClass     = variant === 'dark' ? 'text-lightGrey' : 'text-darkGrey';
  return (
    <Center className="flex-1">
      <Spinner size="large" className={spinnerClass} />
      {caption ? (
        <Text size="sm" className={`mt-3 ${captionClass}`}>
          {caption}
        </Text>
      ) : null}
    </Center>
  );
}
