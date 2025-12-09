"use client"

import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Mail, Bell, Monitor } from "lucide-react"

export function NotificationsForm() {
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [screenAlerts, setScreenAlerts] = useState(true)
  const [weeklyDigest, setWeeklyDigest] = useState(false)
  const [marketingEmails, setMarketingEmails] = useState(false)

  return (
    <div className="space-y-6">
      {/* Email Notifications */}
      <div className="rounded-lg border border-border/50 p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-muted/50 rounded-lg">
            <Mail className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-1">Email Notifications</h2>
                <p className="text-sm text-muted-foreground">
                  Receive email notifications about your account activity.
                </p>
              </div>
              <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} disabled />
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-4 pt-4 border-t border-border/50">Coming soon</p>
      </div>

      {/* Screen Alerts */}
      <div className="rounded-lg border border-border/50 p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-muted/50 rounded-lg">
            <Monitor className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-1">Screen Alerts</h2>
                <p className="text-sm text-muted-foreground">Get notified when a screen goes offline or has issues.</p>
              </div>
              <Switch checked={screenAlerts} onCheckedChange={setScreenAlerts} disabled />
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-4 pt-4 border-t border-border/50">Coming soon</p>
      </div>

      {/* Weekly Digest */}
      <div className="rounded-lg border border-border/50 p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-muted/50 rounded-lg">
            <Bell className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-1">Weekly Digest</h2>
                <p className="text-sm text-muted-foreground">Receive a weekly summary of your screen analytics.</p>
              </div>
              <Switch checked={weeklyDigest} onCheckedChange={setWeeklyDigest} disabled />
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-4 pt-4 border-t border-border/50">Coming soon</p>
      </div>

      {/* Marketing Emails */}
      <div className="rounded-lg border border-border/50 p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-muted/50 rounded-lg">
            <Mail className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-1">Marketing Emails</h2>
                <p className="text-sm text-muted-foreground">Receive updates about new features and promotions.</p>
              </div>
              <Switch checked={marketingEmails} onCheckedChange={setMarketingEmails} disabled />
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-4 pt-4 border-t border-border/50">Coming soon</p>
      </div>
    </div>
  )
}
