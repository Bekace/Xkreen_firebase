import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const singleEvent = await request.json();

    if (!singleEvent || typeof singleEvent !== 'object' || !singleEvent.device_id) {
      return NextResponse.json({ error: "Invalid event payload" }, { status: 400 });
    }

    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
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

    // 1. Fetch the device's last heartbeat to determine true online status
    const { data: device, error: deviceError } = await supabase
      .from("devices")
      .select("last_heartbeat")
      .eq("id", singleEvent.device_id)
      .single();

    if (deviceError) {
      console.error("[Events-Single] Error fetching device heartbeat:", deviceError);
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    // 2. Calculate if the device is considered online (heartbeat within last 2 minutes)
    let isOnline = false;
    if (device && device.last_heartbeat) {
      const lastHeartbeat = new Date(device.last_heartbeat).getTime();
      const now = new Date().getTime();
      const twoMinutesInMs = 2 * 60 * 1000;
      isOnline = (now - lastHeartbeat) <= twoMinutesInMs;
    }

    // 3. Force the server's truth onto the event metadata
    const processedEvent = {
      ...singleEvent,
      metadata: {
        ...(singleEvent.metadata || {}),
        play_type: isOnline ? "online" : "offline"
      }
    };

    // 4. Insert the verified event
    const { error } = await supabase
      .from("device_events")
      .insert([processedEvent]);

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
