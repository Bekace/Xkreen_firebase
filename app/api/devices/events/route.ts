import { NextResponse } from "next/server";

/**
 * POST /api/devices/events
 * AGGRESSIVE EMERGENCY STOP
 * This endpoint is temporarily disabled to prevent database saturation.
 * It now returns a 200 OK for any request and does nothing.
 */
export async function POST(request: Request) {
  // Return a success response immediately and perform no actions.
  return NextResponse.json({ status: "event_ingestion_paused_temporarily" });
}
