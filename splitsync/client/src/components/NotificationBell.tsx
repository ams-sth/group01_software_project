import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ApiError,
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationResponse,
} from '../lib/api'

const POLL_INTERVAL_MS = 30_000

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMinutes = Math.floor(diffMs / 60_000)
  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(iso).toLocaleDateString()
}

function NotificationBell() {
  const navigate = useNavigate()

  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function refreshUnreadCount() {
    getUnreadNotificationCount()
      .then((res) => setUnreadCount(res.count))
      .catch(() => {})
  }

  useEffect(() => {
    refreshUnreadCount()
    const interval = setInterval(refreshUnreadCount, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  function openDropdown() {
    setIsOpen(true)
    setIsLoading(true)
    setError(null)
    listNotifications()
      .then(setNotifications)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load notifications.'))
      .finally(() => setIsLoading(false))
  }

  async function handleNotificationClick(notification: NotificationResponse) {
    if (!notification.isRead) {
      try {
        await markNotificationRead(notification.id)
        setNotifications((current) =>
          current.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
        )
        setUnreadCount((current) => Math.max(0, current - 1))
      } catch {
        // best-effort — still navigate even if marking read failed
      }
    }
    setIsOpen(false)
    if (notification.groupId) {
      navigate(`/groups/${notification.groupId}`)
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead()
      setNotifications((current) => current.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch {
      // best-effort
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : openDropdown())}
        aria-label="Notifications"
        aria-expanded={isOpen}
        className="relative cursor-pointer rounded-full p-2 text-(--text-h) hover:bg-(--surface-2)"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-(--danger) px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="surface-shadow absolute right-0 z-50 mt-2 w-80 max-w-[90vw] rounded-xl border p-2 border-(--border) bg-(--surface)">
            <div className="flex items-center justify-between px-1 pb-1">
              <p className="text-xs font-semibold text-(--text-h)">Notifications</p>
              {notifications.some((n) => !n.isRead) && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="cursor-pointer text-[11px] text-(--accent) hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            {isLoading && <p className="px-1 py-2 text-xs text-(--text)">Loading…</p>}
            {error && <p className="px-1 py-2 text-xs text-(--danger)">{error}</p>}
            {!isLoading && !error && notifications.length === 0 && (
              <p className="px-1 py-2 text-xs text-(--text)">No notifications yet.</p>
            )}

            <ul className="flex max-h-80 flex-col gap-0.5 overflow-y-auto">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full cursor-pointer rounded-md p-2 text-left text-xs hover:bg-(--bg) ${
                      notification.isRead ? 'text-(--text)' : 'text-(--text-h) font-medium'
                    }`}
                  >
                    <span className="flex items-start gap-1.5">
                      {!notification.isRead && (
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-(--accent)" aria-hidden="true" />
                      )}
                      <span className="flex-1">{notification.message}</span>
                    </span>
                    <span className="mt-0.5 block text-[10px] text-(--text)">
                      {formatRelativeTime(notification.createdAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}

export default NotificationBell
