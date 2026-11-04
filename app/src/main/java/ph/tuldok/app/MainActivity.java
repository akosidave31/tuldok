package ph.tuldok.app;

import android.app.Activity;
import android.content.ClipData;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
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
import android.util.Base64;
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

/**
 * Tuldok: the worksheet maker page (assets/index.html) in a WebView.
 * The page builds each PDF itself, then hands it over in base64 pieces:
 * TuldokAndroid.begin(name), append(piece)..., done("save|a4" / "print|short" / "share|long").
 */
public class MainActivity extends Activity {

    private static final PrintAttributes.MediaSize LONG_BOND =
            new PrintAttributes.MediaSize("PH_LONG_BOND", "Long bond 8.5 x 13 in", 8500, 13000);

    private WebView web;
    private File pendingFile;
    private OutputStream pendingOut;
    private String pendingName = "worksheet.pdf";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        web = new WebView(this);
        setContentView(web);

        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setTextZoom(100);

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

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) {
            web.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (web != null) web.destroy();
        super.onDestroy();
    }

    /** Methods the page can call. They run on a background thread, so UI work goes through runOnUiThread. */
    public class Bridge {

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
