import { useState } from 'react'
import type { FormEvent } from 'react'
import { authApi } from '../lib/api'

export const ResetPasswordPage = () => {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setMessage(null)
    setError(null)

    const { error: resetError } = await authApi.resetPassword(email)
    if (resetError) {
      setError(resetError.message)
      return
    }

    setMessage('Falls die E-Mail existiert, wurde ein Link zum Zurücksetzen versendet.')
  }

  return (
    <div className="auth-page">
      <form className="card form" onSubmit={onSubmit}>
        <h1>Passwort zurücksetzen</h1>
        <label>
          E-Mail
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        {error && <p className="error">{error}</p>}
        {message && <p className="success">{message}</p>}
        <button type="submit" className="button">
          Link senden
        </button>
      </form>
    </div>
  )
}
