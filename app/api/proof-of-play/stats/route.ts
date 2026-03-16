
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("timeRange") || "24h";

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Corrected Query to get user's device IDs by joining with screens
    const { data: devices, error: deviceError } = await supabase
      .from("devices")
      .select("id, screens!inner(user_id)")
      .eq("screens.user_id", user.id);

    if (deviceError) {
      console.error("[PoP-Stats] Error fetching devices:", deviceError);
      return NextResponse.json({ error: "Failed to fetch devices" }, { status: 500 });
    }

    if (!devices || devices.length === 0) {
      // Return all zeros if user has no devices
      return NextResponse.json({
        summary: {
          online_plays: 0,
          offline_plays: 0,
          total_plays: 0,
          completed_plays: 0,
          success_rate: "0",
        },
        time_range: timeRange,
      });
    }

    const deviceIds = devices.map((d) => d.id);

    const now = new Date();
    let startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24h
    if (timeRange === "7d") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeRange === "30d") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
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

    // Initialize counters
    let totalStarts = 0;
    let totalEnds = 0;
    let onlinePlays = 0;
    let offlinePlays = 0;

    // Process events
    for (const event of events) {
      if (event.event_type === "media_start") {
        totalStarts++;
        // Check metadata for play type, default to online if not specified
        if (event.metadata?.play_type === 'offline') {
          offlinePlays++;
        } else {
          onlinePlays++;
        }
      }
      if (event.event_type === "media_end") {
        totalEnds++;
      }
    }

    // Calculate success rate
    const successRate = totalStarts > 0 ? ((totalEnds / totalStarts) * 100).toFixed(0) : "0";

    return NextResponse.json({
      summary: {
        online_plays: onlinePlays,
        offline_plays: offlinePlays,
        total_plays: totalStarts, // Total plays are now based on media_start events
        completed_plays: totalEnds,
        success_rate: successRate,
      },
      time_range: timeRange,
    });

  } catch (error) {
    console.error("[PoP-Stats] Internal server error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
