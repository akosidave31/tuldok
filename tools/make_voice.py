"""
Tuldok voice maker: records every line the kid app says, with feeling, using an open voice model.
Run it in Google Colab with a GPU (Runtime > Change runtime type > T4 GPU).

Easiest: open tools/tuldok_voice.ipynb in Colab (it contains this script and all the steps).
By hand:
  Cell 1:  !pip install -q chatterbox-tts torchvision==0.21.0
           import os; os.kill(os.getpid(), 9)   # restarts Colab so the new packages load ("session crashed" is expected)
  Cell 2:  !wget -q -O make_voice.py https://raw.githubusercontent.com/akosidave31/tuldok/main/tools/make_voice.py
           %run -i make_voice.py --sample      # 6 test lines, plays them right here
  Cell 3:  %run -i make_voice.py               # all lines -> /content/tuldok-voice.zip (downloads it)
  (-i keeps the loaded model between runs, so later runs start faster)

Options:
  --exag 0.9          feeling: 0.5 plain, 0.9 happy (default), 1.3 very excited (too high can get shaky)
  --cfg 0.35          pace: lower = slower and more careful, 0.5 = model default
  --voice x.wav       copy a real person's voice from a 10-20 second clean WAV (only with that person's permission)
  --only "text"       remake only the lines containing this text, with a new take, e.g. --only "letter A"
  --fix "OLD=>NEW"    change how a word is read, e.g. --fix "letter A!=>letter Ay!" (repeatable)
  --engine kokoro     use Kokoro-82M instead (calmer, no feeling control). First run:
                      !pip install -q kokoro soundfile  and  !apt-get -qq install espeak-ng
  --kvoice af_heart   Kokoro voice name

  --out DIR           where clips are kept (default /content/tuldok-voice; the notebook can use Google Drive)
  --lines FILE|URL    the line list (default: voice-lines.json from the newest GitHub build)

Running it again continues where it stopped (finished clips are kept).
Output: DIR.zip (default /content/tuldok-voice.zip) holding voice/*.mp3 and voice/manifest.js.
Unzip it into app/src/main/assets/ of the tuldok repo.

The list of lines comes from the newest GitHub build (voice-lines.json, made from content.js),
so after adding words or games: push, wait for the build, and run this again; only new lines are recorded.
A line without a clip falls back to the tablet voice; the grown-ups menu shows how many lines have clips.
"""
import argparse, contextlib, datetime, hashlib, io, json, os, random, re, subprocess, time, zipfile

import numpy as np
from scipy.io import wavfile

ap = argparse.ArgumentParser()
ap.add_argument('--sample', action='store_true')
ap.add_argument('--engine', default='chatterbox', choices=['chatterbox', 'kokoro'])
ap.add_argument('--exag', type=float, default=0.9)
ap.add_argument('--cfg', type=float, default=0.35)
ap.add_argument('--voice', default='')
ap.add_argument('--kvoice', default='af_heart')
ap.add_argument('--only', default='')
ap.add_argument('--fix', action='append', default=[])
ap.add_argument('--seed', type=int, default=7)
ap.add_argument('--out', default='/content/tuldok-voice')
ap.add_argument('--lines', default='')
args, _ = ap.parse_known_args()

# ---------------- every line the app says ----------------
# The GitHub build exports it from app/src/main/assets/content.js and publishes it next to the APK,
# so this script always records exactly what the newest app says.
LINES_URL = 'https://github.com/akosidave31/tuldok/releases/download/latest-build/voice-lines.json'
SAMPLE = ["Hi there! Let's play!", "Let's trace big letter A! A is for apple!", 'Yay! Great job!',
          'How many butterflies did you count?', 'Three!', "Oops! Let's count again!"]


def load_lines():
    src = args.lines or LINES_URL
    try:
        if re.match(r'https?://', src):
            import urllib.request
            req = urllib.request.Request(src, headers={'User-Agent': 'tuldok-voice-maker'})
            with urllib.request.urlopen(req, timeout=60) as r:
                data = json.loads(r.read().decode('utf-8'))
        else:
            with open(src) as fh:
                data = json.load(fh)
    except Exception as e:
        raise SystemExit(f'Could not read the line list from {src}: {e}\n'
                         'Push the app, wait until the GitHub build finishes, then run this again.')
    seen, out = set(), []
    for t in data:
        if isinstance(t, str) and key(t) and key(t) not in seen:
            seen.add(key(t))
            out.append(t)
    print(f'Line list: {len(out)} lines from {src}', flush=True)
    return out


