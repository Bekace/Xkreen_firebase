const IS_BROWSER = typeof window !== 'undefined';

/**
 * Sends a single analytics event to the new proof-of-play endpoint.
 * This is a "fire and forget" function. The player's job is to report the event;
 * the server is responsible for all processing and validation.
 * This new version abandons the old, complex batching system.
 */
export const trackEvent = (
  deviceId: string,
  eventType: "media_start" | "media_end" | "media_error" | "screen_online" | "heartbeat",
  media?: any,
  playlist?: any,
  additionalMetadata: Record<string, any> = {}
) => {
  // Ensure this code only runs in the browser.
  if (!IS_BROWSER) {
    return;
  }

  // Use setTimeout to ensure the call is non-blocking and doesn't interfere with UI updates.
  setTimeout(() => {
    const eventPayload = {
      device_id: deviceId,
      event_type: eventType,
      media_id: media?.media?.id || null,
      // The playlist_id is not used in the new proof_of_play table, but we keep it for potential future use.
      playlist_id: playlist?.id || null,
      created_at: new Date().toISOString(),
      metadata: {
        ...additionalMetadata,
        user_agent: navigator.userAgent,
        screen_resolution: `${window.screen.width}x${window.screen.height}`,
      },
    };

    // Send the event to the new, dedicated proof-of-play endpoint.
    // We use `keepalive: true` to increase the chance of the request succeeding
    // even if the page is being closed or navigated away from.
    fetch("/api/proof-of-play/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventPayload),
      keepalive: true,
    }).catch(error => {
      // We log the error but don't retry. The server's heartbeat mechanism
      // is the source of truth for online/offline status, not the player's ability to send an event.
      console.error("[Analytics] Failed to send event. This is expected if offline:", error);
    });
  }, 0);
};

// The initializeAnalytics function is no longer needed with this simpler, direct-sending approach.
// You can remove any calls to it.
export const initializeAnalytics = () => {};
