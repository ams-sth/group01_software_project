import { Link } from 'react-router-dom'
import { getCurrentUser } from '../lib/session'

function HomePage() {
  const user = getCurrentUser()

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 sm:px-10 sm:py-14">
      <div className="brand-gradient surface-shadow flex flex-col gap-2 rounded-3xl px-8 py-10 text-white sm:px-12">
        <p className="text-sm font-medium text-white/80">Welcome back{user ? `, ${user.username}` : ''}</p>
        <h1 className="text-3xl font-bold sm:text-4xl">Here's where you left off</h1>
        <p className="max-w-xl text-white/85">
          Jump back into a group to add expenses, check balances, or settle up with your
          housemates.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Link
          to="/groups"
          className="surface-shadow group flex flex-col gap-3 rounded-2xl border border-(--border) bg-(--surface) p-7 transition hover:border-(--accent-border)"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-(--accent-soft) text-2xl">
            👥
          </span>
          <span className="text-lg font-semibold text-(--text-h)">Groups</span>
          <span className="text-sm text-(--text)">View your spending groups, balances, and transactions.</span>
          <span className="mt-1 text-sm font-semibold text-(--accent) group-hover:underline">
            Open groups →
          </span>
        </Link>
        <Link
          to="/profile"
          className="surface-shadow group flex flex-col gap-3 rounded-2xl border border-(--border) bg-(--surface) p-7 transition hover:border-(--accent-border)"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-(--accent-soft) text-2xl">
            👤
          </span>
          <span className="text-lg font-semibold text-(--text-h)">Profile</span>
          <span className="text-sm text-(--text)">Account details and notification preferences.</span>
          <span className="mt-1 text-sm font-semibold text-(--accent) group-hover:underline">
            Open profile →
          </span>
        </Link>
      </div>
    </main>
  )
}

export default HomePage
