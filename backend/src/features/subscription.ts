import { Customer, Plan, Subscription } from "@pharlase/paystack-effect"
import { Effect, Schema } from "effect"
import { DemoStore } from "../service/store"
import { json } from "../data/lib/http"
import { runtime } from "../data/lib/runtime"

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

// Paystack has no "get or create" for plans — a real app would seed this via
// a migration or the dashboard. We fake idempotency here with an in-memory
// cache keyed by this constant, purely for demo purposes.
const DEMO_PLAN_KEY = "pro-monthly"

const ensurePlanCode = Effect.gen(function* () {
  const store = yield* DemoStore
  const cached = yield* store.getPlan(DEMO_PLAN_KEY)
  if (cached) return cached

  const planService = yield* Plan.Service
  const response = yield* planService.create({
    name: "Pro Monthly",
    amount: 500000, // ₦5,000.00
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

    // Note: Paystack's create-customer endpoint returns the existing
    // customer when the email already exists rather than erroring, so this
    // is safe to call even without the cache — the cache just saves a round
    // trip on repeat calls within this demo.
    const customerService = yield* Customer.Service
    const response = yield* customerService.create({ email })
    const data = yield* Schema.decodeUnknownEffect(CustomerData)(response.data ?? {})
    yield* store.setCustomer(email, data.customer_code)
    return data.customer_code
  })

// POST /api/subscription/subscribe  { email }
// Subscribes the given email to a single demo "Pro Monthly" plan, creating
// the customer and the plan on first use if they don't exist yet.
export async function subscribe(req: Request): Promise<Response> {
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
    return json(await runtime.runPromise(program))
  } catch (err) {
    console.error("subscribe failed", err)
    return json({ error: "Failed to create subscription" }, { status: 502 })
  }
}

// GET /api/subscription/manage-link?code=xxx
// Returns Paystack's hosted self-service link for the customer to
// update payment method or cancel — no custom UI needed for that part.
export async function manageLink(req: Request, url: URL): Promise<Response> {
  const code = url.searchParams.get("code")
  if (!code) return json({ error: "code is required" }, { status: 400 })

  const program = Effect.gen(function* () {
    const subscriptionService = yield* Subscription.Service
    const response = yield* subscriptionService.manageLink({ code })
    return yield* Schema.decodeUnknownEffect(ManageLinkData)(response.data ?? {})
  })

  try {
    return json(await runtime.runPromise(program))
  } catch (err) {
    console.error("manageLink failed", err)
    return json({ error: "Failed to fetch manage link" }, { status: 502 })
  }
}
