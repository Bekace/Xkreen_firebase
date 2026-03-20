import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  try {
    // Attempt to update the session
    return await updateSession(request);
  } catch (error) {
    // Log the error for debugging purposes
    console.error("Middleware error:", error);

    // If updateSession fails, gracefully continue to the requested page.
    // This prevents the entire app from crashing due to a network or auth error.
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
