import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { pantryApi } from '../lib/api'
import { useAsyncData } from '../hooks/useAsyncData'
import { getExpiryBucket, hasCriticalUseByWarning } from '../utils/expiry'

export const PantryPage = () => {
  const { data, loading, error, reload } = useAsyncData(pantryApi.list)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('alle')
  const [locationFilter, setLocationFilter] = useState('alle')

  const categories = useMemo(
    () => ['alle', ...new Set((data ?? []).map((item) => item.category))],
    [data],
  )
  const locations = useMemo(
    () => ['alle', ...new Set((data ?? []).map((item) => item.storage_location))],
    [data],
  )

  const filtered = useMemo(
    () =>
      (data ?? []).filter((item) => {
        if (categoryFilter !== 'alle' && item.category !== categoryFilter) {
          return false
        }
        if (locationFilter !== 'alle' && item.storage_location !== locationFilter) {
          return false
        }

        return item.name.toLowerCase().includes(search.toLowerCase())
      }),
    [categoryFilter, data, locationFilter, search],
  )

  return (
    <div className="page">
      <header className="page-header row">
        <div>
          <h1>Vorräte</h1>
          <p>Mehrere Chargen werden als eigene Einträge geführt.</p>
        </div>
        <Link className="button" to="/pantry/new">
          Lebensmittel hinzufügen
        </Link>
      </header>

      <section className="card filter-grid">
        <label>
          Suche
          <input value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <label>
          Kategorie
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label>
          Lagerort
          <select value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)}>
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </label>
      </section>

      {loading && <p>Lade Vorräte …</p>}
      {error && <p className="error">{error}</p>}

      <section className="list-grid">
        {filtered.map((item) => (
          <article key={item.id} className="card">
            <h2>{item.name}</h2>
            <p>
              {item.quantity} {item.unit} · {item.category} · {item.storage_location}
            </p>
            <p>
              Haltbarkeit: {item.use_by_date ?? item.best_before_date ?? 'nicht hinterlegt'}
            </p>
            {getExpiryBucket(item) === 'expired' && <p className="warning">Abgelaufen</p>}
            {hasCriticalUseByWarning(item) && <p className="danger">Verbrauchsdatum überschritten</p>}
            <div className="row">
              <Link className="button ghost" to={`/pantry/${item.id}/edit`}>
                Bearbeiten
              </Link>
              <button
                type="button"
                className="button ghost"
                onClick={async () => {
                  await pantryApi.archive(item.id)
                  await reload()
                }}
              >
                Aufgebraucht
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
