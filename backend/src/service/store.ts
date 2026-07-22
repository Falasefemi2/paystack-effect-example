import { Context, Effect, Layer, Ref } from "effect"

export interface DemoStoreShape {
  readonly setCustomer: (email: string, code: string) => Effect.Effect<void>
  readonly getCustomer: (email: string) => Effect.Effect<string | undefined>
  readonly setPlan: (key: string, code: string) => Effect.Effect<void>
  readonly getPlan: (key: string) => Effect.Effect<string | undefined>
  readonly setAuthorization: (email: string, code: string) => Effect.Effect<void>
  readonly getAuthorization: (email: string) => Effect.Effect<string | undefined>
}

export class DemoStore extends Context.Service<DemoStore, DemoStoreShape>()("backend/service/store/DemoStore") {}

// Everything here is in-memory and resets on restart — these examples exist
// to show the Paystack calls, not to model real persistence.
export const DemoStoreLive = Layer.effect(
  DemoStore,
  Effect.gen(function* () {
    const customers = yield* Ref.make(new Map<string, string>())
    const authorizations = yield* Ref.make(new Map<string, string>())
    const plans = yield* Ref.make(new Map<string, string>())

    const set = (ref: Ref.Ref<Map<string, string>>) => (key: string, value: string) =>
      Ref.update(ref, (map) => new Map(map).set(key, value))

    const get = (ref: Ref.Ref<Map<string, string>>) => (key: string) =>
      Ref.get(ref).pipe(Effect.map((map) => map.get(key)))

    return DemoStore.of({
      setCustomer: set(customers),
      getCustomer: get(customers),
      setAuthorization: set(authorizations),
      getAuthorization: get(authorizations),
      setPlan: set(plans),
      getPlan: get(plans),
    })
  }),
)
