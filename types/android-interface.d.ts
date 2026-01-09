// TypeScript declarations for Android WebView JavaScript interface
// This allows the web app to communicate with the native Android app

interface AndroidInterface {
  /**
   * Called when device pairing is complete.
   * The Android app will transition out of the WebView and into content playback.
   */
  onPairingComplete: () => void
}

declare global {
  interface Window {
    /**
     * Android native interface exposed by the WebView.
     * Only available when running inside the Xkreen Android app.
     */
    AndroidInterface?: AndroidInterface

    /**
     * Function called by the Android app to display a dynamically generated device code.
     * The web app should implement this to receive and display the pairing code.
     */
    displayPairingCode?: (code: string) => void
  }
}

export {}
