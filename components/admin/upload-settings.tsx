"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { HardDrive, FileCheck, Settings, Save, RefreshCw } from "lucide-react"

interface UploadSettings {
  id: string
  max_file_size: number
  allowed_file_types: string[]
  enforce_globally: boolean
  created_at: string
  updated_at: string
}

const FILE_TYPE_OPTIONS = [
  { value: "image/jpeg", label: "JPEG Images" },
  { value: "image/jpg", label: "JPG Images" },
  { value: "image/png", label: "PNG Images" },
  { value: "image/gif", label: "GIF Images" },
  { value: "image/webp", label: "WebP Images" },
  { value: "image/svg+xml", label: "SVG Images" },
  { value: "video/mp4", label: "MP4 Videos" },
  { value: "video/mpeg", label: "MPEG Videos" },
  { value: "video/quicktime", label: "QuickTime Videos" },
  { value: "video/webm", label: "WebM Videos" },
  { value: "video/x-msvideo", label: "AVI Videos" },
  { value: "application/pdf", label: "PDF Documents" },
]

export function UploadSettings() {
  const [settings, setSettings] = useState<UploadSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [maxFileSizeMB, setMaxFileSizeMB] = useState<number>(10)
  const [allowedTypes, setAllowedTypes] = useState<string[]>([])
  const [enforceGlobally, setEnforceGlobally] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/upload-settings")
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
        setMaxFileSizeMB(Math.round(data.max_file_size / (1024 * 1024)))
        setAllowedTypes(data.allowed_file_types)
        setEnforceGlobally(data.enforce_globally)
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch upload settings",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error fetching upload settings:", error)
      toast({
        title: "Error",
        description: "Failed to fetch upload settings",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    try {
      setSaving(true)

      const response = await fetch("/api/admin/upload-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          max_file_size: maxFileSizeMB * 1024 * 1024,
          allowed_file_types: allowedTypes,
          enforce_globally: enforceGlobally,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSettings(data)
        toast({
          title: "Success",
          description: "Upload settings updated successfully. Changes will apply immediately.",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to update upload settings",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error saving upload settings:", error)
      toast({
        title: "Error",
        description: "Failed to update upload settings",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const toggleFileType = (type: string) => {
    setAllowedTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Upload Settings
          </h2>
          <p className="text-muted-foreground mt-1">Configure global file upload limits and restrictions</p>
        </div>
        <Button onClick={fetchSettings} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Maximum File Size
          </CardTitle>
          <CardDescription>
            Set the maximum file size allowed for uploads. This limit applies based on enforcement mode.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="max-file-size">Maximum File Size (MB)</Label>
            <Input
              id="max-file-size"
              type="number"
              min="1"
              max="1000"
              value={maxFileSizeMB}
              onChange={(e) => setMaxFileSizeMB(Number.parseInt(e.target.value) || 1)}
              className="max-w-xs"
            />
            <p className="text-sm text-muted-foreground">
              Current: {maxFileSizeMB} MB ({(maxFileSizeMB * 1024 * 1024).toLocaleString()} bytes)
            </p>
          </div>

          <div className="flex items-center space-x-2 pt-4 border-t">
            <Switch id="enforce-globally" checked={enforceGlobally} onCheckedChange={setEnforceGlobally} />
            <div className="flex-1">
              <Label htmlFor="enforce-globally" className="cursor-pointer">
                Enforce Globally
              </Label>
              <p className="text-sm text-muted-foreground">
                {enforceGlobally
                  ? "Global limits override individual subscription plan limits"
                  : "Users are limited by their subscription plan limits"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="w-5 h-5" />
            Allowed File Types
          </CardTitle>
          <CardDescription>
            Select which file types are allowed for upload. Users can only upload files matching these types.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium">
                {allowedTypes.length} of {FILE_TYPE_OPTIONS.length} types enabled
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAllowedTypes(FILE_TYPE_OPTIONS.map((t) => t.value))}
                >
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={() => setAllowedTypes([])}>
                  Clear All
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {FILE_TYPE_OPTIONS.map((option) => {
                const isSelected = allowedTypes.includes(option.value)
                return (
                  <div
                    key={option.value}
                    onClick={() => toggleFileType(option.value)}
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                      isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <span className="text-sm font-medium">{option.label}</span>
                    {isSelected && (
                      <Badge variant="default" className="text-xs">
                        Enabled
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={fetchSettings} disabled={loading || saving}>
          Cancel
        </Button>
        <Button onClick={handleSaveSettings} disabled={saving || allowedTypes.length === 0}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  )
}
