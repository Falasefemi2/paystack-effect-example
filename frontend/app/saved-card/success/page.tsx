"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { verifySavedCardPayment } from "@/lib/api";

export default function SavedCardSuccessPage() {
	const searchParams = useSearchParams();
	const reference = searchParams.get("reference");
	const [status, setStatus] = useState<string>("Verifying...");

	useEffect(() => {
		const email = localStorage.getItem("saved-card-email");
		if (!reference || !email) {
			setStatus("Missing reference or email");
			return;
		}

		verifySavedCardPayment(reference, email)
			.then((result) => {
				setStatus(
					result.authorization
						? `${result.status} — card saved (${result.authorization.bank ?? "bank unknown"} ****${result.authorization.last4 ?? "????"})`
						: result.status,
				);
			})
			.catch(() => setStatus("Verification failed"));
	}, [reference]);

	return (
		<main className="max-w-md mx-auto p-8">
			<h1 className="text-xl font-bold mb-2">
				Payment {status}
			</h1>
			<p className="text-sm text-muted-foreground">
				Reference: {reference}
			</p>
			<a
				href="/saved-card"
				className="text-sm underline mt-4 inline-block"
			>
				Back to saved-card demo
			</a>
		</main>
	);
}
