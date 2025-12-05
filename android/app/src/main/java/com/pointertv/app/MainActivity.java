package com.pointertv.app;

import android.app.Activity;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.ConsoleMessage;
import android.util.Log;
import android.graphics.Color;

public class MainActivity extends Activity {
    private static final String TAG = "XkreenTV";
    
    // IMPORTANT: Replace this with your actual Vercel deployment URL
    private static final String APP_URL = "https://xkreen.vercel.app/player/[deviceCode]?tv=true";
    
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Enable immersive mode (hide system UI)
        enableImmersiveMode();
        
        // Create and configure WebView
        webView = new WebView(this);
        setContentView(webView);
        
        configureWebView();
        
        // Load the app
        Log.d(TAG, "Loading app from: " + APP_URL);
        webView.loadUrl(APP_URL);
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        
        // Enable JavaScript
        settings.setJavaScriptEnabled(true);
        
        // Enable DOM storage (required for modern web apps)
        settings.setDomStorageEnabled(true);
        
        // Enable local storage
        settings.setDatabaseEnabled(true);
        
        // Enable caching
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setAppCacheEnabled(true);
        
        // Enable hardware acceleration
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        
        // Set user agent to identify as Fire TV
        String userAgent = settings.getUserAgentString();
        settings.setUserAgentString(userAgent + " PointerTV/1.0 FireTV");
        
        // Allow mixed content (if needed)
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        
        // Enable zoom controls (usually not needed for TV)
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        
        // Set background color to black
        webView.setBackgroundColor(Color.BLACK);
        
        // Set WebViewClient to handle page navigation
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                Log.d(TAG, "Page loaded: " + url);
            }
            
            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                Log.e(TAG, "WebView error: " + description);
            }
        });
        
        // Set WebChromeClient for console logging and debugging
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                Log.d(TAG, "WebView Console: " + consoleMessage.message() + 
                      " -- From line " + consoleMessage.lineNumber() + 
                      " of " + consoleMessage.sourceId());
                return true;
            }
        });
    }

    private void enableImmersiveMode() {
        View decorView = getWindow().getDecorView();
        decorView.setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_FULLSCREEN
        );
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            enableImmersiveMode();
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        // Handle back button
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        
        // Pass all other keys to the WebView (they'll be handled by JavaScript)
        // The TV navigation system in the React app will handle:
        // - DPAD_LEFT, DPAD_RIGHT, DPAD_UP, DPAD_DOWN
        // - DPAD_CENTER (Enter)
        // - MENU button
        
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
            webView.resumeTimers();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) {
            webView.onPause();
            webView.pauseTimers();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}
