import { PaystackHttpClient, Transaction } from "@pharlase/paystack-effect"
import { Config, Layer } from "effect"

const PaystackConfigLive = PaystackHttpClient.layerConfig({
  apiKey: Config.redacted("PAYSTACK_SECRET_KEY"),
})

export const PaystackClientLive = PaystackHttpClient.layer.pipe(Layer.provide(PaystackConfigLive))

export const PaystackLayer = Layer.mergeAll(Transaction.layer).pipe(Layer.provide(PaystackClientLive))
