import { type NextRequest, NextResponse } from "next/server"
import { requireSuperAdmin } from "@/lib/admin/auth"
import { logAdminAction } from "@/lib/admin/audit"
import { stripe } from "@/lib/stripe"

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireSuperAdmin()

    const { data: plans, error } = await supabase
      .from("subscription_plans")
      .select(`
        *,
        subscription_prices (
          id,
          plan_id,
          billing_cycle,
          price,
          stripe_price_id,
          trial_days,
          is_active
        ),
        user_subscriptions(count)
      `)
      .order("created_at", { ascending: false })

    if (error) throw error

    const formattedPlans = plans.map((plan: any) => {
      const prices = plan.subscription_prices || []
      const monthlyPrice = prices.find((p: any) => p.billing_cycle === "monthly")?.price || 0
      const yearlyPrice = prices.find((p: any) => p.billing_cycle === "yearly")?.price || 0

      return {
        ...plan,
        prices,
        monthly_price: monthlyPrice,
        yearly_price: yearlyPrice,
        subscriber_count: plan.user_subscriptions?.filter((sub: any) => sub.count > 0).length || 0,
      }
    })

    await logAdminAction({
      action: "view_subscription_plans",
      targetType: "plan",
      details: { count: plans.length },
    })

    return NextResponse.json({ plans: formattedPlans })
  } catch (error) {
    console.error("Admin plans fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch subscription plans" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase } = await requireSuperAdmin()
    const body = await request.json()

    const { monthly_price, yearly_price, trial_days, ...planData } = body

    let stripeProduct = null
    try {
      stripeProduct = await stripe.products.create({
        name: planData.name,
        description: planData.description || undefined,
        metadata: {
          max_screens: String(planData.max_screens || 0),
          max_playlists: String(planData.max_playlists || 0),
          max_media_storage: String(planData.max_media_storage || 0),
        },
      })
    } catch (stripeError) {
      console.error("[v0] Stripe product creation error:", stripeError)
      // Continue without Stripe - can sync later
    }

    // Create the plan first
    const { data: newPlan, error: planError } = await supabase
      .from("subscription_plans")
      .insert({
        name: planData.name,
        description: planData.description,
        max_screens: planData.max_screens,
        max_media_storage: planData.max_media_storage,
        storage_unit: planData.storage_unit,
        max_playlists: planData.max_playlists,
        is_active: planData.is_active,
        stripe_product_id: stripeProduct?.id || null,
      })
      .select()
      .single()

    if (planError) throw planError

    const pricesToInsert = []

    if (monthly_price !== undefined) {
      let stripePriceId = null
      if (stripeProduct && monthly_price > 0) {
        try {
          const stripePrice = await stripe.prices.create({
            product: stripeProduct.id,
            unit_amount: Math.round(monthly_price * 100), // Convert to cents
            currency: "usd",
            recurring: { interval: "month" },
          })
          stripePriceId = stripePrice.id
        } catch (stripeError) {
          console.error("[v0] Stripe monthly price creation error:", stripeError)
        }
      }

      pricesToInsert.push({
        plan_id: newPlan.id,
        billing_cycle: "monthly",
        price: monthly_price,
        trial_days: trial_days || 0,
        is_active: true,
        stripe_price_id: stripePriceId,
      })
    }

    if (yearly_price !== undefined) {
      let stripePriceId = null
      if (stripeProduct && yearly_price > 0) {
        try {
          const stripePrice = await stripe.prices.create({
            product: stripeProduct.id,
            unit_amount: Math.round(yearly_price * 100), // Convert to cents
            currency: "usd",
            recurring: { interval: "year" },
          })
          stripePriceId = stripePrice.id
        } catch (stripeError) {
          console.error("[v0] Stripe yearly price creation error:", stripeError)
        }
      }

      pricesToInsert.push({
        plan_id: newPlan.id,
        billing_cycle: "yearly",
        price: yearly_price,
        trial_days: trial_days || 0,
        is_active: true,
        stripe_price_id: stripePriceId,
      })
    }

    if (pricesToInsert.length > 0) {
      const { error: pricesError } = await supabase.from("subscription_prices").insert(pricesToInsert)

      if (pricesError) {
        console.error("[v0] Error creating prices:", pricesError)
      }
    }

    await logAdminAction({
      action: "create_subscription_plan",
      targetType: "plan",
      targetId: newPlan.id,
      details: {
        name: planData.name,
        monthly_price,
        yearly_price,
        stripe_product_id: stripeProduct?.id,
      },
    })

    return NextResponse.json({ plan: newPlan })
  } catch (error) {
    console.error("[v0] Admin plan creation error:", error)
    return NextResponse.json({ error: "Failed to create subscription plan" }, { status: 500 })
  }
}
