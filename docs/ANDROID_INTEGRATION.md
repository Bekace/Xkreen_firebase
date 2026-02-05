# Android Integration Guide: Player Status & Proof of Play

## Overview
This document outlines the API endpoints and implementation requirements for Android devices to report online status and media playback events.

---

## 1. Device Online Status (Heartbeat)

### Endpoint
```
POST https://app.xkreen.com/api/devices/heartbeat
```

### Purpose
Android devices must send heartbeat signals every 30 seconds to maintain online status. Devices are considered offline if no heartbeat is received for 5 minutes (300 seconds).

### Request Body
```json
{
  "device_code": "ABC123",
  "status": "online"
}
```

### Response
```json
{
  "success": true,
  "message": "Heartbeat recorded",
  "last_heartbeat": "2024-01-15T10:30:00.000Z"
}
```

### Implementation Requirements
- Send heartbeat every 30 seconds using a background service
- Include the device's unique `device_code` obtained during pairing
- Handle network failures gracefully with exponential backoff retry
- Resume heartbeat when app returns to foreground or network reconnects

### Example (Kotlin)
```kotlin
class HeartbeatService : Service() {
    private val handler = Handler(Looper.getMainLooper())
    private val heartbeatInterval = 30_000L // 30 seconds
    
    private val heartbeatRunnable = object : Runnable {
        override fun run() {
            sendHeartbeat()
            handler.postDelayed(this, heartbeatInterval)
        }
    }
    
    private fun sendHeartbeat() {
        val request = JSONObject().apply {
            put("device_code", getDeviceCode())
            put("status", "online")
        }
        
        // Make API call
        apiClient.post("/api/devices/heartbeat", request)
    }
}
```

---

## 2. Proof of Play (Media Events)

### Endpoint
```
POST https://app.xkreen.com/api/devices/events
```

### Purpose
Track all media playback events for analytics, reporting, and proof of play verification.

### Event Types
1. **media_start** - Media file begins playing
2. **media_end** - Media file completes playback successfully
3. **media_error** - Media file fails to play or encounters an error

### Request Body
```json
{
  "device_code": "ABC123",
  "event_type": "media_start",
  "media_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "metadata": {
    "duration": 30.5,
    "position": 0,
    "error_message": null
  }
}
```

### Field Descriptions
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `device_code` | string | Yes | Unique device identifier from pairing |
| `event_type` | string | Yes | One of: `media_start`, `media_end`, `media_error` |
| `media_id` | string | Yes | UUID of the media file from playlist config |
| `timestamp` | string | Yes | ISO 8601 timestamp when event occurred |
| `metadata.duration` | number | No | Media duration in seconds (for start/end events) |
| `metadata.position` | number | No | Playback position when event occurred (seconds) |
| `metadata.error_message` | string | No | Error description (required for error events) |

### Response
```json
{
  "success": true,
  "message": "Event recorded",
  "event_id": "550e8400-e29b-41d4-a716-446655440001"
}
```

### Implementation Requirements

#### Media Start Event
- Send when media begins playing (after buffering complete)
- Include media ID from the playlist configuration
- Include full duration if known

#### Media End Event  
- Send when media completes playback successfully
- Include final position (should equal duration)
- Only send if media played to completion (>95% of duration)

#### Media Error Event
- Send immediately when playback fails
- Include descriptive error message in metadata
- Common errors: file not found, unsupported format, network timeout, decoding error

