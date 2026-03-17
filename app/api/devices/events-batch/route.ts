
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { events } = await request.json();

  if (!events || !Array.isArray(events) || events.length === 0) {
    return NextResponse.json({ error: "No events provided" }, { status: 400 });
  }

  // The client now provides the correct timestamp (created_at). 
  // We will trust the client's timestamp.
  // We just need to ensure the play_type is correctly set for batch-processed events.
  const processedEvents = events.map((event) => ({
    ...event,
    metadata: {
      ...event.metadata,
      play_type: "offline", // All events from this endpoint are considered offline
    },
  }));

  const supabase = await createClient();
  const { error } = await supabase.from("device_events").insert(processedEvents);

  if (error) {
    console.error("[Batch Events] Error inserting events:", error);
    return NextResponse.json(
      { error: "Failed to record batch events" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, count: processedEvents.length });
}
