import { useEffect, useState, type FormEvent } from 'react'
import {
  addExpense,
  ApiError,
  updateExpense,
  type ExpenseResponse,
  type ExpenseSplitInput,
  type SplitMethod,
} from '../lib/api'

function distributeEvenly(total: number, count: number): number[] {
  if (count <= 0) return []
  const clampedTotal = Math.max(0, Math.round(total))
  const base = Math.floor(clampedTotal / count)
  const remainderUnits = clampedTotal - base * count
  return Array.from({ length: count }, (_, index) => (index < remainderUnits ? base + 1 : base))
}

// `decimals` is 0 for percentage points, 2 for dollar cents — everything is distributed
// in integer "units" at that precision so shares always add up exactly to `target`.
function autoBalanceSplit(
  values: Record<string, string>,
  selectedList: string[],
  overridden: Set<string>,
  target: number,
  decimals: number,
): Record<string, string> {
  const toDistribute = selectedList.filter((username) => !overridden.has(username))
  if (toDistribute.length === 0) {
    return values
  }

  const scale = 10 ** decimals
  const overriddenTotalUnits = selectedList
    .filter((username) => overridden.has(username))
    .reduce((sum, username) => sum + Math.round((Number(values[username]) || 0) * scale), 0)

  const shareUnits = distributeEvenly(Math.round(target * scale) - overriddenTotalUnits, toDistribute.length)

  const next = { ...values }
  toDistribute.forEach((username, index) => {
    next[username] = (shareUnits[index] / scale).toFixed(decimals)
  })
  return next
}

function initialSplitValues(expense: ExpenseResponse | undefined): Record<string, string> {
  if (!expense) return {}
  if (expense.splitMethod === 'unequal') {
    return Object.fromEntries(expense.shares.map((share) => [share.username, String(share.amount)]))
  }
  if (expense.splitMethod === 'percentage') {
    // The server only persists/returns the resolved dollar amount per share, not
    // the original percentage — re-derive an approximate percentage from it so
    // there's something sensible to edit from, rather than claiming false precision.
    return Object.fromEntries(
      expense.shares.map((share) => [share.username, String(Math.round((share.amount / expense.amount) * 100))]),
    )
  }
  return {}
}

