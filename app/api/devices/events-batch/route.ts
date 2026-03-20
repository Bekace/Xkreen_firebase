
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const { events } = await request.json();

  if (!events || !Array.isArray(events) || events.length === 0) {
    return NextResponse.json({ error: "No events provided" }, { status: 400 });
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
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );

  try {
    // 1. Extract all unique device IDs from the batch
    const deviceIds = [...new Set(events.map((e: any) => e.device_id).filter(Boolean))];
    
    // 2. Fetch the latest heartbeats for all those devices at once
    const { data: devices, error: deviceError } = await supabase
      .from('devices')
      .select('id, last_heartbeat')
      .in('id', deviceIds as string[]);

    if (deviceError) {
      console.error("[Batch Events] Error fetching device heartbeats:", deviceError);
      return NextResponse.json({ error: "Failed to validate devices" }, { status: 500 });
    }

    // Create a quick lookup map for device heartbeats
    const heartbeatMap = (devices || []).reduce((acc: any, device: any) => {
      acc[device.id] = device.last_heartbeat;
      return acc;
    }, {});

    const now = new Date().getTime();
    const twoMinutesInMs = 2 * 60 * 1000;

    // 3. Process each event and inject the server-verified status
    const processedEvents = events.map((event: any) => {
      let isOnline = false;
      const deviceHeartbeat = heartbeatMap[event.device_id];

      if (deviceHeartbeat) {
        const lastHeartbeat = new Date(deviceHeartbeat).getTime();
        isOnline = (now - lastHeartbeat) <= twoMinutesInMs;
      }

      return {
        ...event,
        metadata: {
          ...(event.metadata || {}),
          play_type: isOnline ? "online" : "offline"
        }
      };
    });

    // 4. Insert the verified events
    const { error } = await supabase.from("device_events").insert(processedEvents);

    if (error) {
      console.error("[Batch Events] Error inserting events:", error);
      return NextResponse.json(
        { error: "Failed to record batch events" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, count: processedEvents.length });

  } catch (error) {
    console.error("[Batch Events] Internal server error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
