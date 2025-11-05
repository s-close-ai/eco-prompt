module.exports = {
    plugins: {
      autoprefixer: {},
      'postcss-pxtorem': {
        rootValue: 14,
        propList: ['*'],
        minPixelValue: 0,
        mediaQuery: true,
      },
    },
  };