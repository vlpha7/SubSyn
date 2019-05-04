module.exports = {
    entry: './frontend/index.jsx',
    output: {
      path: __dirname + '/javascripts',
      filename: 'bundle.js'
    },
    module: {
        rules: [{
          test: /\.jsx?$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['react']
            }
          }
        }]
      },
};