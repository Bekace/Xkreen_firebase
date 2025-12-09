export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ProfileForm } from "@/components/dashboard/settings/profile-form"

export default async function ProfileSettingsPage() {
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
      <ProfileForm
        userId={user.id}
        initialData={{
          full_name: profile?.full_name || "",
          company_name: profile?.company_name || "",
          avatar_url: "", // Placeholder - field doesn't exist yet
          username: "", // Placeholder - field doesn't exist yet
          bio: "", // Placeholder - field doesn't exist yet
        }}
      />
    </div>
  )
}
