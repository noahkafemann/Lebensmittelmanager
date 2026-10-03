import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { authApi } from '../lib/api'

export const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error: signInError } = await authApi.signIn(email, password)
      if (signInError) {
        throw signInError
      }

      const target = (location.state as { from?: { pathname: string } } | null)?.from?.pathname
      navigate(target ?? '/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <form className="card form" onSubmit={onSubmit}>
        <h1>Anmelden</h1>
        <label>
          E-Mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Passwort
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="button" type="submit" disabled={loading}>
          {loading ? 'Bitte warten …' : 'Anmelden'}
        </button>
        <p>
          Noch kein Konto? <Link to="/register">Registrieren</Link>
        </p>
        <p>
          <Link to="/forgot-password">Passwort vergessen?</Link>
        </p>
      </form>
    </div>
  )
}
