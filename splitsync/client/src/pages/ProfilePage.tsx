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
    <main className="mx-auto max-w-3xl px-6 py-10 sm:px-10 sm:py-14">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-(--text-h)">Profile</h1>
          <Link to="/home" className="text-sm font-medium text-(--accent) hover:underline">
            Back to home
          </Link>
        </div>

        <div className="brand-gradient surface-shadow flex items-center gap-4 rounded-2xl px-6 py-6 text-white">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/20 text-2xl font-bold">
            {(user?.username ?? '?').charAt(0).toUpperCase()}
          </span>
          <div className="flex flex-col">
            <span className="text-lg font-semibold">{user?.username ?? 'Not signed in'}</span>
            <span className="text-sm text-white/80">{user?.email ?? '—'}</span>
          </div>
        </div>

        <label className="surface-shadow flex items-center justify-between rounded-2xl border p-5 border-(--border) bg-(--surface)">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-(--text-h)">Email reminders</span>
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
          className="cursor-pointer rounded-xl border py-3 text-sm font-semibold border-(--border) bg-(--surface) text-(--text-h) hover:border-(--accent-border)"
        >
          Sign out
        </button>

        <div className="flex flex-col gap-3 rounded-2xl border p-5 border-(--danger)/30 bg-(--danger-soft)">
          <span className="text-sm font-semibold text-(--danger)">Danger zone</span>
          <p className="text-xs text-(--text)">
            Permanently delete your account. If you own any groups, delete those first.
          </p>
          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={isDeleting}
            className="cursor-pointer rounded-xl border border-(--danger) py-2.5 text-sm font-semibold text-(--danger) hover:bg-(--danger)/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? 'Deleting…' : 'Delete account'}
          </button>
          {deleteError && (
            <p role="alert" className="text-xs text-(--danger)">
              {deleteError}
            </p>
          )}
        </div>
      </div>
    </main>
  )
}

export default ProfilePage
