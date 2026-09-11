import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError, deleteAccount } from '../lib/api'
import { clearSession, getCurrentUser } from '../lib/session'

function ProfilePage() {
  const navigate = useNavigate()
  const user = getCurrentUser()
  // Notification preference isn't persisted to the backend yet — local-only for now.
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)

  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function handleSignOut() {
    clearSession()
    navigate('/')
  }

  async function handleDeleteAccount() {
    if (
      !window.confirm(
        "Delete your account? This also deletes any expenses you've added and your shares in others', and removes you from your groups. This can't be undone."
      )
    ) {
      return
    }
    setDeleteError(null)
    setIsDeleting(true)
    try {
      await deleteAccount()
      clearSession()
      navigate('/')
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Could not delete your account.')
      setIsDeleting(false)
    }
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center p-6">
      <div className="flex w-full max-w-90 flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-(--text-h)">Profile</h1>
          <Link to="/home" className="text-sm text-(--accent) hover:underline">
            Back to home
          </Link>
        </div>

        <div className="flex flex-col gap-1 rounded-lg border p-4 border-(--border) bg-(--surface)">
          <span className="text-xs text-(--text)">Username</span>
          <span className="text-sm text-(--text-h)">{user?.username ?? 'Not signed in'}</span>
          <span className="mt-3 text-xs text-(--text)">Email</span>
          <span className="text-sm text-(--text-h)">{user?.email ?? '—'}</span>
        </div>

        <label className="flex items-center justify-between rounded-lg border p-4 border-(--border) bg-(--surface)">
          <div className="flex flex-col">
            <span className="text-sm text-(--text-h)">Email reminders</span>
            <span className="text-xs text-(--text)">
              Sent once daily while you have an unpaid balance.
            </span>
          </div>
          <input
            type="checkbox"
            checked={notificationsEnabled}
            onChange={(event) => setNotificationsEnabled(event.target.checked)}
            className="h-5 w-5 accent-(--accent)"
          />
        </label>

        <button
          type="button"
          onClick={handleSignOut}
          className="cursor-pointer rounded-lg border py-2.5 text-sm font-semibold border-(--border) text-(--text-h) hover:border-(--accent-border)"
        >
          Sign out
        </button>

        <div className="flex flex-col gap-2 rounded-lg border p-4 border-red-500/40">
          <span className="text-sm font-semibold text-red-500">Danger zone</span>
          <p className="text-xs text-(--text)">
            Permanently delete your account. If you own any groups, delete those first.
          </p>
          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={isDeleting}
            className="cursor-pointer rounded-lg border border-red-500 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? 'Deleting…' : 'Delete account'}
          </button>
          {deleteError && (
            <p role="alert" className="text-xs text-red-500">
              {deleteError}
            </p>
          )}
        </div>
      </div>
    </main>
  )
}

export default ProfilePage
