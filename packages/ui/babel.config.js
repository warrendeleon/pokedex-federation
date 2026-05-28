// --- Babel config used by react-native-builder-bob when it transpiles src/ into the
// shipped lib/ outputs. The combination here matches what the Re.Pack-bundled consumer
// apps will use at runtime: TypeScript stripped, React JSX transformed via the automatic
// runtime, NativeWind className → style attached via cssInterop, no module-resolution
// rewrites (Bob handles paths). ---

module.exports = {
  presets: [
    ['module:@react-native/babel-preset', {disableImportExportTransform: false}],
  ],
  // --- nativewind/babel is the className plugin; it adds cssInterop calls for primitive
  // RN components. Must come after the RN preset so the JSX is already in a shape the
  // plugin can rewrite. ---
  plugins: ['nativewind/babel'],
};
