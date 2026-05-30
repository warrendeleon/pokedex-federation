module.exports = {
  preset: '@react-native/jest-preset',
  // @noble/ed25519 (version-map signature verification) ships as ESM. Extend the RN preset's
  // allowlist so Jest transforms it instead of choking on its `export` syntax.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@noble)/)',
  ],
};
