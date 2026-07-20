const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface Product {
	id: string;
	name: string;
	description: string;
	price: number; // kobo
	currency: "NGN";
	image: string;
}

export interface CartItem {
	productId: string;
	quantity: number;
}

export const formatNaira = (kobo: number) =>
	new Intl.NumberFormat("en-NG", {
		style: "currency",
		currency: "NGN",
	}).format(kobo / 100);

export async function getProducts(): Promise<Product[]> {
	const res = await fetch(`${API_URL}/api/products`, {
		cache: "no-store",
	});
	if (!res.ok) throw new Error("Failed to load products");
	return res.json();
}

export async function initializeCheckout(email: string, items: CartItem[]) {
	const res = await fetch(`${API_URL}/api/checkout/initialize`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ email, items }),
	});
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(body.error ?? "Failed to start checkout");
	}
	return res.json() as Promise<{
		authorization_url: string;
		reference: string;
	}>;
}

export async function verifyCheckout(reference: string) {
	const res = await fetch(
		`${API_URL}/api/checkout/verify?reference=${encodeURIComponent(reference)}`,
		{ cache: "no-store" },
	);
	if (!res.ok) throw new Error("Failed to verify payment");
	return res.json() as Promise<{
		paystackStatus: string;
		order: unknown;
	}>;
}
