const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './app/next.js',
  output: {
    filename: 'next.js',
    path: path.resolve(__dirname, 'dist')
  },
  plugins: [
    new CopyWebpackPlugin([
      {
        from: 'app/sw/service-worker.js',
        to: 'service-worker.js'
      }
    ])
  ]
};
