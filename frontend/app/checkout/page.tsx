"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initializeCheckout } from "@/lib/api";
import { useCart } from "@/lib/cart-context";

// NOTE: prices shown here are illustrative only (client doesn't have the
// catalog loaded). The backend recomputes the real amount server-side from
// product IDs before calling Paystack — never trust a client-sent amount.
export default function CheckoutPage() {
  const { items } = useCart();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { authorization_url } = await initializeCheckout(email, items);
      window.location.href = authorization_url;
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return <main className="max-w-md mx-auto p-8">Your cart is empty.</main>;
  }

  return (
    <main className="max-w-md mx-auto p-8">
      <h1 className="text-xl font-bold mb-4">Checkout</h1>
      <ul className="mb-4 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item.productId}>
            {item.productId} × {item.quantity}
          </li>
        ))}
      </ul>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? "Redirecting..." : "Pay with Paystack"}
        </Button>
      </form>
    </main>
  );
}
