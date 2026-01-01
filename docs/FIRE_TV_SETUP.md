# Fire TV Application Setup Guide

This guide walks you through setting up, building, and deploying the Pointer TV application to Amazon Fire TV devices.

## Overview

The Pointer TV Fire TV app uses a **hybrid architecture**:
- **React/Next.js** web application (hosted on Vercel)
- **Android WebView** wrapper (native Fire TV app)
- **TV Navigation** system for D-Pad remote control

## Quick Start

### 1. Prerequisites

Install the following tools:

- **Node.js 18+** (for web app development)
- **Android Studio** or **Android SDK CLI tools**
- **ADB (Android Debug Bridge)**
- **JDK 8+**

### 2. Deploy Web App to Vercel

The web app should already be deployed. Ensure it's accessible at your Vercel URL.

### 3. Configure Android App

Edit `android/app/src/main/java/com/pointertv/app/MainActivity.java`:

```java
private static final String APP_URL = "https://your-deployment.vercel.app/player/DEVICE001?tv=true";
```

Replace with your actual:
- Vercel deployment URL
- Device code for the player

### 4. Build APK

```bash
chmod +x scripts/build-android.sh
./scripts/build-android.sh
```

### 5. Install on Fire TV

```bash
chmod +x scripts/install-to-firetv.sh
./scripts/install-to-firetv.sh 192.168.1.100  # Your Fire TV IP
```

## Architecture Details

### Web Application (React/Next.js)

**Location**: `/app/player/[deviceCode]/page.tsx`

**TV Mode Features**:
- Automatic detection via User Agent or `?tv=true` query parameter
- Hidden cursor for clean TV experience
- Keyboard/D-Pad navigation support
- Edge-triggered sliding panels replaced with button navigation

**Remote Control Mapping**:
- **Left Arrow**: Open left panel (Camera Setup)
- **Right Arrow**: Open right panel (Analytics)
- **Up Arrow**: Previous media
- **Down Arrow**: Next media
- **Enter/Select**: Activate focused element
- **Back**: Close panels / Go back
- **Menu**: Toggle analytics panel

### Android WebView Wrapper

**Location**: `/android/`

**Key Components**:

1. **MainActivity.java**: 
   - Full-screen WebView
   - Hardware acceleration enabled
   - Immersive mode (no system UI)
   - Remote button pass-through to JavaScript

2. **AndroidManifest.xml**:
   - Declares TV app with Leanback launcher
   - No touchscreen required
   - Internet permissions
   - Landscape orientation locked

3. **Gradle Config**:
   - Minimum SDK 22 (Fire TV Stick 2nd Gen+)
   - Target SDK 34 (latest)
   - Leanback and AppCompat libraries

## Testing & Debugging

### Test TV Mode in Browser

Add `?tv=true` to any player URL:
```
http://localhost:3000/player/DEVICE001?tv=true
```

Test with keyboard:
- Arrow keys = D-Pad
- Enter = Select button
- Escape = Back button
- M key = Menu button

### Debug on Fire TV

1. **Enable ADB Debugging**:
   - Settings > My Fire TV > About
   - Click "Fire TV" 7 times
   - Settings > My Fire TV > Developer Options
   - Enable "ADB Debugging" and "Apps from Unknown Sources"

2. **Connect via ADB**:
```bash
adb connect [FIRE_TV_IP]:5555
```

3. **View Logs**:
```bash
adb logcat -s PointerTV:* chromium:*
```

4. **Inspect WebView** (Chrome DevTools):
   - Open Chrome on your computer
   - Navigate to `chrome://inspect`
   - Select your Fire TV device
   - Click "Inspect" on the WebView

### Common Issues

**WebView blank screen**:
- Check APP_URL is correct and accessible
- Verify JavaScript is enabled in WebView settings
- Check network connectivity from Fire TV

**Remote buttons not working**:
- Ensure `?tv=true` is in the URL
- Check keyboard event listeners in React app
- Verify `useTVNavigation` hook is properly initialized

**App crashes on launch**:
- Check `adb logcat` for error messages
- Verify minimum SDK version compatibility
- Ensure WebView is up to date on Fire TV

## Performance Optimization

### Web App Optimization

- Images are already optimized with Next.js Image component
- Lazy loading for off-screen content
- Minimize re-renders during video playback

### WebView Optimization

- Hardware acceleration enabled by default
- Caching enabled (LOAD_DEFAULT)
- DOM storage and local storage enabled
- Background color set to black to prevent white flash

## Production Deployment

### 1. Web App

Deploy to Vercel (already configured):
```bash
vercel --prod
```

### 2. Android APK

Create signed release APK:

```bash
# Generate keystore (first time only)
keytool -genkey -v -keystore pointer-tv.keystore \
  -alias pointer-tv -keyalg RSA -keysize 2048 -validity 10000

# Add to android/app/build.gradle:
android {
    signingConfigs {
        release {
            storeFile file('pointer-tv.keystore')
            storePassword 'your_password'
            keyAlias 'pointer-tv'
            keyPassword 'your_password'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}

# Build release APK
cd android
./gradlew assembleRelease
```

### 3. Amazon Appstore Submission

1. Create Amazon Developer Account
2. Register app at: https://developer.amazon.com/apps-and-games/console/apps/list
3. Upload APK and provide:
   - App title and description
   - Screenshots (1920x1080)
   - Banner image (1920x720)
   - Content rating
4. Submit for review

## Additional Resources

- [Fire TV Developer Documentation](https://developer.amazon.com/fire-tv)
- [Android TV Development Guide](https://developer.android.com/tv)
- [WebView API Reference](https://developer.android.com/reference/android/webkit/WebView)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

## Support

For issues or questions:
1. Check the troubleshooting section in `/android/README.md`
2. Review ADB logs: `adb logcat`
3. Test in browser TV mode first before debugging native app
