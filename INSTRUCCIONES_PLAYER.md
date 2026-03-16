# Instrucciones para Instrumentar el Reproductor Web

Este documento detalla los pasos para agregar el seguimiento de analíticas (Proof of Play) al reproductor web.

## Resumen del Problema

El reproductor web (`app/player/[deviceCode]/page.tsx`) actualmente muestra contenido (videos, imágenes) pero no envía ningún evento de analítica. Esto significa que no se registra cuándo un medio comienza o termina de reproducirse, dejando la tabla `device_events` vacía y el dashboard de analíticas sin datos.

## Estrategia de Solución

Implementaremos un sistema de seguimiento de eventos modificando tres archivos clave. Los cambios están diseñados para ser seguros, eficientes y fáciles de entender.

---

### Paso 1: Crear un Ayudante de Analíticas (`lib/analytics.ts`)

**Propósito:** Centralizar la lógica para enviar eventos a la API. Esto evita duplicar código y facilita el mantenimiento.

**Acción:** Crear un nuevo archivo en `lib/analytics.ts` con el siguiente contenido.

```typescript
/**
 * Ayudante de analíticas para estandarizar el seguimiento de eventos desde el reproductor.
 *
 * @param deviceCode El código del dispositivo que envía el evento.
 * @param eventType El tipo de evento a enviar (p. ej., 'media_start').
 * @param media El ítem de medios relacionado con el evento.
 * @param playlist La lista de reproducción relacionada con el evento.
 * @param additionalMetadata Cualquier otro dato a incluir en el evento.
 */
export const trackEvent = async (
  deviceCode: string,
  eventType: "media_start" | "media_end" | "media_error" | "device_online",
  media?: any,
  playlist?: any,
  additionalMetadata: Record<string, any> = {}
) => {
  const eventPayload = {
    device_code: deviceCode,
    event_type: eventType,
    media_id: media?.id,
    playlist_id: playlist?.id,
    metadata: {
      ...additionalMetadata,
      // Capturar contexto útil del lado del cliente automáticamente
      client_timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
      screen_resolution: `${window.screen.width}x${window.screen.height}`,
      play_type: "online", // Marcar que este evento ocurrió desde el reproductor web
    },
  };

  try {
    // Usamos fetch con keepalive para asegurar que la solicitud se envíe
    // incluso si la página se está cerrando. Es una solicitud no bloqueante.
    await fetch("/api/devices/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventPayload),
      keepalive: true,
    });
  } catch (error) {
    // Si la analítica falla, la experiencia del usuario no debe ser afectada.
    console.error("[Analytics] Fallo al enviar evento:", error);
  }
};
```

---

### Paso 2: Instrumentar el Reproductor de YouTube

**Propósito:** Disparar los eventos `media_start` y `media_end` desde el componente que reproduce videos de YouTube.

**Acción:** Modificar el archivo `components/youtube-player-with-fallback.tsx`.

Se importará `trackEvent` y se llamará en los momentos apropiados del ciclo de vida del video (`onStateChange`).

---

### Paso 3: Instrumentar el Reproductor de Video Estándar

**Propósito:** Disparar los eventos `media_start` y `media_end` para videos que no son de YouTube (archivos .mp4, etc.).

**Acción:** Modificar el archivo `app/player/[deviceCode]/page.tsx`.

Se importará `trackEvent` y se usarán los eventos `onPlay` y `onEnded` del elemento `<video>` de HTML5 para llamar a la función de seguimiento.

---

## Próximos Pasos

1.  **Crear Copias de Seguridad:** Se crearán copias de los archivos que serán modificados (`.bak`).
2.  **Aplicar Cambios:** Se aplicará el código descrito anteriormente a los archivos correspondientes.
3.  **Verificación:** Se verificará que los eventos se registran correctamente en la base de datos.
