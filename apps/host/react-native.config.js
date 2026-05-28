// --- Wires Re.Pack into the React Native CLI so `react-native start` and `react-native bundle`
// use Rspack via rspack.config.mjs instead of Metro via metro.config.js. ---
module.exports = {
  commands: require('@callstack/repack/commands/rspack'),
};
