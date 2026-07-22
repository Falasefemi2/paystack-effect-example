"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { chargeSavedCard, initializeSavedCardPayment } from "@/lib/api";

export default function SavedCardPage() {
	const [email, setEmail] = useState("");
	const [amount, setAmount] = useState("500000"); // kobo
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [chargeResult, setChargeResult] = useState<string | null>(null);

	const savedCard =
		typeof window !== "undefined"
			? localStorage.getItem("saved-card-status")
			: null;

	const handlePay = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setLoading(true);
		try {
			localStorage.setItem("saved-card-email", email);
			const { authorization_url } =
				await initializeSavedCardPayment(
					email,
					Number(amount),
				);
			window.location.href = authorization_url;
		} catch (err) {
			setError((err as Error).message);
			setLoading(false);
		}
	};

	const handleChargeAgain = async () => {
		setError(null);
		setChargeResult(null);
		setLoading(true);
		try {
			const result = await chargeSavedCard(
				email,
				Number(amount),
			);
			setChargeResult(
				`Charged — status: ${result.status}, reference: ${result.reference}`,
			);
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<main className="max-w-md mx-auto p-8 flex flex-col gap-4">
			<h1 className="text-xl font-bold">
				Saved-card repeat checkout
			</h1>
			<p className="text-sm text-muted-foreground">
				Pay once to save the card, then charge the same
				email again without a redirect.
			</p>

			<form
				onSubmit={handlePay}
				className="flex flex-col gap-3"
			>
				<Input
					type="email"
					required
					placeholder="you@example.com"
					value={email}
					onChange={(e) =>
						setEmail(e.target.value)
					}
				/>
				<Input
					type="number"
					required
					placeholder="Amount in kobo"
					value={amount}
					onChange={(e) =>
						setAmount(e.target.value)
					}
				/>
				{error && (
					<p className="text-sm text-red-600">
						{error}
					</p>
				)}
				<Button type="submit" disabled={loading}>
					{loading
						? "Redirecting..."
						: "Pay with Paystack"}
				</Button>
			</form>

			<div className="border-t pt-4">
				<Button
					variant="secondary"
					onClick={handleChargeAgain}
					disabled={loading || !email}
				>
					Charge saved card again
				</Button>
				{chargeResult && (
					<p className="text-sm text-green-700 mt-2">
						{chargeResult}
					</p>
				)}
			</div>
		</main>
	);
}
