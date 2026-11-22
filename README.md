# Tuldok

Touch-screen learning games for Nursery, Pre-K and Kinder, plus a printable worksheet maker for teachers. English only.

## What's inside

**Games (`app/src/main/assets/index.html`)** for kids on a phone or tablet, grouped on the home screen. Each age group sees the games that suit it.

| Section | Game | Ages | What the child does |
|---|---|---|---|
| ✏️ Trace | Letters, Numbers, Lines, Shapes | all | Traces with a finger, starting at the green dot and following the arrow, the way handwriting is taught |
| 🔤 Letters and words | Find the letter | all | Hears "Find the letter M!" and taps it (Kinder also finds small letters) |
| | First sounds | Pre-K, Kinder | "Which one starts with B?" Picks the picture (bee, bus, ball...) |
| | Rhymes | Pre-K, Kinder | "What rhymes with cat?" Picks the hat |
| | First words | Kinder | Reads a short word (cat, sun, bed...) and taps its picture |
| 🔢 Numbers | Count | all | Taps each picture to count, then picks how many |
| | Find the number | all | Hears a number and taps the numeral (1-5, 1-10, 0-20 by age) |
| | More or fewer | all | Taps the group with more (Kinder: also fewer) |
| | Add it up | Pre-K, Kinder | Counts two groups together (sums to 5, Kinder to 10 with the number sentence) |
| 🎨 Colors and shapes | Colors | all | "Find the red balloon!" (4, 8 or 10 colors by age) |
| | Find the shape | all | "Find the triangle!" Shapes come in mixed colors so color is no clue |
| | Coloring | all | Picks a crayon and taps areas to paint 10 pictures |
| | Construction | all | The same coloring book with 6 construction vehicles: excavator, dump truck, bulldozer, crane, cement mixer, road roller |
| 🌏 My world | Listen and find | all | "Where is the carabao?" Animals, fruits, food, vehicles, clothes, body, things |
| | Animal sounds | all | "Who says moo?" |
| | Feelings | all | "Find the sad face!" |
| 🧩  | Match, What's next? | all | Draws lines between pairs; finishes patterns |
| | Memory | all | Flips cards to find pairs (3, 4 or 6 pairs by age) |
| | Odd one out | Pre-K, Kinder | "Which one does not belong?" |

A cheerful recorded voice reads every instruction, wrong answers get a gentle "Try again!" plus the question again,
and after two misses the right answer glows (errorless learning). Finished games earn stars.

**For grown-ups:** press and hold the gear on the home screen to change age group, sounds and voice, see each game's stars,
check how many spoken lines have voice clips, mark lines that sound flat (Voice check) for the Colab voice maker, or open the printable worksheet maker (`print.html`), which can Save, Print or Share PDFs.

## Get the APK

Every push to `main` tests the games, builds the app with GitHub Actions and publishes it at the same link:

```
https://github.com/akosidave31/tuldok/releases/download/latest-build/tuldok.apk
```

In Termux, `bash tools/getapk.sh` waits for the build of your latest commit, downloads it to Downloads and checks it is that build.

## Project layout

```
app/src/main/assets/index.html          touch games: engines for tracing, counting, matching, patterns, quizzes, memory, coloring
app/src/main/assets/content.js          learning content: words, pictures, coloring pages and every spoken line
app/src/main/assets/print.html          printable worksheet maker
app/src/main/assets/voice/              recorded voice clips + manifest.js (made by tools/make_voice.py)
app/src/main/java/ph/tuldok/app/        MainActivity: WebView, voice, save/print/share
tools/smoke.mjs                         build check: plays every game at every age in Chrome; writes voice-lines.json
tools/make_voice.py                     Google Colab script that records every app line with Chatterbox
tools/tuldok_voice.ipynb                the same script as a ready-to-run Colab notebook
tools/getapk.sh, tools/add_voice.sh     Termux helpers: fetch the new APK; add a voice zip and push
.github/workflows/build-apk.yml         tests, builds, signs and publishes the APK
```

## Adding learning content

Words, picture lists, rhymes, first-sound words, colors, coloring pages and the text of every spoken line are in
`content.js`. A quiz game is one `make...()` function in `index.html` that returns a question
(what to say, the answer choices, the right answer, what to say when it is right) plus one line in `ACTS`.
Every spoken line must come from `T` in `content.js` and be listed by `lines()`; the build warns if a game says something that isn't listed.

## Checks on every build

Before the APK is built, `tools/smoke.mjs` opens the app in headless Chrome, plays every activity at all three age groups
(random taps, then the right answers), and stops the build on any JavaScript error, so a broken app is never published.
It also writes `voice-lines.json` (every line the app says) next to the APK and reports how many lines still need voice clips.

## Notes

- **Voice.** "Happy teacher" plays recorded clips made in Google Colab with [Chatterbox](https://github.com/resemble-ai/chatterbox) (MIT License; clips carry Resemble AI's inaudible watermark). Its exaggeration setting gives the lines real feeling. Open [tools/tuldok_voice.ipynb in Colab](https://colab.research.google.com/github/akosidave31/tuldok/blob/main/tools/tuldok_voice.ipynb): it downloads the newest `voice-lines.json` and records only lines that have no clip yet. Then `bash tools/add_voice.sh` in Termux adds the zip to the app. A line without a clip, and the "Calm" style, use the tablet's own speech engine, rendered to a sound file and played back at a set pitch, because many engines ignore pitch settings.
- **Signing.** The first build creates a test key and keeps it on a pre-release named `signing-key`, so later builds can update the installed app. Anyone who can see the repo can download that key. Before giving the app to schools, switch to a release key stored in GitHub Secrets.
- **Fonts.** Titles use Google Fonts when online and the device font offline. Traced letters are drawn by the app, so they look the same either way.
- **Emoji.** Pictures are emoji that Android 10 can show (Emoji 12 or older).
