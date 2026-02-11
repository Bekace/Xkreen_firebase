"use client"

import { usePlanLimits } from "@/hooks/use-plan-limits"
import { UpgradeBanner } from "@/components/upgrade-banner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UserPlus, Mail, Shield, Clock } from "lucide-react"

export default function TeamPage() {
  const { teamMembers, features, loading } = usePlanLimits()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
      </div>
    )
  }

  if (!features?.multiUser) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-gray-600 mt-2">
            Collaborate with your team by inviting members to manage your digital signage.
          </p>
        </div>

        <UpgradeBanner
          feature="Multi-User Access"
          description="Invite team members to collaborate on your digital signage content. Control permissions and manage user roles."
          planRequired="Pro"
        />
      </div>
    )
  }

  const canInvite = teamMembers ? teamMembers.canInvite : false

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-gray-600 mt-2">Invite and manage team members</p>
        </div>
        <Button disabled={!canInvite} className="bg-cyan-500 hover:bg-cyan-600">
          <UserPlus className="w-4 h-4 mr-2" />
          Invite Member
        </Button>
      </div>

      {teamMembers && (
        <Card>
          <CardHeader>
            <CardTitle>Team Limit</CardTitle>
            <CardDescription>
              {teamMembers.current} of {teamMembers.limit === -1 ? "Unlimited" : teamMembers.limit} members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 transition-all"
                style={{
                  width:
                    teamMembers.limit === -1 ? "10%" : `${(teamMembers.current / teamMembers.limit) * 100}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-cyan-200">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-cyan-500 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Coming Soon: Team Roles</CardTitle>
                <CardDescription>Assign different permission levels to team members</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• <strong>Admin:</strong> Full access to all features</p>
              <p>• <strong>Editor:</strong> Can create and edit content</p>
              <p>• <strong>Viewer:</strong> Read-only access</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500 rounded-lg">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Coming Soon: Email Invitations</CardTitle>
                <CardDescription>Invite team members via email</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Send invitation links directly to your team members' email addresses. They'll receive a secure link to
              join your organization.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-200">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-500 rounded-lg">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Coming Soon: Activity Logs</CardTitle>
                <CardDescription>Track team member actions</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              View detailed activity logs showing who created, edited, or deleted content. Keep track of all changes
              made by your team.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
