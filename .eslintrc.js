module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    sourceType: 'module',
    ecmaVersion: 2020,
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
    'airbnb-base',
    'airbnb-typescript/base',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
    es2020: true,
  },
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/indent': 'off',
    'import/prefer-default-export': 'off',
    'implicit-arrow-linebreak': 'off',
    'object-curly-newline': 'off',
    '@typescript-eslint/no-unused-vars': 1,
    'no-confusing-arrow': 0,
    'function-paren-newline': 0,
    'class-methods-use-this': 0,
    'max-classes-per-file': 0,
    '@typescript-eslint/ban-ts-comment': 1,
    'operator-linebreak': 0,
    'import/extensions': 0,
    'no-underscore-dangle': 0,
    '@typescript-eslint/no-namespace': [ 2, { 'allowDeclarations': true }],
    'max-len': [2, { 'ignoreComments': true }],
    'consistent-return': [2, { 'treatUndefinedAsUnspecified': true }],
    'consistent-return': 0
  },
};
