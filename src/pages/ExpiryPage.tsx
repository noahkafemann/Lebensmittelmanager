import { pantryApi } from '../lib/api'
import { useAsyncData } from '../hooks/useAsyncData'
import { getExpiryBucket, hasCriticalUseByWarning, type ExpiryBucket } from '../utils/expiry'

const sections: Array<{ title: string; bucket: ExpiryBucket }> = [
  { title: 'Bereits abgelaufen', bucket: 'expired' },
  { title: 'Läuft heute ab', bucket: 'today' },
  { title: 'Läuft in 3 Tagen ab', bucket: 'next3' },
  { title: 'Läuft in 7 Tagen ab', bucket: 'next7' },
  { title: 'Noch länger haltbar', bucket: 'later' },
]

export const ExpiryPage = () => {
  const { data, loading, error } = useAsyncData(pantryApi.list)

  return (
    <div className="page">
      <header className="page-header">
        <h1>Haltbarkeit</h1>
        <p>MHD ist ein Qualitätsdatum. Verbrauchsdatum wird als kritische Warnung markiert.</p>
      </header>

      {loading && <p>Lade Haltbarkeit …</p>}
      {error && <p className="error">{error}</p>}

      {sections.map((section) => {
        const items = (data ?? []).filter((item) => getExpiryBucket(item) === section.bucket)
        return (
          <section key={section.bucket} className="card">
            <h2>{section.title}</h2>
            {items.length === 0 ? (
              <p>Keine Einträge.</p>
            ) : (
              <ul>
                {items.map((item) => (
                  <li key={item.id}>
                    {item.name} · {item.quantity} {item.unit} · {item.use_by_date ?? item.best_before_date}
                    {hasCriticalUseByWarning(item) ? ' ⚠️ Verbrauchsdatum überschritten' : ''}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
