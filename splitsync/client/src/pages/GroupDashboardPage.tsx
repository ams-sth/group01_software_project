import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AddExpenseModal from '../components/AddExpenseModal'
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
} from '../lib/api'
import { getCurrentUser } from '../lib/session'

type Tab = 'overview' | 'transactions' | 'members'

type TransactionItem =
  | { kind: 'expense'; id: string; createdAt: string; data: ExpenseResponse }
  | { kind: 'settlement'; id: string; createdAt: string; data: SettlementResponse }

function GroupDashboardPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const currentUsername = getCurrentUser()?.username

  const [group, setGroup] = useState<GroupResponse | null>(null)
  const [isLoadingGroup, setIsLoadingGroup] = useState(true)
  const [groupError, setGroupError] = useState<string | null>(null)

  const [tab, setTab] = useState<Tab>('overview')
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<ExpenseResponse | null>(null)
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null)
  const [deleteExpenseError, setDeleteExpenseError] = useState<string | null>(null)

  const [expenses, setExpenses] = useState<ExpenseResponse[]>([])
  const [settlements, setSettlements] = useState<SettlementResponse[]>([])
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true)
  const [transactionsError, setTransactionsError] = useState<string | null>(null)

  const [balances, setBalances] = useState<GroupBalancesResponse | null>(null)
  const [isLoadingBalances, setIsLoadingBalances] = useState(true)
  const [balancesError, setBalancesError] = useState<string | null>(null)

  const [settleUsername, setSettleUsername] = useState('')
  const [settleDirection, setSettleDirection] = useState<'i_paid' | 'they_paid'>('i_paid')
  const [settleAmount, setSettleAmount] = useState('')
  const [isRecordingSettlement, setIsRecordingSettlement] = useState(false)
  const [settleError, setSettleError] = useState<string | null>(null)

  const [username, setUsername] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [isSubmittingRename, setIsSubmittingRename] = useState(false)
  const [renameError, setRenameError] = useState<string | null>(null)

  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [isLeaving, setIsLeaving] = useState(false)
  const [leaveError, setLeaveError] = useState<string | null>(null)

  const [removingUsername, setRemovingUsername] = useState<string | null>(null)
  const [removeMemberError, setRemoveMemberError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    listGroups()
      .then((groups) => {
        const found = groups.find((g) => g.id === id) ?? null
        setGroup(found)
        setRenameValue(found?.name ?? '')
        if (!found) setGroupError('Group not found.')
      })
      .catch((err) => setGroupError(err instanceof ApiError ? err.message : 'Could not load this group.'))
      .finally(() => setIsLoadingGroup(false))
  }, [id])

  function refreshTransactions() {
    if (!id) return
    setIsLoadingTransactions(true)
    Promise.all([listExpenses(id), listSettlements(id)])
      .then(([expenseList, settlementList]) => {
        setExpenses(expenseList)
        setSettlements(settlementList)
      })
      .catch((err) => setTransactionsError(err instanceof ApiError ? err.message : 'Could not load transactions.'))
      .finally(() => setIsLoadingTransactions(false))
  }

  function refreshBalances() {
    if (!id) return
    setIsLoadingBalances(true)
    getBalances(id)
      .then(setBalances)
      .catch((err) => setBalancesError(err instanceof ApiError ? err.message : 'Could not load balances.'))
      .finally(() => setIsLoadingBalances(false))
  }

  useEffect(() => {
    refreshTransactions()
    refreshBalances()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (isLoadingGroup) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <p className="text-sm text-(--text)">Loading group…</p>
      </main>
    )
  }

  if (!group) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <p className="text-sm text-red-500">{groupError ?? 'Group not found.'}</p>
        <Link to="/groups" className="mt-2 inline-block text-sm text-(--accent) hover:underline">
          Back to groups
        </Link>
      </main>
    )
  }

  const isCreator = group.creatorUsername === currentUsername
  const otherMembers = group.memberUsernames.filter((memberUsername) => memberUsername !== currentUsername)
  const effectiveSettleUsername =
    settleUsername && otherMembers.includes(settleUsername) ? settleUsername : (otherMembers[0] ?? '')

  const balanceSummaryText = !balances
    ? null
    : balances.youAreOwedTotal > 0
      ? `You are owed $${balances.youAreOwedTotal.toFixed(2)}`
      : balances.youOweTotal > 0
        ? `You owe $${balances.youOweTotal.toFixed(2)}`
        : "You're all settled up"

  const transactions: TransactionItem[] = [
    ...expenses.map((expense): TransactionItem => ({ kind: 'expense', id: expense.id, createdAt: expense.createdAt, data: expense })),
    ...settlements.map((settlement): TransactionItem => ({
      kind: 'settlement',
      id: settlement.id,
      createdAt: settlement.createdAt,
      data: settlement,
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  async function handleRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!group) return
    setRenameError(null)
    setIsSubmittingRename(true)
    try {
      const updated = await renameGroup(group.id, renameValue.trim())
      setGroup(updated)
      setIsRenaming(false)
    } catch (err) {
      setRenameError(err instanceof ApiError ? err.message : 'Could not rename this group.')
    } finally {
      setIsSubmittingRename(false)
    }
  }

  async function handleDelete() {
    if (!group) return
    if (!window.confirm(`Delete "${group.name}"? This removes it for everyone and can't be undone.`)) {
      return
    }
    setDeleteError(null)
    setIsDeleting(true)
    try {
      await deleteGroup(group.id)
      navigate('/groups')
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Could not delete this group.')
      setIsDeleting(false)
    }
  }

  async function handleLeave() {
    if (!group) return
    if (!window.confirm(`Leave "${group.name}"?`)) {
      return
    }
    setLeaveError(null)
    setIsLeaving(true)
    try {
      await leaveGroup(group.id)
      navigate('/groups')
    } catch (err) {
      setLeaveError(err instanceof ApiError ? err.message : 'Could not leave this group.')
      setIsLeaving(false)
    }
  }

  async function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!group) return
    setAddError(null)
    setIsAdding(true)
    try {
      const updated = await addMember(group.id, username)
      setGroup(updated)
      setUsername('')
    } catch (err) {
      setAddError(err instanceof ApiError ? err.message : 'Could not add that member.')
    } finally {
      setIsAdding(false)
    }
  }

  async function handleRemoveMember(memberUsername: string) {
    if (!group) return
    if (!window.confirm(`Remove ${memberUsername} from "${group.name}"?`)) {
      return
    }
    setRemoveMemberError(null)
    setRemovingUsername(memberUsername)
    try {
      const updated = await removeMember(group.id, memberUsername)
      setGroup(updated)
    } catch (err) {
      setRemoveMemberError(err instanceof ApiError ? err.message : 'Could not remove that member.')
    } finally {
      setRemovingUsername(null)
    }
  }

  async function handleRecordSettlement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!group) return
    setSettleError(null)
    setIsRecordingSettlement(true)
    try {
      await recordSettlement(group.id, effectiveSettleUsername, Number(settleAmount), settleDirection === 'i_paid')
      setSettleAmount('')
      refreshTransactions()
      refreshBalances()
    } catch (err) {
      setSettleError(err instanceof ApiError ? err.message : 'Could not record that settlement.')
    } finally {
      setIsRecordingSettlement(false)
    }
  }

  async function handleDeleteExpense(expenseId: string, description: string) {
    if (!group) return
    if (!window.confirm(`Delete "${description}"? This can't be undone.`)) {
      return
    }
    setDeleteExpenseError(null)
    setDeletingExpenseId(expenseId)
    try {
      await deleteExpense(group.id, expenseId)
      refreshTransactions()
      refreshBalances()
    } catch (err) {
      setDeleteExpenseError(err instanceof ApiError ? err.message : 'Could not delete that expense.')
    } finally {
      setDeletingExpenseId(null)
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <Link to="/groups" className="text-sm text-(--accent) hover:underline">
        ← Back to groups
      </Link>

      <div className="mt-2 flex items-center justify-between gap-2">
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
              {isSubmittingRename ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRenaming(false)
                setRenameValue(group.name)
                setRenameError(null)
              }}
              className="cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold border-(--border) text-(--text-h)"
            >
              Cancel
            </button>
          </form>
        ) : (
          <h1 className="text-2xl font-semibold text-(--text-h)">{group.name}</h1>
        )}
      </div>
      {renameError && (
        <p role="alert" className="mt-1 text-xs text-red-500">
          {renameError}
        </p>
      )}

      <div className="mt-4 flex gap-1 rounded-lg border p-0.5 border-(--border)" role="tablist" aria-label="Group sections">
        {(['overview', 'transactions', 'members'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`flex-1 cursor-pointer rounded-md py-1.5 text-xs font-medium capitalize ${
              tab === t ? 'bg-(--accent) text-white' : 'text-(--text)'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="mt-4">
          <div className="rounded-lg border p-4 border-(--border) bg-(--surface)">
            <p className="text-xs font-semibold text-(--text-h)">Balances</p>
            {isLoadingBalances && <p className="mt-1 text-xs text-(--text)">Loading balances…</p>}
            {balancesError && <p className="mt-1 text-xs text-red-500">{balancesError}</p>}
            {!isLoadingBalances && !balancesError && balances && (
              <>
                <p className="mt-1 text-sm font-semibold text-(--text-h)">{balanceSummaryText}</p>
                {balances.balances.length === 0 ? (
                  <p className="mt-1 text-xs text-(--text)">No balances yet.</p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {balances.balances.map((balance) => (
                      <li key={balance.username} className="flex items-center justify-between text-xs">
                        <span className="text-(--text-h)">{balance.username}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            balance.netAmount > 0 ? 'bg-green-500/15 text-green-600' : 'bg-red-500/15 text-red-600'
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
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setIsAddExpenseOpen(true)}
              className="cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold text-white bg-(--accent) hover:opacity-90"
            >
              + Add expense
            </button>
          </div>

          {otherMembers.length > 0 && (
            <form
              onSubmit={handleRecordSettlement}
              className="mt-3 flex flex-col gap-2 rounded-lg border p-3 border-(--border)"
            >
              <p className="text-xs font-semibold text-(--text-h)">Record settlement</p>
              <div className="flex gap-2">
                <select
                  value={effectiveSettleUsername}
                  onChange={(event) => setSettleUsername(event.target.value)}
                  className="flex-1 rounded-lg border px-2 py-1.5 text-xs bg-(--bg) border-(--border) text-(--text-h)"
                >
                  {otherMembers.map((memberUsername) => (
                    <option key={memberUsername} value={memberUsername}>
                      {memberUsername}
                    </option>
                  ))}
                </select>
                <select
                  value={settleDirection}
                  onChange={(event) => setSettleDirection(event.target.value as 'i_paid' | 'they_paid')}
                  className="rounded-lg border px-2 py-1.5 text-xs bg-(--bg) border-(--border) text-(--text-h)"
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
                  className="flex-1 rounded-lg border px-2 py-1.5 text-xs bg-(--bg) border-(--border) text-(--text-h)"
                />
                <button
                  type="submit"
                  disabled={isRecordingSettlement}
                  className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold text-white bg-(--accent) hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRecordingSettlement ? 'Recording…' : 'Record'}
                </button>
              </div>
            </form>
          )}
          {settleError && (
            <p role="alert" className="mt-1 text-xs text-red-500">
              {settleError}
            </p>
          )}
        </div>
      )}

      {tab === 'transactions' && (
        <div className="mt-4 flex flex-col gap-2">
          {isLoadingTransactions && <p className="text-xs text-(--text)">Loading transactions…</p>}
          {transactionsError && <p className="text-xs text-red-500">{transactionsError}</p>}
          {deleteExpenseError && (
            <p role="alert" className="text-xs text-red-500">
              {deleteExpenseError}
            </p>
          )}
          {!isLoadingTransactions && !transactionsError && transactions.length === 0 && (
            <p className="text-xs text-(--text)">No transactions yet.</p>
          )}
          {transactions.map((item) =>
            item.kind === 'expense' ? (
              <div key={`expense-${item.id}`} className="rounded-md border p-2 border-(--border) bg-(--surface)">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-(--text-h)">{item.data.description}</p>
                  <div className="flex shrink-0 items-center gap-2">
                    <p className="text-xs text-(--text-h)">${item.data.amount.toFixed(2)}</p>
                    {item.data.paidByUsername === currentUsername && (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditingExpense(item.data)}
                          className="cursor-pointer text-[11px] text-(--accent) hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(item.data.id, item.data.description)}
                          disabled={deletingExpenseId === item.data.id}
                          className="cursor-pointer text-[11px] text-red-500 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingExpenseId === item.data.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <p className="mt-0.5 text-[11px] text-(--text)">Paid by {item.data.paidByUsername}</p>
                <p className="text-[11px] text-(--text)">
                  Split{' '}
                  {item.data.splitMethod === 'equal'
                    ? 'equally'
                    : item.data.splitMethod === 'percentage'
                      ? 'by percentage'
                      : 'unequally'}
                  : {item.data.shares.map((share) => `${share.username} $${share.amount.toFixed(2)}`).join(', ')}
                </p>
              </div>
            ) : (
              <div key={`settlement-${item.id}`} className="rounded-md border p-2 border-(--border) bg-(--surface)">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-(--text-h)">Settlement</p>
                  <p className="text-xs text-(--text-h)">${item.data.amount.toFixed(2)}</p>
                </div>
                <p className="mt-0.5 text-[11px] text-(--text)">
                  {item.data.fromUsername} paid {item.data.toUsername}
                </p>
              </div>
            ),
          )}
        </div>
      )}

      {tab === 'members' && (
        <div className="mt-4">
          <p className="text-xs text-(--text)">
            {group.memberUsernames.length} member{group.memberUsernames.length === 1 ? '' : 's'}:
          </p>
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {group.memberUsernames.map((memberUsername) => (
              <li
                key={memberUsername}
                className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs border-(--border) text-(--text)"
              >
                {memberUsername}
                {isCreator && memberUsername !== group.creatorUsername && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(memberUsername)}
                    disabled={removingUsername === memberUsername}
                    aria-label={`Remove ${memberUsername}`}
                    className="cursor-pointer text-red-500 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
          {removeMemberError && (
            <p role="alert" className="mt-1 text-xs text-red-500">
              {removeMemberError}
            </p>
          )}

          <p className="mt-2 text-xs text-(--text)">
            Group ID (share to invite): <span className="font-mono">{group.id}</span>
          </p>

          {isCreator && (
            <form onSubmit={handleAddMember} className="mt-3 flex gap-2">
              <input
                type="text"
                placeholder="Add member by username"
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="flex-1 rounded-lg border px-2 py-1.5 text-xs bg-(--bg) border-(--border) text-(--text-h)"
              />
              <button
                type="submit"
                disabled={isAdding}
                className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold text-white bg-(--accent) hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAdding ? 'Adding…' : 'Add'}
              </button>
            </form>
          )}
          {addError && (
            <p role="alert" className="mt-1 text-xs text-red-500">
              {addError}
            </p>
          )}

          <div className="mt-4 flex gap-3 border-t pt-3 border-(--border) text-xs">
            {isCreator && (
              <button
                type="button"
                onClick={() => setIsRenaming(true)}
                className="cursor-pointer text-(--accent) hover:underline"
              >
                Rename group
              </button>
            )}
            {isCreator ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="cursor-pointer text-red-500 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? 'Deleting…' : 'Delete group'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLeave}
                disabled={isLeaving}
                className="cursor-pointer text-red-500 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLeaving ? 'Leaving…' : 'Leave group'}
              </button>
            )}
          </div>
          {deleteError && (
            <p role="alert" className="mt-1 text-xs text-red-500">
              {deleteError}
            </p>
          )}
          {leaveError && (
            <p role="alert" className="mt-1 text-xs text-red-500">
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
            setIsAddExpenseOpen(false)
            setEditingExpense(null)
          }}
          onSaved={() => {
            refreshTransactions()
            refreshBalances()
          }}
        />
      )}
    </main>
  )
}

export default GroupDashboardPage
