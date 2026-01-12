"use client"
import dynamic from "next/dynamic"

const PlayerSetupPage = dynamic(() => import("@/components/player-setup-page"), { ssr: false })

export default function Page() {
  return <PlayerSetupPage />
}
