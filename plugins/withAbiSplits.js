const { withAppBuildGradle } = require('@expo/config-plugins');

const withAbiSplits = (config) => {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.contents.includes('splits {')) {
      return config;
    }
    config.modResults.contents = config.modResults.contents.replace(
      /android \{/,
      `android {
    splits {
        abi {
            reset()
            enable true
            universalApk false
            include "arm64-v8a", "armeabi-v7a"
        }
    }`
    );
    return config;
  });
};

module.exports = withAbiSplits;
