module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          alias: { "@": "./src" },
          extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
        },
      ],
      // No reanimated/worklets plugin here on purpose. Since SDK 54
      // (Reanimated 4), babel-preset-expo adds `react-native-worklets/plugin`
      // automatically when react-native-worklets is installed. Listing
      // `react-native-reanimated/plugin` here as well would run the same
      // plugin twice.
    ],
  };
};
