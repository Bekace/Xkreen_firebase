import { requireAdmin } from "@/lib/admin/auth"
import { FeatureManagement } from "@/components/admin/feature-management"

export default async function FeatureManagementPage() {
  const { user, profile } = await requireAdmin()

  return <FeatureManagement />
}
