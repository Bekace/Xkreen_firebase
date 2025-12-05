# AI-Powered Vision Analytics

This document explains how the AI-powered computer vision analytics system works in Pointer AI.

## Overview

The system uses **TensorFlow.js** running entirely in the browser to analyze video frames from cameras attached to digital signage screens. This approach ensures:

- **Complete Privacy**: No images or video frames are sent to servers
- **Real-time Processing**: Analysis happens locally on the device
- **Zero API Costs**: No cloud AI service fees
- **Offline Capable**: Works without internet connection
- **GDPR Compliant**: Only anonymized metrics are stored

## Architecture

\`\`\`
┌─────────────────┐
│  Camera Device  │
└────────┬────────┘
         │ Video Stream
         ▼
┌─────────────────────────────┐
│  Camera Analytics Component │
│  (Browser/Client-Side)      │
├─────────────────────────────┤
│ 1. Capture frame every 5s   │
│ 2. Run TensorFlow.js models │
│ 3. Detect faces             │
│ 4. Analyze demographics     │
│ 5. Detect emotions          │
│ 6. Track attention          │
└────────┬────────────────────┘
         │ Anonymized Metrics Only
         ▼
┌─────────────────────────────┐
│  Backend API                │
│  /api/analytics/process-frame│
├─────────────────────────────┤
│ Store aggregated data       │
│ No images stored            │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Supabase Database          │
│  (analytics table)          │
└─────────────────────────────┘
\`\`\`

## Components

### 1. Vision Analytics Library (`lib/ai/vision-analytics.ts`)

Core AI processing module that:
- Initializes TensorFlow.js with WebGL backend
- Loads BlazeFace model for face detection
- Analyzes each detected face for:
  - **Gender**: Male, Female, Unknown
  - **Age Group**: Child (<13), Teen (13-19), Adult (20-59), Senior (60+)
  - **Emotion**: Happy, Neutral, Sad, Angry, Surprised, Unknown
  - **Attention**: Whether looking at screen (based on face position/size)

**Key Functions:**
- `initializeModels()`: Loads AI models on startup
- `analyzeFrame()`: Processes a video frame and returns analytics
- `cleanup()`: Disposes models and frees memory

### 2. Camera Analytics Component (`components/camera-analytics.tsx`)

React component that:
- Manages camera access and permissions
- Captures video frames every 5 seconds
- Runs AI analysis locally in the browser
- Sends only anonymized metrics to backend
- Displays real-time analytics

**Privacy Features:**
- Video element is hidden (not visible to user)
- Canvas used for frame capture is hidden
- No frame data sent to server
- Only aggregated counts sent to backend

### 3. Backend API (`app/api/analytics/process-frame/route.ts`)

Server endpoint that:
- Receives anonymized analytics data (no images)
- Stores metrics in Supabase database
- Returns success confirmation

**Data Stored:**
\`\`\`json
{
  "screen_id": "uuid",
  "event_type": "audience_analytics",
  "event_data": {
    "personCount": 3,
    "demographics": { "male": 2, "female": 1, "unknown": 0 },
    "ageGroups": { "child": 0, "teen": 1, "adult": 2, "senior": 0 },
    "emotions": { "happy": 2, "neutral": 1, "sad": 0, "angry": 0, "surprised": 0, "unknown": 0 },
    "lookingAtScreen": 2,
    "timestamp": "2025-01-15T10:30:00Z"
  },
  "created_at": "2025-01-15T10:30:00Z"
}
\`\`\`

## AI Models Used

### BlazeFace (Face Detection)
- **Purpose**: Detect faces in video frames
- **Speed**: ~30ms per frame on modern devices
- **Accuracy**: High precision for frontal faces
- **Output**: Bounding boxes and confidence scores

### Future Enhancements
For production, consider adding:
- **Age/Gender Model**: More accurate demographic estimation
- **Emotion Recognition**: Dedicated emotion detection model
- **Gaze Tracking**: Precise eye tracking for attention metrics
- **Face Recognition**: Optional (with explicit consent)

## Usage

### 1. Setup Camera
\`\`\`typescript
// Navigate to Camera Setup page
/dashboard/screens/camera-setup

// Select camera device
// Configure resolution and frame rate
// Save configuration
\`\`\`

### 2. Enable Analytics
\`\`\`typescript
// In player page or dashboard
<CameraAnalytics 
  screenId="screen-uuid"
  enabled={true}
  onToggle={(enabled) => console.log('Analytics:', enabled)}
/>
\`\`\`

### 3. View Analytics
\`\`\`typescript
// Real-time: Camera Analytics component shows live data
// Historical: Analytics dashboard shows aggregated metrics
/dashboard/analytics
/dashboard/screens/[id]/analytics
\`\`\`

## Performance Considerations

### Browser Requirements
- **WebGL Support**: Required for TensorFlow.js
- **Modern Browser**: Chrome 90+, Firefox 88+, Safari 14+
- **Memory**: ~200MB for models
- **CPU/GPU**: Better performance with dedicated GPU

### Optimization Tips
1. **Frame Rate**: Analyze every 5 seconds (configurable)
2. **Resolution**: Use 640x480 for balance of speed/accuracy
3. **Model Loading**: Initialize once, reuse for all frames
4. **Cleanup**: Dispose models when component unmounts

### Expected Performance
- **Model Load Time**: 2-5 seconds (first time)
- **Frame Analysis**: 100-500ms per frame
- **Memory Usage**: ~200-300MB
- **CPU Usage**: 10-30% during analysis

## Privacy & Compliance

### Data Protection
- **No Image Storage**: Video frames never leave the device
- **Anonymized Metrics**: Only aggregated counts stored
- **No Personal Data**: No faces, names, or identifiable information
- **Consent Management**: Built-in consent UI (future enhancement)

### GDPR Compliance
- **Data Minimization**: Only essential metrics collected
- **Purpose Limitation**: Data used only for analytics
- **Storage Limitation**: Configurable retention period
- **Right to Erasure**: Analytics can be deleted by screen ID

### Best Practices
1. Display clear signage about analytics
2. Provide opt-out mechanism if required
3. Set reasonable data retention periods
4. Regular privacy impact assessments
5. Document data processing activities

## Troubleshooting

### Camera Not Working
\`\`\`
Error: "Camera access denied"
Solution: Check browser permissions, configure camera in Camera Setup
\`\`\`

### AI Models Not Loading
\`\`\`
Error: "Failed to initialize AI models"
Solution: Check browser WebGL support, clear cache, refresh page
\`\`\`

### Poor Detection Accuracy
\`\`\`
Issue: Not detecting faces or wrong demographics
Solution: 
- Ensure good lighting conditions
- Position camera at eye level
- Use higher resolution camera
- Consider upgrading to production-grade models
\`\`\`

### High CPU Usage
\`\`\`
Issue: Browser slowing down during analytics
Solution:
- Reduce frame capture frequency (10s instead of 5s)
- Lower camera resolution
- Close other browser tabs
- Use device with better GPU
\`\`\`

## Future Roadmap

### Phase 1 (Current)
- ✅ Face detection with BlazeFace
- ✅ Basic demographics estimation
- ✅ Emotion detection (heuristic)
- ✅ Attention tracking (position-based)

### Phase 2 (Next)
- [ ] Dedicated age/gender model
- [ ] Improved emotion recognition
- [ ] Gaze tracking with eye landmarks
- [ ] Heat map visualization
- [ ] Dwell time tracking

### Phase 3 (Future)
- [ ] Multi-person tracking over time
- [ ] Engagement scoring
- [ ] A/B testing integration
- [ ] Predictive analytics
- [ ] Custom model training

## API Reference

### `analyzeFrame(imageData)`
Analyzes a video frame and returns demographics, emotions, and attention metrics.

**Parameters:**
- `imageData`: string | HTMLImageElement | HTMLVideoElement | HTMLCanvasElement

**Returns:**
\`\`\`typescript
{
  personCount: number
  demographics: { male: number, female: number, unknown: number }
  ageGroups: { child: number, teen: number, adult: number, senior: number }
  emotions: { happy: number, neutral: number, sad: number, angry: number, surprised: number, unknown: number }
  lookingAtScreen: number
  timestamp: string
  faces: FaceAnalysis[]
}
\`\`\`

### `initializeModels()`
Loads TensorFlow.js models. Call once on app startup.

**Returns:** Promise<void>

### `cleanup()`
Disposes models and frees memory. Call on component unmount.

**Returns:** void

## Support

For issues or questions:
1. Check browser console for error messages
2. Review this documentation
3. Check TensorFlow.js documentation: https://www.tensorflow.org/js
4. Open GitHub issue with details

---

**Last Updated**: January 2025
**Version**: 1.0.0
