
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("timeRange") || "today"; // Default to today

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's device IDs
    const { data: devices, error: deviceError } = await supabase
      .from("devices")
      .select("id, screens!inner(user_id)")
      .eq("screens.user_id", user.id);

    if (deviceError) {
      console.error("[PoP-Stats] Error fetching devices:", deviceError);
      return NextResponse.json({ error: "Failed to fetch devices" }, { status: 500 });
    }

    if (!devices || devices.length === 0) {
      return NextResponse.json({
        summary: { online_plays: 0, offline_plays: 0, total_plays: 0, completed_plays: 0, success_rate: "0" },
        time_range: timeRange,
      });
    }

    const deviceIds = devices.map((d) => d.id);

    const now = new Date();
    let startDate: Date;

    if (timeRange === 'today') {
      startDate = new Date();
      startDate.setUTCHours(0, 0, 0, 0); // Set to midnight UTC
    } else if (timeRange === '7d') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeRange === '30d') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      // Fallback for any other value, though UI will be fixed
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Fetch all relevant events for the user's devices in the time range
    const { data: events, error: eventsError } = await supabase
      .from("device_events")
      .select("event_type, metadata")
      .in("device_id", deviceIds)
      .gte("created_at", startDate.toISOString());

    if (eventsError) {
      console.error("[PoP-Stats] Error fetching events:", eventsError);
      return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
    }

    let onlineStarts = 0;
    let offlineStarts = 0;
    let onlineEnds = 0;
    let offlineEnds = 0;

    // Process events with corrected logic
    for (const event of events) {
      const isOfflinePlay = event.metadata?.play_type === 'offline';

      if (event.event_type === "media_start") {
        if (isOfflinePlay) {
          offlineStarts++;
        } else {
          onlineStarts++;
        }
      }
      
      if (event.event_type === "media_end") {
        if (isOfflinePlay) {
          offlineEnds++;
        } else {
          onlineEnds++;
        }
      }
    }
    
    const totalPlays = onlineStarts + offlineStarts;
    const completedPlays = onlineEnds + offlineEnds;

    // Calculate success rate based ONLY on online plays
    const successRate = onlineStarts > 0 ? ((onlineEnds / onlineStarts) * 100).toFixed(0) : "0";

    return NextResponse.json({
      summary: {
        online_plays: onlineStarts,
        offline_plays: offlineStarts,
        total_plays: totalPlays,
        completed_plays: completedPlays,
        success_rate: successRate,
      },
      time_range: timeRange,
    });

  } catch (error) {
    console.error("[PoP-Stats] Internal server error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
