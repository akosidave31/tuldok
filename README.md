# Tuldok

Touch-screen learning games for Nursery, Pre-K and Kinder, in English, Filipino or both, plus a printable worksheet maker for teachers.

## What's inside

**Games (`app/src/main/assets/index.html`)** for kids on a phone or tablet:

- **Letters, Numbers, Lines, Shapes:** trace with a finger. The game checks that children start at the green dot and follow the arrow, the way handwriting is taught. Wider paths for younger children; Nursery gets big letters only.
- **Count:** tap each picture to count it, then pick how many.
- **Match:** drag a line between pictures, big and small letters, or numbers and dots.
- **What's next?:** finish the pattern.

The app reads instructions aloud with the device's text-to-speech voice and gives stars for finished games.

**For grown-ups:** press and hold the gear on the home screen to change age group, language, sound and voice, or to open the printable worksheet maker (`print.html`). That page can Save, Print or Share PDFs.

## Get the APK

Every push to `main` builds the app with GitHub Actions and publishes it at the same link:

```
https://github.com/OWNER/REPO/releases/latest/download/tuldok.apk
```

Open that link on the phone or tablet, download, and install. If the repo is private, sign in to GitHub in that browser first.

## Project layout

```
app/src/main/assets/index.html          touch games (all game logic and drawing)
app/src/main/assets/print.html          printable worksheet maker
app/src/main/java/ph/tuldok/app/        MainActivity: WebView, voice, save/print/share
.github/workflows/build-apk.yml         builds, signs and publishes the APK
```

## Notes

- **Signing.** The first build creates a test key and keeps it on a pre-release named `signing-key`, so later builds can update the installed app. Anyone who can see the repo can download that key. Before giving the app to schools, switch to a release key stored in GitHub Secrets.
- **Voice.** Uses the device's text-to-speech engine. Filipino needs a Filipino voice installed; if there isn't one, the app falls back to the default voice.
- **Fonts.** Titles use Google Fonts when online and the device font offline. Traced letters are drawn by the app, so they look the same either way.
