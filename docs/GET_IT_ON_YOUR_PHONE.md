# Get Pocket Ledger on your phone

There are three ways to run the app on a real phone. Start with the first one; it is free and takes about ten minutes.

| Option                        | Cost                               | Needs a computer?       | Result                                                       |
| ----------------------------- | ---------------------------------- | ----------------------- | ------------------------------------------------------------ |
| 1. Expo Go                    | Free                               | Yes, while running      | Opens inside the Expo Go app. Great for trying it.           |
| 2. Android APK with EAS Build | Free tier                          | Only to start the build | A real app with its own icon, installed from a link.         |
| 3. iPhone install             | Apple developer account ($99/year) | Only to start the build | A real app on an iPhone via TestFlight or an internal build. |

Everything below assumes the project is on your computer:

```sh
git clone <this repository>
cd pocket-ledger
npm install
```

You need [Node.js 22 or newer](https://nodejs.org). On Windows use PowerShell or the Windows Terminal; on macOS use Terminal.

## Option 1: Expo Go (free, fastest)

1. Install **Expo Go** on the phone from the App Store or Google Play. The store version runs the Expo SDK this project uses (SDK 58), which is why the project is kept on the latest SDK.
2. Create a free account at <https://expo.dev/signup>, then on the computer run `npx expo login`. On the phone, open Expo Go and sign in with the same account. iPhones only open projects from a computer signed in to the same account; Android does not require it but it does no harm.
3. Put the phone and the computer on the same Wi-Fi network.
4. Run:
   ```sh
   npx expo start
   ```
5. Scan the QR code shown in the terminal. On iPhone use the Camera app; on Android tap "Scan QR code" inside Expo Go.
6. If the phone cannot connect (guest Wi-Fi, firewalls, mobile data), stop the server and run `npx expo start --tunnel` instead. It is slower but works from anywhere.

Notes for Expo Go:

- The ledger is stored inside Expo Go's sandbox for this project. It persists between sessions as long as you keep Expo Go and open the same project.
- The nightly reminder works in Expo Go (local notifications are supported). On Android it may arrive a few minutes late because Expo Go cannot use exact alarms.
- The app icon and splash screen only appear in a real build (options 2 and 3).

## Option 2: Android APK with EAS Build (free tier)

EAS Build compiles the app in the cloud and gives you a download link. The free plan includes a monthly allowance of builds on a low-priority queue; a build can take 15 to 60 minutes while you wait.

1. Install the EAS command line tool and sign in:
   ```sh
   npm install -g eas-cli
   eas login
   ```
2. Link the project to your Expo account:
   ```sh
   eas init
   ```
   Because this project uses `app.config.ts`, EAS cannot write the project ID automatically. It prints the **project ID** and your **account name**: paste them into `src/config/brand.json` as `easProjectId` and `expoOwner`.
3. Start the build:
   ```sh
   npm run build:android
   ```
   The first time, say **yes** when asked to generate a new Android keystore (EAS stores it for you).
4. When it finishes, open the build page link that is printed (or <https://expo.dev>, Builds). Tap **Install** to show a QR code. Scan it with the phone, download the APK, and allow "Install unknown apps" for your browser when Android asks.
5. Open **Pocket Ledger** from the home screen. Notifications, camera access and the app lock prompt for permission the first time they are used.

Updating later: pull the new code, run `npm run build:android` again and install the new APK over the old one; the data is kept.

## Option 3: iPhone

Apple does not allow installing apps outside the App Store without a developer account, so for an iPhone you have these choices:

- **Expo Go** (Option 1) is the only free route, and it works well for daily use as long as you keep the project around.
- **TestFlight**: join the Apple Developer Program ($99/year), then run `eas build --platform ios --profile production` followed by `eas submit --platform ios`. Add yourself as an internal tester in App Store Connect and install from the TestFlight app.
- **Internal distribution**: with the same developer account, register the iPhone with `eas device:create`, then run `eas build --platform ios --profile preview` and install from the build page link. Enable Developer Mode on the phone when prompted (Settings, Privacy & Security).
- **A Mac with Xcode**: `npx expo run:ios --device` installs directly with a free Apple ID, but the signature expires after seven days and must be rebuilt.

## Troubleshooting

- **"Project is incompatible with this version of Expo Go"**: your Expo Go app and the project are on different SDK versions. Update Expo Go from the store, then run `npm install` again in the project.
- **The QR code opens but the app never loads**: try `npx expo start --tunnel`, and make sure no VPN is active on the phone.
- **Camera or photos are blocked**: allow them in the phone's Settings for Pocket Ledger (or for Expo Go when using Option 1).
- **No reminder arrives**: check that notifications are allowed for the app, that the reminder is switched on in Settings, and that the phone is not in a battery-saver mode that blocks scheduled notifications.
- **Build fails with "android.package"**: keep the `bundleIdentifier` in `src/config/brand.json` as a reverse-domain string such as `com.yourname.pocketledger`. Change it before the first build if you want your own.
