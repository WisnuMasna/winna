// Metro config. Extends Expo's defaults to support expo-sqlite on web:
//  - register .wasm as an asset so the wa-sqlite worker can load it
//  - send COOP/COEP headers so SharedArrayBuffer (OPFS) is available in the browser
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('wasm');

config.server = config.server || {};
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  return middleware(req, res, next);
};

module.exports = config;
