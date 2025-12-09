import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

declare global {
  var supabaseClient: SupabaseClient | undefined
}

export function createClient() {
  if (typeof window === "undefined") {
    // Server-side: always create a new client
    return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  }

  // Client-side: use singleton pattern with global variable
  if (!globalThis.supabaseClient) {
    globalThis.supabaseClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  }

  return globalThis.supabaseClient
}
