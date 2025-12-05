#!/bin/bash

# Installation script for Fire TV

if [ -z "$1" ]; then
    echo "Usage: ./scripts/install-to-firetv.sh [FIRE_TV_IP_ADDRESS]"
    echo "Example: ./scripts/install-to-firetv.sh 192.168.1.100"
    exit 1
fi

FIRE_TV_IP=$1
APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"

echo "📱 Installing Pointer TV to Fire TV at $FIRE_TV_IP..."

# Check if APK exists
if [ ! -f "$APK_PATH" ]; then
    echo "❌ APK not found. Please build first: ./scripts/build-android.sh"
    exit 1
fi

# Connect to Fire TV
echo "🔌 Connecting to Fire TV..."
adb connect $FIRE_TV_IP:5555

if [ $? -ne 0 ]; then
    echo "❌ Failed to connect to Fire TV. Make sure:"
    echo "   1. ADB debugging is enabled on your Fire TV"
    echo "   2. Your Fire TV is on the same network"
    echo "   3. The IP address is correct"
    exit 1
fi

# Install APK
echo "📦 Installing APK..."
adb -s $FIRE_TV_IP:5555 install -r $APK_PATH

if [ $? -eq 0 ]; then
    echo "✅ Installation successful!"
    echo "🚀 Launch the app from your Fire TV home screen"
    echo ""
    echo "To uninstall: adb -s $FIRE_TV_IP:5555 uninstall com.pointertv.app"
else
    echo "❌ Installation failed. Check the errors above."
    exit 1
fi
