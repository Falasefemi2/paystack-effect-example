export interface Product {
  readonly id: string
  readonly name: string
  readonly description: string
  /** price in kobo (smallest NGN unit) — Paystack amounts are always the smallest currency unit */
  readonly price: number
  readonly currency: "NGN"
  readonly image: string
}

// In-memory catalog. Swap for a real DB (Drizzle + Postgres) once you're past
// smoke-testing the Paystack integration — server-side price lookup below is
// what matters, not where the catalog lives.
export const products: ReadonlyArray<Product> = [
  {
    id: "prod_1",
    name: "Mechanical Keyboard",
    description: "75% hot-swappable, brown switches",
    price: 4_500_000, // ₦45,000.00
    currency: "NGN",
    image: "/products/keyboard.jpg",
  },
  {
    id: "prod_2",
    name: "Wireless Mouse",
    description: "Ergonomic, 2.4GHz + Bluetooth",
    price: 1_200_000, // ₦12,000.00
    currency: "NGN",
    image: "/products/mouse.jpg",
  },
  {
    id: "prod_3",
    name: "USB-C Hub",
    description: "7-in-1, HDMI + PD passthrough",
    price: 1_800_000, // ₦18,000.00
    currency: "NGN",
    image: "/products/hub.jpg",
  },
]

export const findProduct = (id: string): Product | undefined => products.find((p) => p.id === id)
