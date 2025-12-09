import { redirect } from "next/navigation"

export default function SettingsPage() {
  // Redirect to general settings by default
  redirect("/dashboard/settings/general")
}
