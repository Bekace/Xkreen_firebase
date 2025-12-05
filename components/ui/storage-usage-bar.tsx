import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

interface StorageUsageBarProps {
  currentFormatted: number
  maxStorage: number
  storageUnit: string
  usagePercentage: number
  className?: string
}

export function StorageUsageBar({
  currentFormatted,
  maxStorage,
  storageUnit,
  usagePercentage,
  className,
}: StorageUsageBarProps) {
  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500"
    if (percentage >= 75) return "bg-yellow-500"
    return "bg-cyan-500"
  }

  const getBadgeVariant = (percentage: number) => {
    if (percentage >= 90) return "destructive"
    if (percentage >= 75) return "secondary"
    return "default"
  }

  const formatStorageDisplay = () => {
    if (maxStorage === -1) return "Unlimited"

    let maxStorageFormatted: number
    if (storageUnit === "GB") {
      maxStorageFormatted = maxStorage / (1024 * 1024 * 1024)
    } else if (storageUnit === "MB") {
      maxStorageFormatted = maxStorage / (1024 * 1024)
    } else if (storageUnit === "KB") {
      maxStorageFormatted = maxStorage / 1024
    } else {
      // For bytes
      maxStorageFormatted = maxStorage
    }

    const maxFormatted = storageUnit === "bytes" ? maxStorageFormatted.toString() : maxStorageFormatted.toFixed(0)
    return `${currentFormatted.toFixed(2)} ${storageUnit} / ${maxFormatted} ${storageUnit}`
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Storage Usage</span>
        <Badge
          variant={getBadgeVariant(usagePercentage)}
          className={`
            ${usagePercentage < 75 ? "bg-emerald-500 hover:bg-emerald-600 text-white" : ""}
            ${usagePercentage >= 75 && usagePercentage < 90 ? "bg-yellow-500 hover:bg-yellow-600 text-white" : ""}
            ${usagePercentage >= 90 ? "bg-red-500 hover:bg-red-600 text-white" : ""}
            font-medium px-3 py-1
          `}
        >
          {formatStorageDisplay()}
        </Badge>
      </div>

      {maxStorage !== -1 && (
        <>
          <Progress
            value={Math.min(usagePercentage, 100)}
            className="h-2"
            // @ts-ignore - Custom color override
            style={{ "--progress-background": getUsageColor(usagePercentage) } as any}
          />
          {usagePercentage >= 90 && (
            <p className="text-xs text-red-600">
              Storage almost full. Consider upgrading your plan or deleting unused files.
            </p>
          )}
          {usagePercentage >= 75 && usagePercentage < 90 && (
            <p className="text-xs text-yellow-600">Storage usage is high. Consider managing your files.</p>
          )}
        </>
      )}
    </div>
  )
}
