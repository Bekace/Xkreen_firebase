import { requireAdmin } from "@/lib/admin/auth"
import { AdminDashboard } from "@/components/admin/admin-dashboard"

export default async function AdminOverviewPage() {
  const { user, profile } = await requireAdmin()

  return <AdminDashboard />
}
