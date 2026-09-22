import { Link } from 'react-router-dom'
import NotificationBell from './NotificationBell'
import ThemeToggle from './ThemeToggle'

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-(--border) bg-(--surface)/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-10">
        <Link to="/home" className="flex items-center gap-2 text-lg font-bold text-(--text-h)">
          <span className="brand-gradient flex h-8 w-8 items-center justify-center rounded-xl text-white">S</span>
          SplitSync
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <nav className="flex items-center gap-1 text-sm font-medium sm:gap-2">
            <Link
              to="/home"
              className="rounded-lg px-3 py-2 text-(--text-h) transition hover:bg-(--surface-2)"
            >
              Home
            </Link>
            <Link
              to="/groups"
              className="rounded-lg px-3 py-2 text-(--text-h) transition hover:bg-(--surface-2)"
            >
              Groups
            </Link>
            <Link
              to="/profile"
              className="rounded-lg px-3 py-2 text-(--text-h) transition hover:bg-(--surface-2)"
            >
              Profile
            </Link>
          </nav>
          <div className="h-6 w-px bg-(--border)" aria-hidden="true" />
          <NotificationBell />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

export default Header
