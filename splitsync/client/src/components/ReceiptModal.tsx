import { useEffect, useState } from "react";
import { ApiError, getReceipt } from "../lib/api";

function ReceiptModal({
	groupId,
	expenseId,
	description,
	onClose,
}: {
	groupId: string;
	expenseId: string;
	description: string;
	onClose: () => void;
}) {
	const [imageUrl, setImageUrl] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") onClose();
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onClose]);

	useEffect(() => {
		let objectUrl: string | null = null;
		let isCancelled = false;

		getReceipt(groupId, expenseId)
			.then((blob) => {
				if (isCancelled) return;
				objectUrl = URL.createObjectURL(blob);
				setImageUrl(objectUrl);
			})
			.catch((err) => {
				if (isCancelled) return;
				setError(
					err instanceof ApiError ? err.message : "Could not load the receipt.",
				);
			});

		return () => {
			isCancelled = true;
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	}, [groupId, expenseId]);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<button
				type="button"
				aria-label="Close receipt"
				tabIndex={-1}
				onClick={onClose}
				className="absolute inset-0 cursor-default bg-black/70"
			/>
			<div
				role="dialog"
				aria-modal="true"
				aria-label={`Receipt for ${description}`}
				className="surface-shadow relative flex max-h-full w-full max-w-lg flex-col rounded-2xl border p-4 border-(--border) bg-(--surface)"
			>
				<div className="flex items-center justify-between gap-2">
					<p className="truncate text-sm font-semibold text-(--text-h)">
						Receipt · {description}
					</p>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close"
						className="cursor-pointer text-(--text) hover:text-(--text-h)"
					>
						×
					</button>
				</div>

				<div className="mt-3 flex min-h-40 items-center justify-center overflow-auto">
					{error ? (
						<p role="alert" className="text-sm text-(--danger)">
							{error}
						</p>
					) : imageUrl ? (
						<img
							src={imageUrl}
							alt={`Receipt for ${description}`}
							className="max-h-[75vh] w-auto rounded-lg object-contain"
						/>
					) : (
						<p className="text-sm text-(--text)">Loading receipt…</p>
					)}
				</div>
			</div>
		</div>
	);
}

export default ReceiptModal;
