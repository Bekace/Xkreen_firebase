import { NextResponse } from "next/server";
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized: You must be logged in to record a play event.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { device_id, media_id, playlist_id, play_type } = await request.json();

    if (!device_id || !media_id || !play_type) {
      return new NextResponse(
        JSON.stringify({ error: 'Bad Request: Missing required fields (device_id, media_id, play_type).' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const { data: device, error: deviceError } = await supabase
      .from('proof_of_play_devices')
      .select('id')
      .eq('id', device_id)
      .eq('user_id', user.id)
      .single();

    if (deviceError || !device) {
      return new NextResponse(
        JSON.stringify({ error: 'Forbidden: You do not own this device or the device does not exist.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const { data: newPlay, error: insertError } = await supabase
      .from('proof_of_play')
      .insert({
        user_id: user.id,
        device_id,
        media_id,
        playlist_id,
        play_type,
      })
      .select()
      .single();

    if (insertError) {
      return new NextResponse(
        JSON.stringify({ error: `Database Error: ${insertError.message}` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return NextResponse.json(newPlay, { status: 201 });

  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'An unknown server error occurred.';
    console.error('[API CATCH] The POST proof-of-play route crashed:', e);
    return new NextResponse(
      JSON.stringify({ error: `Internal Server Error: ${errorMessage}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
