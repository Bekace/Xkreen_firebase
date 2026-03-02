// Helper function to transform screen data structure
export const transformScreenData = (screen: any) => {
  // Extract active playlist from screen_playlists array
  const activePlaylist = screen.screen_playlists?.find((sp: any) => sp.is_active)?.playlists

  return {
    ...screen,
    playlists: activePlaylist || null,
    playlist_id: activePlaylist?.id || null,
    media_id: screen.media_id || null,
    screen_playlists: screen.screen_playlists || [],
    screen_media: screen.screen_media || [],
    screen_schedules: screen.screen_schedules || [],
  }
}
