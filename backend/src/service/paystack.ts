import { PaystackHttpClient, Transaction, Customer, Plan, Subscription } from "@pharlase/paystack-effect"
import { Config, Layer } from "effect"

const PaystackConfigLive = PaystackHttpClient.layerConfig({
  apiKey: Config.redacted("PAYSTACK_SECRET_KEY"),
})

export const PaystackClientLive = PaystackHttpClient.layer.pipe(Layer.provide(PaystackConfigLive))

// Add a resource's `.layer` here whenever a new feature needs it.
export const PaystackLayer = Layer.mergeAll(Transaction.layer, Customer.layer, Plan.layer, Subscription.layer).pipe(
  Layer.provide(PaystackClientLive),
)
