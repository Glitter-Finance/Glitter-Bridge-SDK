const NodePolyfillPlugin = require('node-polyfill-webpack-plugin')

module.exports = function override(config, env) {
  config.resolve.fallback = {
    readline: require.resolve('readline'),
    fs: require.resolve('browserify-fs'),
    console: require.resolve('console-browserify')
  }
  config.plugins.push(new NodePolyfillPlugin({ 
    excludeAliases: ['console'],
   }))
  return config
}