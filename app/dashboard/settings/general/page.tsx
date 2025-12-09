export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function GeneralSettingsPage() {
  const supabase = await createClient()

  if (!supabase) {
    redirect("/auth/login")
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  // Fetch profile data
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  return (
    <div className="space-y-6">
      {/* Email Section */}
      <div className="rounded-lg border border-border/50 p-6">
        <h2 className="text-lg font-semibold mb-2">Email</h2>
        <p className="text-sm text-muted-foreground mb-4">Your email address is used for login and notifications.</p>
        <div className="bg-muted/30 rounded-md px-4 py-3">
          <p className="text-sm font-mono">{user.email}</p>
        </div>
        <p className="text-sm text-muted-foreground mt-3">Contact support to change your email address.</p>
      </div>

      {/* User ID Section */}
      <div className="rounded-lg border border-border/50 p-6">
        <h2 className="text-lg font-semibold mb-2">User ID</h2>
        <p className="text-sm text-muted-foreground mb-4">Your unique identifier in our system.</p>
        <div className="bg-muted/30 rounded-md px-4 py-3">
          <p className="text-sm font-mono">{user.id}</p>
        </div>
      </div>

      {/* Account Created Section */}
      <div className="rounded-lg border border-border/50 p-6">
        <h2 className="text-lg font-semibold mb-2">Account Created</h2>
        <p className="text-sm text-muted-foreground mb-4">The date when your account was created.</p>
        <div className="bg-muted/30 rounded-md px-4 py-3">
          <p className="text-sm">
            {new Date(user.created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Role Section */}
      {profile?.role && (
        <div className="rounded-lg border border-border/50 p-6">
          <h2 className="text-lg font-semibold mb-2">Role</h2>
          <p className="text-sm text-muted-foreground mb-4">Your current role and permissions level.</p>
          <div className="bg-muted/30 rounded-md px-4 py-3">
            <p className="text-sm capitalize">{profile.role}</p>
          </div>
        </div>
      )}
    </div>
  )
}
