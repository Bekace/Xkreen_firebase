
export function convertStorageToDisplayValue(bytes: number, unit: "MB" | "GB" | "TB" = "GB") {
  if (bytes === -1) return "Unlimited"
  if (unit === "MB") {
    return (bytes / 1024 / 1024).toFixed(0)
  }
  if (unit === "TB") {
    return (bytes / 1024 / 1024 / 1024 / 1024).toFixed(2)
  }
  // Default to GB
  return (bytes / 1024 / 1024 / 1024).toFixed(2)
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  if (isNaN(bytes) || bytes === null) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  // Handle unlimited case represented by a large number or infinity
  if (!isFinite(bytes) || bytes < 0) {
      return 'Unlimited';
  }

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  if (i >= sizes.length) {
      // If the size is larger than what's in our array, default to TB and calculate appropriately
      return parseFloat((bytes / Math.pow(k, 4)).toFixed(dm)) + ' TB';
  }

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
