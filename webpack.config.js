const path = require('path');

module.exports = {
  mode: "development",
  devtool: "source-map",
  entry: {
    bundle:   "./client/src/main.tsx",
    login:    "./client/src/auth/login.ts",
    logout:   "./client/src/auth/logout.ts",
    relogin:  "./client/src/auth/relogin.ts",
    register: "./client/src/auth/register.ts",
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