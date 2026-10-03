import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'

const navigation = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/pantry', label: 'Vorräte' },
  { to: '/expiry', label: 'Haltbarkeit' },
  { to: '/recipes', label: 'Rezepte' },
  { to: '/shopping', label: 'Einkauf' },
  { to: '/settings', label: 'Haushalt' },
]

export const AppLayout = () => {
  const { signOut } = useAuth()
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('theme')
    return stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  const toggleTheme = () => {
    setDarkMode((current) => {
      const next = !current
      document.documentElement.dataset.theme = next ? 'dark' : 'light'
      localStorage.setItem('theme', next ? 'dark' : 'light')
      return next
    })
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <Link to="/dashboard" className="brand">
          Lebensmittelmanager
        </Link>
        <nav>
          {navigation.map((item) => (
            <NavLink key={item.to} to={item.to} className="nav-link">
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button onClick={toggleTheme} type="button" className="button ghost">
            {darkMode ? 'Hellmodus' : 'Dunkelmodus'}
          </button>
          <button onClick={() => void signOut()} type="button" className="button ghost">
            Abmelden
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>

      <nav className="mobile-nav">
        {navigation.map((item) => (
          <NavLink key={item.to} to={item.to} className="nav-link">
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
