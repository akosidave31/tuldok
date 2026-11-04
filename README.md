# Tuldok

Printable preschool worksheets for Nursery, Pre-K and Kinder, in English, Filipino or both.

The worksheet maker is one web page, `app/src/main/assets/index.html`. The Android app shows that page and adds three things the page can't do alone on a phone: **Save PDF** (to Downloads/Tuldok), **Print** (Android's print service: Wi-Fi printers or Save as PDF) and **Share** (Messenger, Viber, Gmail, Drive and so on).

## Get the APK

Every push to `main` builds the app with GitHub Actions and publishes it at the same link:

```
https://github.com/OWNER/REPO/releases/latest/download/tuldok.apk
```

Open that link on the phone or tablet, download, and install. Android will ask you to allow installs from your browser or Files app. If the repo is private, sign in to GitHub in that browser first.

## Change the worksheets

Edit `app/src/main/assets/index.html`, commit and push. The new APK shows up at the same link a few minutes later, and it installs over the old one.

## Project layout

```
app/src/main/assets/index.html          the worksheet maker (all drawing and PDF making)
app/src/main/java/ph/tuldok/app/        MainActivity: WebView + save/print/share bridge
.github/workflows/build-apk.yml         builds, signs and publishes the APK
```

## Notes

- **Signing.** The first build creates a test key and keeps it on a pre-release named `signing-key`, so later builds can update the installed app. Anyone who can see the repo can download that key. Before giving the app to schools, switch to a release key stored in GitHub Secrets.
- **Fonts.** Titles use Google Fonts when the device is online. Offline, the device's own font is used. The traced letters and numbers are drawn by the app, so they look the same either way.
- **Builds.** Android Gradle Plugin 8.5.2, Gradle 8.7, JDK 17, compileSdk/targetSdk 34, minSdk 26 (Android 8.0).
