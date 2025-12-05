"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

interface UserProfile {
  id: string
  email: string
  role: "user" | "admin" | "superadmin"
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

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    // Get initial user
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        // Get user profile with role
        const { data: profile } = await supabase.from("profiles").select("id, email, role").eq("id", user.id).single()

        setProfile(profile)
      }

      setLoading(false)
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
          .select("id, email, role")
          .eq("id", session.user.id)
          .single()

        setProfile(profile)
      } else {
        setProfile(null)
      }

      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return <UserContext.Provider value={{ user, profile, loading }}>{children}</UserContext.Provider>
}

export const useUser = () => {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}