def key(t):  # same rule as vkey() in the app: lowercase, punctuation becomes one space
    return re.sub(r'[^a-z0-9]+', ' ', t.lower()).strip()


def fname(k):
    return re.sub(r' +', '-', k)[:40].strip('-') + '-' + hashlib.md5(k.encode()).hexdigest()[:6] + '.mp3'


FIXES = [f.split('=>', 1) for f in args.fix if '=>' in f]


def spoken(text):
    for old, new in FIXES:
        text = text.replace(old, new)
    return text


# ---------------- voice engines ----------------
def load_engine():
    import torch
    dev = 'cuda' if torch.cuda.is_available() else 'cpu'
    if dev == 'cpu':
        print('!! No GPU. Use Runtime > Change runtime type > T4 GPU, or this will be very slow.', flush=True)
    # With "%run -i" this lives in the notebook, so the model loads once per session.
    cache = globals().setdefault('_tuldok_engines', {})
    if args.engine == 'kokoro':
        ck = ('kokoro', dev)
        if ck not in cache:
            from kokoro import KPipeline
            cache[ck] = KPipeline(lang_code='a', device=dev)
        pipe = cache[ck]

        def gen(text, seed):
            parts = [a for _, _, a in pipe(text, voice=args.kvoice, speed=0.95)]
            parts = [p.detach().cpu().numpy() if hasattr(p, 'detach') else np.asarray(p) for p in parts]
            return np.concatenate(parts).astype(np.float32), 24000
        return gen, f'Kokoro-82M ({args.kvoice}, Apache 2.0)'

    ck = ('chatterbox', dev, args.voice)  # a copied voice changes the model's state, so it gets its own load
    if ck not in cache:
        cache.clear()
        if dev == 'cuda':
            torch.cuda.empty_cache()
        from chatterbox.tts import ChatterboxTTS
        print('Loading Chatterbox (first time downloads about 2-3 GB)...', flush=True)
        cache[ck] = ChatterboxTTS.from_pretrained(device=dev)
    model = cache[ck]

    def gen(text, seed):
        torch.manual_seed(seed)
        random.seed(seed)
        np.random.seed(seed % (2 ** 32))
        kw = dict(exaggeration=args.exag, cfg_weight=args.cfg)
        if args.voice:
            kw['audio_prompt_path'] = args.voice
        with torch.inference_mode(), contextlib.redirect_stderr(io.StringIO()):
            wav = model.generate(text, **kw)
        return wav.squeeze().detach().cpu().numpy().astype(np.float32), model.sr
    return gen, f'Chatterbox by Resemble AI (MIT), exaggeration {args.exag}, cfg {args.cfg}' + (', cloned voice' if args.voice else '')


# ---------------- clean-up: trim silence, even loudness, soft edges ----------------
def tidy(x, sr):
    x = np.nan_to_num(np.asarray(x, dtype=np.float32))
    if x.size < sr // 10:
        return None
    win = max(1, int(sr * 0.02))
    env = np.convolve(np.abs(x), np.ones(win) / win, mode='same')
    thr = max(env.max() * 0.05, 1e-4)
    on = np.where(env > thr)[0]
    if on.size == 0:
        return None
    s, e = max(0, on[0] - int(sr * 0.04)), min(x.size, on[-1] + int(sr * 0.15))
    y = x[s:e].copy()
    f = min(int(sr * 0.012), y.size // 4)
    if f > 0:
        ramp = np.linspace(0, 1, f, dtype=np.float32)
        y[:f] *= ramp
        y[-f:] *= ramp[::-1]
    voiced = y[env[s:e] > thr]
    rms = float(np.sqrt(np.mean(voiced ** 2))) if voiced.size else float(np.sqrt(np.mean(y ** 2)))
    g = min(10 ** (-17 / 20) / max(rms, 1e-6), 0.95 / max(float(np.abs(y).max()), 1e-6))
    return y * g


def length_ok(text, secs):
    w = max(1, len(re.findall(r"[A-Za-z0-9']+", text)))
    lo, hi = 0.2 * w, 0.6 * w + 1.4
    return lo <= secs <= hi, (lo + hi) / 2


def make_clip(gen, text, seed):
    best = None
    for take in range(4):  # a take that is far too long/short (babbling, cut off) is redone
        x, sr = gen(spoken(text), seed + 101 * take)
        y = tidy(x, sr)
        if y is None:
            continue
        ok, mid = length_ok(text, y.size / sr)
        if ok:
            return y, sr, take
        if best is None or abs(y.size / sr - mid) < abs(best[0].size / best[1] - mid):
            best = (y, sr)
    if best is None:
        raise RuntimeError('no audio for: ' + text)
    return best[0], best[1], 9


def save_mp3(y, sr, path):
    tmp = path[:-4] + '.wav'
    wavfile.write(tmp, sr, np.clip(y * 32767, -32768, 32767).astype(np.int16))
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-ac', '1', '-codec:a', 'libmp3lame',
                    '-b:a', '64k', path], check=True)
    os.remove(tmp)


