# Xkreen Player - Android TV / Fire TV Wrapper

This directory contains the native Android application that wraps the Xkreen Player web app in a WebView for Fire TV devices.

## Prerequisites

1. **Android Studio** (recommended) or **Android SDK Command Line Tools**
   - Download from: https://developer.android.com/studio
   - Install Android SDK Platform 34
   - Install Android Build Tools

2. **Java Development Kit (JDK) 8 or higher**
   - Check: `java -version`

3. **ADB (Android Debug Bridge)**
   - Included with Android SDK
   - Check: `adb version`

## Project Structure

```
android/
├── app/
│   ├── src/main/
│   │   ├── java/com/pointertv/app/
│   │   │   └── MainActivity.java          # Main WebView activity
│   │   ├── res/                            # Resources (icons, strings, styles)
│   │   └── AndroidManifest.xml             # App configuration
│   └── build.gradle                        # App-level build config
├── build.gradle                            # Project-level build config
└── gradle.properties                       # Gradle properties

scripts/
├── build-android.sh                        # Build APK script
└── install-to-firetv.sh                    # Install to device script
```

## Configuration

### 1. Update App URL

Edit `android/app/src/main/java/com/pointertv/app/MainActivity.java`:

```java
private static final String APP_URL = "https://your-app.vercel.app/player/[deviceCode]?tv=true";
```

Replace with your actual Vercel deployment URL.

### 2. Customize App Info (Optional)

- **App Name**: `android/app/src/main/res/values/strings.xml`
- **Package Name**: `android/app/build.gradle` (applicationId)
- **Version**: `android/app/build.gradle` (versionCode, versionName)

## Building the APK

### Option 1: Using Build Script (Recommended)

```bash
# Make script executable (first time only)
chmod +x scripts/build-android.sh

# Build the APK
./scripts/build-android.sh
```

### Option 2: Using Gradle Directly

```bash
cd android
./gradlew assembleDebug
```

The APK will be generated at:
`android/app/build/outputs/apk/debug/app-debug.apk`

## Installing on Fire TV

### Step 1: Enable Developer Options on Fire TV

1. Go to **Settings** > **My Fire TV** > **About**
2. Click on **Fire TV** 7 times to enable Developer Options
3. Go back to **Settings** > **My Fire TV** > **Developer Options**
4. Enable **ADB Debugging**
5. Enable **Apps from Unknown Sources**

### Step 2: Find Your Fire TV IP Address

Settings > My Fire TV > About > Network

### Step 3: Install the APK

```bash
# Make script executable (first time only)
chmod +x scripts/install-to-firetv.sh

# Install to Fire TV (replace with your IP)
./scripts/install-to-firetv.sh 192.168.1.100
```

### Manual Installation (Alternative)

```bash
# Connect to Fire TV
adb connect [FIRE_TV_IP]:5555

# Install APK
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# Launch app
adb shell am start -n com.pointertv.app/.MainActivity
```

## Testing

### View Logs

```bash
# Connect to Fire TV
adb connect [FIRE_TV_IP]:5555

# View app logs
adb logcat -s XkreenPlayer:* chromium:* WebView:*
```

### Uninstall App

```bash
adb -s [FIRE_TV_IP]:5555 uninstall com.pointertv.app
```

## Troubleshooting

### Build Fails

1. **Gradle version issues**: Update `android/gradle/wrapper/gradle-wrapper.properties`
2. **SDK not found**: Set `ANDROID_HOME` environment variable
3. **Java version**: Ensure JDK 8+ is installed

### Installation Fails

1. **Connection refused**: Check ADB debugging is enabled on Fire TV
2. **Device unauthorized**: Accept the ADB authorization prompt on Fire TV
3. **Unknown sources**: Enable "Apps from Unknown Sources" in Developer Options

### App Crashes

1. **Check logs**: Use `adb logcat` to see error messages
2. **WebView issues**: Ensure JavaScript and DOM storage are enabled
3. **Network issues**: Check the APP_URL is accessible from Fire TV network

## Production Release

For Amazon Appstore submission:

1. Create a keystore:
```bash
keytool -genkey -v -keystore xkreen-player.keystore -alias xkreen-player -keyalg RSA -keysize 2048 -validity 10000
```

2. Update `android/app/build.gradle` with signing config

3. Build release APK:
```bash
cd android
./gradlew assembleRelease
```

4. Submit to Amazon Appstore Developer Console

## Resources

- [Fire TV Development](https://developer.amazon.com/fire-tv)
- [Android TV Development](https://developer.android.com/tv)
- [WebView Best Practices](https://developer.android.com/develop/ui/views/layout/webapps/webview)
