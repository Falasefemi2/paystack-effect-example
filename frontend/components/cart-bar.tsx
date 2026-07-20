"use client";

import { useCart } from "@/lib/cart-context";
import Link from "next/link";
import { Button } from "./ui/button";

export function CartBar() {
	const { items } = useCart();
	const count = items.reduce((sum, i) => sum + i.quantity, 0);

	if (count === 0) return null;

	return (
		<div className="fixed bottom-4 inset-x-0 flex justify-center">
			<div className="bg-black text-white rounded-full px-6 py-3 flex items-center gap-4 shadow-lg">
				<span>
					{count} item{count > 1 ? "s" : ""} in
					cart
				</span>
				<Link href="/checkout">
					<Button variant="secondary" size="sm">
						checkout
					</Button>
				</Link>
			</div>
		</div>
	);
}
