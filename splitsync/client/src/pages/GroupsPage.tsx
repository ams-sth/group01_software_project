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
    <main className="mx-auto max-w-7xl px-6 py-10 sm:px-10 sm:py-14">
      <h1 className="text-3xl font-bold text-(--text-h)">Your spending groups</h1>
      <p className="mt-1 text-sm text-(--text)">Create a new group or join one with an ID a housemate shared with you.</p>

      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <form
          onSubmit={handleCreate}
          className="surface-shadow flex flex-col gap-3 rounded-2xl border border-(--border) bg-(--surface) p-6"
        >
          <p className="text-sm font-semibold text-(--text-h)">Create a group</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Flat 4B"
              required
              value={newGroupName}
              onChange={(event) => setNewGroupName(event.target.value)}
              className="flex-1 rounded-lg border px-3 py-2.5 text-sm bg-(--bg) border-(--border) text-(--text-h)"
            />
            <button
              type="submit"
              disabled={isCreating}
              className="cursor-pointer rounded-lg px-4 py-2.5 text-sm font-semibold text-white bg-(--accent) hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreating ? 'Creating…' : 'Create'}
            </button>
          </div>
          {createError && (
            <p role="alert" className="text-xs text-(--danger)">
              {createError}
            </p>
          )}
        </form>

        <form
          onSubmit={handleJoin}
          className="surface-shadow flex flex-col gap-3 rounded-2xl border border-(--border) bg-(--surface) p-6"
        >
          <p className="text-sm font-semibold text-(--text-h)">Join a group</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Paste a group ID"
              required
              value={joinGroupId}
              onChange={(event) => setJoinGroupId(event.target.value)}
              className="flex-1 rounded-lg border px-3 py-2.5 text-sm bg-(--bg) border-(--border) text-(--text-h)"
            />
            <button
              type="submit"
              disabled={isJoining}
              className="cursor-pointer rounded-lg border px-4 py-2.5 text-sm font-semibold border-(--border) text-(--text-h) hover:border-(--accent-border) disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isJoining ? 'Joining…' : 'Join'}
            </button>
          </div>
          {joinError && (
            <p role="alert" className="text-xs text-(--danger)">
              {joinError}
            </p>
          )}
        </form>
      </div>

      <div className="mt-10">
        {isLoading && <p className="text-sm text-(--text)">Loading groups…</p>}
        {loadError && <p className="text-sm text-(--danger)">{loadError}</p>}
        {!isLoading && !loadError && groups.length === 0 && (
          <p className="text-sm text-(--text)">
            You're not in any groups yet — create one above to get started.
          </p>
        )}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group, index) => (
            <Link
              key={group.id}
              to={`/groups/${group.id}`}
              className="surface-shadow group flex flex-col gap-4 rounded-2xl border border-(--border) bg-(--surface) p-6 transition hover:border-(--accent-border)"
            >
              <span
                className="brand-gradient flex h-11 w-11 items-center justify-center rounded-xl text-lg font-bold text-white"
                style={index % 2 === 1 ? { backgroundImage: 'linear-gradient(135deg, var(--accent-2), var(--accent))' } : undefined}
                aria-hidden="true"
              >
                {group.name.charAt(0).toUpperCase()}
              </span>
              <div>
                <span className="block font-semibold text-(--text-h)">{group.name}</span>
                <span className="text-xs text-(--text)">
                  {group.memberUsernames.length} member{group.memberUsernames.length === 1 ? '' : 's'}
                </span>
              </div>
              <span className="mt-auto text-sm font-semibold text-(--accent) group-hover:underline">
                Open group →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}

export default GroupsPage
