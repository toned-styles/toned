module.exports = {
  presets: [
    [
      'module:@react-native/babel-preset',
      {
        enableBabelRuntime: require('@babel/runtime/package.json').version,
      },
    ],
  ],
}
