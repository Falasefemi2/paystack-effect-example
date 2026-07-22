import { Layer, ManagedRuntime, Effect, Schema } from "effect"
import { PaystackLayer } from "./src/service/paystack"
import { OrderStore, OrderStoreLive } from "./src/service/order-store"
import { DemoStore, DemoStoreLive } from "./src/service/store"
import { findProduct, products } from "./src/data/product"
import { Transaction, Customer, Plan, Subscription } from "@pharlase/paystack-effect"
import * as crypto from "node:crypto"
import * as SavedCard from "./src/features/saved-card"
import { runtime } from "./src/data/lib/runtime"

// --- checkout schemas ---
const InitializeData = Schema.Struct({
  authorization_url: Schema.String,
  access_code: Schema.String,
  reference: Schema.String,
})

const VerifyData = Schema.Struct({
  status: Schema.String,
})

// --- subscription schemas ---
const PlanData = Schema.Struct({
  plan_code: Schema.String,
  name: Schema.String,
  amount: Schema.Number,
})

const CustomerData = Schema.Struct({
  customer_code: Schema.String,
  email: Schema.String,
})

const SubscriptionData = Schema.Struct({
  subscription_code: Schema.String,
  status: Schema.String,
})

const ManageLinkData = Schema.Struct({
  link: Schema.String,
})

const DEMO_PLAN_KEY = "pro-monthly"

const ensurePlanCode = Effect.gen(function* () {
  const store = yield* DemoStore
  const cached = yield* store.getPlan(DEMO_PLAN_KEY)
  if (cached) return cached

  const planService = yield* Plan.Service
  const response = yield* planService.create({
    name: "Pro Monthly",
    amount: 500000,
    interval: "monthly",
  })
  const data = yield* Schema.decodeUnknownEffect(PlanData)(response.data ?? {})
  yield* store.setPlan(DEMO_PLAN_KEY, data.plan_code)
  return data.plan_code
})

const ensureCustomerCode = (email: string) =>
  Effect.gen(function* () {
    const store = yield* DemoStore
    const cached = yield* store.getCustomer(email)
    if (cached) return cached

    const customerService = yield* Customer.Service
    const response = yield* customerService.create({ email })
    const data = yield* Schema.decodeUnknownEffect(CustomerData)(response.data ?? {})
    yield* store.setCustomer(email, data.customer_code)
    return data.customer_code
  })

const json = (data: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      ...(init?.headers ?? {}),
    },
  })

interface CheckoutItem {
  productId: string
  quantity: number
}

const computeAmount = (items: ReadonlyArray<CheckoutItem>): number =>
  items.reduce((total, item) => {
    const product = findProduct(item.productId)
    if (!product) throw new Error(`Unknown product: ${item.productId}`)
    return total + product.price * item.quantity
  }, 0)

