"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { User, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

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
  const [bio, setBio] = useState(initialData.bio)
  const [avatarUrl, setAvatarUrl] = useState(initialData.avatar_url)
  const [saving, setSaving] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const router = useRouter()

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload avatar")
      }

      setAvatarUrl(data.url)
      toast({
        title: "Avatar updated",
        description: "Your avatar has been uploaded successfully.",
      })
      router.refresh()
    } catch (error) {
      console.error("[v0] Avatar upload error:", error)
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload avatar",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleSaveFullName = async () => {
    setSaving("full_name")
    try {
      const response = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fullName }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update name")
      }

      toast({
        title: "Name updated",
        description: "Your display name has been saved.",
      })
      router.refresh()
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update name",
        variant: "destructive",
      })
    } finally {
      setSaving(null)
    }
  }

  const handleSaveCompanyName = async () => {
    setSaving("company_name")
    try {
      const response = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_name: companyName }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update company name")
      }

      toast({
        title: "Company name updated",
        description: "Your company name has been saved.",
      })
      router.refresh()
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update company name",
        variant: "destructive",
      })
    } finally {
      setSaving(null)
    }
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
          <div className="relative">
            <Avatar
              className="w-20 h-20 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleAvatarClick}
            >
              <AvatarImage src={avatarUrl || "/placeholder.svg"} />
              <AvatarFallback className="bg-muted">
                <User className="w-8 h-8 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
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
