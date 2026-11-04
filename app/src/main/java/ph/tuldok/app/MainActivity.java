package ph.tuldok.app;

import android.app.Activity;
import android.content.ClipData;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.PlaybackParams;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.Environment;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintDocumentInfo;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.util.Base64;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayDeque;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Tuldok: the touch games (assets/index.html) and the printable worksheet maker (assets/print.html) in a WebView.
 *
 * Voice: many speech engines ignore setPitch(), so each line is first rendered to a WAV file,
 * then played with MediaPlayer at a raised pitch (PlaybackParams), which works with any engine.
 *
 * PDFs: the page hands them over with begin(name) / append(base64) / done("save|a4" | "print|short" | "share|long").
 */
public class MainActivity extends Activity {

    private static final PrintAttributes.MediaSize LONG_BOND =
            new PrintAttributes.MediaSize("PH_LONG_BOND", "Long bond 8.5 x 13 in", 8500, 13000);

    private WebView web;

    // ---- voice ----
    private TextToSpeech tts;
    private volatile boolean ttsReady = false;
    private volatile float voicePitch = 1.4f;
    private volatile float voiceRate = 0.95f;
    private volatile int speakGen = 0;
    private final Map<String, File> pendingSpeech = new ConcurrentHashMap<>();
    private final Map<String, Integer> pendingGen = new ConcurrentHashMap<>();
    private final ArrayDeque<File> playQueue = new ArrayDeque<>();
    private MediaPlayer player;
    private boolean playing = false;

