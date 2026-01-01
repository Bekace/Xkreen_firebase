# Fire TV Navigation Guide

## Overview
This document describes the TV navigation system implemented for Fire TV / Fire Stick devices.

## Remote Control Mapping

### D-Pad Navigation
- **Left Arrow** (←): Toggle left panel (Camera Setup)
- **Right Arrow** (→): Toggle right panel (Audience Analytics)
- **Up Arrow** (↑): Reserved for future navigation
- **Down Arrow** (↓): Reserved for future navigation

### Action Buttons
- **Select/Enter**: Activate focused button
- **Back**: Close panels or return to previous screen
- **Menu** (M key or Menu button): Toggle right analytics panel

## Testing TV Mode

### Browser Testing
Add `?tv=true` to the URL to enable TV mode simulation:
```
http://localhost:3000/player/[deviceCode]?tv=true
```

### Fire TV Testing
The app automatically detects Fire TV devices by checking the user agent for:
- `aftb` - Fire TV
- `aftm` - Fire TV Stick
- `afts` - Fire TV Stick 4K
- `aftt` - Fire TV Cube

## Focus Management

### TV-Specific Focus Styles
All interactive elements have enhanced focus states for 10-foot viewing:
- **4px solid outline** in primary color
- **4px offset** for clear separation
- **Scale transform (1.05x)** for visual feedback
- **Glow effect** using box-shadow

### CSS Classes
- `.tv-focusable` - Applies TV-specific focus styles
- `.tv-button` - Ensures minimum touch target size (120x48px)
- `.tv-mode` - Hides cursor in TV mode

## Implementation Details

### Custom Hook: `useTVNavigation`
Located in `hooks/use-tv-navigation.ts`, this hook:
- Detects TV mode automatically
- Maps keyboard events to navigation actions
- Handles Fire TV specific keycodes
- Provides callbacks for directional and action buttons

### Key Features
1. **Auto-detection**: Identifies Fire TV devices via user agent
2. **Keyboard navigation**: Full keyboard support for testing
3. **Panel control**: Left/Right arrows control sliding panels
4. **Back button**: Closes panels hierarchically
5. **Focus trapping**: Prevents focus from leaving interactive areas

## Next Steps

### Phase 2: Android Wrapper
Once TV optimization is complete, we'll wrap the web app in a native Android application:
1. Create Android TV project structure
2. Configure WebView for optimal performance
3. Map physical remote buttons to key events
4. Handle Fire OS specific requirements

### Phase 3: Deployment
1. Build APK for Fire TV
2. Set up side-loading instructions
3. Prepare for Amazon Appstore submission
