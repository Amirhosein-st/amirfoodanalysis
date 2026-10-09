# Rima Food Tracker — Android TWA

This Android app opens **https://amirhosein-st.github.io/amirfoodanalysis/** using a Trusted Web Activity. It uses the existing Rima logo, green theme, dark splash screen, and portrait orientation. The web app and backend continue to run on their existing services.

| Setting | Value |
| --- | --- |
| Application ID | `io.github.amirhosein_st.amirfoodanalysis.twa` |
| Launcher label | Rima |
| Version | 1.0.0 (code 1) |
| Minimum Android | Android 6.0 / API 23 |
| Compile / target SDK | Android 15 / API 35 |
| Android Gradle plugin | 8.13.0 |
| Gradle | 8.14.3 |
| Android Browser Helper | 2.5.0 (compatible with SDK 35) |

## Build on Windows

Install JDK 17, Android SDK Platform 35, and Build Tools 35.0.0 through Android Studio. Set `JAVA_HOME` to your JDK directory. The build script detects the usual SDK location at `%LOCALAPPDATA%\Android\Sdk`; for another location, set `ANDROID_HOME` or configure `local.properties`. It also uses the Windows system HTTP proxy when configured, so Gradle follows the same network route as Windows apps.

From PowerShell:

```powershell
Set-Location 'H:\amir food analysis\amirfoodanalysis\TWA'
npm ci
npm run build
```

The Android source and Gradle wrapper are included. Building does not require regenerating the project. The script creates a release signing key if needed, builds both artifacts, and runs Android release lint:

- `output/rima-release.apk` — signed APK to install directly on Android.
- `output/rima-release.aab` — signed Android app bundle for distribution.
- `app/build/reports/lint-results-release.html` — Android lint report.

To build a debug APK instead:

```powershell
npm run build:debug
```

This produces `output/rima-debug.apk`. Debug builds use a different signing certificate; the supplied verification file authorizes the release APK.

If Google's download server returns 404 for Android library archives on your connection, use the optional Aliyun Google Maven mirror:

```powershell
npm run build:mirror
```

This is the command that successfully built the supplied APK and app bundle on this computer.

The mirror option affects dependency downloads during the build. The installed app continues to open your GitHub Pages URL. The default build uses Google's repository and Maven Central. For Android Studio, the equivalent Gradle option is `-PrimaGoogleMavenRepository=https://maven.aliyun.com/repository/google`.

You can also open this `TWA` directory in Android Studio. Run `npm run setup-signing` before building a signed release for the first time.

## Enable fullscreen mode on GitHub Pages

The app needs this exact public URL to verify ownership:

**https://amirhosein-st.github.io/.well-known/assetlinks.json**

At project creation this URL returned HTTP 404. Until it serves the matching certificate, the app opens the site with a browser toolbar. This is the normal verification fallback.

The prepared files are:

```text
website/
  .nojekyll
  .well-known/
    assetlinks.json
```

1. Use the GitHub user-site repository named **Amirhosein-st.github.io**, creating it if needed.
2. Copy `website/.well-known/assetlinks.json` into `.well-known/assetlinks.json` at that repository's publishing root. Merge the entry into any existing asset-links array rather than replacing other apps' entries.
3. Copy the empty `website/.nojekyll` file to the publishing root so GitHub Pages serves `.well-known`.
4. Enable GitHub Pages for the branch/folder containing those files. If the user site already has a build workflow, include both files in its published output.
5. Check the exact verification URL returns HTTP 200 with JSON content and no redirect. Reopen the installed release app after Chrome has refreshed verification.

Publishing under `https://amirhosein-st.github.io/amirfoodanalysis/.well-known/assetlinks.json` does **not** verify this origin. The root user site and the `/amirfoodanalysis/` project site can coexist; the app keeps opening the project URL.

```powershell
npm run verify
```

This checks the launch URL, web manifest, icon, local package/certificate configuration, and hosted verification file. `PENDING domain verification` means the app is built but the domain setup remains incomplete.

For Google Play App Signing, add the **app signing** certificate SHA-256 from Play Console to `fingerprints` in `twa-manifest.json` before running `npm run setup-signing`. Keep the local release fingerprint if you also distribute the APK directly. The script refreshes the local fingerprint while preserving additional fingerprints.

## Signing key and updates

The signing script generates `rima-release.jks` and `keystore.properties` locally. **Back up both files together in a private location.** They are excluded from Git, as are SDK paths and build outputs. The properties file contains the generated password; it is never printed by the scripts.

Keep the same key and application ID for future app updates. Increase `appVersionCode` and update `appVersion` in `twa-manifest.json`, then regenerate and rebuild:

```powershell
npm run generate
npm run build
```

`npm run generate` uses Google's pinned Bubblewrap core package to regenerate the Android sources and icon/splash sizes. It also reapplies this project's SDK, maintained Maven repositories, and local signing configuration. It overwrites generated Android files, so make persistent Android customizations in `scripts/generate.cjs`.

The website can be updated independently; a new APK is needed when native configuration, icons, signing, or app version changes. The website's existing service worker controls offline behavior. Web camera, uploads, authentication, and permissions continue to use the browser's web APIs.

## Branded start screen

The website shows the Rima logo, app name, and animated loading dots before JavaScript loads and while authentication or page data is loading. There is no loading message at the bottom. It transitions to the normal page as soon as loading completes. The shared React component is `src/components/StartScreen.tsx`; its styles and the matching initial HTML are in the project's root `index.html`.

Publish the website update from the main project directory with `npm run deploy`. The installed TWA then receives the updated screen from GitHub Pages; rebuilding or reinstalling the APK is not required for this web change. If the old screen remains after publishing, close and reopen the app so its service worker can finish updating.

The web build, TypeScript check, and startup component lint passed. Browser checks covered the screen before JavaScript loads, phone and landscape layouts, reduced motion, delayed authentication, delayed home data, and the transition into the signed-in home page.

Android release 1.0.1 (version code 2) accompanies the updated website. The existing installed TWA also receives the website change automatically after its service worker updates.

## Validation

The release APK and app bundle were built successfully. Android release lint completed with zero errors and ten warnings concerning generated resources, portrait orientation, themed icons, and a newer Gradle release. Both artifact signatures were verified, and the APK certificate matches the supplied `assetlinks.json` fingerprint. The live website, icon, and web manifest returned HTTP 200. No Android device was connected for runtime testing.

Domain verification remains pending: the required root `assetlinks.json` URL returned HTTP 404. Follow the GitHub Pages steps above to remove the browser toolbar.

## References

- [Google Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap)
- [Trusted Web Activity quick start](https://developer.chrome.com/docs/android/trusted-web-activity/quick-start)
- [Digital Asset Links hosting requirements](https://developer.android.com/training/app-links/configure-assetlinks)
