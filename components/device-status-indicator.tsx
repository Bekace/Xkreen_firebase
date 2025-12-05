"use client"

import { Badge } from "@/components/ui/badge"
import { Wifi, WifiOff, CheckCircle, Monitor } from "lucide-react"

interface DeviceStatusIndicatorProps {
  status: "online" | "offline" | "paired" | "unpaired"
  lastSeen?: string | null
  showLastSeen?: boolean
  size?: "sm" | "md" | "lg"
}

export function DeviceStatusIndicator({
  status,
  lastSeen,
  showLastSeen = false,
  size = "md",
}: DeviceStatusIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "online":
        return {
          color: "bg-green-100 text-green-800 border-green-200",
          icon: <Wifi className="h-3 w-3 mr-1 text-green-600" />,
          label: "Online",
          description: "Device connected and active",
        }
      case "paired":
        return {
          color: "bg-blue-100 text-blue-800 border-blue-200",
          icon: <CheckCircle className="h-3 w-3 mr-1 text-blue-600" />,
          label: "Paired",
          description: "Device paired but not active",
        }
      case "offline":
        return {
          color: "bg-red-100 text-red-800 border-red-200",
          icon: <WifiOff className="h-3 w-3 mr-1 text-red-600" />,
          label: "Offline",
          description: "Device disconnected",
        }
      case "unpaired":
        return {
          color: "bg-gray-100 text-gray-800 border-gray-200",
          icon: <Monitor className="h-3 w-3 mr-1 text-gray-600" />,
          label: "Unpaired",
          description: "Waiting for device pairing",
        }
      default:
        return {
          color: "bg-gray-100 text-gray-800 border-gray-200",
          icon: <Monitor className="h-3 w-3 mr-1 text-gray-600" />,
          label: "Unknown",
          description: "Status unknown",
        }
    }
  }

  const formatLastSeen = (lastSeen: string | null) => {
    if (!lastSeen) return "Never"

    const now = new Date()
    const lastSeenDate = new Date(lastSeen)
    const diffInMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  const config = getStatusConfig()
  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-2.5 py-1.5",
    lg: "text-base px-3 py-2",
  }

  return (
    <div className="flex items-center gap-2">
      <Badge className={`${config.color} border ${sizeClasses[size]} flex items-center`}>
        {config.icon}
        {config.label}
      </Badge>

      {showLastSeen && lastSeen && <span className="text-xs text-muted-foreground">{formatLastSeen(lastSeen)}</span>}

      {status === "online" && (
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-green-600">Live</span>
        </div>
      )}
    </div>
  )
}
