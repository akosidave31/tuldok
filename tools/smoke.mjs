// Tuldok checks, run by the GitHub build before the APK is published.
//  1. Writes voice-lines.json: every line the app says (from content.js), for the Colab voice maker,
//     and reports how many lines still need a voice clip.
//  2. Opens the app in headless Chrome (the same engine as the tablet's WebView), plays every
//     activity at every age group, and fails the build on any JavaScript error.
// Run locally (needs Chrome):  npm install --no-save puppeteer-core@24 && node tools/smoke.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = path.join(root, 'app', 'src', 'main', 'assets');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const vkey = (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const report = [];
const problems = [];

function finish() {
  for (const p of problems) console.log(`::error::${p.replace(/\s+/g, ' ')}`);
  const text = report.join('\n\n') + (problems.length
    ? `\n\n**Problems (${problems.length}):**\n` + problems.map((p) => `- ${p}`).join('\n')
    : '\n\nNo problems found.');
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '## Tuldok checks\n\n' + text + '\n');
  process.exit(problems.length ? 1 : 0);
}

function loadScript(file, name) {
  const box = { window: {} };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), box, { filename: name });
  return box.window;
}

// 1. Line list and voice coverage (no browser needed).
const content = loadScript(path.join(assets, 'content.js'), 'content.js').TULDOK_CONTENT;
const lines = Array.from(content.lines());
fs.writeFileSync(path.join(root, 'voice-lines.json'), JSON.stringify(lines, null, 1) + '\n');
const manifestFile = path.join(assets, 'voice', 'manifest.js');
const voice = fs.existsSync(manifestFile) ? loadScript(manifestFile, 'manifest.js').TULDOK_VOICE : null;
const clips = (voice && voice.clips) || {};
const missing = lines.filter((l) => !clips[vkey(l)]);
report.push(`**Voice:** ${lines.length - missing.length} of ${lines.length} spoken lines have clips.` +
  (missing.length ? ` Run the Colab voice maker to record the other ${missing.length} (for example: ${missing.slice(0, 3).join(' / ')}).` : ''));
const lostFiles = Object.keys(clips).map((k) => clips[k]).filter((f) => !fs.existsSync(path.join(assets, 'voice', f)));
if (lostFiles.length) problems.push(`voice/manifest.js lists ${lostFiles.length} clip files that are not in assets/voice, e.g. ${lostFiles[0]}`);

// 2. Play every activity in Chrome.
const chrome = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium-browser', '/usr/bin/chromium']
  .find((p) => p && fs.existsSync(p));
let puppeteer = null;
try { puppeteer = (await import('puppeteer-core')).default; } catch (e) { /* not installed */ }
if (!chrome || !puppeteer) {
  console.log(`::warning::Game test skipped: ${!chrome ? 'no Chrome on this machine' : 'puppeteer-core is not installed'}`);
  report.push('**Game test:** skipped.');
  finish();
}

let browser;
try {
  browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--mute-audio', '--autoplay-policy=no-user-gesture-required', '--allow-file-access-from-files'],
  });
} catch (e) {
  console.log(`::warning::Game test skipped: Chrome would not start (${e.message})`);
  report.push('**Game test:** skipped (Chrome would not start).');
  finish();
}

async function openPage(file, label) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  page.on('pageerror', (e) => problems.push(`${label}: ${(e && e.message) || String(e)}`));
  page.on('dialog', (d) => { d.dismiss().catch(() => {}); });
  await page.evaluateOnNewDocument(() => { window.__tuldokTestLog = []; window.__tuldokFast = true; });
  await page.goto(pathToFileURL(path.join(assets, file)).href, { waitUntil: 'domcontentloaded' });
  await sleep(600);
  return page;
}

const printPage = await openPage('print.html', 'print.html');
await printPage.close();

const unlisted = new Set();
let played = 0;
for (const age of ['nursery', 'prek', 'kinder']) {
  const page = await openPage('index.html', age);
  const started = await page.evaluate(() => !!window.__tuldok);
  if (!started) { problems.push(`${age}: the app did not start`); await page.close(); continue; }
  const acts = await page.evaluate((a) => window.__tuldok.setAge(a), age);
  for (const k of acts) {
    const where = `${age} / ${k}`;
    try {
      await page.evaluate((key) => window.__tuldok.open(key), k);
      await sleep(120);
      for (let i = 0; i < 4; i++) { await page.evaluate(() => window.__tuldok.poke()); await sleep(80); }
      await page.evaluate(() => window.__tuldok.solve());
      await sleep(400);
      await page.evaluate(() => window.__tuldok.solve());
      await sleep(400);
      const banner = await page.evaluate(() => { const e = document.getElementById('err'); return e && !e.hidden ? e.textContent : ''; });
      if (banner) problems.push(`${where}: ${banner}`);
      await page.evaluate(() => window.__tuldok.home());
      played++;
    } catch (e) {
      problems.push(`${where}: ${e.message}`);
    }
  }
  for (const l of await page.evaluate(() => window.__tuldok.unlisted())) unlisted.add(l);
  await page.close();
}
await browser.close();

report.push(`**Game test:** played ${played} activities across 3 age groups in Chrome.`);
if (unlisted.size) {
  report.push(`**Spoken lines missing from content.js lines()** (they can never get a voice clip): ${[...unlisted].slice(0, 12).join(' / ')}`);
  console.log(`::warning::${unlisted.size} spoken lines are missing from content.js lines()`);
}
finish();
