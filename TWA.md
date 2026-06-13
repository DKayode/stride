# Packaging Stride as a Trusted Web Activity (TWA) for Google Play

This guide takes the deployed **Stride** PWA and wraps it as an installable
Android app (`.aab` / `.apk`) using [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap).
Every step is a concrete command — follow it top to bottom.

Replace these placeholders throughout:

| Placeholder | Meaning | Example |
|---|---|---|
| `<YOUR_DOMAIN>` | HTTPS host serving the built PWA | `stride.example.com` |
| `<PACKAGE_NAME>` | Android application id (reverse-DNS, lowercase) | `app.stride.twa` |
| `<SHA256_FINGERPRINT>` | SHA-256 of the signing certificate | `AB:CD:01:…:EF` |

> A TWA is just Chrome rendering your live site full-screen. The app ships **no
> web assets** — it loads `https://<YOUR_DOMAIN>`. So the PWA must be deployed to
> HTTPS first, and Digital Asset Links must verify, or the app shows a browser
> URL bar instead of running full-screen.

---

## 0. Deploy the PWA first

Bubblewrap reads the **live** manifest over HTTPS. Build and deploy before wrapping:

```bash
pnpm build          # outputs dist/ (sw.js + manifest.webmanifest + icons/)
# deploy dist/ to your static host (Netlify, Vercel, Firebase Hosting, S3+CloudFront, …)
```

Verify these URLs return 200 over HTTPS (no redirects):

```bash
curl -I https://<YOUR_DOMAIN>/manifest.webmanifest
curl -I https://<YOUR_DOMAIN>/icons/icon-512.png
curl -I https://<YOUR_DOMAIN>/sw.js
```

Stride's manifest (already produced by `pnpm build`) advertises:

- `name` / `short_name`: **Stride**
- `display`: **standalone**
- `background_color` / `theme_color`: **#0f172a**
- icons: `icons/icon-192.png`, `icons/icon-512.png`, and maskable
  `icons/icon-192-maskable.png`, `icons/icon-512-maskable.png`

---

## 1. Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | ≥ 18 | for the Bubblewrap CLI |
| JDK | **17** | provides `keytool`; Bubblewrap can also install a JDK for you |
| Android SDK | build-tools + platform-tools | Bubblewrap can download these on first run |

```bash
# macOS example (Homebrew)
brew install --cask temurin@17     # JDK 17 (includes keytool)
java -version                      # confirm 17.x

# Install the Bubblewrap CLI
npm install -g @bubblewrap/cli
bubblewrap --version
```

On first `init`/`build`, Bubblewrap offers to download and configure the JDK and
Android SDK into `~/.bubblewrap` — accept this if you don't manage them yourself.

---

## 2. Initialise the TWA project

Run this in an **empty directory** (e.g. `stride-twa/`, separate from this repo):

```bash
mkdir stride-twa && cd stride-twa
bubblewrap init --manifest https://<YOUR_DOMAIN>/manifest.webmanifest
```

Bubblewrap fetches the manifest and prompts for the values below. Answer them to
match Stride (press Enter to accept a shown default when it already matches):

| Prompt | Value |
|---|---|
| Domain | `<YOUR_DOMAIN>` |
| Application ID (package) | `<PACKAGE_NAME>` |
| App name | `Stride` |
| Launcher name | `Stride` |
| Display mode | `standalone` |
| Theme color | `#0f172a` |
| Background color | `#0f172a` |
| Status bar / navigation color | `#0f172a` |
| Start URL | `/` |
| Icon URL | `https://<YOUR_DOMAIN>/icons/icon-512.png` |
| Maskable icon URL | `https://<YOUR_DOMAIN>/icons/icon-512-maskable.png` |
| Include support for shortcuts | optional (Stride defines none) |
| Signing key — create new | `Yes` (see step 3) |

This writes `twa-manifest.json` (template in step 2a) and generates the Android
project.

### 2a. `twa-manifest.json` template

If you prefer to drop in the config directly (then run `bubblewrap update`),
this matches Stride's web manifest:

```json
{
  "packageId": "<PACKAGE_NAME>",
  "host": "<YOUR_DOMAIN>",
  "name": "Stride",
  "launcherName": "Stride",
  "display": "standalone",
  "orientation": "portrait",
  "themeColor": "#0f172a",
  "themeColorDark": "#0f172a",
  "navigationColor": "#0f172a",
  "navigationColorDark": "#0f172a",
  "navigationDividerColor": "#0f172a",
  "backgroundColor": "#0f172a",
  "enableNotifications": false,
  "startUrl": "/",
  "iconUrl": "https://<YOUR_DOMAIN>/icons/icon-512.png",
  "maskableIconUrl": "https://<YOUR_DOMAIN>/icons/icon-512-maskable.png",
  "webManifestUrl": "https://<YOUR_DOMAIN>/manifest.webmanifest",
  "fallbackType": "customtabs",
  "signingKey": {
    "path": "./android.keystore",
    "alias": "android"
  },
  "appVersionName": "1",
  "appVersionCode": 1,
  "shortcuts": [],
  "generatorApp": "bubblewrap-cli"
}
```

