"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { Shield, Smartphone } from "lucide-react"

interface SecurityFormProps {
  userEmail: string
}

export function SecurityForm({ userEmail }: SecurityFormProps) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match." })
      return
    }

    if (newPassword.length < 8) {
      setMessage({ type: "error", text: "Password must be at least 8 characters." })
      return
    }

    setSaving(true)
    setMessage(null)

    const supabase = createClient()

    // Re-authenticate with current password first to get a fresh session
    const { data: userData } = await supabase.auth.getUser()
    const email = userData?.user?.email
    if (!email) {
      setMessage({ type: "error", text: "Could not retrieve your account. Please log in again." })
      setSaving(false)
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    })

    if (signInError) {
      setMessage({ type: "error", text: "Current password is incorrect." })
      setSaving(false)
      return
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      setMessage({ type: "error", text: error.message })
    } else {
      setMessage({ type: "success", text: "Password updated successfully." })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    }

    setSaving(false)
  }

  return (
    <div className="space-y-6">
      {/* Password Section */}
      <div className="rounded-lg border border-border/50 p-6">
        <h2 className="text-lg font-semibold mb-2">Change Password</h2>
        <p className="text-sm text-muted-foreground mb-4">Update your password to keep your account secure.</p>

        <div className="space-y-4 max-w-md">
          <div>
            <label className="text-sm font-medium mb-2 block">Current Password</label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="bg-muted/30"
              placeholder="Enter current password"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">New Password</label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-muted/30"
              placeholder="Enter new password"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Confirm New Password</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-muted/30"
              placeholder="Confirm new password"
            />
          </div>
        </div>

        {message && (
          <p className={`text-sm mt-4 ${message.type === "error" ? "text-destructive" : "text-primary"}`}>
            {message.text}
          </p>
        )}

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
          <p className="text-sm text-muted-foreground">Password must be at least 8 characters.</p>
          <Button onClick={handleChangePassword} disabled={saving} size="sm">
            {saving ? "Updating..." : "Update Password"}
          </Button>
        </div>
      </div>

      {/* Two-Factor Authentication - Placeholder */}
      <div className="rounded-lg border border-border/50 p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-muted/50 rounded-lg">
            <Smartphone className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold mb-2">Two-Factor Authentication</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Add an extra layer of security to your account by enabling two-factor authentication.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
          <p className="text-sm text-muted-foreground">Coming soon</p>
          <Button size="sm" disabled>
            Enable 2FA
          </Button>
        </div>
      </div>

      {/* Active Sessions - Placeholder */}
      <div className="rounded-lg border border-border/50 p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-muted/50 rounded-lg">
            <Shield className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold mb-2">Active Sessions</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Manage your active sessions and sign out of other devices.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
          <p className="text-sm text-muted-foreground">Coming soon</p>
          <Button size="sm" variant="destructive" disabled>
            Sign Out All Devices
          </Button>
        </div>
      </div>
    </div>
  )
}
