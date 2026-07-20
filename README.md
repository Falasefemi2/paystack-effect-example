# paystack-effect-examples

A runnable example showing how to use [`@pharlase/paystack-effect`](https://github.com/Falasefemi2/paystack-effect) — an Effect-TS v4 wrapper around the Paystack API — in a real application.

This is **not a hosted demo**. It's a reference you clone and run locally: a minimal storefront (product list → cart → Paystack checkout → payment confirmation) with a real backend integration and real webhook signature verification. If you're evaluating `paystack-effect` or wiring it into your own app, this is the fastest way to see it in context.

No database — products are a static in-memory catalog, orders live in an in-memory store. That's deliberate: the point here is the Paystack integration, not persistence. Swap the in-memory `OrderStore` for a real DB-backed layer when adapting this into a production app; nothing about the Paystack calls changes.

---

## What this demonstrates

1. **Server-side price computation** — the backend recomputes the charge amount from product IDs before calling Paystack. Never trust a client-supplied amount.
2. **`Transaction.initialize`** — starts a hosted checkout session, decodes the untyped response `data` into a proper shape at the boundary using `Schema`.
3. **Redirect + `callback_url`** — customer completes payment on Paystack's hosted page, gets redirected back to the app.
4. **`Transaction.verify`** — confirms payment status when the customer lands back on the app (used for immediate UI feedback).
5. **Webhook signature verification** — the durable source of truth. Paystack signs webhook payloads with your secret key (HMAC-SHA512); the example verifies that signature before trusting a `charge.success` event.

---

## Project structure

---

## Setup

### Backend

```bash
cd backend
bun install
cp .env.example .env
```

Fill in `.env`:

| Var | Purpose |
|---|---|
| `PAYSTACK_SECRET_KEY` | Auth for API calls + webhook signature verification. Use a `sk_test_...` key. |
| `PORT` | Defaults to `4000`. |
| `FRONTEND_URL` | Used to build the `callback_url` Paystack redirects to after payment. Defaults to `http://localhost:3000`. |

```bash
bun run dev
```

Backend runs on `:4000`.

### Frontend

```bash
cd frontend
bun install
```

If you're generating the Next.js app fresh rather than using the one committed here:

```bash
bunx create-next-app@latest . --typescript --tailwind --app
bunx shadcn@latest init
bunx shadcn@latest add button input
```

Set `.env.local`:  NEXT_PUBLIC_API_URL=http://localhost:4000

```bash
bun run dev
```

Frontend runs on `:3000`.

---

## Running the full flow

1. Open `http://localhost:3000` — you'll see the product grid.
2. Add a couple of items, click **Checkout**.
3. Enter an email, submit — you're redirected to Paystack's hosted checkout page.
4. Complete payment with a [Paystack test card](https://paystack.com/docs/payments/test-payments/).
5. You land back on `/checkout/success?reference=...`, which calls `Transaction.verify` and shows the payment status.

### Testing the webhook

Paystack needs a public URL to deliver webhooks to. Tunnel your backend:

```bash
ngrok http 4000
```

Point your Paystack dashboard's webhook URL at `https://<your-ngrok-subdomain>.ngrok.io/api/webhook/paystack`, then run through the checkout flow again — you should see `webhook processing` logs in the backend terminal as the `charge.success` event lands.

The webhook is the source of truth for payment status in a real app; `/checkout/verify` (step 5 above) is only for immediate feedback on the page the customer happens to land on.

---

## Why an example, not a hosted demo

A live deployment means uptime babysitting, a real Paystack test account staying valid indefinitely, and public attack surface — none of which helps someone learn the SDK. Cloning and running working code does, and it takes about two minutes.

---

## Roadmap

Planned additions as time allows: subscription billing (`Plan` + `Subscription`), marketplace payouts (`Split` + `Subaccount` + `Transfer`), refunds (`Refund`).

Contributions welcome — open an issue with what you're trying to do, or send a PR.

---

## Related

- [`paystack-effect`](https://github.com/Falasefemi2/paystack-effect) — the SDK itself
