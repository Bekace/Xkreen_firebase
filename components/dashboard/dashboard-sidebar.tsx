"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useUser } from "@/lib/hooks/use-user"
import { usePlanLimits } from "@/hooks/use-plan-limits"
import {
  LayoutDashboard,
  Monitor,
  ImageIcon,
  PlayCircle,
  Calendar,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  Users as UsersIcon,
  CreditCard,
  Zap,
  MapPin,
  UserPlus,
} from "lucide-react"

const navigation = [
  {
    name: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Screens",
    href: "/dashboard/screens",
    icon: Monitor,
  },
  {
    name: "Locations",
    href: "/dashboard/locations",
    icon: MapPin,
  },
  {
    name: "Media Library",
    href: "/dashboard/media",
    icon: ImageIcon,
  },
  {
    name: "Playlists",
    href: "/dashboard/playlists",
    icon: PlayCircle,
  },
  {
    name: "Schedules",
    href: "/dashboard/schedules",
    icon: Calendar,
  },
  {
    name: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
  },
  {
    name: "Team",
    href: "/dashboard/team",
    icon: UserPlus,
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
]

const adminNavigation = [
  {
    name: "Admin Overview",
    href: "/dashboard/admin-overview",
    icon: Shield,
  },
  {
    name: "User Management",
    href: "/dashboard/user-management",
    icon: UsersIcon,
  },
  {
    name: "Plan Management",
    href: "/dashboard/plan-management",
    icon: CreditCard,
  },
  {
    name: "Feature Management",
    href: "/dashboard/feature-management",
    icon: Zap,
  },
]

export function DashboardSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const { profile, loading } = useUser()
  const { limits, features, loading: limitsLoading } = usePlanLimits()

  const isAdmin = profile?.role === "admin" || profile?.role === "superadmin"
  const isSuperAdmin = limits?.isSuperAdmin || false

  // Filter navigation based on feature toggles (super admin sees everything)
  // While loading, only show Overview and Settings (safe defaults)
  const filteredNavigation = navigation.filter((item) => {
    // Overview and Settings are always visible
    if (item.href === "/dashboard" || item.href === "/dashboard/settings") return true
    
    // While limits are loading, hide feature-gated items
    if (limitsLoading || !features) return false
    
    if (isSuperAdmin) return true // Super admin bypasses all restrictions
    
    // Map navigation items to feature toggles
    if (item.href === "/dashboard/screens") return features.screens
    if (item.href === "/dashboard/locations") return features.locations
    if (item.href === "/dashboard/media") return features.mediaLibrary
    if (item.href === "/dashboard/playlists") return features.playlists
    if (item.href === "/dashboard/schedules") return features.schedules
    if (item.href === "/dashboard/analytics") return features.analytics
    if (item.href === "/dashboard/team") return features.teamMembers
    
    return true
  })

  return (
    <div
      className={cn(
        "bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo and Collapse Button */}
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
          {!collapsed && (
            <div className="flex items-center gap-2">
                <img src="/xkreen-logo.svg" alt="XKREEN" className="h-6 w-auto" />
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="text-sidebar-foreground hover:bg-sidebar-accent/10"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 h-11",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/10",
                    collapsed && "px-3",
                  )}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span>{item.name}</span>}
                </Button>
              </Link>
            )
          })}

          {isAdmin && (
            <>
              <div className="pt-4 pb-2">
                {!collapsed && (
                  <h3 className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider px-3">
                    Administration
                  </h3>
                )}
              </div>
              {adminNavigation.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon

                return (
                  <Link key={item.name} href={item.href}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      className={cn(
                        "w-full justify-start gap-3 h-11",
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/10",
                        collapsed && "px-3",
                      )}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {!collapsed && <span>{item.name}</span>}
                    </Button>
                  </Link>
                )
              })}
            </>
          )}
        </nav>
      </div>
    </div>
  )
}
