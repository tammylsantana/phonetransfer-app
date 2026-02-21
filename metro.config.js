const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow Metro to bundle HTML files as assets
config.resolver.assetExts.push('html', 'css');

module.exports = config;
