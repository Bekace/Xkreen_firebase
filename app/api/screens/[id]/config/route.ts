import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const cookieStore = cookies()
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    })

    const { data: screen, error: screenError } = await supabase.from("screens").select("*").eq("id", id).single()

    if (screenError || !screen) {
      return NextResponse.json({ error: "Screen not found" }, { status: 404 })
    }

    const { data: screenPlaylist, error: playlistError } = await supabase
      .from("screen_playlists")
      .select(`
        playlist_id,
        playlists (
          id,
          name,
          background_color
        )
      `)
      .eq("screen_id", id)
      .eq("is_active", true)
      .single()

    if (playlistError || !screenPlaylist) {
      return NextResponse.json({ error: "No active playlist found for screen" }, { status: 404 })
    }

    const { data: items, error: itemsError } = await supabase
      .from("playlist_items")
      .select("*")
      .eq("playlist_id", screenPlaylist.playlist_id)
      .order("position", { ascending: true })

    if (itemsError) {
      return NextResponse.json({ error: "Failed to fetch playlist items" }, { status: 500 })
    }

    const config = {
      screen: {
        id: screen.id,
        name: screen.name,
        location: screen.location,
        background_color: screen.background_color || "#000000",
      },
      playlist: {
        id: screenPlaylist.playlists.id,
        name: screenPlaylist.playlists.name,
        background_color: screenPlaylist.playlists.background_color || "#000000",
      },
      items: items || [],
    }

    return NextResponse.json(config)
  } catch (error) {
    console.error("Error in screen config API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
