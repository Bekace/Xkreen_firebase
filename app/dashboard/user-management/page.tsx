import { requireAdmin } from "@/lib/admin/auth"
import { UserManagement } from "@/components/admin/user-management"

export default async function UserManagementPage() {
  const { user, profile } = await requireAdmin()

  return <UserManagement userRole={profile.role} />
}
