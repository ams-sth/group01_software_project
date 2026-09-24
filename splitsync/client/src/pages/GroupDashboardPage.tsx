import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AddExpenseModal from "../components/AddExpenseModal";
import ReceiptModal from "../components/ReceiptModal";
import {
	addMember,
	ApiError,
	deleteExpense,
	deleteGroup,
	getBalances,
	leaveGroup,
	listExpenses,
	listGroups,
	listSettlements,
	recordSettlement,
	removeMember,
	renameGroup,
	type ExpenseResponse,
	type GroupBalancesResponse,
	type GroupResponse,
	type SettlementResponse,
} from "../lib/api";
import { getCurrentUser } from "../lib/session";

type Tab = "overview" | "transactions" | "members";

// How often the dashboard quietly re-fetches while it's open, so changes made by
// other members show up without a page reload.
const BACKGROUND_REFRESH_MS = 20_000;

type TransactionItem =
	| { kind: "expense"; id: string; createdAt: string; data: ExpenseResponse }
	| {
			kind: "settlement";
			id: string;
			createdAt: string;
			data: SettlementResponse;
	  };

function GroupDashboardPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const currentUsername = getCurrentUser()?.username;

	const [group, setGroup] = useState<GroupResponse | null>(null);
	const [isLoadingGroup, setIsLoadingGroup] = useState(true);
	const [groupError, setGroupError] = useState<string | null>(null);

	const [tab, setTab] = useState<Tab>("overview");
	const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
	const [editingExpense, setEditingExpense] = useState<ExpenseResponse | null>(
		null,
	);
	const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(
		null,
	);
	const [deleteExpenseError, setDeleteExpenseError] = useState<string | null>(
		null,
	);
	const [viewingReceiptExpense, setViewingReceiptExpense] =
		useState<ExpenseResponse | null>(null);

	const [expenses, setExpenses] = useState<ExpenseResponse[]>([]);
	const [settlements, setSettlements] = useState<SettlementResponse[]>([]);
	const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
	const [transactionsError, setTransactionsError] = useState<string | null>(
		null,
	);

	const [balances, setBalances] = useState<GroupBalancesResponse | null>(null);
	const [isLoadingBalances, setIsLoadingBalances] = useState(true);
	const [balancesError, setBalancesError] = useState<string | null>(null);

	const [settleUsername, setSettleUsername] = useState("");
	const [settleDirection, setSettleDirection] = useState<
		"i_paid" | "they_paid"
	>("i_paid");
	const [settleAmount, setSettleAmount] = useState("");
	const [isRecordingSettlement, setIsRecordingSettlement] = useState(false);
	const [settleError, setSettleError] = useState<string | null>(null);

	const [username, setUsername] = useState("");
	const [isAdding, setIsAdding] = useState(false);
	const [addError, setAddError] = useState<string | null>(null);

	const [isRenaming, setIsRenaming] = useState(false);
	const [renameValue, setRenameValue] = useState("");
	const [isSubmittingRename, setIsSubmittingRename] = useState(false);
	const [renameError, setRenameError] = useState<string | null>(null);

	const [isDeleting, setIsDeleting] = useState(false);
	const [deleteError, setDeleteError] = useState<string | null>(null);

	const [isLeaving, setIsLeaving] = useState(false);
	const [leaveError, setLeaveError] = useState<string | null>(null);

	const [removingUsername, setRemovingUsername] = useState<string | null>(null);
	const [removeMemberError, setRemoveMemberError] = useState<string | null>(
		null,
	);

	// `silent` refreshes run in the background: no loading indicators, and a failed
	// one (e.g. briefly offline) keeps showing the last good data instead of an error.
	function refreshGroup({ silent = false } = {}) {
		if (!id) return;
		listGroups()
			.then((groups) => {
				const found = groups.find((g) => g.id === id) ?? null;
				setGroup(found);
				setGroupError(found ? null : "Group not found.");
				if (!silent) setRenameValue(found?.name ?? "");
			})
			.catch((err) => {
				if (silent) return;
				setGroupError(
					err instanceof ApiError ? err.message : "Could not load this group.",
				);
			})
			.finally(() => setIsLoadingGroup(false));
	}

	function refreshTransactions({ silent = false } = {}) {
		if (!id) return;
		if (!silent) setIsLoadingTransactions(true);
		Promise.all([listExpenses(id), listSettlements(id)])
			.then(([expenseList, settlementList]) => {
				setExpenses(expenseList);
				setSettlements(settlementList);
				setTransactionsError(null);
			})
			.catch((err) => {
				if (silent) return;
				setTransactionsError(
					err instanceof ApiError
						? err.message
						: "Could not load transactions.",
				);
			})
			.finally(() => setIsLoadingTransactions(false));
	}

	function refreshBalances({ silent = false } = {}) {
		if (!id) return;
		if (!silent) setIsLoadingBalances(true);
		getBalances(id)
			.then((result) => {
				setBalances(result);
				setBalancesError(null);
			})
			.catch((err) => {
				if (silent) return;
				setBalancesError(
					err instanceof ApiError ? err.message : "Could not load balances.",
				);
			})
			.finally(() => setIsLoadingBalances(false));
	}

	useEffect(() => {
		refreshGroup();
		refreshTransactions();
		refreshBalances();

		function refreshInBackground() {
			if (document.visibilityState !== "visible") return;
			refreshGroup({ silent: true });
			refreshTransactions({ silent: true });
			refreshBalances({ silent: true });
		}

		const interval = window.setInterval(
			refreshInBackground,
			BACKGROUND_REFRESH_MS,
		);
		// Catch up straight away when coming back to the tab/app rather than
		// waiting for the next tick.
		document.addEventListener("visibilitychange", refreshInBackground);
		return () => {
			window.clearInterval(interval);
			document.removeEventListener("visibilitychange", refreshInBackground);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [id]);

	if (isLoadingGroup) {
		return (
			<main className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
				<p className="text-sm text-(--text)">Loading group…</p>
			</main>
		);
	}

	if (!group) {
		return (
			<main className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
				<p className="text-sm text-(--danger)">
					{groupError ?? "Group not found."}
				</p>
				<Link
					to="/groups"
					className="mt-2 inline-block text-sm text-(--accent) hover:underline"
				>
					Back to groups
				</Link>
			</main>
		);
	}

	const isCreator = group.creatorUsername === currentUsername;
	const otherMembers = group.memberUsernames.filter(
		(memberUsername) => memberUsername !== currentUsername,
	);
	const effectiveSettleUsername =
		settleUsername && otherMembers.includes(settleUsername)
			? settleUsername
			: (otherMembers[0] ?? "");

	const balanceSummaryText = !balances
		? null
		: balances.youAreOwedTotal > 0
			? `You are owed $${balances.youAreOwedTotal.toFixed(2)}`
			: balances.youOweTotal > 0
				? `You owe $${balances.youOweTotal.toFixed(2)}`
				: "You're all settled up";

	const transactions: TransactionItem[] = [
		...expenses.map(
			(expense): TransactionItem => ({
				kind: "expense",
				id: expense.id,
				createdAt: expense.createdAt,
				data: expense,
			}),
		),
		...settlements.map(
			(settlement): TransactionItem => ({
				kind: "settlement",
				id: settlement.id,
				createdAt: settlement.createdAt,
				data: settlement,
			}),
		),
	].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

	async function handleRename(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!group) return;
		setRenameError(null);
		setIsSubmittingRename(true);
		try {
			const updated = await renameGroup(group.id, renameValue.trim());
			setGroup(updated);
			setIsRenaming(false);
		} catch (err) {
			setRenameError(
				err instanceof ApiError ? err.message : "Could not rename this group.",
			);
		} finally {
			setIsSubmittingRename(false);
		}
	}

	async function handleDelete() {
		if (!group) return;
		if (
			!window.confirm(
				`Delete "${group.name}"? This removes it for everyone and can't be undone.`,
			)
		) {
			return;
		}
		setDeleteError(null);
		setIsDeleting(true);
		try {
			await deleteGroup(group.id);
			navigate("/groups");
		} catch (err) {
			setDeleteError(
				err instanceof ApiError ? err.message : "Could not delete this group.",
			);
			setIsDeleting(false);
		}
	}

	async function handleLeave() {
		if (!group) return;
		if (!window.confirm(`Leave "${group.name}"?`)) {
			return;
		}
		setLeaveError(null);
		setIsLeaving(true);
		try {
			await leaveGroup(group.id);
			navigate("/groups");
		} catch (err) {
			setLeaveError(
				err instanceof ApiError ? err.message : "Could not leave this group.",
			);
			setIsLeaving(false);
		}
	}

	async function handleAddMember(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!group) return;
		setAddError(null);
		setIsAdding(true);
		try {
			const updated = await addMember(group.id, username);
			setGroup(updated);
			setUsername("");
		} catch (err) {
			setAddError(
				err instanceof ApiError ? err.message : "Could not add that member.",
			);
		} finally {
			setIsAdding(false);
		}
	}

	async function handleRemoveMember(memberUsername: string) {
		if (!group) return;
		if (!window.confirm(`Remove ${memberUsername} from "${group.name}"?`)) {
			return;
		}
		setRemoveMemberError(null);
		setRemovingUsername(memberUsername);
		try {
			const updated = await removeMember(group.id, memberUsername);
			setGroup(updated);
		} catch (err) {
			setRemoveMemberError(
				err instanceof ApiError ? err.message : "Could not remove that member.",
			);
		} finally {
			setRemovingUsername(null);
		}
	}

	async function handleRecordSettlement(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!group) return;
		setSettleError(null);
		setIsRecordingSettlement(true);
		try {
			await recordSettlement(
				group.id,
				effectiveSettleUsername,
				Number(settleAmount),
				settleDirection === "i_paid",
			);
			setSettleAmount("");
			refreshTransactions();
			refreshBalances();
		} catch (err) {
			setSettleError(
				err instanceof ApiError
					? err.message
					: "Could not record that settlement.",
			);
		} finally {
			setIsRecordingSettlement(false);
		}
	}

	async function handleDeleteExpense(expenseId: string, description: string) {
		if (!group) return;
		if (!window.confirm(`Delete "${description}"? This can't be undone.`)) {
			return;
		}
		setDeleteExpenseError(null);
		setDeletingExpenseId(expenseId);
		try {
			await deleteExpense(group.id, expenseId);
			refreshTransactions();
			refreshBalances();
		} catch (err) {
			setDeleteExpenseError(
				err instanceof ApiError
					? err.message
					: "Could not delete that expense.",
			);
		} finally {
			setDeletingExpenseId(null);
		}
	}

	return (
		<main className="mx-auto max-w-6xl px-6 py-10 sm:px-10 sm:py-14">
			<Link
				to="/groups"
				className="text-sm font-medium text-(--accent) hover:underline"
			>
				← Back to groups
			</Link>

			<div className="mt-3 flex items-center justify-between gap-2">
				{isRenaming ? (
					<form onSubmit={handleRename} className="flex flex-1 gap-2">
						<input
							type="text"
							required
							value={renameValue}
							onChange={(event) => setRenameValue(event.target.value)}
							className="flex-1 rounded-lg border px-2 py-1.5 text-sm bg-(--surface) border-(--border) text-(--text-h)"
							autoFocus
						/>
						<button
							type="submit"
							disabled={isSubmittingRename}
							className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold text-white bg-(--accent) hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
						>
							{isSubmittingRename ? "Saving…" : "Save"}
						</button>
						<button
							type="button"
							onClick={() => {
								setIsRenaming(false);
								setRenameValue(group.name);
								setRenameError(null);
							}}
							className="cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold border-(--border) text-(--text-h)"
						>
							Cancel
						</button>
					</form>
				) : (
					<h1 className="text-3xl font-bold text-(--text-h)">{group.name}</h1>
				)}
			</div>
			{renameError && (
				<p role="alert" className="mt-1 text-xs text-(--danger)">
					{renameError}
				</p>
			)}

			<div
				className="mt-6 flex gap-1 rounded-xl border p-1 border-(--border) bg-(--surface) sm:inline-flex"
				role="tablist"
				aria-label="Group sections"
			>
				{(["overview", "transactions", "members"] as const).map((t) => (
					<button
						key={t}
						type="button"
						role="tab"
						aria-selected={tab === t}
						onClick={() => setTab(t)}
						className={`flex-1 cursor-pointer rounded-lg px-5 py-2 text-sm font-medium capitalize transition sm:flex-none ${
							tab === t
								? "bg-(--accent) text-white"
								: "text-(--text) hover:text-(--text-h)"
						}`}
					>
						{t}
					</button>
				))}
			</div>

			{tab === "overview" && (
				<div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
					<div className="surface-shadow rounded-2xl border p-6 border-(--border) bg-(--surface) lg:col-span-2">
						<p className="text-sm font-semibold text-(--text-h)">Balances</p>
						{isLoadingBalances && (
							<p className="mt-2 text-sm text-(--text)">Loading balances…</p>
						)}
						{balancesError && (
							<p className="mt-2 text-sm text-(--danger)">{balancesError}</p>
						)}
						{!isLoadingBalances && !balancesError && balances && (
							<>
								<p className="mt-1 text-2xl font-bold text-(--text-h)">
									{balanceSummaryText}
								</p>
								{balances.balances.length === 0 ? (
									<p className="mt-2 text-sm text-(--text)">No balances yet.</p>
								) : (
									<ul className="mt-4 flex flex-col gap-2">
										{balances.balances.map((balance) => (
											<li
												key={balance.username}
												className="flex items-center justify-between rounded-xl bg-(--surface-2) px-4 py-3 text-sm"
											>
												<span className="font-medium text-(--text-h)">
													{balance.username}
												</span>
												<span
													className={`rounded-full px-3 py-1 text-xs font-semibold ${
														balance.netAmount > 0
															? "bg-(--success-soft) text-(--success)"
															: "bg-(--danger-soft) text-(--danger)"
													}`}
												>
													{balance.netAmount > 0
														? `Owes you $${balance.netAmount.toFixed(2)}`
														: `You owe $${Math.abs(balance.netAmount).toFixed(2)}`}
												</span>
											</li>
										))}
									</ul>
								)}
							</>
						)}

						<button
							type="button"
							onClick={() => setIsAddExpenseOpen(true)}
							className="mt-5 cursor-pointer rounded-lg px-5 py-2.5 text-sm font-semibold text-white bg-(--accent) hover:opacity-90"
						>
							+ Add expense
						</button>
					</div>

					{otherMembers.length > 0 && (
						<form
							onSubmit={handleRecordSettlement}
							className="surface-shadow flex flex-col gap-3 rounded-2xl border p-6 border-(--border) bg-(--surface)"
						>
							<p className="text-sm font-semibold text-(--text-h)">
								Record settlement
							</p>
							<div className="flex flex-col gap-2">
								<select
									value={effectiveSettleUsername}
									onChange={(event) => setSettleUsername(event.target.value)}
									className="rounded-lg border px-2 py-2 text-xs bg-(--bg) border-(--border) text-(--text-h)"
								>
									{otherMembers.map((memberUsername) => (
										<option key={memberUsername} value={memberUsername}>
											{memberUsername}
										</option>
									))}
								</select>
								<select
									value={settleDirection}
									onChange={(event) =>
										setSettleDirection(
											event.target.value as "i_paid" | "they_paid",
										)
									}
									className="rounded-lg border px-2 py-2 text-xs bg-(--bg) border-(--border) text-(--text-h)"
								>
									<option value="i_paid">I paid them</option>
									<option value="they_paid">They paid me</option>
								</select>
							</div>
							<div className="flex gap-2">
								<input
									type="number"
									step="0.01"
									min="0.01"
									placeholder="Amount"
									required
									value={settleAmount}
									onChange={(event) => setSettleAmount(event.target.value)}
									className="flex-1 rounded-lg border px-2 py-2 text-xs bg-(--bg) border-(--border) text-(--text-h)"
								/>
								<button
									type="submit"
									disabled={isRecordingSettlement}
									className="cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold text-white bg-(--accent) hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
								>
									{isRecordingSettlement ? "Recording…" : "Record"}
								</button>
							</div>
							{settleError && (
								<p role="alert" className="text-xs text-(--danger)">
									{settleError}
								</p>
							)}
						</form>
					)}
				</div>
			)}

			{tab === "transactions" && (
				<div className="mt-6 flex flex-col gap-3">
					{isLoadingTransactions && (
						<p className="text-sm text-(--text)">Loading transactions…</p>
					)}
					{transactionsError && (
						<p className="text-sm text-(--danger)">{transactionsError}</p>
					)}
					{deleteExpenseError && (
						<p role="alert" className="text-sm text-(--danger)">
							{deleteExpenseError}
						</p>
					)}
					{!isLoadingTransactions &&
						!transactionsError &&
						transactions.length === 0 && (
							<p className="text-sm text-(--text)">No transactions yet.</p>
						)}
					{transactions.map((item) =>
						item.kind === "expense" ? (
							<div
								key={`expense-${item.id}`}
								className="surface-shadow rounded-xl border p-4 border-(--border) bg-(--surface)"
							>
								<div className="flex items-center justify-between gap-2">
									<p className="text-sm font-semibold text-(--text-h)">
										{item.data.description}
									</p>
									<div className="flex shrink-0 items-center gap-3">
										<p className="text-sm font-semibold text-(--text-h)">
											${item.data.amount.toFixed(2)}
										</p>
										{item.data.hasReceipt && (
											<button
												type="button"
												onClick={() => setViewingReceiptExpense(item.data)}
												className="cursor-pointer text-xs font-medium text-(--accent) hover:underline"
											>
												Receipt
											</button>
										)}
										{item.data.paidByUsername === currentUsername && (
											<>
												<button
													type="button"
													onClick={() => setEditingExpense(item.data)}
													className="cursor-pointer text-xs font-medium text-(--accent) hover:underline"
												>
													Edit
												</button>
												<button
													type="button"
													onClick={() =>
														handleDeleteExpense(
															item.data.id,
															item.data.description,
														)
													}
													disabled={deletingExpenseId === item.data.id}
													className="cursor-pointer text-xs font-medium text-(--danger) hover:underline disabled:cursor-not-allowed disabled:opacity-60"
												>
													{deletingExpenseId === item.data.id
														? "Deleting…"
														: "Delete"}
												</button>
											</>
										)}
									</div>
								</div>
								<p className="mt-1 text-xs text-(--text)">
									Paid by {item.data.paidByUsername}
								</p>
								<p className="text-xs text-(--text)">
									Split{" "}
									{item.data.splitMethod === "equal"
										? "equally"
										: item.data.splitMethod === "percentage"
											? "by percentage"
											: "unequally"}
									:{" "}
									{item.data.shares
										.map(
											(share) =>
												`${share.username} $${share.amount.toFixed(2)}`,
										)
										.join(", ")}
								</p>
							</div>
						) : (
							<div
								key={`settlement-${item.id}`}
								className="surface-shadow rounded-xl border p-4 border-(--border) bg-(--surface)"
							>
								<div className="flex items-center justify-between">
									<p className="text-sm font-semibold text-(--text-h)">
										<span className="mr-2 rounded-full bg-(--success-soft) px-2 py-0.5 text-xs text-(--success)">
											Settlement
										</span>
									</p>
									<p className="text-sm font-semibold text-(--text-h)">
										${item.data.amount.toFixed(2)}
									</p>
								</div>
								<p className="mt-1 text-xs text-(--text)">
									{item.data.fromUsername} paid {item.data.toUsername}
								</p>
							</div>
						),
					)}
				</div>
			)}

			{tab === "members" && (
				<div className="surface-shadow mt-6 rounded-2xl border p-6 border-(--border) bg-(--surface)">
					<p className="text-sm text-(--text)">
						{group.memberUsernames.length} member
						{group.memberUsernames.length === 1 ? "" : "s"}
					</p>
					<ul className="mt-3 flex flex-wrap gap-2">
						{group.memberUsernames.map((memberUsername) => (
							<li
								key={memberUsername}
								className="flex items-center gap-1.5 rounded-full bg-(--surface-2) px-3 py-1.5 text-sm text-(--text-h)"
							>
								{memberUsername}
								{isCreator && memberUsername !== group.creatorUsername && (
									<button
										type="button"
										onClick={() => handleRemoveMember(memberUsername)}
										disabled={removingUsername === memberUsername}
										aria-label={`Remove ${memberUsername}`}
										className="cursor-pointer text-(--danger) hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
									>
										×
									</button>
								)}
							</li>
						))}
					</ul>
					{removeMemberError && (
						<p role="alert" className="mt-2 text-xs text-(--danger)">
							{removeMemberError}
						</p>
					)}

					<p className="mt-4 text-xs text-(--text)">
						Group ID (share to invite):{" "}
						<span className="font-mono">{group.id}</span>
					</p>

					{isCreator && (
						<form onSubmit={handleAddMember} className="mt-4 flex gap-2">
							<input
								type="text"
								placeholder="Add member by username"
								required
								value={username}
								onChange={(event) => setUsername(event.target.value)}
								className="flex-1 rounded-lg border px-3 py-2 text-sm bg-(--bg) border-(--border) text-(--text-h)"
							/>
							<button
								type="submit"
								disabled={isAdding}
								className="cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold text-white bg-(--accent) hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
							>
								{isAdding ? "Adding…" : "Add"}
							</button>
						</form>
					)}
					{addError && (
						<p role="alert" className="mt-1 text-xs text-(--danger)">
							{addError}
						</p>
					)}

					<div className="mt-6 flex gap-4 border-t pt-4 border-(--border) text-sm">
						{isCreator && (
							<button
								type="button"
								onClick={() => setIsRenaming(true)}
								className="cursor-pointer font-medium text-(--accent) hover:underline"
							>
								Rename group
							</button>
						)}
						{isCreator ? (
							<button
								type="button"
								onClick={handleDelete}
								disabled={isDeleting}
								className="cursor-pointer font-medium text-(--danger) hover:underline disabled:cursor-not-allowed disabled:opacity-60"
							>
								{isDeleting ? "Deleting…" : "Delete group"}
							</button>
						) : (
							<button
								type="button"
								onClick={handleLeave}
								disabled={isLeaving}
								className="cursor-pointer font-medium text-(--danger) hover:underline disabled:cursor-not-allowed disabled:opacity-60"
							>
								{isLeaving ? "Leaving…" : "Leave group"}
							</button>
						)}
					</div>
					{deleteError && (
						<p role="alert" className="mt-1 text-xs text-(--danger)">
							{deleteError}
						</p>
					)}
					{leaveError && (
						<p role="alert" className="mt-1 text-xs text-(--danger)">
							{leaveError}
						</p>
					)}
				</div>
			)}

			{(isAddExpenseOpen || editingExpense) && (
				<AddExpenseModal
					groupId={group.id}
					memberUsernames={group.memberUsernames}
					expense={editingExpense ?? undefined}
					onClose={() => {
						setIsAddExpenseOpen(false);
						setEditingExpense(null);
					}}
					onSaved={() => {
						refreshTransactions();
						refreshBalances();
					}}
				/>
			)}

			{viewingReceiptExpense && (
				<ReceiptModal
					groupId={group.id}
					expenseId={viewingReceiptExpense.id}
					description={viewingReceiptExpense.description}
					onClose={() => setViewingReceiptExpense(null)}
				/>
			)}
		</main>
	);
}

export default GroupDashboardPage;
