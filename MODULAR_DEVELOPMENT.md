# Modular Development Rules

**This project follows a modular architecture to prevent breaking changes and allow safe feature experimentation.**

## Core Principles

1. **Never modify working core pages directly for new features**
2. **Create isolated hooks in /hooks/ for complex logic**
3. **Use feature flags for experimental features**
4. **Always keep .backup versions before major changes**
5. **New functionality = new hook file, imported with toggle**
6. **If new code breaks, just disable the import - never breaks the main app**

## File Structure

\`\`\`
/hooks/
  ├── use-[feature-name].ts  (all new complex logic goes here)
  
/components/
  ├── [component-name].tsx    (presentation only)
  
/app/[page]/
  ├── page.tsx               (stable, imports hooks)
  ├── page.backup.tsx        (last working version)
\`\`\`

## Feature Flag Pattern

Every experimental feature gets a flag at the top of the file:

\`\`\`tsx
// Feature flags for testing new functionality
const FEATURE_FLAGS = {
  USE_SMART_PRELOADER: false,  // Set to true to enable multi-item preloading
  USE_NEW_ADVANCEMENT: false,   // Set to true to enable enhanced rotation
}
\`\`\`

## Testing Workflow

1. Create the hook in separate file
2. Test with flag ON in Android TV app
3. If works → set flag to true permanently
4. If breaks → set flag to false, no damage done
5. After 1 week working → integrate directly and remove flag

## Android TV App Considerations

**IMPORTANT: This player runs in an Android TV WebView, NOT a web browser.**

- WebView behaves differently than Chrome/Firefox
- Video buffering is handled by WebView, not browser
- Preloading strategies must account for WebView limitations
- Always test changes in actual TV app, not desktop browser

## Communication Rule

When implementing new features:
- ✅ Ask: "Should this be a new hook or modify existing?"
- ✅ Show the feature flag toggle location
- ✅ Never assume direct modification is okay
