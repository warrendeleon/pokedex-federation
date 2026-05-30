import React, { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';

import { Box } from './ui/box';
import { Text } from './ui/text';

// --- A transient status message (WCAG 4.1.3 Status Messages): tells a screen-reader user that
// something happened without moving focus. Two mechanisms, because the platforms differ: Android
// reads an accessibilityLiveRegion automatically when its content appears; iOS has no live-region
// equivalent, so we announce imperatively on mount. Sighted users get the pill overlay. The host
// screen mounts this only while the message should show and unmounts it to dismiss. ---

export interface StatusBannerProps {
  message: string;
  /** Pill background colour class. Defaults to the success green. */
  className?: string;
  /** Message text colour class. */
  textClassName?: string;
}

export function StatusBanner({
  message,
  className = 'bg-pokemonGreen',
  textClassName = 'text-black',
}: StatusBannerProps) {
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(message);
  }, [message]);

  return (
    <Box className="absolute left-0 right-0 top-0 items-center px-4 pt-3">
      <Box
        accessible
        accessibilityLiveRegion="polite"
        accessibilityLabel={message}
        className={`rounded-2xl px-5 py-3 ${className}`}
      >
        <Text bold className={textClassName}>
          {message}
        </Text>
      </Box>
    </Box>
  );
}
