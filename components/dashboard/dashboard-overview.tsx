'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Monitor, ImageIcon, PlayCircle, Activity, Plus, TrendingUp, Zap, CheckCircle2, X, Wifi, CheckCircle } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// Interface definitions
interface ScreenLimits {
  current: number
  limit: number
  availableSlots: number
  plan: string
}

interface ProofOfPlayStats {
  online_plays: number
  offline_plays: number
  total_plays: number
  success_rate: string
}

// Main component
export function DashboardOverview({ user, showWelcome = false }: { user: User; showWelcome?: boolean }) {
  const [screenLimits, setScreenLimits] = useState<ScreenLimits | null>(null)
  const [loading, setLoading] = useState(true)
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(showWelcome)
  const [deviceStatus, setDeviceStatus] = useState<{ online: number; offline: number; total: number } | null>(null)
  const [proofOfPlay, setProofOfPlay] = useState<ProofOfPlayStats | null>(null)
  const [recentActivities, setRecentActivities] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true)
      try {
        const results = await Promise.allSettled([
          fetch('/api/devices/status'),
          fetch('/api/proof-of-play/stats?timeRange=24h'),
          fetch('/api/dashboard/recent-activities'),
          fetch('/api/screen-limits'),
        ])

        const [deviceStatusResult, popResult, activitiesResult, screenLimitsResult] = results

        if (deviceStatusResult.status === 'fulfilled' && deviceStatusResult.value.ok) {
          const data = await deviceStatusResult.value.json()
          setDeviceStatus(data.summary)
        } else {
          console.error('Error fetching device status:', deviceStatusResult.status === 'rejected' ? deviceStatusResult.reason : 'Request failed')
        }

        if (popResult.status === 'fulfilled' && popResult.value.ok) {
          const data = await popResult.value.json()
          setProofOfPlay(data.summary)
        } else {
          // MODIFICATION: Log the actual error message from the API response
          let errorDetail = 'Request failed with no specific message.';
          if (popResult.status === 'fulfilled') {
            // The server responded with an error status code (4xx or 5xx)
            try {
              const errorPayload = await popResult.value.json();
              errorDetail = errorPayload.error || JSON.stringify(errorPayload);
            } catch (e) {
              errorDetail = `Failed to parse error JSON. Status: ${popResult.value.status} ${popResult.value.statusText}`;
            }
          } else { // The promise was rejected (e.g., network error)
            errorDetail = popResult.reason.message;
          }
          console.error('Error fetching proof of play stats:', errorDetail);
        }

        if (activitiesResult.status === 'fulfilled' && activitiesResult.value.ok) {
          const data = await activitiesResult.value.json()
          setRecentActivities(data.activities || [])
        } else {
          console.error('Error fetching recent activities:', activitiesResult.status === 'rejected' ? activitiesResult.reason : 'Request failed')
        }

        if (screenLimitsResult.status === 'fulfilled' && screenLimitsResult.value.ok) {
          const data = await screenLimitsResult.value.json()
          setScreenLimits(data)
        } else {
          console.error('Error fetching screen limits:', screenLimitsResult.status === 'rejected' ? screenLimitsResult.reason : 'Request failed')
        }

      } catch (error) {
        console.error('An unexpected error occurred in fetchDashboardData:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const closeWelcome = () => {
    setIsWelcomeOpen(false)
    router.replace('/dashboard', { scroll: false })
  }

  // Data for stats cards
  const statsData = [
    {
      title: 'Online Devices',
      value: loading ? '...' : deviceStatus?.online.toString() || '0',
      description: deviceStatus ? `${deviceStatus.offline} offline` : 'Loading...',
      icon: Wifi,
      color: 'text-green-500',
    },
    {
      title: 'Available Screens',
      value: loading || screenLimits === null ? '...' : screenLimits.availableSlots.toString(),
      description: screenLimits
        ? `You have ${screenLimits.current} of ${screenLimits.limit === -1 ? 'unlimited' : screenLimits.limit} screens used`
        : 'Loading...',
      icon: Monitor,
      color: 'text-primary',
    },
    {
      title: 'Media Plays Today',
      value: loading ? '...' : proofOfPlay?.total_plays.toString() || '0',
      description: proofOfPlay
        ? `${proofOfPlay.online_plays} online, ${proofOfPlay.offline_plays} offline | ${proofOfPlay.success_rate}% success`
        : 'Loading...',
      icon: CheckCircle,
      color: 'text-cyan-500',
    },
    {
      title: 'Active Playlists',
      value: loading || !deviceStatus ? '...' : `${deviceStatus.total}`,
      description: !deviceStatus ? 'Loading...' : `${deviceStatus.total} total playlists`,
      icon: PlayCircle,
      color: 'text-accent',
    },
  ]

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Welcome back, {user.email?.split('@')[0]}!</h2>
          <p className="text-muted-foreground mt-1">Here's what's happening with your digital signage network today.</p>
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Quick Setup
        </Button>
      </div>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions and Recent Activity sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Quick Actions
            </CardTitle>
            <CardDescription>Get started with common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Monitor className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">Add New Screen</h4>
                    <p className="text-sm text-muted-foreground">Connect a new display to your network</p>
                  </div>
                </div>
                <Plus className="w-4 h-4 text-muted-foreground" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-secondary" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest updates from your network</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                    <Monitor className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
