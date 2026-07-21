import { Transaction } from "@pharlase/paystack-effect"
import { Effect, Schema } from "effect"
import { json } from "../data/lib/http"
import { runtime } from "../data/lib/runtime"
import { DemoStore } from "../service/store"

// paystack-effect's generic Response envelope types `data` as
// Record<string, unknown> for every endpoint, so each feature decodes into
// its own shape at the boundary via Schema.decodeUnknownEffect.

const InitializeData = Schema.Struct({
  authorization_url: Schema.String,
  access_code: Schema.String,
  reference: Schema.String,
})

const AuthorizationInfo = Schema.Struct({
  authorization_code: Schema.String,
  last4: Schema.optional(Schema.String),
  bank: Schema.optional(Schema.String),
})

const VerifyData = Schema.Struct({
  status: Schema.String,
  authorization: Schema.optional(AuthorizationInfo),
})

const ChargeData = Schema.Struct({
  status: Schema.String,
  reference: Schema.String,
})

// POST /api/saved-card/initialize  { email, amount }
// A completely normal Transaction.initialize call — the interesting part
// happens in verify() below.
export async function initialize(req: Request): Promise<Response> {
  const body = (await req.json()) as { email: string; amount: number }
  if (!body.email || !body.amount) {
    return json({ error: "email and amount are required" }, { status: 400 })
  }

  const program = Effect.gen(function* () {
    const tx = yield* Transaction.Service
    const response = yield* tx.initialize({
      email: body.email,
      amount: body.amount,
      currency: "NGN",
    })
    return yield* Schema.decodeUnknownEffect(InitializeData)(response.data ?? {})
  })

  try {
    return json(await runtime.runPromise(program))
  } catch (err) {
    console.error("saved-card initialize failed", err)
    return json({ error: "Failed to initialize payment" }, { status: 502 })
  }
}

// GET /api/saved-card/verify?reference=xxx&email=xxx
// On a successful payment, Paystack's verify response includes an
// `authorization` object with a reusable `authorization_code`. We capture
// that here — this is the whole point of the demo.
export async function verify(req: Request, url: URL): Promise<Response> {
  const reference = url.searchParams.get("reference")
  const email = url.searchParams.get("email")
  if (!reference || !email) {
    return json({ error: "reference and email are required" }, { status: 400 })
  }

  const program = Effect.gen(function* () {
    const tx = yield* Transaction.Service
    const store = yield* DemoStore

    const response = yield* tx.verify({ reference })
    const data = yield* Schema.decodeUnknownEffect(VerifyData)(response.data ?? {})

    if (data.status === "success" && data.authorization?.authorization_code) {
      yield* store.setAuthorization(email, data.authorization.authorization_code)
    }

    return data
  })

  try {
    return json(await runtime.runPromise(program))
  } catch (err) {
    console.error("saved-card verify failed", err)
    return json({ error: "Verification failed" }, { status: 502 })
  }
}

// POST /api/saved-card/charge  { email, amount }
// No redirect, no card entry — charges whatever authorization_code we
// captured for this email during a previous verify() call.
export async function charge(req: Request): Promise<Response> {
  const body = (await req.json()) as { email: string; amount: number }
  if (!body.email || !body.amount) {
    return json({ error: "email and amount are required" }, { status: 400 })
  }

  const program = Effect.gen(function* () {
    const store = yield* DemoStore
    const authorizationCode = yield* store.getAuthorization(body.email)

    if (!authorizationCode) {
      return yield* Effect.fail(new Error("No saved card for this email — complete an initial payment first."))
    }

    const tx = yield* Transaction.Service
    const response = yield* tx.chargeAuthorization({
      email: body.email,
      amount: body.amount,
      authorization_code: authorizationCode,
    })

    return yield* Schema.decodeUnknownEffect(ChargeData)(response.data ?? {})
  })

  try {
    return json(await runtime.runPromise(program))
  } catch (err) {
    console.error("saved-card charge failed", err)
    return json({ error: (err as Error).message ?? "Charge failed" }, { status: 502 })
  }
}
