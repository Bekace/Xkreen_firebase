/**
 * Ayudante de analíticas para estandarizar el seguimiento de eventos desde el reproductor.
 *
 * @param deviceCode El código del dispositivo que envía el evento.
 * @param eventType El tipo de evento a enviar (p. ej., 'media_start').
 * @param media El ítem de medios relacionado con el evento (tipo MediaItem).
 * @param playlist La lista de reproducción relacionada con el evento.
 * @param additionalMetadata Cualquier otro dato a incluir en el evento.
 */
export const trackEvent = async (
  deviceCode: string,
  eventType: "media_start" | "media_end" | "media_error" | "screen_online",
  media?: any,
  playlist?: any,
  additionalMetadata: Record<string, any> = {}
) => {
  // El evento 'media' tiene un objeto 'media' anidado. El ID correcto está en media.media.id
  const mediaId = media?.media?.id || null;

  const eventPayload = {
    device_code: deviceCode,
    event_type: eventType,
    media_id: mediaId,
    playlist_id: playlist?.id || null,
    metadata: {
      ...additionalMetadata,
      client_timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
      screen_resolution: `${window.screen.width}x${window.screen.height}`,
      play_type: "online",
    },
  };

  try {
    const response = await fetch("/api/devices/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventPayload),
      keepalive: true,
    });
    
    // Si la respuesta no es OK, muestra un error en la consola para depuración.
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: "Failed to parse error response" }));
      console.error("[Analytics] API Error:", response.status, errorBody);
    }

  } catch (error) {
    console.error("[Analytics] Failed to send event:", error);
  }
};
