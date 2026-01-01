"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

interface UserProfile {
  id: string
  email: string
  role: "user" | "admin" | "superadmin"
  deleted_at?: string
}

interface UserContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
}

const UserContext = createContext<UserContextType>({
  user: null,
  profile: null,
  loading: true,
})

interface UserProviderProps {
  children: React.ReactNode
  initialUser?: User | null
  initialProfile?: UserProfile | null
}

export function UserProvider({ children, initialUser = null, initialProfile = null }: UserProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser)
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile)
  const [loading, setLoading] = useState(!initialUser)

  useEffect(() => {
    const supabase = createClient()

    const getUser = async () => {
      if (initialUser && initialProfile) {
        // Already have data from server, skip initial fetch
        return
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        setUser(user)

        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, email, role, deleted_at")
            .eq("id", user.id)
            .maybeSingle()

          // If user is soft-deleted, sign them out immediately
          if (profile?.deleted_at) {
            await supabase.auth.signOut()
            window.location.href = "/auth/login?error=This account has been deleted"
            return
          }

          setProfile(profile)
        }
      } catch (err) {
        console.error("Error fetching user:", err)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)

      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, email, role, deleted_at")
          .eq("id", session.user.id)
          .maybeSingle()

        // If user is soft-deleted, sign them out immediately
        if (profile?.deleted_at) {
          await supabase.auth.signOut()
          window.location.href = "/auth/login?error=This account has been deleted"
          return
        }

        setProfile(profile)
      } else {
        setProfile(null)
      }

      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [initialUser, initialProfile])

  return <UserContext.Provider value={{ user, profile, loading }}>{children}</UserContext.Provider>
}

export const useUser = () => {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}
