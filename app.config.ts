import type { ExpoConfig } from 'expo/config';

import brand from './src/config/brand.json';

// Filled in by `eas init` (copy the values it prints into src/config/brand.json),
// or provided through the environment on a build machine.
const easProjectId = process.env.EAS_PROJECT_ID || brand.easProjectId;
const expoOwner = process.env.EXPO_OWNER || brand.expoOwner;

const config: ExpoConfig = {
  name: brand.name,
  slug: brand.slug,
  ...(expoOwner ? { owner: expoOwner } : {}),
  version: '1.0.0',
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
  android: {
    package: brand.bundleIdentifier,
    adaptiveIcon: {
      backgroundColor: brand.colors.splashBackground,
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
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
        icon: './assets/images/notification-icon.png',
        color: brand.colors.primary,
        defaultChannel: 'reminders',
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
  },
  ...(easProjectId ? { extra: { eas: { projectId: easProjectId } } } : {}),
};

export default config;
