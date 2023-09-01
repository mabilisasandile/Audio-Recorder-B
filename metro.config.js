
const { getDefaultConfig } = require('expo/metro-config');

// const defaultConfig = getDefaultConfig(__dirname);
// defaultConfig.resolver.sourceExts.push('cjs');

// module.exports = config;

module.exports = async () => {
    const defaultConfig = await getDefaultConfig(__dirname);
    defaultConfig.resolver.sourceExts.push('cjs');
  
    return defaultConfig;
  };