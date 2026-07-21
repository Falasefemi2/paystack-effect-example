"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getManageLink, subscribe } from "@/lib/api";

export default function SubscriptionPage() {
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [subscriptionCode, setSubscriptionCode] = useState<string | null>(
		null,
	);
	const [status, setStatus] = useState<string | null>(null);

	const handleSubscribe = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setLoading(true);
		try {
			const result = await subscribe(email);
			setSubscriptionCode(result.subscription_code);
			setStatus(result.status);
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setLoading(false);
		}
	};

	const handleManage = async () => {
		if (!subscriptionCode) return;
		try {
			const { link } = await getManageLink(subscriptionCode);
			window.open(link, "_blank");
		} catch (err) {
			setError((err as Error).message);
		}
	};

	return (
		<main className="max-w-md mx-auto p-8 flex flex-col gap-4">
			<h1 className="text-xl font-bold">
				Subscription billing
			</h1>
			<p className="text-sm text-muted-foreground">
				Subscribes to a demo "Pro Monthly" plan
				(₦5,000/month).
			</p>

			<form
				onSubmit={handleSubscribe}
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
				{error && (
					<p className="text-sm text-red-600">
						{error}
					</p>
				)}
				<Button type="submit" disabled={loading}>
					{loading
						? "Subscribing..."
						: "Subscribe"}
				</Button>
			</form>

			{subscriptionCode && (
				<div className="border-t pt-4 flex flex-col gap-2">
					<p className="text-sm">
						Subscribed — code:{" "}
						<code>{subscriptionCode}</code>,
						status: {status}
					</p>
					<Button
						variant="secondary"
						onClick={handleManage}
					>
						Manage subscription
					</Button>
				</div>
			)}
		</main>
	);
}
