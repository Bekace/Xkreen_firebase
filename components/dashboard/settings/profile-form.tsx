"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase/client"
import { User } from "lucide-react"

interface ProfileFormProps {
  userId: string
  initialData: {
    full_name: string
    company_name: string
    avatar_url: string
    username: string
    bio: string
  }
}

export function ProfileForm({ userId, initialData }: ProfileFormProps) {
  const [fullName, setFullName] = useState(initialData.full_name)
  const [companyName, setCompanyName] = useState(initialData.company_name)
  const [username, setUsername] = useState(initialData.username)
  const [bio, setBio] = useState(initialData.bio)
  const [saving, setSaving] = useState<string | null>(null)

  const handleSaveFullName = async () => {
    setSaving("full_name")
    const supabase = createClient()
    await supabase
      .from("profiles")
      .update({ full_name: fullName, updated_at: new Date().toISOString() })
      .eq("id", userId)
    setSaving(null)
  }

  const handleSaveCompanyName = async () => {
    setSaving("company_name")
    const supabase = createClient()
    await supabase
      .from("profiles")
      .update({ company_name: companyName, updated_at: new Date().toISOString() })
      .eq("id", userId)
    setSaving(null)
  }

  return (
    <div className="space-y-6">
      {/* Avatar Section */}
      <div className="rounded-lg border border-border/50 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-2">Avatar</h2>
            <p className="text-sm text-muted-foreground mb-4">This is your avatar.</p>
            <p className="text-sm text-muted-foreground">Click on the avatar to upload a custom one from your files.</p>
          </div>
          <Avatar className="w-20 h-20 cursor-pointer hover:opacity-80 transition-opacity">
            <AvatarImage src={initialData.avatar_url || "/placeholder.svg"} />
            <AvatarFallback className="bg-muted">
              <User className="w-8 h-8 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
        </div>
        <p className="text-sm text-muted-foreground mt-4 pt-4 border-t border-border/50">
          An avatar is optional but strongly recommended.
        </p>
      </div>

      {/* Display Name Section */}
      <div className="rounded-lg border border-border/50 p-6">
        <h2 className="text-lg font-semibold mb-2">Display Name</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Please enter your full name, or a display name you are comfortable with.
        </p>
        <Input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="max-w-md bg-muted/30"
          maxLength={32}
        />
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
          <p className="text-sm text-muted-foreground">Please use 32 characters at maximum.</p>
          <Button onClick={handleSaveFullName} disabled={saving === "full_name"} size="sm">
            {saving === "full_name" ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Username Section - Placeholder */}
      <div className="rounded-lg border border-border/50 p-6">
        <h2 className="text-lg font-semibold mb-2">Username</h2>
        <p className="text-sm text-muted-foreground mb-4">This is your URL namespace within the platform.</p>
        <div className="flex items-center max-w-md">
          <span className="bg-muted/50 px-3 py-2 text-sm text-muted-foreground rounded-l-md border border-r-0 border-border/50">
            pointer.tv/
          </span>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="rounded-l-none bg-muted/30"
            placeholder="username"
            maxLength={48}
            disabled
          />
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
          <p className="text-sm text-muted-foreground">Coming soon - Please use 48 characters at maximum.</p>
          <Button size="sm" disabled>
            Save
          </Button>
        </div>
      </div>

      {/* Company Name Section */}
      <div className="rounded-lg border border-border/50 p-6">
        <h2 className="text-lg font-semibold mb-2">Company Name</h2>
        <p className="text-sm text-muted-foreground mb-4">Your company or organization name.</p>
        <Input
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          className="max-w-md bg-muted/30"
          maxLength={100}
        />
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
          <p className="text-sm text-muted-foreground">Please use 100 characters at maximum.</p>
          <Button onClick={handleSaveCompanyName} disabled={saving === "company_name"} size="sm">
            {saving === "company_name" ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Bio Section - Placeholder */}
      <div className="rounded-lg border border-border/50 p-6">
        <h2 className="text-lg font-semibold mb-2">Bio</h2>
        <p className="text-sm text-muted-foreground mb-4">A brief description about yourself or your business.</p>
        <Textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="max-w-md bg-muted/30 min-h-[100px]"
          placeholder="Tell us about yourself..."
          maxLength={500}
          disabled
        />
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
          <p className="text-sm text-muted-foreground">Coming soon - Please use 500 characters at maximum.</p>
          <Button size="sm" disabled>
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}
