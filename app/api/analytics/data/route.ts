import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const screenId = searchParams.get("screenId")
    const timeRange = searchParams.get("timeRange") || "24h" // 1h, 24h, 7d, 30d
    const limit = Number.parseInt(searchParams.get("limit") || "100")

    console.log("[v0] Analytics data request:", { screenId, timeRange, limit })

    // Create Supabase client
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        get: () => null,
        set: () => {},
        remove: () => {},
      },
    })

    // Calculate time range
    const now = new Date()
    const startTime = new Date()

    switch (timeRange) {
      case "1h":
        startTime.setHours(now.getHours() - 1)
        break
      case "24h":
        startTime.setDate(now.getDate() - 1)
        break
      case "7d":
        startTime.setDate(now.getDate() - 7)
        break
      case "30d":
        startTime.setDate(now.getDate() - 30)
        break
      default:
        startTime.setDate(now.getDate() - 1)
    }

    // Build query
    let query = supabase
      .from("analytics")
      .select("*")
      .eq("event_type", "audience_analytics")
      .gte("created_at", startTime.toISOString())
      .order("created_at", { ascending: false })
      .limit(limit)

    // Filter by screen if provided
    if (screenId) {
      query = query.eq("screen_id", screenId)
    }

    const { data: analytics, error } = await query

    if (error) {
      console.error("[v0] Error fetching analytics:", error)
      return NextResponse.json({ error: "Failed to fetch analytics data" }, { status: 500 })
    }

    // Process and aggregate data
    const processedData = {
      totalRecords: analytics?.length || 0,
      timeRange,
      data: analytics || [],
      summary: aggregateAnalytics(analytics || []),
    }

    console.log("[v0] Returning analytics data:", processedData.totalRecords, "records")

    return NextResponse.json(processedData)
  } catch (error) {
    console.error("[v0] Analytics data error:", error)
    return NextResponse.json({ error: "Failed to fetch analytics data" }, { status: 500 })
  }
}

function aggregateAnalytics(data: any[]) {
  if (!data.length) {
    return {
      avgPersonCount: 0,
      totalInteractions: 0,
      peakHour: null,
      demographics: { male: 0, female: 0, unknown: 0 },
      ageGroups: { child: 0, teen: 0, adult: 0, senior: 0 },
      emotions: { happy: 0, neutral: 0, sad: 0, angry: 0, surprised: 0, unknown: 0 },
    }
  }

  const totals = data.reduce(
    (acc, record) => {
      const eventData = record.event_data

      acc.personCount += eventData.personCount || 0
      acc.lookingAtScreen += eventData.lookingAtScreen || 0

      // Demographics
      acc.demographics.male += eventData.demographics?.male || 0
      acc.demographics.female += eventData.demographics?.female || 0
      acc.demographics.unknown += eventData.demographics?.unknown || 0

      // Age Groups
      acc.ageGroups.child += eventData.ageGroups?.child || 0
      acc.ageGroups.teen += eventData.ageGroups?.teen || 0
      acc.ageGroups.adult += eventData.ageGroups?.adult || 0
      acc.ageGroups.senior += eventData.ageGroups?.senior || 0

      // Emotions
      acc.emotions.happy += eventData.emotions?.happy || 0
      acc.emotions.neutral += eventData.emotions?.neutral || 0
      acc.emotions.sad += eventData.emotions?.sad || 0
      acc.emotions.angry += eventData.emotions?.angry || 0
      acc.emotions.surprised += eventData.emotions?.surprised || 0
      acc.emotions.unknown += eventData.emotions?.unknown || 0

      return acc
    },
    {
      personCount: 0,
      lookingAtScreen: 0,
      demographics: { male: 0, female: 0, unknown: 0 },
      ageGroups: { child: 0, teen: 0, adult: 0, senior: 0 },
      emotions: { happy: 0, neutral: 0, sad: 0, angry: 0, surprised: 0, unknown: 0 },
    },
  )

  return {
    avgPersonCount: Math.round(totals.personCount / data.length),
    totalInteractions: totals.lookingAtScreen,
    peakHour: findPeakHour(data),
    demographics: totals.demographics,
    ageGroups: totals.ageGroups,
    emotions: totals.emotions,
  }
}

function findPeakHour(data: any[]) {
  const hourCounts: { [key: number]: number } = {}

  data.forEach((record) => {
    const hour = new Date(record.created_at).getHours()
    hourCounts[hour] = (hourCounts[hour] || 0) + (record.event_data.personCount || 0)
  })

  let peakHour = 0
  let maxCount = 0

  Object.entries(hourCounts).forEach(([hour, count]) => {
    if (count > maxCount) {
      maxCount = count
      peakHour = Number.parseInt(hour)
    }
  })

  return peakHour
}
