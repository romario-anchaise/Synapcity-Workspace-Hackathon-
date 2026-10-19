package pe.rapicostura.app;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import java.util.Arrays;

public final class MainActivity extends Activity {
    private static final String HOME = "https://rapicostura-romario.web.app/";
    private static final int FILE_PICKER = 20, CAMERA_PERMISSION = 21;
    private WebView web;
    private ProgressBar progress;
    private LinearLayout errorPanel;
    private ValueCallback<Uri[]> fileResult;
    private PermissionRequest cameraRequest;
    private boolean loaded, loadFailed, choosingFile;
    private long pausedAt;
    private View fullscreenVideo;
    private WebChromeClient.CustomViewCallback fullscreenCallback;
    private FrameLayout root;

    private boolean trusted(Uri uri) {
        return uri != null && "https".equalsIgnoreCase(uri.getScheme())
            && "rapicostura-romario.web.app".equalsIgnoreCase(uri.getHost())
            && (uri.getPort() == -1 || uri.getPort() == 443) && uri.getUserInfo() == null;
    }

    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(32,21,44));
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(32,21,44));
        root.addView(web, new FrameLayout.LayoutParams(-1,-1));
        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progress.setProgressTintList(android.content.res.ColorStateList.valueOf(Color.rgb(189,146,220)));
        root.addView(progress, new FrameLayout.LayoutParams(-1, dp(3), Gravity.TOP));
        buildErrorPanel();
        setContentView(root);
        if (Build.VERSION.SDK_INT >= 33) getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::handleBack);
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            root.setOnApplyWindowInsetsListener((view, insets) -> {
                Insets edges = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.ime());
                view.setPadding(edges.left, edges.top, edges.right, edges.bottom);
                return WindowInsets.CONSUMED;
            });
        }
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setUseWideViewPort(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setUserAgentString(settings.getUserAgentString() + " RapicosturaAndroid/1.0");
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (trusted(uri)) return false;
                if (request.isForMainFrame() && request.hasGesture()
                    && Arrays.asList("https","tel","mailto").contains(uri.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
                    catch (ActivityNotFoundException ignored) { message("No hay una aplicación para abrir este enlace."); }
                }
                return true;
            }
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) {
                loadFailed = false; progress.setVisibility(View.VISIBLE); errorPanel.setVisibility(View.GONE);
            }
            @Override public void onPageFinished(WebView view, String url) {
                progress.setVisibility(View.GONE); loaded = !loadFailed && trusted(Uri.parse(url));
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showError();
            }
            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                if (request.isForMainFrame() && response.getStatusCode() >= 400) showError();
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView view, int percent) { progress.setProgress(percent); }
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (!trusted(Uri.parse(view.getUrl() == null ? "" : view.getUrl()))) return false;
                if (fileResult != null) fileResult.onReceiveValue(null);
                fileResult = callback; choosingFile = true;
                Intent picker = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                picker.addCategory(Intent.CATEGORY_OPENABLE);
                picker.setType("*/*");
                picker.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"image/*","video/*"});
                picker.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE);
                try { startActivityForResult(picker, FILE_PICKER); }
                catch (ActivityNotFoundException error) {
                    fileResult.onReceiveValue(null); fileResult = null; choosingFile = false;
                    message("No se pudo abrir la galería.");
                }
                return true;
            }
            @Override public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> {
                    if (!trusted(request.getOrigin()) || !Arrays.asList(request.getResources()).contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE)) {
                        request.deny(); return;
                    }
                    if (cameraRequest != null) { request.deny(); return; }
                    cameraRequest = request;
                    if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) finishCameraPermission(true);
                    else requestPermissions(new String[]{Manifest.permission.CAMERA}, CAMERA_PERMISSION);
                });
            }
            @Override public void onPermissionRequestCanceled(PermissionRequest request) { if (cameraRequest == request) cameraRequest = null; }
            @Override public void onShowCustomView(View view, CustomViewCallback callback) {
                if (fullscreenVideo != null) { callback.onCustomViewHidden(); return; }
                fullscreenVideo = view; fullscreenCallback = callback;
                root.addView(view, new FrameLayout.LayoutParams(-1,-1));
            }
            @Override public void onHideCustomView() { hideVideo(); }
        });
        web.setDownloadListener((url, agent, disposition, mime, length) -> {
            Uri uri = Uri.parse(url);
            if ("https".equalsIgnoreCase(uri.getScheme())) {
                try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
                catch (ActivityNotFoundException ignored) { message("No se pudo abrir la descarga."); }
            }
        });
        web.loadUrl(launchUrl(getIntent()));
    }

    private String launchUrl(Intent intent) {
        Uri uri = intent == null ? null : intent.getData();
        return trusted(uri) ? uri.toString() : HOME;
    }
    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent); setIntent(intent);
        if (web != null) web.loadUrl(launchUrl(intent));
    }

    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
    private void message(String text) { Toast.makeText(this, text, Toast.LENGTH_LONG).show(); }
    private void buildErrorPanel() {
        errorPanel = new LinearLayout(this); errorPanel.setOrientation(LinearLayout.VERTICAL);
        errorPanel.setGravity(Gravity.CENTER); errorPanel.setPadding(dp(28),dp(28),dp(28),dp(28));
        errorPanel.setBackgroundColor(Color.rgb(32,21,44));
        TextView title = new TextView(this); title.setText("No pudimos cargar Rapicostura");
        title.setTextSize(23); title.setTextColor(Color.WHITE); title.setGravity(Gravity.CENTER);
        TextView note = new TextView(this); note.setText("Revisa tu conexión a internet y vuelve a intentarlo.");
        note.setTextSize(17); note.setTextColor(Color.rgb(214,194,229)); note.setGravity(Gravity.CENTER); note.setPadding(0,dp(18),0,dp(24));
        Button retry = new Button(this); retry.setText("Volver a intentar"); retry.setTextSize(17);
        retry.setOnClickListener(view -> { errorPanel.setVisibility(View.GONE); web.loadUrl(HOME); });
        errorPanel.addView(title); errorPanel.addView(note); errorPanel.addView(retry);
        root.addView(errorPanel, new FrameLayout.LayoutParams(-1,-1)); errorPanel.setVisibility(View.GONE);
    }
    private void showError() { loadFailed = true; loaded = false; progress.setVisibility(View.GONE); errorPanel.setVisibility(View.VISIBLE); }
    private void finishCameraPermission(boolean allowed) {
        PermissionRequest request = cameraRequest; cameraRequest = null;
        if (request == null) return;
        if (allowed && trusted(request.getOrigin())) request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
        else request.deny();
    }
    @Override public void onRequestPermissionsResult(int code, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(code,permissions,results);
        if (code == CAMERA_PERMISSION) finishCameraPermission(results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED);
    }
    @Override protected void onActivityResult(int code, int result, Intent data) {
        super.onActivityResult(code,result,data);
        if (code == FILE_PICKER) {
            choosingFile = false; pausedAt = 0;
            if (fileResult != null) { fileResult.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result,data)); fileResult = null; }
        }
    }
    @Override protected void onPause() { pausedAt = SystemClock.elapsedRealtime(); if (web != null) web.onPause(); super.onPause(); }
    @Override protected void onResume() {
        super.onResume(); if (web == null) return; web.onResume();
        if (!loaded || choosingFile || cameraRequest != null || fullscreenVideo != null || pausedAt == 0 || SystemClock.elapsedRealtime() - pausedAt < 5000) return;
        // No interrumpir un formulario, la cámara ni un archivo seleccionado.
        String busy = "(function(){var s=document.getElementById('shipping-module');var r=s&&s.shadowRoot;var e=document.activeElement;return !!(document.querySelector('dialog[open]')||(r&&r.querySelector('dialog[open]'))||(e&&/INPUT|TEXTAREA|SELECT/.test(e.tagName)));})()";
        web.evaluateJavascript(busy, value -> { if ("false".equals(value) && !choosingFile && cameraRequest == null) web.reload(); });
    }
    private void hideVideo() {
        if (fullscreenVideo != null) { root.removeView(fullscreenVideo); fullscreenVideo = null; }
        if (fullscreenCallback != null) { fullscreenCallback.onCustomViewHidden(); fullscreenCallback = null; }
    }
    @Override public void onBackPressed() { handleBack(); }
    private void handleBack() {
        if (fullscreenVideo != null) { hideVideo(); return; }
        if (!loaded) { finish(); return; }
        String back = "(function(){var s=document.getElementById('shipping-module');var r=s&&s.shadowRoot;var d=r&&r.querySelector('dialog[open]');d=d||document.querySelector('dialog[open]');if(d){d.close();return true;}var b=document.querySelector('main .back-link');if(b){b.click();return true;}var n=document.querySelector('#mobile-nav button');if(n&&n.getAttribute('aria-current')!=='page'){n.click();return true;}return false;})()";
        web.evaluateJavascript(back, handled -> { if (!"true".equals(handled)) { if (web.canGoBack()) web.goBack(); else finish(); } });
    }
    @Override protected void onDestroy() {
        if (fileResult != null) { fileResult.onReceiveValue(null); fileResult = null; }
        finishCameraPermission(false); hideVideo();
        if (web != null) { root.removeView(web); web.destroy(); web = null; }
        super.onDestroy();
    }
}
