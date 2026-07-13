const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = defineConfig([
  globalIgnores(['.expo/**', 'coverage/**', 'dist/**', 'expo-env.d.ts', 'node_modules/**']),
  expoConfig,
  prettierRecommended,
]);
