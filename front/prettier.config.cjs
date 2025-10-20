/**** Prettier config ****/
module.exports = {
  printWidth: 100,
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  tabWidth: 2,
  useTabs: false,
  endOfLine: 'lf',
  plugins: [require('prettier-plugin-tailwindcss')],
};
