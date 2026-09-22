import { Outlet } from 'react-router-dom'
import Header from './Header'

function AuthenticatedLayout() {
  return (
    <div className="min-h-svh bg-(--bg)">
      <Header />
      <Outlet />
    </div>
  )
}

export default AuthenticatedLayout
