export type StorageUnit = "KB" | "MB" | "GB" | "TB" | "unlimited"

export interface StorageValue {
  value: number
  unit: StorageUnit
}

export const STORAGE_UNITS: { value: StorageUnit; label: string }[] = [
  { value: "KB", label: "Kilobytes (KB)" },
  { value: "MB", label: "Megabytes (MB)" },
  { value: "GB", label: "Gigabytes (GB)" },
  { value: "TB", label: "Terabytes (TB)" },
  { value: "unlimited", label: "Unlimited" },
]

// Convert storage value to bytes
export function storageToBytes(value: number, unit: StorageUnit): number {
  if (unit === "unlimited") return -1

  const multipliers = {
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
    TB: 1024 * 1024 * 1024 * 1024,
  }

  return Math.round(value * multipliers[unit])
}

// Convert bytes to storage value with unit
export function bytesToStorage(bytes: number): StorageValue {
  if (bytes === -1) return { value: 0, unit: "unlimited" }
  if (bytes === 0) return { value: 0, unit: "MB" }

  const units: StorageUnit[] = ["TB", "GB", "MB", "KB"]
  const multipliers = {
    TB: 1024 * 1024 * 1024 * 1024,
    GB: 1024 * 1024 * 1024,
    MB: 1024 * 1024,
    KB: 1024,
  }

  for (const unit of units) {
    const value = bytes / multipliers[unit]
    if (value >= 1) {
      return { value: Math.round(value * 100) / 100, unit }
    }
  }

  return { value: bytes, unit: "KB" }
}

// Format storage for display
export function formatStorage(bytes: number): string {
  if (bytes === -1) return "Unlimited"

  const { value, unit } = bytesToStorage(bytes)
  return `${value} ${unit}`
}

// Get the best unit for a given value in bytes
export function getBestStorageUnit(bytes: number): StorageUnit {
  if (bytes === -1) return "unlimited"

  const { unit } = bytesToStorage(bytes)
  return unit
}

export function formatStorageWithUnit(value: number, unit: StorageUnit): string {
  if (value === -1 || unit === "unlimited") return "Unlimited"
  return `${value} ${unit}`
}
