import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const singleEvent = await request.json();

    if (!singleEvent || typeof singleEvent !== 'object') {
      return NextResponse.json({ error: "Invalid event payload" }, { status: 400 });
    }

    // Sanitize the single event before insertion
    let metadata = singleEvent.metadata;
    if (typeof metadata === 'string') {
      try {
        metadata = JSON.parse(metadata);
      } catch (e) {
        console.error("Failed to parse metadata string:", metadata);
        // Handle error appropriately
      }
    }
    
    const sanitizedEvent = {
      ...singleEvent,
      metadata,
    };

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("device_events")
      .insert([sanitizedEvent]); // Insert as an array with one element

    if (error) {
      console.error("[Events-Single] Error inserting event:", error);
      return NextResponse.json({ error: "Failed to insert event", details: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Event processed successfully" });

  } catch (error) {
    console.error("[Events-Single] Internal server error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
