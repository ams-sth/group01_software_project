import { Link } from 'react-router-dom'
import NotificationBell from './NotificationBell'

function Header() {
  return (
    <header className="border-b border-(--border)">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-8 py-3">
        <Link to="/home" className="font-semibold text-(--text-h)">
          SplitSync
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link to="/home" className="text-(--accent) hover:underline">
            Home
          </Link>
          <Link to="/profile" className="text-(--accent) hover:underline">
            Profile
          </Link>
          <NotificationBell />
        </div>
      </div>
    </header>
  )
}

export default Header
