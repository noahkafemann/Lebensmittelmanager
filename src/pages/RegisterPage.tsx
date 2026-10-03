import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../lib/api'

export const RegisterPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setMessage(null)

    const { error: signUpError } = await authApi.signUp(email, password)
    if (signUpError) {
      setError(signUpError.message)
      return
    }

    setMessage('Registrierung erfolgreich. Bitte bestätige deine E-Mail-Adresse.')
  }

  return (
    <div className="auth-page">
      <form className="card form" onSubmit={onSubmit}>
        <h1>Registrieren</h1>
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
            minLength={8}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        {message && <p className="success">{message}</p>}
        <button className="button" type="submit">
          Konto erstellen
        </button>
        <p>
          Bereits registriert? <Link to="/login">Anmelden</Link>
        </p>
      </form>
    </div>
  )
}
