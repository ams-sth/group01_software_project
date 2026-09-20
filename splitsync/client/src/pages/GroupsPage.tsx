import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, createGroup, joinGroup, listGroups, type GroupResponse } from '../lib/api'

function GroupsPage() {
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
      <h1 className="text-2xl font-semibold text-(--text-h)">Your spending groups</h1>

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
          <Link
            key={group.id}
            to={`/groups/${group.id}`}
            className="flex items-center justify-between rounded-lg border p-4 border-(--border) bg-(--surface) hover:border-(--accent-border)"
          >
            <span className="font-semibold text-(--text-h)">{group.name}</span>
            <span className="text-xs text-(--text)">
              {group.memberUsernames.length} member{group.memberUsernames.length === 1 ? '' : 's'}
            </span>
          </Link>
        ))}
      </div>
    </main>
  )
}

export default GroupsPage
