
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { formatBytes } from "@/lib/storage-utils"

interface StorageUsageBarProps {
  currentStorage: number // Should be in bytes
  maxStorage: number // Should be in bytes, -1 for unlimited
  storageUnit: string // This prop is no longer used but kept for compatibility
  usagePercentage: number
  planName?: string
  className?: string
}

export function StorageUsageBar({
  currentStorage,
  maxStorage,
  usagePercentage,
  planName = "Free",
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

  const storageDisplay =
    maxStorage === -1 ? "Unlimited" : `${formatBytes(currentStorage)} / ${formatBytes(maxStorage)}`

  const percentageDisplay =
    maxStorage === -1
      ? `Unlimited storage on your ${planName} plan`
      : `You are using ${usagePercentage.toFixed(
          2
        )}% of ${formatBytes(maxStorage)} on your ${planName} plan`

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{percentageDisplay}</span>
        <Badge
          variant={getBadgeVariant(usagePercentage)}
          className={`
            ${
              usagePercentage < 75 ? "bg-emerald-500 hover:bg-emerald-600 text-white" : ""
            }
            ${
              usagePercentage >= 75 && usagePercentage < 90
                ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                : ""
            }
            ${
              usagePercentage >= 90 ? "bg-red-500 hover:bg-red-600 text-white" : ""
            }
            font-medium px-3 py-1
          `}
        >
          {storageDisplay}
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
            <p className="text-xs text-yellow-600">
              Storage usage is high. Consider managing your files.
            </p>
          )}
        </>
      )}
    </div>
  )
}
