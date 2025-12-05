"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Monitor, ImageIcon, PlayCircle, Activity, Plus, TrendingUp, Zap } from "lucide-react"
import type { User } from "@supabase/supabase-js"
import { useEffect, useState } from "react"

interface DashboardOverviewProps {
  user: User
}

interface DashboardStats {
  activeScreens: { value: number; change: string }
  mediaFiles: { value: number; change: string }
  activePlaylists: { value: number; change: string }
  totalViews: { value: number; change: string }
}

export function DashboardOverview({ user }: DashboardOverviewProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/dashboard/stats")
        if (response.ok) {
          const data = await response.json()
          setStats(data.stats)
        }
      } catch (error) {
        console.error("[v0] Error fetching dashboard stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const statsData = [
    {
      title: "Active Screens",
      value: loading ? "..." : stats?.activeScreens.value.toString() || "0",
      change: loading ? "Loading..." : stats?.activeScreens.change || "No change",
      icon: Monitor,
      color: "text-primary",
    },
    {
      title: "Media Files",
      value: loading ? "..." : stats?.mediaFiles.value.toString() || "0",
      change: loading ? "Loading..." : stats?.mediaFiles.change || "No change",
      icon: ImageIcon,
      color: "text-secondary",
    },
    {
      title: "Active Playlists",
      value: loading ? "..." : stats?.activePlaylists.value.toString() || "0",
      change: loading ? "Loading..." : stats?.activePlaylists.change || "No change",
      icon: PlayCircle,
      color: "text-accent",
    },
    {
      title: "Total Views",
      value: loading ? "..." : stats?.totalViews.value.toLocaleString() || "0",
      change: loading ? "Loading..." : stats?.totalViews.change || "No change",
      icon: Activity,
      color: "text-chart-4",
    },
  ]

  const quickActions = [
    {
      title: "Add New Screen",
      description: "Connect a new display to your network",
      icon: Monitor,
      href: "/dashboard/screens/new",
    },
    {
      title: "Upload Media",
      description: "Add images and videos to your library",
      icon: ImageIcon,
      href: "/dashboard/media/upload",
    },
    {
      title: "Create Playlist",
      description: "Build a new content playlist",
      icon: PlayCircle,
      href: "/dashboard/playlists/new",
    },
  ]

  const recentActivity = [
    {
      action: "Screen 'Lobby Display' went online",
      time: "2 minutes ago",
      icon: Monitor,
    },
    {
      action: "New media file 'summer-promo.mp4' uploaded",
      time: "15 minutes ago",
      icon: ImageIcon,
    },
    {
      action: "Playlist 'Morning Announcements' updated",
      time: "1 hour ago",
      icon: PlayCircle,
    },
    {
      action: "Screen 'Cafeteria Display' went offline",
      time: "2 hours ago",
      icon: Monitor,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Welcome back, {user.email?.split("@")[0]}!</h2>
          <p className="text-muted-foreground mt-1">Here's what's happening with your digital signage network today.</p>
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Quick Setup
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Quick Actions
            </CardTitle>
            <CardDescription>Get started with common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <div
                  key={action.title}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">{action.title}</h4>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-secondary" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest updates from your network</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivity.map((activity, index) => {
              const Icon = activity.icon
              return (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
