// --- Babel for the Jest runs only (bob's babel.config.js is for the library build and lists
// nativewind/babel under `plugins`, but it's a preset). Here it's a preset alongside the RN
// preset: nativewind/babel both sets the JSX import source AND enables cssInterop on the core
// components, which is what actually wires className→style so react-native-css-interop's test
// render can resolve classes to real values. ---
module.exports = {
  presets: ['module:@react-native/babel-preset', 'nativewind/babel'],
};
