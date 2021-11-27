const path = require('path');

module.exports = {
  mode: "production",
  entry: {
    bundle:   "./client/src/main.tsx",
    login:    "./client/src/login.ts",
    logout:   "./client/src/logout.ts",
    relogin:  "./client/src/relogin.ts",
    register: "./client/src/register.ts",
  },
  output: {
    path: path.resolve(__dirname, './client/public/js/'),
    filename: "[name].js"
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?/,
        use: 'ts-loader'
      }
    ]
  }
};