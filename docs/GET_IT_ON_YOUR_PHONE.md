# Get Pocket Ledger on your phone

| Phone              | Best option                            | Cost                              | Needs a computer?       |
| ------------------ | -------------------------------------- | --------------------------------- | ----------------------- |
| iPhone             | Install the web app on the Home Screen | Free                              | No                      |
| iPhone, native app | TestFlight or internal build           | Apple Developer Program, $99/year | Only to start the build |

## iPhone: the Home Screen web app (recommended)

The web app is the same Pocket Ledger with the same screens. Installed on the Home Screen it opens full screen with its own icon, works offline and keeps everything on the phone. You never need Expo or a computer to use it.

### Step 1: publish it once (about five minutes, can be done from the phone)

The app is published by GitHub Pages, straight from this repository.

1. Merge the latest code into the `main` branch.
2. Choose how to host it:
   - **Simplest: make the repository public.** On github.com open the repository, then Settings, General, Danger Zone, Change visibility, Public. Only the code becomes visible. Your entries and photos never leave your iPhone. GitHub Pages is free only for public repositories on a free account.
   - **To keep the code private:** use Cloudflare Pages (free). Create an account, choose Workers & Pages, Create, Pages, Connect to Git, pick this repository, set the build command to `npm run build:web` and the output directory to `dist`. Your address will end in `pages.dev`.
3. For GitHub Pages: Settings, Pages, Build and deployment, Source: **GitHub Actions**.
4. Open the Actions tab, choose **Publish iPhone web app** and press **Run workflow**. It also runs on every push to `main`.
5. When it finishes, the address is shown on the run page. For this repository it is:
   `https://tahahumam233-blip.github.io/pocket-ledger/`

### Step 2: install it on the iPhone

1. Open the address in **Safari**.
2. The app shows a short guide. Tap the **Share** button (the square with an arrow; on newer iOS tap **•••** first), then **Add to Home Screen**. Keep **Open as Web App** switched on and tap **Add**.
3. Open **Ledger** from the Home Screen and complete setup there, not in the Safari tab. The installed app and Safari keep separate storage.
4. On the reminder step, tap **Add reminder to Calendar**, then **Add to Calendar**. Each evening the Calendar alert reminds you to record your spending, even with the app closed.

### Keep a backup

Because nothing is stored in the cloud, removing the icon from the Home Screen deletes the ledger. Once in a while open Settings, tap **Back up now**, then **Save to Files** and pick iCloud Drive. The file contains every entry and receipt photo. To move to a new phone or recover, install the app again and tap **Restore from a backup instead** on the first screen, or **Restore from backup** in Settings. Home shows a reminder when a month has passed without a backup.

### Updates

Every publish updates the app automatically. The new version loads the next time you open it from the Home Screen; if you just published, close and reopen it once.

### What differs from a native app

- The nightly reminder is a Calendar alert rather than an app notification, because iPhone web apps cannot schedule notifications without a server.
- Face ID app lock is not available in the web app.
- Receipt photos are shrunk to a sensible size (2000 pixels on the long side) when saved.

## iPhone: native app (paid)

With the Apple Developer Program you can build a native iPhone app that adds Face ID lock and real notifications. First run `npm install -g eas-cli`, `eas login` and `eas init`; because this project uses `app.config.ts`, paste the printed project ID and account name into `src/config/brand.json` as `easProjectId` and `expoOwner`. Then:

- **TestFlight:** `eas build --platform ios --profile production`, then `eas submit --platform ios`, add yourself as an internal tester in App Store Connect and install from the TestFlight app.
- **Internal distribution:** register the phone with `eas device:create`, run `npm run build:ios` and install from the build page link. Enable Developer Mode when asked.

## Trying the app during development

`npx expo start` and the Expo Go app remain available for quick testing, but they are not needed to use the app.

## Troubleshooting

- **The web app shows an old version:** close it from the app switcher and open it again.
- **The reminder did not appear:** open Calendar and check that the event "Record today's spending" exists with an alert, and that Calendar notifications are allowed in Settings, Notifications, Calendar.
- **Camera does not open:** allow camera access for Safari websites in Settings, Apps, Safari, Camera.
- **"Add to Home Screen" is missing:** make sure the address is open in Safari itself, not inside another app's browser.
