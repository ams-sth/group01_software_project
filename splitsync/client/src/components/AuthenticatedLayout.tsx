import { Outlet } from 'react-router-dom'
import Header from './Header'

function AuthenticatedLayout() {
  return (
    <>
      <Header />
      <Outlet />
    </>
  )
}

export default AuthenticatedLayout
