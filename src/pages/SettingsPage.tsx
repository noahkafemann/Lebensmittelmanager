import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { householdApi } from '../lib/api'
import type { Household, HouseholdMember } from '../types/domain'

export const SettingsPage = () => {
  const [household, setHousehold] = useState<Household | null>(null)
  const [members, setMembers] = useState<HouseholdMember[]>([])
  const [newHouseholdName, setNewHouseholdName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member')
  const [inviteToken, setInviteToken] = useState('')
  const [acceptToken, setAcceptToken] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    const currentHousehold = await householdApi.getCurrentHousehold()
    setHousehold(currentHousehold)

    if (currentHousehold) {
      const nextMembers = await householdApi.listMembers()
      setMembers(nextMembers)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const createHousehold = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setMessage(null)

    try {
      await householdApi.createHousehold(newHouseholdName)
      setNewHouseholdName('')
      setMessage('Haushalt angelegt.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler')
    }
  }

  const createInvite = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    try {
      const invite = await householdApi.createInvite(inviteEmail, inviteRole)
      setInviteToken(invite.token)
      setInviteEmail('')
      setMessage(`Einladung erstellt (gültig bis ${invite.expires_at}).`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler')
    }
  }

  const acceptInvite = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    try {
      await householdApi.acceptInvite(acceptToken)
      setAcceptToken('')
      setMessage('Einladung angenommen.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler')
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Haushalt & Mitglieder</h1>
      </header>

      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}

      {!household && (
        <form className="card form" onSubmit={createHousehold}>
          <h2>Ersten Haushalt erstellen</h2>
          <label>
            Haushaltsname
            <input
              value={newHouseholdName}
              onChange={(event) => setNewHouseholdName(event.target.value)}
              required
            />
          </label>
          <button type="submit" className="button">
            Haushalt anlegen
          </button>
        </form>
      )}

      {household && (
        <>
          <section className="card">
            <h2>{household.name}</h2>
            <p>ID: {household.id}</p>
          </section>

          <section className="card">
            <h2>Mitglieder</h2>
            <ul>
              {members.map((member) => (
                <li key={member.id}>{member.email} · {member.role}</li>
              ))}
            </ul>
          </section>

          <form className="card form" onSubmit={createInvite}>
            <h2>Mitglied einladen</h2>
            <div className="split">
              <input
                type="email"
                placeholder="E-Mail"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                required
              />
              <select
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value as 'admin' | 'member')}
              >
                <option value="member">member</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <button type="submit" className="button">
              Einladung erstellen
            </button>
            {inviteToken && (
              <p>
                Einladungstoken: <code>{inviteToken}</code>
              </p>
            )}
          </form>
        </>
      )}

      <form className="card form" onSubmit={acceptInvite}>
        <h2>Einladung annehmen</h2>
        <input
          placeholder="Token"
          value={acceptToken}
          onChange={(event) => setAcceptToken(event.target.value)}
          required
        />
        <button className="button" type="submit">
          Beitreten
        </button>
      </form>
    </div>
  )
}
