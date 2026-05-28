import React from 'react';
import {Center} from './ui/center';
import {Heading} from './ui/heading';
import {Text} from './ui/text';
import {Button, ButtonText} from './ui/button';

// --- Error state with retry. Composed from Gluestack Center + Heading + Text + Button.
// Variant tracks ScreenContainer so dark-themed screens (Party) get a dark error too. ---

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  variant?: 'light' | 'dark';
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Retry',
  variant = 'light',
}: ErrorStateProps) {
  const titleClass = variant === 'dark' ? 'text-white'     : 'text-red';
  const bodyClass  = variant === 'dark' ? 'text-lightGrey' : 'text-darkGrey';
  return (
    <Center className="flex-1 px-6">
      <Heading size="lg" className={`mb-2 ${titleClass}`}>
        {title}
      </Heading>
      {message ? (
        <Text size="sm" className={`text-center mb-4 ${bodyClass}`}>
          {message}
        </Text>
      ) : null}
      {onRetry ? (
        <Button action="primary" size="md" onPress={onRetry}>
          <ButtonText>{retryLabel}</ButtonText>
        </Button>
      ) : null}
    </Center>
  );
}