### Example Implementation (Kotlin)
```kotlin
class MediaEventTracker(private val apiClient: ApiClient) {
    
    fun trackMediaStart(mediaId: String, duration: Float) {
        sendEvent(
            eventType = "media_start",
            mediaId = mediaId,
            metadata = mapOf(
                "duration" to duration,
                "position" to 0f
            )
        )
    }
    
    fun trackMediaEnd(mediaId: String, duration: Float, position: Float) {
        if (position >= duration * 0.95) { // 95% threshold
            sendEvent(
                eventType = "media_end",
                mediaId = mediaId,
                metadata = mapOf(
                    "duration" to duration,
                    "position" to position
                )
            )
        }
    }
    
    fun trackMediaError(mediaId: String, errorMessage: String) {
        sendEvent(
            eventType = "media_error",
            mediaId = mediaId,
            metadata = mapOf("error_message" to errorMessage)
        )
    }
    
    private fun sendEvent(
        eventType: String,
        mediaId: String,
        metadata: Map<String, Any>
    ) {
        val request = JSONObject().apply {
            put("device_code", getDeviceCode())
            put("event_type", eventType)
            put("media_id", mediaId)
            put("timestamp", getCurrentISOTimestamp())
            put("metadata", JSONObject(metadata))
        }
        
        // Send asynchronously with retry logic
        CoroutineScope(Dispatchers.IO).launch {
            try {
                apiClient.post("/api/devices/events", request)
            } catch (e: Exception) {
                // Queue for retry or local storage
                eventQueue.add(request)
            }
        }
    }
}
```

---

## 3. Integration Workflow

### On App Startup
1. Start heartbeat background service
2. Initialize media event tracker
3. Retrieve current playlist from `/api/devices/config/{deviceCode}`

### During Media Playback
1. **Before playback starts**: Send `media_start` event
2. **Monitor playback**: Track position and handle errors
3. **On successful completion**: Send `media_end` event
4. **On error**: Send `media_error` event with details

### On Network Failure
- Queue events locally using Room database or SharedPreferences
- Retry failed events when network reconnects
- Maintain heartbeat schedule with exponential backoff

### On App Background/Foreground
- Continue heartbeat in background using WorkManager
- Resume event tracking when returning to foreground

---

## 4. Data Flow

```
Android Device
    ├── Heartbeat Service (every 30s) → POST /api/devices/heartbeat
    ├── Media Player
    │   ├── onStart → POST /api/devices/events (media_start)
    │   ├── onComplete → POST /api/devices/events (media_end)
    │   └── onError → POST /api/devices/events (media_error)
    └── Event Queue (for offline storage)
```

---

## 5. Testing

### Test Online Status
1. Send heartbeat every 30 seconds
2. Verify device shows "Online" in dashboard
3. Stop heartbeat and wait 5 minutes
4. Verify device shows "Offline" in dashboard

### Test Proof of Play
1. Play a media file from start to finish
2. Verify `media_start` and `media_end` events appear in Analytics
3. Trigger a playback error (invalid file)
4. Verify `media_error` event appears with error message
5. Check "Top Media" chart updates with play counts

---

## 6. Error Handling

### HTTP Status Codes
- `200` - Success
- `400` - Invalid request (check required fields)
- `404` - Device not found (device_code invalid)
- `500` - Server error (retry with exponential backoff)

### Retry Strategy
```kotlin
suspend fun sendWithRetry(request: JSONObject, maxRetries: Int = 3) {
    var attempt = 0
    while (attempt < maxRetries) {
        try {
            apiClient.post(endpoint, request)
            return // Success
        } catch (e: Exception) {
            attempt++
            delay(2.0.pow(attempt).toLong() * 1000) // Exponential backoff
        }
    }
    // Queue for later retry
    localDatabase.queueEvent(request)
}
```

---

## 7. Performance Considerations

- **Batch events**: Queue up to 10 events and send in single request if needed
- **Compress large payloads**: Use gzip compression for request bodies
- **Minimize battery drain**: Use WorkManager for background tasks
- **Respect network conditions**: Reduce frequency on metered connections
- **Local queue limit**: Keep max 1000 events in local queue, purge oldest if exceeded

---

## 8. Security

- Use HTTPS for all API calls
- Store `device_code` securely using EncryptedSharedPreferences
- Validate media_id matches IDs from official playlist config
- Include request timeouts (30 seconds recommended)

---

## Questions?
Contact backend team for API issues or clarification on event tracking requirements.
