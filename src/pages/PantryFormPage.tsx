import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Unit } from '../types/domain'
import { pantryApi } from '../lib/api'

const units: Unit[] = ['g', 'kg', 'ml', 'l', 'stück', 'tl', 'el']

export const PantryFormPage = () => {
  const navigate = useNavigate()
  const { itemId } = useParams()
  const [form, setForm] = useState({
    name: '',
    category: 'Gemüse',
    quantity: 1,
    unit: 'stück' as Unit,
    storage_location: 'Kühlschrank',
    best_before_date: '',
    use_by_date: '',
    purchase_date: '',
    note: '',
  })

  useEffect(() => {
    if (!itemId) {
      return
    }

    pantryApi.list().then((items) => {
      const existing = items.find((item) => item.id === itemId)
      if (!existing) {
        return
      }
      setForm({
        name: existing.name,
        category: existing.category,
        quantity: existing.quantity,
        unit: existing.unit,
        storage_location: existing.storage_location,
        best_before_date: existing.best_before_date ?? '',
        use_by_date: existing.use_by_date ?? '',
        purchase_date: existing.purchase_date ?? '',
        note: existing.note ?? '',
      })
    })
  }, [itemId])

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()

    await pantryApi.upsert({
      id: itemId,
      ...form,
      best_before_date: form.best_before_date || null,
      use_by_date: form.use_by_date || null,
      purchase_date: form.purchase_date || null,
      note: form.note || null,
    })

    navigate('/pantry')
  }

  return (
    <div className="page">
      <form className="card form" onSubmit={onSubmit}>
        <h1>{itemId ? 'Lebensmittel bearbeiten' : 'Lebensmittel hinzufügen'}</h1>

        <label>
          Name
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            required
          />
        </label>

        <label>
          Kategorie
          <input
            value={form.category}
            onChange={(event) =>
              setForm((current) => ({ ...current, category: event.target.value }))
            }
            required
          />
        </label>

        <div className="split">
          <label>
            Menge
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.quantity}
              onChange={(event) =>
                setForm((current) => ({ ...current, quantity: Number(event.target.value) }))
              }
              required
            />
          </label>

          <label>
            Einheit
            <select
              value={form.unit}
              onChange={(event) =>
                setForm((current) => ({ ...current, unit: event.target.value as Unit }))
              }
            >
              {units.map((unit) => (
                <option value={unit} key={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          Lagerort
          <input
            value={form.storage_location}
            onChange={(event) =>
              setForm((current) => ({ ...current, storage_location: event.target.value }))
            }
            required
          />
        </label>

        <div className="split">
          <label>
            MHD
            <input
              type="date"
              value={form.best_before_date}
              onChange={(event) =>
                setForm((current) => ({ ...current, best_before_date: event.target.value }))
              }
            />
          </label>

          <label>
            Verbrauchsdatum
            <input
              type="date"
              value={form.use_by_date}
              onChange={(event) =>
                setForm((current) => ({ ...current, use_by_date: event.target.value }))
              }
            />
          </label>
        </div>

        <div className="split">
          <label>
            Kaufdatum
            <input
              type="date"
              value={form.purchase_date}
              onChange={(event) =>
                setForm((current) => ({ ...current, purchase_date: event.target.value }))
              }
            />
          </label>

          <label>
            Notiz
            <input
              value={form.note}
              onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
            />
          </label>
        </div>

        <button className="button" type="submit">
          Speichern
        </button>
      </form>
    </div>
  )
}
