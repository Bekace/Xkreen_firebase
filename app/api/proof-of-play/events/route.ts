import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// A helper function to determine device status based on your business logic.
const getPlayType = (lastHeartbeat: string | null): "online" | "offline" => {
  if (!lastHeartbeat) {
    return "offline";
  }
  const lastHeartbeatTime = new Date(lastHeartbeat).getTime();
  const now = new Date().getTime();
  const twoMinutesInMs = 2 * 60 * 1000;

  if (now - lastHeartbeatTime <= twoMinutesInMs) {
    return "online";
  }
  return "offline";
};


// This is the new, clean endpoint for handling events destined for the proof_of_play table.
export async function POST(request: Request) {
  try {
    const event = await request.json();

    // Basic validation
    if (!event || !event.device_id || !event.event_type) {
      return NextResponse.json({ error: "Invalid event payload" }, { status: 400 });
    }

    const cookieStore = await cookies(); // CORRECTED: Added await
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        // CORRECTED: Provided the full cookie handler object
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      }
    );

    // --- Main Logic: Handle events based on their type ---

    if (event.event_type === 'media_start') {
      // For a `media_start`, we create a new record in the proof_of_play table.

      if (!event.media_id) {
        return NextResponse.json({ error: "media_id is required for media_start event" }, { status: 400 });
      }

      // 1. Get the device to determine user_id and play_type
      const { data: device, error: deviceError } = await supabase
        .from('devices')
        .select('user_id, last_heartbeat')
        .eq('id', event.device_id)
        .single();

      if (deviceError || !device) {
        console.error("[proof-of-play] Device not found for media_start:", { device_id: event.device_id, error: deviceError });
        return NextResponse.json({ error: "Device not found" }, { status: 404 });
      }

      // 2. Insert the new playback record
      const { error: insertError } = await supabase.from('proof_of_play').insert({
        device_id: event.device_id,
        media_id: event.media_id,
        user_id: device.user_id,
        start_time: new Date().toISOString(),
        play_type: getPlayType(device.last_heartbeat),
        is_complete: false, // This is the crucial starting state
      });

      if (insertError) {
        console.error("[proof-of-play] Failed to insert media_start record:", { error: insertError });
        return NextResponse.json({ error: "Failed to create playback record", details: insertError.message }, { status: 500 });
      }

      return NextResponse.json({ status: "playback_started" });

    } else if (event.event_type === 'media_end') {
      // For a `media_end`, we find the existing record and complete it.

      if (!event.media_id) {
        return NextResponse.json({ error: "media_id is required for media_end event" }, { status: 400 });
      }

      // 1. Find the playback that is currently in-progress.
      const { data: play, error: findError } = await supabase
        .from('proof_of_play')
        .select('id, start_time')
        .eq('device_id', event.device_id)
        .eq('media_id', event.media_id)
        .eq('is_complete', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (findError || !play) {
        // This is an "orphan" media_end. It has no matching start. We can safely ignore it.
        console.warn("[proof-of-play] Orphan media_end event ignored:", event);
        return NextResponse.json({ status: "orphan_event_ignored" });
      }

      // 2. Calculate the duration and prepare the update.
      const startTime = new Date(play.start_time).getTime();
      const endTime = new Date();
      const duration_seconds = Math.round((endTime.getTime() - startTime) / 1000);

      // 3. Update the record to mark it as complete.
      const { error: updateError } = await supabase
        .from('proof_of_play')
        .update({
          end_time: endTime.toISOString(),
          is_complete: true,
          duration_seconds: duration_seconds,
        })
        .eq('id', play.id);

      if (updateError) {
        console.error("[proof-of-play] Failed to complete playback record:", { error: updateError });
        return NextResponse.json({ error: "Failed to complete playback record", details: updateError.message }, { status: 500 });
      }

      return NextResponse.json({ status: "playback_completed" });

    }

    // For any other event types, we just acknowledge them without taking action.
    return NextResponse.json({ status: "event_acknowledged" });

  } catch (error: any) {
    console.error("[proof-of-play] Internal server error:", error);
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 });
  }
}