const port = Number(process.env.PORT ?? 4000)

Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url)

    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET,POST,OPTIONS",
          "access-control-allow-headers": "content-type",
        },
      })
    }

    // GET /api/products
    if (req.method === "GET" && url.pathname === "/api/products") {
      return json(products)
    }

    // POST /api/checkout/initialize
    if (req.method === "POST" && url.pathname === "/api/checkout/initialize") {
      const body = (await req.json()) as { email: string; items: CheckoutItem[] }

      if (!body.email || !body.items?.length) {
        return json({ error: "email and items are required" }, { status: 400 })
      }

      let amount: number
      try {
        amount = computeAmount(body.items)
      } catch (err) {
        return json({ error: (err as Error).message }, { status: 400 })
      }

      const program = Effect.gen(function* () {
        const tx = yield* Transaction.Service
        const orderStore = yield* OrderStore

        const response = yield* tx.initialize({
          email: body.email,
          amount,
          currency: "NGN",
          callback_url: `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/checkout/success`,
        })

        const data = yield* Schema.decodeUnknownEffect(InitializeData)(response.data ?? {})

        yield* orderStore.create({
          reference: data.reference,
          email: body.email,
          amount,
          status: "pending",
          items: body.items,
          createdAt: Date.now(),
        })

        return data
      })

      try {
        const result = await runtime.runPromise(program)
        return json(result)
      } catch (err) {
        console.error("checkout initialize failed", err)
        return json({ error: "Failed to initialize payment" }, { status: 502 })
      }
    }

    // GET /api/checkout/verify?reference=xxx
    if (req.method === "GET" && url.pathname === "/api/checkout/verify") {
      const reference = url.searchParams.get("reference")
      if (!reference) return json({ error: "reference is required" }, { status: 400 })

      const program = Effect.gen(function* () {
        const tx = yield* Transaction.Service
        const orderStore = yield* OrderStore

        const response = yield* tx.verify({ reference })
        const data = yield* Schema.decodeUnknownEffect(VerifyData)(response.data ?? {})
        const status = data.status

        if (status === "success") {
          yield* orderStore.markPaid(reference)
        } else if (status === "failed" || status === "abandoned") {
          yield* orderStore.markFailed(reference)
        }

        const order = yield* orderStore.get(reference)
        return { paystackStatus: status, order }
      })

      try {
        const result = await runtime.runPromise(program)
        return json(result)
      } catch (err) {
        console.error("checkout verify failed", err)
        return json({ error: "Verification failed" }, { status: 502 })
      }
    }

    // POST /api/webhook/paystack
    if (req.method === "POST" && url.pathname === "/api/webhook/paystack") {
      const secretKey = process.env.PAYSTACK_SECRET_KEY ?? ""
      const rawBody = await req.text()
      const signature = req.headers.get("x-paystack-signature") ?? ""

      const expected = crypto.createHmac("sha512", secretKey).update(rawBody).digest("hex")

      if (expected !== signature) {
        return new Response("Invalid signature", { status: 401 })
      }

      const event = JSON.parse(rawBody)

      if (event.event === "charge.success" && event.data?.reference) {
        try {
          await runtime.runPromise(
            Effect.gen(function* () {
              const orderStore = yield* OrderStore
              yield* orderStore.markPaid(event.data.reference)
            }),
          )
        } catch (err) {
          console.error("webhook processing failed", err)
        }
      }

      return new Response(null, { status: 200 })
    }

    // POST /api/subscription/subscribe  { email }
    if (req.method === "POST" && url.pathname === "/api/subscription/subscribe") {
      const body = (await req.json()) as { email: string }
      if (!body.email) return json({ error: "email is required" }, { status: 400 })

      const program = Effect.gen(function* () {
        const customerCode = yield* ensureCustomerCode(body.email)
        const planCode = yield* ensurePlanCode

        const subscriptionService = yield* Subscription.Service
        const response = yield* subscriptionService.create({
          customer: customerCode,
          plan: planCode,
        })

        return yield* Schema.decodeUnknownEffect(SubscriptionData)(response.data ?? {})
      })

      try {
        const result = await runtime.runPromise(program)
        return json(result)
      } catch (err) {
        console.error("subscribe failed", err)
        return json({ error: "Failed to create subscription" }, { status: 502 })
      }
    }

    // GET /api/subscription/manage-link?code=xxx
    if (req.method === "GET" && url.pathname === "/api/subscription/manage-link") {
      const code = url.searchParams.get("code")
      if (!code) return json({ error: "code is required" }, { status: 400 })

      const program = Effect.gen(function* () {
        const subscriptionService = yield* Subscription.Service
        const response = yield* subscriptionService.manageLink({ code })
        return yield* Schema.decodeUnknownEffect(ManageLinkData)(response.data ?? {})
      })

      try {
        const result = await runtime.runPromise(program)
        return json(result)
      } catch (err) {
        console.error("manageLink failed", err)
        return json({ error: "Failed to fetch manage link" }, { status: 502 })
      }
    }

    // --- Saved-card repeat checkout ---
    if (req.method === "POST" && url.pathname === "/api/saved-card/initialize") {
      return SavedCard.initialize(req)
    }
    if (req.method === "GET" && url.pathname === "/api/saved-card/verify") {
      return SavedCard.verify(req, url)
    }
    if (req.method === "POST" && url.pathname === "/api/saved-card/charge") {
      return SavedCard.charge(req)
    }

    return json({ error: "Not found" }, { status: 404 })
  },
})

console.log(`Backend listening on http://localhost:${port}`)
