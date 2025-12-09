import type React from "react"
import { SettingsSidebar } from "@/components/dashboard/settings-sidebar"

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-border/50 pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-12">
        {/* Left sidebar navigation */}
        <SettingsSidebar />

        {/* Right content area */}
        <div className="flex-1 max-w-3xl">{children}</div>
      </div>
    </div>
  )
}
