import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'

const baseName = import.meta.env.BASE_URL

const applyInitialTheme = () => {
  const stored = localStorage.getItem('theme')
  const theme = stored ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  document.documentElement.dataset.theme = theme
}

applyInitialTheme()

const redirectHashPrefix = '#__redirect='
if (window.location.hash.startsWith(redirectHashPrefix)) {
  const raw = decodeURIComponent(window.location.hash.replace(redirectHashPrefix, ''))
  const normalized = raw.replace(import.meta.env.BASE_URL, '/')
  window.history.replaceState(null, '', normalized)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={baseName}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
