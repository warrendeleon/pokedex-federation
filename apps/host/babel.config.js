module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // --- NativeWind's JSX runtime. The repack-plugin-nativewind handles the SWC side of the
  // className→style transform for the bundler, but the automatic-runtime importSource is still
  // needed so JSX compiles against nativewind's jsx-runtime. react-native-worklets/plugin is
  // required by reanimated 4 (worklet directive transform); it must be listed last. ---
  plugins: [
    [
      '@babel/plugin-transform-react-jsx',
      {runtime: 'automatic', importSource: 'nativewind'},
    ],
    'react-native-worklets/plugin',
  ],
};