---

## 3. Generate a signing key

The signing certificate's SHA-256 fingerprint is what links the app to your
domain (step 5). Create a keystore once and **keep it safe** — losing it means
you can't ship updates.

```bash
keytool -genkeypair \
  -v \
  -keystore android.keystore \
  -alias android \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
# choose a password and record it; it is referenced by twa-manifest.json
```

---

## 4. Build the app

```bash
bubblewrap build
```

Bubblewrap signs the build with the keystore from step 3 and produces, in the
project directory:

- **`app-release-bundle.aab`** — upload **this** to the Google Play Console.
- **`app-release-signed.apk`** — sideload for local testing
  (`adb install app-release-signed.apk`).

Re-run `bubblewrap build` after any `twa-manifest.json` change (bump
`appVersionCode` for each Play upload).

---

## 5. Digital Asset Links (`assetlinks.json`)

This file proves you own both the website and the app, removing the browser URL
bar. It must be hosted on the **same domain** as the PWA.

### 5a. Get the SHA-256 fingerprint

From the local signing key:

```bash
keytool -list -v -keystore android.keystore -alias android | grep "SHA256:"
```

Or let Bubblewrap emit a ready-made `assetlinks.json`:

```bash
bubblewrap fingerprint generateAssetLinks --output assetlinks.json
```

> **Google Play App Signing:** if you enrol in Play App Signing (recommended,
> and default for new apps), Google re-signs your app with a *different* key.
> After uploading, copy the **SHA-256 from Play Console → Setup → App signing**
> and use that fingerprint here. Include **both** your upload key and the Play
> app-signing key fingerprints in the array below so verification works in every
> distribution path.

### 5b. `assetlinks.json` template

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "<PACKAGE_NAME>",
      "sha256_cert_fingerprints": [
        "<SHA256_FINGERPRINT>"
      ]
    }
  }
]
```

To allow both the upload key and the Play app-signing key:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "<PACKAGE_NAME>",
      "sha256_cert_fingerprints": [
        "<SHA256_FINGERPRINT_UPLOAD_KEY>",
        "<SHA256_FINGERPRINT_PLAY_APP_SIGNING_KEY>"
      ]
    }
  }
]
```

### 5c. Host it

Serve the file at **exactly** this path, as `application/json`, over HTTPS with
no redirect:

```
https://<YOUR_DOMAIN>/.well-known/assetlinks.json
```

For this Vite project, place the file at `public/.well-known/assetlinks.json`
so `pnpm build` copies it into `dist/.well-known/assetlinks.json`, then redeploy.

### 5d. Verify

```bash
curl https://<YOUR_DOMAIN>/.well-known/assetlinks.json

# Google's official validator:
# https://developers.google.com/digital-asset-links/tools/generator
```

On-device, confirmation that linking works: launch the installed app — it should
open **full-screen with no URL bar**. If a bar appears, Asset Links failed
(wrong fingerprint, wrong package name, file not reachable, or wrong content-type).

---

## 6. Publish & update

1. Create the app in the [Play Console](https://play.google.com/console) using
   `<PACKAGE_NAME>`.
2. Upload `app-release-bundle.aab` to a testing or production track.
3. If using Play App Signing, update `assetlinks.json` with the Play
   app-signing fingerprint (step 5a) and redeploy the site.
4. For each update: bump `appVersionCode` in `twa-manifest.json`, run
   `bubblewrap build`, upload the new `.aab`.

Because Stride is offline-first (service worker precaches the app shell — 18
entries incl. `index.html`, JS, CSS, manifest and icons), the wrapped app keeps
working without a network connection after first launch.

---

## Quick reference

```bash
# one-time
npm install -g @bubblewrap/cli
bubblewrap init --manifest https://<YOUR_DOMAIN>/manifest.webmanifest
keytool -genkeypair -v -keystore android.keystore -alias android -keyalg RSA -keysize 2048 -validity 10000

# build (repeat per release; bump appVersionCode first)
bubblewrap build

# asset links
keytool -list -v -keystore android.keystore -alias android | grep "SHA256:"
# host JSON at  https://<YOUR_DOMAIN>/.well-known/assetlinks.json
```
