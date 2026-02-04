# Route Discrepancies - v1 (Original) vs v2 (Current Broken)

## File: /app/api/devices/config/[deviceCode]/route.ts

### Discrepancies Found:

<!-- Add your discrepancies here -->
screens select list differs

v1: id, name, orientation, status, media_id, content_type, enable_audio_management

v2: v1 fields + shuffle, is_active, scale_image, scale_video, scale_document, background_color, default_transition

Non-asset branching differs

v1: else { ... } (always attempts playlist lookup when not asset)

v2: else if (screen.content_type === "playlist" || !screen.content_type) { ... } (skips playlist lookup for other content types)

screen_media.media field selection differs

v1: file_path, mime_type, file_size

v2: url, type, size

Fallback media field selection differs

v1: file_path, mime_type, file_size

v2: url, type, size

playlist_items.media field selection differs

v1: file_path, mime_type, file_size

v2: url, type, size

screen_playlists -> playlists join selection differs

v1: id, name, background_color, is_active, scale_image, scale_video, scale_document, shuffle, default_transition

v2: id, name, is_active

Asset-mode “virtual playlist” object differs

v1: includes background_color, scale_image, scale_video, scale_document, shuffle, default_transition

v2: includes only id, name, is_active

Response screen.content differs

v1: returns playlistContent directly

v2: returns transformedContent (maps url→file_path, size→file_size, type→mime_type)

Response screen.playlist differs

v1: returns activePlaylist as fetched/constructed

v2: returns playlistWithSettings (injects background_color, scale_*, shuffle, default_transition from screen)

Response screen object fields differ

v1: id, name, orientation, status, enable_audio_management, playlist, content

v2: v1 fields + shuffle, is_active, scale_image, scale_video, scale_document, background_color, default_transition

Defaults source differs for playlist settings in response

v1: defaults are defined in the virtual playlist object (asset-mode) and playlist settings come from playlists join

v2: playlist settings in response default from screen.* with fallbacks (|| "#000000", || "fit", ?? false, || "fade")
