"use client"

import { useState, useEffect } from "react"
import { usePlanLimits } from "@/hooks/use-plan-limits"
import { UpgradeBanner } from "@/components/upgrade-banner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { UserPlus, Trash2, Users } from "lucide-react"
import { useUser } from "@/lib/hooks/use-user"

interface TeamMember {
  id: string
  member_name: string
  member_email: string
  role: string
  status: string
  invited_at: string
  joined_at: string | null
}

export default function TeamPage() {
  const { planName, planLimits, loading: limitsLoading } = usePlanLimits()
  const { user, profile } = useUser()
  const { toast } = useToast()

  const [members, setMembers] = useState<TeamMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [inviteName, setInviteName] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("editor")
  const [inviting, setInviting] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const maxMembers = planLimits?.maxTeamMembers ?? 1
  // +1 to count the owner themselves
  const totalUsed = members.length + 1
  const limitDisplay = maxMembers === -1 ? "Unlimited" : maxMembers
  const canInvite = maxMembers === -1 || members.length < maxMembers

  useEffect(() => {
    fetchMembers()
  }, [])

  const fetchMembers = async () => {
    try {
      setLoadingMembers(true)
      const res = await fetch("/api/team")
      if (res.ok) {
        const data = await res.json()
        setMembers(data.members || [])
      }
    } finally {
      setLoadingMembers(false)
    }
  }

  const handleInvite = async () => {
    if (!inviteName.trim() || !inviteEmail.trim()) {
      toast({ title: "Error", description: "Name and email are required", variant: "destructive" })
      return
    }
    setInviting(true)
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_name: inviteName, member_email: inviteEmail, role: inviteRole }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: "Error", description: data.error, variant: "destructive" })
        return
      }
      setMembers(prev => [data.member, ...prev])
      setInviteName("")
      setInviteEmail("")
      setInviteRole("editor")
      toast({ title: "Invitation sent", description: `${inviteName} has been invited to join your team.` })
    } finally {
      setInviting(false)
    }
  }

  const handleRemove = async (id: string) => {
    setRemovingId(id)
    try {
      const res = await fetch(`/api/team/${id}`, { method: "DELETE" })
      if (res.ok) {
        setMembers(prev => prev.filter(m => m.id !== id))
        toast({ title: "Member removed", description: "Team member has been removed." })
      }
    } finally {
      setRemovingId(null)
    }
  }

  if (limitsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
      </div>
    )
  }

  if (planLimits?.maxTeamMembers === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Team Members</h1>
          <p className="text-muted-foreground mt-1">Manage who has access to this account.</p>
        </div>
        <UpgradeBanner
          feature="Multi-User Access"
          description="Invite team members to collaborate on your digital signage content. Control permissions and manage user roles."
          currentPlan={planName}
        />
      </div>
    )
  }

  const ownerEmail = profile?.email || user?.email || ""
  const ownerName = ownerEmail.split("@")[0] || "Account Owner"
  const ownerInitials = ownerName.split(/[\s._-]/).map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Members</h1>
          <p className="text-muted-foreground mt-1">Manage who has access to this account.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
          <Users className="h-4 w-4" />
          <span>{totalUsed} / {limitDisplay} users</span>
        </div>
      </div>

      {/* Usage summary */}
      <p className="text-sm text-muted-foreground">
        Your account currently has {totalUsed} / {limitDisplay === "Unlimited" ? "Unlimited" : limitDisplay} available users assigned for your plan.
      </p>

      {/* Members table */}
      <div className="border rounded-lg overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_160px_120px_48px] gap-4 px-4 py-3 bg-muted/50 border-b">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">User</span>
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Role</span>
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</span>
          <span />
        </div>

        {/* Owner row */}
        <div className="grid grid-cols-[1fr_160px_120px_48px] gap-4 items-center px-4 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-cyan-500 flex items-center justify-center text-white text-sm font-semibold shrink-0">
              {ownerInitials}
            </div>
            <div>
              <p className="font-medium text-sm">{ownerName}</p>
              <p className="text-xs text-muted-foreground">{ownerEmail}</p>
            </div>
          </div>
          <div>
            <Badge variant="secondary" className="text-xs font-normal">account owner</Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
            <span className="text-sm">Active</span>
          </div>
          <div />
        </div>

        {/* Invited members */}
        {loadingMembers ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">Loading...</div>
        ) : members.length > 0 ? (
          members.map(member => {
            const initials = member.member_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
            return (
              <div key={member.id} className="grid grid-cols-[1fr_160px_120px_48px] gap-4 items-center px-4 py-4 border-b last:border-b-0">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold shrink-0">
                    {initials}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{member.member_name}</p>
                    <p className="text-xs text-muted-foreground">{member.member_email}</p>
                  </div>
                </div>
                <div>
                  <Badge variant="outline" className="text-xs font-normal capitalize">{member.role}</Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full inline-block ${member.status === "active" ? "bg-green-500" : "bg-yellow-400"}`} />
                  <span className="text-sm capitalize">{member.status === "pending" ? "Pending" : "Active"}</span>
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    disabled={removingId === member.id}
                    onClick={() => handleRemove(member.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })
        ) : null}

        {/* Invite a new user row */}
        <div className="border-t">
          <div className="px-4 py-3 bg-muted/30">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Invite a New User</p>
          </div>
          <div className="grid grid-cols-[1fr_160px_120px_auto] gap-3 items-center px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center shrink-0">
                <UserPlus className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex gap-2 flex-1">
                <Input
                  placeholder="Full Name"
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  className="h-9 text-sm"
                  disabled={!canInvite}
                />
                <Input
                  placeholder="Email Address"
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="h-9 text-sm"
                  disabled={!canInvite}
                />
              </div>
            </div>
            <div>
              <Select value={inviteRole} onValueChange={setInviteRole} disabled={!canInvite}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div />
            <Button
              className="bg-cyan-500 hover:bg-cyan-600 text-white h-9"
              onClick={handleInvite}
              disabled={!canInvite || inviting}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {inviting ? "Inviting..." : "Invite"}
            </Button>
          </div>
          {!canInvite && (
            <p className="px-4 pb-3 text-xs text-muted-foreground">
              You have reached the team member limit for your plan.{" "}
              <a href="/dashboard/settings/subscription" className="text-cyan-500 hover:underline">Upgrade</a> to add more.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
