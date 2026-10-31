const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierRecommended = require('eslint-plugin-prettier/recommended');
const globals = require('globals');

module.exports = defineConfig([
  globalIgnores([
    '.expo/**',
    'coverage/**',
    'dist/**',
    'expo-env.d.ts',
    'node_modules/**',
    'android/**',
    'ios/**',
    'public/**',
  ]),
  expoConfig,
  prettierRecommended,
  {
    files: ['scripts/**/*.js', '*.config.js'],
    languageOptions: { globals: globals.node },
  },
]);
