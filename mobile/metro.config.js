const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
// Bump cacheVersion whenever native library changes require fresh Babel
// codegen transforms.
config.cacheVersion = 'v3';
module.exports = config;
