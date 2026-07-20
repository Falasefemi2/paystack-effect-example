import { CartBar } from "@/components/cart-bar";
import { ProductCard } from "@/components/product-card";
import { getProducts } from "@/lib/api";

export default async function HomePage() {
  const products = await getProducts();

  return (
    <main className="max-w-5xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Store</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      <CartBar />
    </main>
  );
}