    // ---- PDF hand-over ----
    private File pendingFile;
    private OutputStream pendingOut;
    private String pendingName = "worksheet.pdf";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        web = new WebView(this);
        web.setLongClickable(false);
        web.setOnLongClickListener(v -> true);
        web.setHapticFeedbackEnabled(false);
        setContentView(web);

        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setTextZoom(100);
        settings.setMediaPlaybackRequiresUserGesture(false);

        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if ("file".equals(url.getScheme())) return false;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, url));
                } catch (Exception ignored) {
                    // No app can open this link.
                }
                return true;
            }
        });
        web.addJavascriptInterface(new Bridge(), "TuldokAndroid");

        tts = new TextToSpeech(this, status -> {
            ttsReady = (status == TextToSpeech.SUCCESS);
            if (ttsReady) {
                tts.setLanguage(Locale.US);
                tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override
                    public void onStart(String utteranceId) { }

                    @Override
                    public void onDone(String utteranceId) {
                        File f = pendingSpeech.remove(utteranceId);
                        Integer gen = pendingGen.remove(utteranceId);
                        if (f != null && gen != null) enqueue(f, gen);
                    }

                    @Override
                    public void onError(String utteranceId) {
                        File f = pendingSpeech.remove(utteranceId);
                        pendingGen.remove(utteranceId);
                        if (f != null) f.delete();
                    }
                });
            }
        });

        if (savedInstanceState != null) {
            web.restoreState(savedInstanceState);
        } else {
            web.loadUrl("file:///android_asset/index.html");
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    /** Back: printables page goes back to the games; inside the games, the page decides; otherwise leave. */
    @Override
    public void onBackPressed() {
        if (web.canGoBack()) {
            web.goBack();
            return;
        }
        web.evaluateJavascript("(window.__tuldokBack && window.__tuldokBack()) ? 'yes' : 'no'", value -> {
            if (!"\"yes\"".equals(value)) finish();
        });
    }

    @Override
    protected void onPause() {
        super.onPause();
        stopVoice();
    }

    @Override
    protected void onDestroy() {
        stopVoice();
        if (tts != null) tts.shutdown();
        if (web != null) web.destroy();
        super.onDestroy();
    }

    // ================= voice =================

    private void speakLine(String text) {
        if (tts == null || !ttsReady || text == null || text.isEmpty()) return;
        final int gen = speakGen;
        tts.setLanguage(Locale.US);
        tts.setPitch(1.0f);              // pitch is raised during playback instead
        tts.setSpeechRate(voiceRate);
        String id = "line" + System.nanoTime();
        File dir = new File(getCacheDir(), "voice");
        if (!dir.isDirectory() && !dir.mkdirs()) {
            tts.speak(text, TextToSpeech.QUEUE_ADD, null, id);
            return;
        }
        File out = new File(dir, id + ".wav");
        pendingSpeech.put(id, out);
        pendingGen.put(id, gen);
        int result = tts.synthesizeToFile(text, null, out, id);
        if (result != TextToSpeech.SUCCESS) {
            pendingSpeech.remove(id);
            pendingGen.remove(id);
            tts.speak(text, TextToSpeech.QUEUE_ADD, null, id);   // fall back to plain speech
        }
    }

    private void enqueue(final File f, final int gen) {
        runOnUiThread(() -> {
            if (gen != speakGen) {
                f.delete();
                return;
            }
            playQueue.add(f);
            if (!playing) playNext();
        });
    }

    /** Runs on the UI thread. */
    private void playNext() {
        releasePlayer();
        final File f = playQueue.poll();
        if (f == null) {
            playing = false;
            return;
        }
        playing = true;
        try {
            player = new MediaPlayer();
            player.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build());
            player.setDataSource(f.getAbsolutePath());
            player.setOnCompletionListener(mp -> {
                f.delete();
                playNext();
            });
            player.setOnErrorListener((mp, what, extra) -> {
                f.delete();
                playNext();
                return true;
            });
            player.prepare();
            try {
                // On a prepared player, a non-zero speed here also starts playback.
                player.setPlaybackParams(new PlaybackParams().setPitch(voicePitch).setSpeed(1.0f));
            } catch (Exception ignored) {
                // This device can't change pitch; play it as it is.
            }
            if (!player.isPlaying()) player.start();
        } catch (Exception e) {
            f.delete();
            playNext();
        }
    }

    private void releasePlayer() {
        if (player != null) {
            try {
                player.setOnCompletionListener(null);
                player.setOnErrorListener(null);
                player.release();
            } catch (Exception ignored) {
                // Already released.
            }
            player = null;
        }
    }

    /** Stops speech now and drops anything still being prepared. Safe from any thread. */
    private void stopVoice() {
        speakGen++;
        if (tts != null) tts.stop();
        runOnUiThread(() -> {
            for (File f : playQueue) f.delete();
            playQueue.clear();
            releasePlayer();
            playing = false;
        });
    }

    // ================= bridge for the pages =================

    /** Methods the pages can call. They run on a background thread, so UI work goes through runOnUiThread. */
    public class Bridge {

        @JavascriptInterface
        public void speak(String text, String lang) {
            speakLine(text);
        }

        /** Pitch above 1.0 sounds brighter and friendlier to young children. */
        @JavascriptInterface
        public void setVoice(float pitch, float rate) {
            voicePitch = Math.max(0.5f, Math.min(2.0f, pitch));
            voiceRate = Math.max(0.5f, Math.min(1.5f, rate));
        }

        @JavascriptInterface
        public void stopSpeaking() {
            stopVoice();
        }

        @JavascriptInterface
        public String version() {
            try {
                return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
            } catch (Exception e) {
                return "?";
            }
        }

        @JavascriptInterface
        public boolean begin(String name) {
            synchronized (MainActivity.this) {
                closePending();
                try {
                    File dir = new File(getCacheDir(), "pdfs");
                    if (!dir.isDirectory() && !dir.mkdirs()) return false;
                    pendingName = safeName(name);
                    pendingFile = new File(dir, pendingName);
                    pendingOut = new FileOutputStream(pendingFile);
                    return true;
                } catch (IOException e) {
                    return false;
                }
            }
        }

        @JavascriptInterface
        public boolean append(String base64) {
            synchronized (MainActivity.this) {
                if (pendingOut == null) return false;
                try {
                    pendingOut.write(Base64.decode(base64, Base64.DEFAULT));
                    return true;
                } catch (Exception e) {
                    return false;
                }
            }
        }

        @JavascriptInterface
        public void done(String action) {
            final File file;
            final String name;
            synchronized (MainActivity.this) {
                file = pendingFile;
                name = pendingName;
                closePending();
            }
            if (file == null) return;
            String[] parts = (action == null ? "save" : action).split("\\|");
            final String what = parts[0];
            final String paper = parts.length > 1 ? parts[1] : "a4";
            runOnUiThread(() -> {
                if ("print".equals(what)) {
                    printPdf(file, name, paper);
                } else if ("share".equals(what)) {
                    sharePdf(file);
                } else {
                    savePdf(file, name);
                }
            });
        }
    }

    // ================= PDF save / share / print =================

    private void closePending() {
        if (pendingOut != null) {
            try {
                pendingOut.close();
            } catch (IOException ignored) {
                // Nothing useful to do here.
            }
        }
        pendingOut = null;
        pendingFile = null;
    }

    /** Android 10+: straight into Downloads/Tuldok. Older Android: open the share sheet instead. */
    private void savePdf(File file, String name) {
        if (Build.VERSION.SDK_INT >= 29) {
            try {
                ContentValues values = new ContentValues();
                values.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
                values.put(MediaStore.MediaColumns.MIME_TYPE, "application/pdf");
                values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Tuldok");
                Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri == null) throw new IOException("Downloads is not available");
                try (InputStream in = new FileInputStream(file);
                     OutputStream out = getContentResolver().openOutputStream(uri)) {
                    if (out == null) throw new IOException("Downloads is not writable");
                    copy(in, out);
                }
                tell("Saved to Downloads/Tuldok/" + name);
                return;
            } catch (Exception e) {
                tell("Could not save to Downloads. Choose an app to keep the PDF.");
            }
        }
        sharePdf(file);
    }

    private void sharePdf(File file) {
        try {
            Uri uri = FileProvider.getUriForFile(this, getPackageName() + ".files", file);
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType("application/pdf");
            send.putExtra(Intent.EXTRA_STREAM, uri);
            send.setClipData(ClipData.newRawUri("", uri));
            send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivity(Intent.createChooser(send, "Send worksheet"));
        } catch (Exception e) {
            tell("Could not share the PDF: " + e.getMessage());
        }
    }

    private void printPdf(final File file, final String name, String paper) {
        PrintManager printManager = (PrintManager) getSystemService(Context.PRINT_SERVICE);
        if (printManager == null) {
            tell("Printing is not available on this device.");
            return;
        }
        PrintAttributes.MediaSize size = "short".equals(paper) ? PrintAttributes.MediaSize.NA_LETTER
                : "long".equals(paper) ? LONG_BOND
                : PrintAttributes.MediaSize.ISO_A4;
        PrintAttributes attributes = new PrintAttributes.Builder().setMediaSize(size).build();

        printManager.print(name, new PrintDocumentAdapter() {
            @Override
            public void onLayout(PrintAttributes oldAttributes, PrintAttributes newAttributes,
                                 CancellationSignal cancellationSignal, LayoutResultCallback callback,
                                 Bundle extras) {
                if (cancellationSignal.isCanceled()) {
                    callback.onLayoutCancelled();
                    return;
                }
                PrintDocumentInfo info = new PrintDocumentInfo.Builder(name)
                        .setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT)
                        .build();
                callback.onLayoutFinished(info, true);
            }

            @Override
            public void onWrite(PageRange[] pages, ParcelFileDescriptor destination,
                                CancellationSignal cancellationSignal, WriteResultCallback callback) {
                try (InputStream in = new FileInputStream(file);
                     OutputStream out = new FileOutputStream(destination.getFileDescriptor())) {
                    copy(in, out);
                    callback.onWriteFinished(new PageRange[]{PageRange.ALL_PAGES});
                } catch (Exception e) {
                    callback.onWriteFailed(e.getMessage());
                }
            }
        }, attributes);
    }

    /** Shows a toast and puts the same message in the page's status line. */
    private void tell(final String message) {
        runOnUiThread(() -> {
            Toast.makeText(this, message, Toast.LENGTH_LONG).show();
            web.evaluateJavascript("window.__tuldokNotify && window.__tuldokNotify("
                    + JSONObject.quote(message) + ")", null);
        });
    }

    private static String safeName(String name) {
        String n = name == null ? "" : name.replaceAll("[^A-Za-z0-9._-]", "-");
        if (n.isEmpty()) n = "worksheet";
        if (!n.toLowerCase().endsWith(".pdf")) n = n + ".pdf";
        return n;
    }

    private static void copy(InputStream in, OutputStream out) throws IOException {
        byte[] buffer = new byte[65536];
        int n;
        while ((n = in.read(buffer)) != -1) out.write(buffer, 0, n);
        out.flush();
    }
}
