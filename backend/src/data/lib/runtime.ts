import { Layer, ManagedRuntime } from "effect"
import { PaystackLayer } from "../../service/paystack"
import { OrderStoreLive } from "../../service/order-store"
import { DemoStoreLive } from "../../service/store"

const AppLayer = Layer.mergeAll(PaystackLayer, OrderStoreLive, DemoStoreLive)

export const runtime = ManagedRuntime.make(AppLayer)