function AddExpenseModal({
  groupId,
  memberUsernames,
  expense,
  onClose,
  onSaved,
}: {
  groupId: string
  memberUsernames: string[]
  expense?: ExpenseResponse
  onClose: () => void
  onSaved: (expense: ExpenseResponse) => void
}) {
  const isEditing = expense !== undefined

  const [description, setDescription] = useState(expense?.description ?? '')
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '')
  const [splitMethod, setSplitMethod] = useState<SplitMethod>(expense?.splitMethod ?? 'equal')
  const [selectedUsernames, setSelectedUsernames] = useState<Set<string>>(
    new Set(expense ? expense.shares.map((share) => share.username) : memberUsernames),
  )
  const [splitValues, setSplitValues] = useState<Record<string, string>>(initialSplitValues(expense))
  const [overriddenUsernames, setOverriddenUsernames] = useState<Set<string>>(
    () => new Set(expense && expense.splitMethod !== 'equal' ? expense.shares.map((share) => share.username) : []),
  )
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

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

  const selectedList = memberUsernames.filter((memberUsername) => selectedUsernames.has(memberUsername))
  const parsedAmount = Number(amount) || 0

  useEffect(() => {
    if (splitMethod === 'equal') return
    const cleanedOverridden = new Set([...overriddenUsernames].filter((username) => selectedUsernames.has(username)))
    setOverriddenUsernames(cleanedOverridden)
    const target = splitMethod === 'percentage' ? 100 : parsedAmount
    const decimals = splitMethod === 'percentage' ? 0 : 2
    setSplitValues((current) => autoBalanceSplit(current, selectedList, cleanedOverridden, target, decimals))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUsernames, splitMethod, parsedAmount])

  const splitValuesTotal = selectedList.reduce((sum, memberUsername) => sum + (Number(splitValues[memberUsername]) || 0), 0)
  const isUnequalValid = Math.abs(splitValuesTotal - parsedAmount) < 0.005
  const isPercentageValid = Math.abs(splitValuesTotal - 100) < 0.005
  const isSplitValid =
    selectedList.length > 0 &&
    (splitMethod === 'equal' ||
      (splitMethod === 'unequal' && isUnequalValid && selectedList.every((u) => Number(splitValues[u]) > 0)) ||
      (splitMethod === 'percentage' && isPercentageValid && selectedList.every((u) => Number(splitValues[u]) > 0)))

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaveError(null)

    const splits: ExpenseSplitInput[] = selectedList.map((memberUsername) => ({
      username: memberUsername,
      amount: splitMethod === 'unequal' ? Number(splitValues[memberUsername]) : undefined,
      percentage: splitMethod === 'percentage' ? Number(splitValues[memberUsername]) : undefined,
    }))

    setIsSaving(true)
    try {
      const saved = isEditing
        ? await updateExpense(groupId, expense.id, description, parsedAmount, splitMethod, splits)
        : await addExpense(groupId, description, parsedAmount, splitMethod, splits)
      onSaved(saved)
      onClose()
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : `Could not ${isEditing ? 'save' : 'add'} that expense.`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? 'Edit expense' : 'Add expense'}
        onClick={(event) => event.stopPropagation()}
        className="surface-shadow w-full max-w-md rounded-2xl border p-5 border-(--border) bg-(--surface)"
      >
        <div className="flex items-center justify-between">
          <p className="text-base font-semibold text-(--text-h)">{isEditing ? 'Edit expense' : 'Add expense'}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer text-(--text) hover:text-(--text-h)"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
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
                  setOverriddenUsernames(new Set())
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
            {memberUsernames.map((memberUsername) => (
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
                    onFocus={(event) => {
                      // Browsers auto-select an input's text on Tab-focus but not on click-focus;
                      // select explicitly so both let you type over a suggestion without backspacing it first.
                      event.target.select()
                      if (!overriddenUsernames.has(memberUsername)) {
                        setOverriddenUsernames((current) => new Set(current).add(memberUsername))
                      }
                    }}
                    onChange={(event) => {
                      const rawValue = event.target.value
                      const nextOverridden = new Set(overriddenUsernames).add(memberUsername)
                      setOverriddenUsernames(nextOverridden)
                      const target = splitMethod === 'percentage' ? 100 : parsedAmount
                      const decimals = splitMethod === 'percentage' ? 0 : 2
                      setSplitValues((current) =>
                        autoBalanceSplit({ ...current, [memberUsername]: rawValue }, selectedList, nextOverridden, target, decimals),
                      )
                    }}
                    className={`w-16 rounded border px-1.5 py-0.5 text-right text-xs bg-(--bg) border-(--border) ${
                      overriddenUsernames.has(memberUsername) ? 'text-(--text-h)' : 'italic text-(--text)'
                    }`}
                  />
                )}
              </label>
            ))}
          </div>

          {splitMethod === 'unequal' && (
            <p className={`text-[11px] ${isUnequalValid ? 'text-(--text)' : 'text-(--warning)'}`}>
              Amounts total ${splitValuesTotal.toFixed(2)} of ${parsedAmount.toFixed(2)}
            </p>
          )}
          {splitMethod === 'percentage' && (
            <p className={`text-[11px] ${isPercentageValid ? 'text-(--text)' : 'text-(--warning)'}`}>
              Percentages total {splitValuesTotal}% of 100%
            </p>
          )}

          {saveError && (
            <p role="alert" className="text-xs text-(--danger)">
              {saveError}
            </p>
          )}

          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold border-(--border) text-(--text-h)"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !isSplitValid}
              className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold text-white bg-(--accent) hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Saving…' : isEditing ? 'Save changes' : 'Add expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddExpenseModal
