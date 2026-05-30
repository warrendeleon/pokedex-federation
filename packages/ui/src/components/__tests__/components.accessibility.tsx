import React from 'react';
import {renderWithTokens, screen, fireEvent} from '../../test-utils/render';
import {
  expectAccessibilityProps,
  expectCanReceiveFocus,
  expectHeading,
  expectImageAccessible,
  expectLabelMatchesVisibleText,
  expectLiveRegionContent,
  expectNonColourCue,
  expectScalableText,
} from '@pokedex/a11y-testing';
import {PokemonCard} from '../pokemon-card';
import {TypeBadge} from '../type-badge';
import {StatBar} from '../stat-bar';
import {StatusBanner} from '../status-banner';
import {Heading} from '../ui/heading';
import {Text} from '../ui/text';

// --- Component-level WCAG assertions. Each describe is tagged with its success criterion so the
// accessibility-report reporter can map it. These exercise the real design-system components, so a
// regression that strips an accessible name or role fails the build. Criteria that depend on the
// rendered native tree (contrast as drawn, focus order in practice) are covered by the native audit
// and stay out of here, the report marks them honestly rather than faking them as automated. ---

describe('WCAG 1.1.1 - Non-text Content', () => {
  it('the card sprite exposes the Pokemon name as its accessible text', async () => {
    await renderWithTokens(
      <PokemonCard id={1} name="Bulbasaur" types={['grass']} spriteUri="sprite://1" onPress={() => {}} />,
    );
    expectImageAccessible(screen.getByLabelText('Bulbasaur'));
  });
});

describe('WCAG 1.3.1 - Info and Relationships', () => {
  it('Heading carries the header role so structure is programmatic', async () => {
    await renderWithTokens(<Heading size="lg">Base stats</Heading>);
    expectHeading(screen.getByText('Base stats'));
  });
});

describe('WCAG 1.4.1 - Use of Color', () => {
  it('a type is conveyed by its name, not colour alone', async () => {
    await renderWithTokens(<TypeBadge type="fire" />);
    expectNonColourCue(screen.getByText('fire'));
  });

  it('a stat value is shown as a number, not only by bar length', async () => {
    await renderWithTokens(<StatBar label="Attack" value={49} colourType="grass" />);
    // The numeric value is the non-colour cue: present as text even if the bar were invisible.
    expect(screen.getByText('49')).toBeTruthy();
    expectNonColourCue(screen.getByText('Attack'));
  });
});

describe('WCAG 1.4.4 - Resize Text', () => {
  it('body text does not disable font scaling', async () => {
    await renderWithTokens(<Text>Bulbasaur</Text>);
    expectScalableText(screen.getByText('Bulbasaur'));
  });
});

describe('WCAG 2.4.3 - Focus Order', () => {
  it('the card is a single focusable element a screen reader can land on', async () => {
    await renderWithTokens(
      <PokemonCard id={1} name="Bulbasaur" types={['grass']} onPress={() => {}} />,
    );
    expectCanReceiveFocus(screen.getByRole('button'));
  });
});

describe('WCAG 2.5.3 - Label in Name', () => {
  it("the card's accessible name contains its visible name", async () => {
    await renderWithTokens(
      <PokemonCard id={1} name="Bulbasaur" types={['grass', 'poison']} onPress={() => {}} />,
    );
    expectLabelMatchesVisibleText(screen.getByRole('button'), 'Bulbasaur');
  });
});

describe('WCAG 4.1.2 - Name, Role, Value', () => {
  it('the card exposes a button role and an accessible name', async () => {
    await renderWithTokens(
      <PokemonCard id={1} name="Bulbasaur" types={['grass', 'poison']} onPress={() => {}} />,
    );
    expectAccessibilityProps(screen.getByRole('button'), {role: 'button', label: true});
  });

  it('remove is reachable as a custom action, not a collapsed nested button', async () => {
    const onRemove = jest.fn();
    await renderWithTokens(
      <PokemonCard id={1} name="Bulbasaur" types={['grass']} onRemove={onRemove} />,
    );
    const card = screen.getByRole('button');
    expect(card.props.accessibilityActions).toEqual([{name: 'remove', label: 'Remove from party'}]);
    fireEvent(card, 'accessibilityAction', {nativeEvent: {actionName: 'remove'}});
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('a stat bar exposes its value through the progressbar role', async () => {
    await renderWithTokens(<StatBar label="Attack" value={49} colourType="grass" />);
    const bar = screen.getByRole('progressbar');
    expectAccessibilityProps(bar, {role: 'progressbar', label: 'Attack'});
    expect(bar.props.accessibilityValue).toEqual({text: '49'});
  });
});

describe('WCAG 4.1.3 - Status Messages', () => {
  it('the added-to-party banner is a live region with content', async () => {
    await renderWithTokens(<StatusBanner message="Bulbasaur added to your party" />);
    expectLiveRegionContent(screen.getByLabelText('Bulbasaur added to your party'));
  });
});
