
// A more robust analytics library that uses localStorage to persist the event queue,
// ensuring that no events are lost even if the browser is closed or refreshed.

const EVENT_QUEUE_KEY = 'v0-analytics-queue';
let isSyncing = false;

// Function to get the queue from localStorage
const getQueue = (): any[] => {
  if (typeof window === 'undefined') return [];
  try {
    const storedQueue = window.localStorage.getItem(EVENT_QUEUE_KEY);
    return storedQueue ? JSON.parse(storedQueue) : [];
  } catch (error) {
    console.error('[Analytics] Error reading event queue from localStorage:', error);
    // If reading fails, it might be corrupt, so we clear it to prevent a loop.
    window.localStorage.removeItem(EVENT_QUEUE_KEY);
    return [];
  }
};

// Function to save the queue to localStorage
const saveQueue = (queue: any[]) => {
    if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(EVENT_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('[Analytics] Error saving event queue to localStorage:', error);
  }
};

// Function to sync the queue with the server
const syncOfflineEvents = async () => {
  // Only run in the browser
  if (typeof window === 'undefined' || isSyncing || !navigator.onLine) {
    return;
  }
  
  let queue = getQueue();
  if (queue.length === 0) {
      return;
  }

  isSyncing = true;
  
  // We'll sync in batches of 50 to avoid creating requests that are too large.
  const eventsToSync = queue.slice(0, 50);

  try {
    const response = await fetch("/api/devices/events-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: eventsToSync }),
      keepalive: true, // Useful for when the page is being closed
    });

    if (response.ok) {
      // If the sync was successful, remove the synced events from the queue.
      const remainingEvents = queue.slice(eventsToSync.length);
      saveQueue(remainingEvents);
      console.log(`[Analytics] Successfully synced ${eventsToSync.length} offline events.`);
      // If there are more events, try to sync them immediately.
      if (remainingEvents.length > 0) {
        // Use a timeout to avoid a synchronous loop and give the browser a break
        setTimeout(() => {
            isSyncing = false; // Reset sync flag before next attempt
            syncOfflineEvents();
        }, 100);
        return; // Exit to avoid flipping isSyncing back too early
      }
    } else {
      // If the API fails, the events remain in localStorage for the next try.
      const errorBody = await response.text();
      console.error("[Analytics] Batch API Error:", response.status, errorBody);
    }
  } catch (error) {
    // If the fetch itself fails, events also remain in localStorage.
    console.error("[Analytics] Failed to send batch event:", error);
  } finally {
    isSyncing = false;
  }
};

// Set up listeners and intervals when in a browser environment
if (typeof window !== 'undefined') {
  // When the browser comes online, trigger a sync.
  window.addEventListener('online', syncOfflineEvents);
  
  // Also, attempt to sync every 30 seconds as a fallback.
  setInterval(syncOfflineEvents, 30000);

  // Attempt a sync on page load, in case there are leftover events.
  setTimeout(syncOfflineEvents, 1000); // Delay slightly to ensure app is initialized
}

// The main event tracking function
export const trackEvent = async (
  deviceId: string,
  eventType: "media_start" | "media_end" | "media_error" | "screen_online" | "heartbeat",
  media?: any,
  playlist?: any,
  additionalMetadata: Record<string, any> = {}
) => {
  if (typeof window === 'undefined') {
      // Do not run on the server
      return;
  }

  const mediaId = media?.media?.id || null;
  const isOffline = !navigator.onLine;

  const eventPayload = {
    device_id: deviceId,
    event_type: eventType,
    media_id: mediaId,
    playlist_id: playlist?.id || null,
    created_at: new Date().toISOString(), // Add timestamp at creation
    metadata: {
      ...additionalMetadata,
      user_agent: navigator.userAgent,
      screen_resolution: `${window.screen.width}x${window.screen.height}`,
      play_type: isOffline ? "offline" : "online",
    },
  };
  
  // Add the event to the persistent queue.
  const queue = getQueue();
  queue.push(eventPayload);
  saveQueue(queue);

  console.log(`[Analytics] Event '${eventType}' queued. Queue size: ${queue.length}. Offline: ${isOffline}`);

  // Immediately try to sync the queue if we are online.
  if (!isOffline) {
    syncOfflineEvents();
  }
};
