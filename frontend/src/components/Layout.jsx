import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { authService } from '../services/api'

export default function Layout() {
  const { user, token, logout, isAdmin } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try { await authService.logout(token) } catch {}
    logout()
    navigate('/login')
  }

  return (
    <>
      <nav className="nav">
        <NavLink to="/game" className="nav-brand">♠ CASINO ROYAL</NavLink>
        <div className="nav-links">
          <NavLink
            to="/game"
            className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
          >
            Blackjack
          </NavLink>
          <NavLink
            to="/wallet"
            className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
          >
            Billetera
          </NavLink>
          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
            >
              Admin
            </NavLink>
          )}
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', padding: '0 0.5rem' }}>
            {user?.email}
          </span>
          <button className="nav-link" onClick={handleLogout}>Salir</button>
        </div>
      </nav>
      <main style={{ padding: '0 1.5rem 3rem', maxWidth: '1100px', margin: '0 auto' }}>
        <Outlet />
      </main>
    </>
  )
}