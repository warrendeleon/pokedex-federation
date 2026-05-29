import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {getFederationStatus} from './scriptManager';

// --- The operational layer's at-a-glance indicator: which mode the federation booted in and the
// resolved remote versions. Pinned above the tab bar, non-interactive. Colour-codes the mode so a
// demo audience can see at a glance whether remotes came from the dev servers, the CDN (with the
// versions the version-map pinned), or the embedded offline fallback. Plain RN + explicit styles
// on purpose: this is host operational chrome, not part of the @pokedex/ui design system. ---

const MODE_COLOUR: Record<string, string> = {
  dev: '#515151',
  cdn: '#1B6E2E',
  bundled: '#B26A00',
};

export function FederationBanner() {
  const status = getFederationStatus();

  const detail =
    status.mode === 'cdn'
      ? Object.entries(status.versions)
          .map(([name, version]) => `${name.replace(/App$/, '')} ${version}`)
          .join('  ·  ')
      : status.source;

  return (
    <View pointerEvents="none" style={styles.wrap}>
      <View style={[styles.pill, {backgroundColor: MODE_COLOUR[status.mode] ?? '#515151'}]}>
        <Text style={styles.text} numberOfLines={1}>
          ⬢ {status.mode.toUpperCase()} · {detail}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 96,
    alignItems: 'center',
  },
  pill: {
    maxWidth: '92%',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    opacity: 0.95,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
