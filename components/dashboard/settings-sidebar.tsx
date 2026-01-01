"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { User, Shield, Bell, CreditCard, Key } from "lucide-react"

const settingsNavigation = [
  {
    name: "General",
    href: "/dashboard/settings/general",
    icon: User,
  },
  {
    name: "Profile",
    href: "/dashboard/settings/profile",
    icon: User,
  },
  {
    name: "Security",
    href: "/dashboard/settings/security",
    icon: Shield,
  },
  {
    name: "Notifications",
    href: "/dashboard/settings/notifications",
    icon: Bell,
  },
  {
    name: "Billing",
    href: "/dashboard/settings/billing",
    icon: CreditCard,
  },
  {
    name: "API Tokens",
    href: "/dashboard/settings/tokens",
    icon: Key,
  },
]

export function SettingsSidebar() {
  const pathname = usePathname()

  return (
    <div className="w-56 flex-shrink-0">
      {/* Navigation Items */}
      <nav className="space-y-1">
        {settingsNavigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "block px-3 py-2 text-sm rounded-md transition-colors",
                isActive ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
