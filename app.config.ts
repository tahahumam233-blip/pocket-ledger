import type { ExpoConfig } from 'expo/config';

import brand from './src/config/brand.json';

// Filled in by `eas init` (copy the values it prints into src/config/brand.json),
// or provided through the environment on a build machine.
const easProjectId = process.env.EAS_PROJECT_ID || brand.easProjectId;
const expoOwner = process.env.EXPO_OWNER || brand.expoOwner;
const webBaseUrl = (process.env.WEB_BASE_URL || '').replace(/\/+$/, '');

const config: ExpoConfig = {
  name: brand.name,
  slug: brand.slug,
  ...(expoOwner ? { owner: expoOwner } : {}),
  version: '1.0.0',
  // iPhone only: the web app for the Home Screen, plus an optional native iOS build.
  platforms: ['ios', 'web'],
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: brand.scheme,
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: brand.bundleIdentifier,
    supportsTablet: false,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  web: {
    // A single-page app installs cleanly to the iPhone home screen and works offline.
    output: 'single',
    favicon: './assets/images/favicon.png',
    name: brand.name,
    shortName: 'Ledger',
    description: 'Private two-currency spending tracker that works offline.',
    backgroundColor: brand.colors.splashBackground,
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: brand.colors.splashBackground,
        image: './assets/images/splash-icon.png',
        imageWidth: 120,
        dark: {
          backgroundColor: brand.colors.splashBackgroundDark,
        },
      },
    ],
    'expo-sqlite',
    'expo-localization',
    'expo-sharing',
    '@react-native-community/datetimepicker',
    [
      'expo-notifications',
      {
        // Reminders are scheduled on the phone; no push service is used.
        enableRemoteNotifications: false,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'Pocket Ledger uses your photo library so you can attach receipt and invoice photos to your spending.',
        cameraPermission:
          'Pocket Ledger uses the camera so you can snap receipts and invoices to record later.',
        microphonePermission: false,
      },
    ],
    [
      'expo-local-authentication',
      {
        faceIDPermission: 'Pocket Ledger can use Face ID to lock your ledger from other people.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    // Set when the web app is published under a sub-path, e.g. /pocket-ledger on GitHub Pages.
    ...(webBaseUrl ? { baseUrl: webBaseUrl } : {}),
  },
  ...(easProjectId ? { extra: { eas: { projectId: easProjectId } } } : {}),
};

export default config;
