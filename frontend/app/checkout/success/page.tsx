import { verifyCheckout } from "@/lib/api";

export default async function CheckoutSuccessPage({
	searchParams,
}: {
	searchParams: Promise<{ reference?: string }>;
}) {
	const { reference } = await searchParams;

	if (!reference) {
		return (
			<main className="max-w-md mx-auto p-8">
				Missing payment reference.
			</main>
		);
	}

	let status: string;
	try {
		const result = await verifyCheckout(reference);
		status = result.paystackStatus;
	} catch {
		status = "error";
	}

	return (
		<main className="max-w-md mx-auto p-8">
			<h1 className="text-xl font-bold mb-2">
				Payment {status}
			</h1>
			<p className="text-sm text-muted-foreground">
				Reference: {reference}
			</p>
		</main>
	);
}
