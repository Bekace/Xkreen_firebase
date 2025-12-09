export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Key, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function TokensSettingsPage() {
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

  return (
    <div className="space-y-6">
      {/* API Tokens */}
      <div className="rounded-lg border border-border/50 p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-muted/50 rounded-lg">
            <Key className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold mb-2">API Tokens</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Generate API tokens to access the Pointer API programmatically. Tokens have full access to your account.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
          <p className="text-sm text-muted-foreground">Coming soon</p>
          <Button size="sm" disabled>
            <Plus className="w-4 h-4 mr-2" />
            Create Token
          </Button>
        </div>
      </div>

      {/* Token List Placeholder */}
      <div className="rounded-lg border border-border/50 p-6">
        <h2 className="text-lg font-semibold mb-4">Your Tokens</h2>
        <div className="text-center py-8">
          <Key className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">No API tokens yet. Create your first token to get started.</p>
        </div>
      </div>

      {/* Documentation */}
      <div className="rounded-lg border border-border/50 p-6">
        <h2 className="text-lg font-semibold mb-2">API Documentation</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Learn how to use the Pointer API to manage your screens, playlists, and media programmatically.
        </p>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
          <p className="text-sm text-muted-foreground">Coming soon</p>
          <Button size="sm" variant="outline" disabled>
            View Docs
          </Button>
        </div>
      </div>
    </div>
  )
}
