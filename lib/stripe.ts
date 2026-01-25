import Stripe from "stripe"

export const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set")
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-04-30.basil",
    typescript: true,
  })
}

// For backward compatibility, create a lazy-initialized instance
let stripeInstance: Stripe | null = null

export const stripe = new Proxy({} as Stripe, {
  get: (target, prop) => {
    if (!stripeInstance) {
      stripeInstance = getStripe()
    }
    return (stripeInstance as any)[prop]
  },
})
