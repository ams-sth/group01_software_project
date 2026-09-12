import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  addExpense,
  addMember,
  ApiError,
  createGroup,
  deleteGroup,
  getBalances,
  joinGroup,
  leaveGroup,
  listExpenses,
  listGroups,
  recordSettlement,
  removeMember,
  renameGroup,
  type ExpenseResponse,
  type ExpenseSplitInput,
  type GroupBalancesResponse,
  type GroupResponse,
  type SplitMethod,
} from '../lib/api'
import { getCurrentUser } from '../lib/session'

function GroupsPage() {
  const currentUsername = getCurrentUser()?.username

  const [groups, setGroups] = useState<GroupResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [newGroupName, setNewGroupName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [joinGroupId, setJoinGroupId] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  useEffect(() => {
    listGroups()
      .then(setGroups)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Could not load groups.'))
      .finally(() => setIsLoading(false))
  }, [])

  function upsertGroup(group: GroupResponse) {
    setGroups((current) => {
      const exists = current.some((g) => g.id === group.id)
      return exists ? current.map((g) => (g.id === group.id ? group : g)) : [...current, group]
    })
  }

  function removeGroupFromList(groupId: string) {
    setGroups((current) => current.filter((g) => g.id !== groupId))
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreateError(null)
    setIsCreating(true)
    try {
      const group = await createGroup(newGroupName)
      upsertGroup(group)
      setNewGroupName('')
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Could not create group.')
    } finally {
      setIsCreating(false)
    }
  }

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setJoinError(null)
    setIsJoining(true)
    try {
      const group = await joinGroup(joinGroupId.trim())
      upsertGroup(group)
      setJoinGroupId('')
    } catch (err) {
      setJoinError(err instanceof ApiError ? err.message : 'Could not join group.')
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-(--text-h)">Your spending groups</h1>
        <div className="flex gap-4 text-sm">
          <Link to="/home" className="text-(--accent) hover:underline">
            Home
          </Link>
          <Link to="/profile" className="text-(--accent) hover:underline">
            Profile
          </Link>
        </div>
      </div>

      <form onSubmit={handleCreate} className="mt-6 flex gap-2">
        <input
          type="text"
          placeholder="e.g. Flat 4B"
          required
          value={newGroupName}
          onChange={(event) => setNewGroupName(event.target.value)}
          className="flex-1 rounded-lg border px-3 py-2 text-sm bg-(--surface) border-(--border) text-(--text-h)"
        />
        <button
          type="submit"
          disabled={isCreating}
          className="cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold text-white bg-(--accent) hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isCreating ? 'Creating…' : 'Create group'}
        </button>
      </form>
      {createError && (
        <p role="alert" className="mt-1 text-xs text-red-500">
          {createError}
        </p>
      )}

      <form onSubmit={handleJoin} className="mt-3 flex gap-2">
        <input
          type="text"
          placeholder="Have a group ID? Paste it here to join"
          required
          value={joinGroupId}
          onChange={(event) => setJoinGroupId(event.target.value)}
          className="flex-1 rounded-lg border px-3 py-2 text-sm bg-(--surface) border-(--border) text-(--text-h)"
        />
        <button
          type="submit"
          disabled={isJoining}
          className="cursor-pointer rounded-lg border px-4 py-2 text-sm font-semibold border-(--border) text-(--text-h) hover:border-(--accent-border) disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isJoining ? 'Joining…' : 'Join group'}
        </button>
      </form>
      {joinError && (
        <p role="alert" className="mt-1 text-xs text-red-500">
          {joinError}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {isLoading && <p className="text-sm text-(--text)">Loading groups…</p>}
        {loadError && <p className="text-sm text-red-500">{loadError}</p>}
        {!isLoading && !loadError && groups.length === 0 && (
          <p className="text-sm text-(--text)">
            You're not in any groups yet — create one above to get started.
          </p>
        )}
        {groups.map((group) => (
          <GroupCard
            key={group.id}
            group={group}
            isCreator={group.creatorUsername === currentUsername}
            currentUsername={currentUsername}
            onGroupUpdated={upsertGroup}
            onGroupRemoved={removeGroupFromList}
          />
        ))}
      </div>
    </main>
  )
}

function GroupCard({
  group,
  isCreator,
  currentUsername,
  onGroupUpdated,
  onGroupRemoved,
}: {
  group: GroupResponse
  isCreator: boolean
  currentUsername: string | undefined
  onGroupUpdated: (group: GroupResponse) => void
  onGroupRemoved: (groupId: string) => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  const [username, setUsername] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(group.name)
  const [isSubmittingRename, setIsSubmittingRename] = useState(false)
  const [renameError, setRenameError] = useState<string | null>(null)

  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [isLeaving, setIsLeaving] = useState(false)
  const [leaveError, setLeaveError] = useState<string | null>(null)

  const [removingUsername, setRemovingUsername] = useState<string | null>(null)
  const [removeMemberError, setRemoveMemberError] = useState<string | null>(null)

  const [expenses, setExpenses] = useState<ExpenseResponse[]>([])
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true)
  const [expensesError, setExpensesError] = useState<string | null>(null)

  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal')
  const [selectedUsernames, setSelectedUsernames] = useState<Set<string>>(new Set(group.memberUsernames))
  const [splitValues, setSplitValues] = useState<Record<string, string>>({})
  const [isAddingExpense, setIsAddingExpense] = useState(false)
  const [addExpenseError, setAddExpenseError] = useState<string | null>(null)

  const [balances, setBalances] = useState<GroupBalancesResponse | null>(null)
  const [isLoadingBalances, setIsLoadingBalances] = useState(true)
  const [balancesError, setBalancesError] = useState<string | null>(null)

  const [settleUsername, setSettleUsername] = useState('')
  const [settleDirection, setSettleDirection] = useState<'i_paid' | 'they_paid'>('i_paid')
  const [settleAmount, setSettleAmount] = useState('')
  const [isRecordingSettlement, setIsRecordingSettlement] = useState(false)
  const [settleError, setSettleError] = useState<string | null>(null)

  useEffect(() => {
    listExpenses(group.id)
      .then(setExpenses)
      .catch((err) => setExpensesError(err instanceof ApiError ? err.message : 'Could not load expenses.'))
      .finally(() => setIsLoadingExpenses(false))
  }, [group.id])

  // Resets the split-between selection to everyone currently in the group
  // whenever membership changes (e.g. someone joins or is removed).
  useEffect(() => {
    setSelectedUsernames(new Set(group.memberUsernames))
  }, [group.memberUsernames.join(',')])

  function refreshBalances() {
    setIsLoadingBalances(true)
    getBalances(group.id)
      .then(setBalances)
      .catch((err) => setBalancesError(err instanceof ApiError ? err.message : 'Could not load balances.'))
      .finally(() => setIsLoadingBalances(false))
  }

  useEffect(() => {
    refreshBalances()
  }, [group.id])

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

  async function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAddError(null)
    setIsAdding(true)
    try {
      const updated = await addMember(group.id, username)
      onGroupUpdated(updated)
      setUsername('')
    } catch (err) {
      setAddError(err instanceof ApiError ? err.message : 'Could not add that member.')
    } finally {
      setIsAdding(false)
    }
  }

  async function handleRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setRenameError(null)
    setIsSubmittingRename(true)
    try {
      const updated = await renameGroup(group.id, renameValue.trim())
      onGroupUpdated(updated)
      setIsRenaming(false)
    } catch (err) {
      setRenameError(err instanceof ApiError ? err.message : 'Could not rename this group.')
    } finally {
      setIsSubmittingRename(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${group.name}"? This removes it for everyone and can't be undone.`)) {
      return
    }
    setDeleteError(null)
    setIsDeleting(true)
    try {
      await deleteGroup(group.id)
      onGroupRemoved(group.id)
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Could not delete this group.')
      setIsDeleting(false)
    }
  }

  async function handleLeave() {
    if (!window.confirm(`Leave "${group.name}"?`)) {
      return
    }
    setLeaveError(null)
    setIsLeaving(true)
    try {
      await leaveGroup(group.id)
      onGroupRemoved(group.id)
    } catch (err) {
      setLeaveError(err instanceof ApiError ? err.message : 'Could not leave this group.')
      setIsLeaving(false)
    }
  }

  async function handleRemoveMember(memberUsername: string) {
    if (!window.confirm(`Remove ${memberUsername} from "${group.name}"?`)) {
      return
    }
    setRemoveMemberError(null)
    setRemovingUsername(memberUsername)
    try {
      const updated = await removeMember(group.id, memberUsername)
      onGroupUpdated(updated)
    } catch (err) {
      setRemoveMemberError(err instanceof ApiError ? err.message : 'Could not remove that member.')
    } finally {
      setRemovingUsername(null)
    }
  }

  function toggleMember(memberUsername: string) {
    setSelectedUsernames((current) => {
      const next = new Set(current)
      if (next.has(memberUsername)) {
        next.delete(memberUsername)
      } else {
        next.add(memberUsername)
      }
      return next
    })
  }

  const selectedList = group.memberUsernames.filter((memberUsername) => selectedUsernames.has(memberUsername))
  const parsedAmount = Number(amount) || 0
  const splitValuesTotal = selectedList.reduce((sum, memberUsername) => sum + (Number(splitValues[memberUsername]) || 0), 0)
  const isUnequalValid = Math.abs(splitValuesTotal - parsedAmount) < 0.005
  const isPercentageValid = Math.abs(splitValuesTotal - 100) < 0.005
  const isSplitValid =
    selectedList.length > 0 &&
    (splitMethod === 'equal' ||
      (splitMethod === 'unequal' && isUnequalValid && selectedList.every((u) => Number(splitValues[u]) > 0)) ||
      (splitMethod === 'percentage' && isPercentageValid && selectedList.every((u) => Number(splitValues[u]) > 0)))

  async function handleAddExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAddExpenseError(null)

    const splits: ExpenseSplitInput[] = selectedList.map((memberUsername) => ({
      username: memberUsername,
      amount: splitMethod === 'unequal' ? Number(splitValues[memberUsername]) : undefined,
      percentage: splitMethod === 'percentage' ? Number(splitValues[memberUsername]) : undefined,
    }))

    setIsAddingExpense(true)
    try {
      const expense = await addExpense(group.id, description, parsedAmount, splitMethod, splits)
      setExpenses((current) => [expense, ...current])
      setDescription('')
      setAmount('')
      setSplitMethod('equal')
      setSplitValues({})
      refreshBalances()
    } catch (err) {
      setAddExpenseError(err instanceof ApiError ? err.message : 'Could not add that expense.')
    } finally {
      setIsAddingExpense(false)
    }
  }

  async function handleRecordSettlement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSettleError(null)
    setIsRecordingSettlement(true)
    try {
      await recordSettlement(group.id, effectiveSettleUsername, Number(settleAmount), settleDirection === 'i_paid')
      setSettleAmount('')
      refreshBalances()
    } catch (err) {
      setSettleError(err instanceof ApiError ? err.message : 'Could not record that settlement.')
    } finally {
      setIsRecordingSettlement(false)
    }
  }

  return (
    <div className="rounded-lg border p-4 border-(--border) bg-(--surface)">
      {isRenaming ? (
        <form onSubmit={handleRename} className="flex gap-2">
          <input
            type="text"
            required
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            className="flex-1 rounded-lg border px-2 py-1.5 text-sm bg-(--bg) border-(--border) text-(--text-h)"
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
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
            aria-expanded={isExpanded}
            className="flex flex-1 cursor-pointer items-center gap-2 text-left"
          >
            <span
              className={`inline-block text-(--text) transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              aria-hidden="true"
            >
              ▸
            </span>
            <span className="font-semibold text-(--text-h)">{group.name}</span>
          </button>
          <div className="flex gap-3 text-xs">
            {isCreator && (
              <button
                type="button"
                onClick={() => setIsRenaming(true)}
                className="cursor-pointer text-(--accent) hover:underline"
              >
                Rename
              </button>
            )}
            {isCreator ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="cursor-pointer text-red-500 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLeave}
                disabled={isLeaving}
                className="cursor-pointer text-red-500 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLeaving ? 'Leaving…' : 'Leave'}
              </button>
            )}
          </div>
        </div>
      )}
      {renameError && (
        <p role="alert" className="mt-1 text-xs text-red-500">
          {renameError}
        </p>
      )}
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

      {!isExpanded && (
        <p className="mt-1 text-xs text-(--text)">
          {group.memberUsernames.length} member{group.memberUsernames.length === 1 ? '' : 's'}
          {balanceSummaryText ? ` · ${balanceSummaryText}` : ''}
        </p>
      )}

      {isExpanded && (
        <>
          <p className="mt-1 text-xs text-(--text)">
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

          <p className="mt-1 text-xs text-(--text)">
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

          <div className="mt-4 border-t pt-3 border-(--border)">
            <p className="text-xs font-semibold text-(--text-h)">Expenses</p>

            <form onSubmit={handleAddExpense} className="mt-2 flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="What was it for?"
                  required
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="flex-1 rounded-lg border px-2 py-1.5 text-xs bg-(--bg) border-(--border) text-(--text-h)"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="Amount"
                  required
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="w-24 rounded-lg border px-2 py-1.5 text-xs bg-(--bg) border-(--border) text-(--text-h)"
                />
              </div>

              <div className="flex gap-1 rounded-lg border p-0.5 border-(--border)" role="tablist" aria-label="Split method">
                {(['equal', 'unequal', 'percentage'] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    role="tab"
                    aria-selected={splitMethod === method}
                    onClick={() => {
                      setSplitMethod(method)
                      setSplitValues({})
                    }}
                    className={`flex-1 cursor-pointer rounded-md py-1 text-[11px] font-medium capitalize ${
                      splitMethod === method ? 'bg-(--accent) text-white' : 'text-(--text)'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-1">
                <p className="text-[11px] text-(--text)">Split between</p>
                {group.memberUsernames.map((memberUsername) => (
                  <label key={memberUsername} className="flex items-center gap-2 text-xs text-(--text-h)">
                    <input
                      type="checkbox"
                      checked={selectedUsernames.has(memberUsername)}
                      onChange={() => toggleMember(memberUsername)}
                      className="h-3.5 w-3.5 accent-(--accent)"
                    />
                    <span className="flex-1">{memberUsername}</span>
                    {splitMethod !== 'equal' && selectedUsernames.has(memberUsername) && (
                      <input
                        type="number"
                        step={splitMethod === 'percentage' ? '1' : '0.01'}
                        min="0"
                        placeholder={splitMethod === 'percentage' ? '%' : '$'}
                        value={splitValues[memberUsername] ?? ''}
                        onChange={(event) =>
                          setSplitValues((current) => ({ ...current, [memberUsername]: event.target.value }))
                        }
                        className="w-16 rounded border px-1.5 py-0.5 text-right text-xs bg-(--bg) border-(--border) text-(--text-h)"
                      />
                    )}
                  </label>
                ))}
              </div>

              {splitMethod === 'unequal' && (
                <p className={`text-[11px] ${isUnequalValid ? 'text-(--text)' : 'text-amber-500'}`}>
                  Amounts total ${splitValuesTotal.toFixed(2)} of ${parsedAmount.toFixed(2)}
                </p>
              )}
              {splitMethod === 'percentage' && (
                <p className={`text-[11px] ${isPercentageValid ? 'text-(--text)' : 'text-amber-500'}`}>
                  Percentages total {splitValuesTotal}% of 100%
                </p>
              )}

              <button
                type="submit"
                disabled={isAddingExpense || !isSplitValid}
                className="cursor-pointer self-start rounded-lg px-3 py-1.5 text-xs font-semibold text-white bg-(--accent) hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAddingExpense ? 'Adding…' : 'Add expense'}
              </button>
            </form>
            {addExpenseError && (
              <p role="alert" className="mt-1 text-xs text-red-500">
                {addExpenseError}
              </p>
            )}

            <div className="mt-2 flex flex-col gap-2">
              {isLoadingExpenses && <p className="text-xs text-(--text)">Loading expenses…</p>}
              {expensesError && <p className="text-xs text-red-500">{expensesError}</p>}
              {!isLoadingExpenses && !expensesError && expenses.length === 0 && (
                <p className="text-xs text-(--text)">No expenses yet.</p>
              )}
              {expenses.map((expense) => (
                <div key={expense.id} className="rounded-md border p-2 border-(--border) bg-(--bg)">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-(--text-h)">{expense.description}</p>
                    <p className="text-xs text-(--text-h)">${expense.amount.toFixed(2)}</p>
                  </div>
                  <p className="mt-0.5 text-[11px] text-(--text)">Paid by {expense.paidByUsername}</p>
                  <p className="text-[11px] text-(--text)">
                    Split {expense.splitMethod === 'equal' ? 'equally' : expense.splitMethod === 'percentage' ? 'by percentage' : 'unequally'}:{' '}
                    {expense.shares.map((share) => `${share.username} $${share.amount.toFixed(2)}`).join(', ')}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 border-t pt-3 border-(--border)">
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

            {otherMembers.length > 0 && (
              <form onSubmit={handleRecordSettlement} className="mt-3 flex flex-col gap-2 rounded-lg border p-2 border-(--border)">
                <p className="text-[11px] font-semibold text-(--text-h)">Record settlement</p>
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
        </>
      )}
    </div>
  )
}

export default GroupsPage
