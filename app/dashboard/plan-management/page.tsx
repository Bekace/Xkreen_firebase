import { requireAdmin } from "@/lib/admin/auth"
import { PlanManagement } from "@/components/admin/plan-management"

export default async function PlanManagementPage() {
  const { user, profile } = await requireAdmin()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Plan Management</h1>
        <p className="text-muted-foreground mt-1">Manage subscription plans and pricing</p>
      </div>

      <PlanManagement />
    </div>
  )
}
