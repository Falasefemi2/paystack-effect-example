"use client";

import { Button } from "@/components/ui/button";
import { formatNaira, type Product } from "@/lib/api";
import { useCart } from "@/lib/cart-context";

export function ProductCard({ product }: { product: Product }) {
	const { add } = useCart();

	return (
		<div className="border rounded-lg p-4 flex flex-col gap-2">
			<div className="aspect-square bg-muted rounded-md" />
			<h3 className="font-medium">{product.name}</h3>
			<p className="text-sm text-muted-foreground">
				{product.description}
			</p>
			<div className="flex items-center justify-between mt-2">
				<span className="font-semibold">
					{formatNaira(product.price)}
				</span>
				<Button
					size="sm"
					onClick={() => add(product.id)}
				>
					Add to cart
				</Button>
			</div>
		</div>
	);
}
