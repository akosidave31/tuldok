# Tuldok

Touch-screen learning games for Nursery, Pre-K and Kinder, plus a printable worksheet maker for teachers. English only.

## What's inside

**Games (`app/src/main/assets/index.html`)** for kids on a phone or tablet:

- **Letters, Numbers, Lines, Shapes:** trace with a finger. The game checks that children start at the green dot and follow the arrow, the way handwriting is taught. Wider paths for younger children; Nursery gets big letters only.
- **Count:** tap each picture to count it, then pick how many.
- **Match:** drag a line between pictures, big and small letters, or numbers and dots.
- **What's next?:** finish the pattern.

A cheerful voice reads every instruction aloud, and finished games earn stars.

**For grown-ups:** press and hold the gear on the home screen to change age group, sounds, voice and voice style, or to open the printable worksheet maker (`print.html`). That page can Save, Print or Share PDFs. The menu also shows the installed app version.

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

- **Voice.** Many speech engines ignore pitch settings, so the app renders each line to a sound file with the device's text-to-speech engine and plays it back at a higher pitch. "Jolly" raises the pitch; "Calm" plays it as is.
- **Signing.** The first build creates a test key and keeps it on a pre-release named `signing-key`, so later builds can update the installed app. Anyone who can see the repo can download that key. Before giving the app to schools, switch to a release key stored in GitHub Secrets.
- **Fonts.** Titles use Google Fonts when online and the device font offline. Traced letters are drawn by the app, so they look the same either way.