# ---------------- run ----------------
def main():
    full = SAMPLE if args.sample else load_lines()
    lines = full
    root = '/content/tuldok-sample' if args.sample else args.out
    vdir = os.path.join(root, 'voice')
    os.makedirs(vdir, exist_ok=True)
    only = args.only.lower()
    todo = []
    for t in lines:
        p = os.path.join(vdir, fname(key(t)))
        if only:
            if only in t.lower():
                todo.append(t)
        elif args.sample or not os.path.exists(p):
            todo.append(t)
    print(f'{len(full)} lines in the {"sample" if args.sample else "app"}, {len(todo)} to make now.', flush=True)
    if only and not todo:
        print(f'No line contains "{args.only}".')
    gen, label = (load_engine() if todo else (None, 'unchanged'))
    t0 = time.time()
    for i, text in enumerate(todo, 1):
        k = key(text)
        seed = args.seed + int(hashlib.md5(k.encode()).hexdigest()[:6], 16) % 100000
        if only:
            seed += random.randint(1, 10 ** 6)  # a fresh take
        t1 = time.time()
        y, sr, take = make_clip(gen, text, seed)
        save_mp3(y, sr, os.path.join(vdir, fname(k)))
        left = (time.time() - t0) / i * (len(todo) - i)
        note = '' if take == 0 else (' (retake)' if take < 9 else ' (CHECK: odd length)')
        print(f'[{i:3d}/{len(todo)}] {time.time() - t1:4.1f}s  {y.size / sr:3.1f}s audio  ~{left / 60:4.1f} min left  {text}{note}', flush=True)

    if args.sample:
        from IPython.display import Audio, display
        for t in SAMPLE:
            print(t)
            display(Audio(os.path.join(vdir, fname(key(t)))))
        print('Like it? Make the full set (notebook cell 6, or:  %run -i make_voice.py' + (f' --exag {args.exag}' if args.exag != 0.9 else '') + ')')
        return

    clips = {key(t): fname(key(t)) for t in full if os.path.exists(os.path.join(vdir, fname(key(t))))}
    meta_path = os.path.join(vdir, 'settings.json')
    if todo and not only:
        json.dump({'model': label}, open(meta_path, 'w'))
    model_label = json.load(open(meta_path)).get('model', label) if os.path.exists(meta_path) else label
    manifest = {'model': model_label, 'made': datetime.date.today().isoformat(), 'clips': clips}
    with open(os.path.join(vdir, 'manifest.js'), 'w') as fh:
        fh.write('/* Made by tools/make_voice.py. Maps each line (lowercase words) to its clip. */\n')
        fh.write('window.TULDOK_VOICE = ' + json.dumps(manifest, indent=1) + ';\n')
    with open(os.path.join(vdir, 'CREDITS.txt'), 'w') as fh:
        fh.write('Voice clips generated with ' + model_label + '.\n')
        if 'Chatterbox' in model_label:
            fh.write("Chatterbox: https://github.com/resemble-ai/chatterbox (MIT License). Clips carry Resemble AI's inaudible Perth watermark.\n")
        else:
            fh.write('Kokoro-82M: https://huggingface.co/hexgrad/Kokoro-82M (Apache 2.0).\n')
    zpath = args.out.rstrip('/') + '.zip'
    with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_DEFLATED) as z:
        keep = set(clips.values()) | {'manifest.js', 'CREDITS.txt'}
        for f in sorted(os.listdir(vdir)):
            if f in keep:
                z.write(os.path.join(vdir, f), 'voice/' + f)
    missing = [t for t in full if key(t) not in clips]
    size = os.path.getsize(zpath) / 1e6
    print(f'\nDone: {len(clips)}/{len(full)} clips, {size:.1f} MB -> {zpath}', flush=True)
    if missing:
        print('Still missing (run again to finish):', missing[:5])
    try:
        from google.colab import files
        files.download(zpath)
    except Exception:
        print('Download ' + zpath + ' from the Files panel on the left (tap ⋮ > Download), or from Google Drive if it is saved there.')


main()
