#!/bin/bash

# Build script for Android TV APK

echo "🔨 Building Pointer TV for Fire TV..."

# Check if Android SDK is available
if [ -z "$ANDROID_HOME" ]; then
    echo "❌ Error: ANDROID_HOME is not set. Please install Android SDK."
    echo "   Download from: https://developer.android.com/studio"
    exit 1
fi

# Navigate to android directory
cd android

# Clean previous builds
echo "🧹 Cleaning previous builds..."
./gradlew clean

# Build debug APK
echo "📦 Building debug APK..."
./gradlew assembleDebug

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "📱 APK location: android/app/build/outputs/apk/debug/app-debug.apk"
    echo ""
    echo "Next steps:"
    echo "1. Enable ADB debugging on your Fire TV (Settings > My Fire TV > Developer Options)"
    echo "2. Connect your Fire TV to the same network"
    echo "3. Run: ./scripts/install-to-firetv.sh [FIRE_TV_IP_ADDRESS]"
else
    echo "❌ Build failed. Check the errors above."
    exit 1
fi
