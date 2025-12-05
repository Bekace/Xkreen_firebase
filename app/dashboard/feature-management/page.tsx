import { requireAdmin } from "@/lib/admin/auth"
import { FeatureManagement } from "@/components/admin/feature-management"

export default async function FeatureManagementPage() {
  const { user, profile } = await requireAdmin()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Feature Management</h1>
        <p className="text-muted-foreground mt-1">Define and manage feature access based on subscription tiers</p>
      </div>

      <FeatureManagement />
    </div>
  )
}
