// Expo watches the app and the workspace packages automatically. The bundled scam patterns
// live in /patterns, which isn't a package, so without this Metro keeps serving a stale copy
// of patterns/dist/in.json after it's rebuilt.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, '../../patterns')];

module.exports = config;
