import React from 'react';
import {renderWithTokens, screen} from '../render';
import {Box} from '../../components/ui/box';
import {Text} from '../../components/ui/text';

// Guards the a11y harness: NativeWind must resolve a design-token className to its real style value
// in Jest (via nativewind/test's setupAllComponents + compiled token theme). If this breaks, the
// rendered-style a11y assertions (contrast, touch targets) silently stop seeing styles.
describe('NativeWind token resolution in Jest', () => {
  it('resolves a background token on a Gluestack Box', async () => {
    await renderWithTokens(<Box testID="card" className="bg-navy" />);
    expect(screen.getByTestId('card')).toHaveStyle({backgroundColor: '#0f172a'});
  });

  it('resolves a text-colour token on a Gluestack Text', async () => {
    await renderWithTokens(
      <Text testID="label" className="text-midGrey">
        hello
      </Text>,
    );
    expect(screen.getByTestId('label')).toHaveStyle({color: '#9a9ab0'});
  });
});
