import { Context, Effect, Layer, Ref } from "effect"

export interface Order {
  readonly reference: string
  readonly email: string
  readonly amount: number
  readonly status: "pending" | "paid" | "failed"
  readonly items: ReadonlyArray<{ productId: string; quantity: number }>
  readonly createdAt: number
}

export interface OrderStoreShape {
  readonly create: (order: Order) => Effect.Effect<void>
  readonly get: (reference: string) => Effect.Effect<Order | undefined>
  readonly markPaid: (reference: string) => Effect.Effect<void>
  readonly markFailed: (reference: string) => Effect.Effect<void>
}

export class OrderStore extends Context.Service<OrderStore, OrderStoreShape>()(
  "backend/service/order-store/OrderStore",
) {}

export const OrderStoreLive = Layer.effect(
  OrderStore,
  Effect.gen(function* () {
    const ref = yield* Ref.make(new Map<string, Order>())

    const setStatus = (reference: string, status: Order["status"]) =>
      Ref.update(ref, (map) => {
        const existing = map.get(reference)
        if (!existing) return map
        const next = new Map(map)
        next.set(reference, { ...existing, status })
        return next
      })

    return OrderStore.of({
      create: (order) =>
        Ref.update(ref, (map) => {
          const next = new Map(map)
          next.set(order.reference, order)
          return next
        }),
      get: (reference) => Ref.get(ref).pipe(Effect.map((map) => map.get(reference))),
      markPaid: (reference) => setStatus(reference, "paid"),
      markFailed: (reference) => setStatus(reference, "failed"),
    })
  }),
)
