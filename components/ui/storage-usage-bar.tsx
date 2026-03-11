import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

interface StorageUsageBarProps {
  currentFormatted: number
  maxStorage: number
  storageUnit: string
  usagePercentage: number
  planName?: string
  className?: string
}

export function StorageUsageBar({
  currentFormatted,
  maxStorage,
  storageUnit,
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

  const formatStorageDisplay = () => {
    if (maxStorage === -1) return "Unlimited"

    const conversionFactor = storageUnit.toUpperCase() === "GB" ? 1024 * 1024 * 1024 : 1024 * 1024;
    const maxStorageConverted = maxStorage / conversionFactor

    if (currentFormatted < 1 && storageUnit.toUpperCase() === "GB") {
      const currentMB = currentFormatted * 1024
      return `${currentMB.toFixed(2)} MB / ${maxStorageConverted.toFixed(0)} GB`
    }

    return `${currentFormatted.toFixed(2)} ${storageUnit} / ${maxStorageConverted.toFixed(0)} ${storageUnit}`
  }

  const formatPercentageDisplay = () => {
    if (maxStorage === -1) return "Unlimited storage on your current plan"

    const conversionFactor = storageUnit.toUpperCase() === "GB" ? 1024 * 1024 * 1024 : 1024 * 1024;
    const maxStorageConverted = maxStorage / conversionFactor

    const percentage = usagePercentage < 1 ? usagePercentage.toFixed(2) : Math.round(usagePercentage).toString()

    return `You are using ${percentage}% of ${maxStorageConverted.toFixed(0)} ${storageUnit} on your ${planName} plan`
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{formatPercentageDisplay()}</span>
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
