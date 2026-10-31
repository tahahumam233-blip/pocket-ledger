import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking, Platform } from 'react-native';

import type { CapturedImage } from '@/application/receipt-service';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.7,
  allowsEditing: false,
  exif: false,
};

function toCaptured(result: ImagePicker.ImagePickerResult): CapturedImage | null {
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;
  return {
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    fileName: asset.fileName ?? null,
    mimeType: asset.mimeType ?? null,
  };
}

function explainDenied(what: 'camera' | 'photos') {
  const message =
    what === 'camera'
      ? 'Allow camera access in Settings to snap receipts.'
      : 'Allow photo access in Settings to attach receipts.';
  if (Platform.OS === 'web') return;
  Alert.alert('Permission needed', message, [
    { text: 'Not now', style: 'cancel' },
    { text: 'Open Settings', onPress: () => void Linking.openSettings() },
  ]);
}

export async function captureFromCamera(): Promise<CapturedImage | null> {
  if (Platform.OS === 'web') {
    // Opens the camera straight away on iPhone. Must run directly from a tap.
    return toCaptured(
      await ImagePicker.launchCameraAsync({
        ...PICKER_OPTIONS,
        cameraType: ImagePicker.CameraType.back,
      }),
    );
  }
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    explainDenied('camera');
    return null;
  }
  return toCaptured(
    await ImagePicker.launchCameraAsync({
      ...PICKER_OPTIONS,
      cameraType: ImagePicker.CameraType.back,
    }),
  );
}

export async function pickFromLibrary(): Promise<CapturedImage | null> {
  if (Platform.OS === 'ios') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted && permission.accessPrivileges === 'none') {
      explainDenied('photos');
      return null;
    }
  }
  return toCaptured(await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS));
}
