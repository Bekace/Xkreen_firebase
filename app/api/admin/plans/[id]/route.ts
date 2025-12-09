import { type NextRequest, NextResponse } from "next/server"
import { requireSuperAdmin } from "@/lib/admin/auth"
import { logAdminAction } from "@/lib/admin/audit"
import { stripe } from "@/lib/stripe"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase } = await requireSuperAdmin()
    const body = await request.json()
    const planId = params.id

    const { monthly_price, yearly_price, trial_days, ...planData } = body

    const { data: existingPlan } = await supabase
      .from("subscription_plans")
      .select("stripe_product_id")
      .eq("id", planId)
      .single()

    if (existingPlan?.stripe_product_id) {
      try {
        await stripe.products.update(existingPlan.stripe_product_id, {
          name: planData.name,
          description: planData.description || undefined,
          active: planData.is_active,
          metadata: {
            max_screens: String(planData.max_screens || 0),
            max_playlists: String(planData.max_playlists || 0),
            max_media_storage: String(planData.max_media_storage || 0),
          },
        })
      } catch (stripeError) {
        console.error("[v0] Stripe product update error:", stripeError)
      }
    }

    // Update the plan
    const { data: updatedPlan, error: planError } = await supabase
      .from("subscription_plans")
      .update({
        name: planData.name,
        description: planData.description,
        max_screens: planData.max_screens,
        max_media_storage: planData.max_media_storage,
        storage_unit: planData.storage_unit,
        max_playlists: planData.max_playlists,
        is_active: planData.is_active,
      })
      .eq("id", planId)
      .select()
      .single()

    if (planError) throw planError

    // First, get existing prices
    const { data: existingPrices } = await supabase.from("subscription_prices").select("*").eq("plan_id", planId)

    const monthlyPriceRecord = existingPrices?.find((p: any) => p.billing_cycle === "monthly")
    const yearlyPriceRecord = existingPrices?.find((p: any) => p.billing_cycle === "yearly")

    const handlePriceUpdate = async (billingCycle: "monthly" | "yearly", newPrice: number, existingRecord: any) => {
      const interval = billingCycle === "monthly" ? "month" : "year"
      let newStripePriceId = existingRecord?.stripe_price_id || null

      // If price changed and we have a Stripe product, create new price and archive old one
      if (existingPlan?.stripe_product_id && newPrice > 0) {
        const priceChanged = existingRecord?.price !== newPrice

        if (priceChanged || !existingRecord?.stripe_price_id) {
          try {
            // Create new Stripe price
            const newStripePrice = await stripe.prices.create({
              product: existingPlan.stripe_product_id,
              unit_amount: Math.round(newPrice * 100),
              currency: "usd",
              recurring: { interval },
            })
            newStripePriceId = newStripePrice.id

            // Archive old price if it exists
            if (existingRecord?.stripe_price_id) {
              await stripe.prices.update(existingRecord.stripe_price_id, {
                active: false,
              })
            }
          } catch (stripeError) {
            console.error(`[v0] Stripe ${billingCycle} price update error:`, stripeError)
          }
        }
      }

      // Update or insert in database
      if (existingRecord) {
        await supabase
          .from("subscription_prices")
          .update({
            price: newPrice,
            trial_days: trial_days || 0,
            stripe_price_id: newStripePriceId,
          })
          .eq("id", existingRecord.id)
      } else {
        await supabase.from("subscription_prices").insert({
          plan_id: planId,
          billing_cycle: billingCycle,
          price: newPrice,
          trial_days: trial_days || 0,
          is_active: true,
          stripe_price_id: newStripePriceId,
        })
      }
    }

    // Update or insert monthly price
    if (monthly_price !== undefined) {
      await handlePriceUpdate("monthly", monthly_price, monthlyPriceRecord)
    }

    // Update or insert yearly price
    if (yearly_price !== undefined) {
      await handlePriceUpdate("yearly", yearly_price, yearlyPriceRecord)
    }

    await logAdminAction({
      action: "update_subscription_plan",
      targetType: "plan",
      targetId: planId,
      details: { name: planData.name, monthly_price, yearly_price },
    })

    return NextResponse.json({ plan: updatedPlan })
  } catch (error) {
    console.error("[v0] Admin plan update error:", error)
    return NextResponse.json({ error: "Failed to update subscription plan" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase } = await requireSuperAdmin()
    const planId = params.id

    // Check if plan has active subscribers
    const { data: subscribers, error: checkError } = await supabase
      .from("user_subscriptions")
      .select("id")
      .eq("plan_id", planId)
      .eq("status", "active")

    if (checkError) throw checkError

    if (subscribers && subscribers.length > 0) {
      return NextResponse.json({ error: "Cannot delete plan with active subscribers" }, { status: 400 })
    }

    const { data: existingPlan } = await supabase
      .from("subscription_plans")
      .select("stripe_product_id")
      .eq("id", planId)
      .single()

    const { data: existingPrices } = await supabase
      .from("subscription_prices")
      .select("stripe_price_id")
      .eq("plan_id", planId)

    if (existingPrices) {
      for (const price of existingPrices) {
        if (price.stripe_price_id) {
          try {
            await stripe.prices.update(price.stripe_price_id, { active: false })
          } catch (stripeError) {
            console.error("[v0] Stripe price archive error:", stripeError)
          }
        }
      }
    }

    if (existingPlan?.stripe_product_id) {
      try {
        await stripe.products.update(existingPlan.stripe_product_id, { active: false })
      } catch (stripeError) {
        console.error("[v0] Stripe product archive error:", stripeError)
      }
    }

    const { error: pricesError } = await supabase.from("subscription_prices").delete().eq("plan_id", planId)

    if (pricesError) {
      console.error("[v0] Error deleting prices:", pricesError)
    }

    // Delete the plan
    const { error } = await supabase.from("subscription_plans").delete().eq("id", planId)

    if (error) throw error

    await logAdminAction({
      action: "delete_subscription_plan",
      targetType: "plan",
      targetId: planId,
      details: { timestamp: new Date().toISOString() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Admin plan deletion error:", error)
    return NextResponse.json({ error: "Failed to delete subscription plan" }, { status: 500 })
  }
}
