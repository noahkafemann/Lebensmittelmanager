import { useState } from 'react'
import type { FormEvent } from 'react'
import { shoppingApi } from '../lib/api'
import { useAsyncData } from '../hooks/useAsyncData'
import type { Unit } from '../types/domain'

const units: Unit[] = ['g', 'kg', 'ml', 'l', 'stück', 'tl', 'el']

export const ShoppingPage = () => {
  const { data, loading, error, reload } = useAsyncData(shoppingApi.list)
  const [form, setForm] = useState({ name: '', quantity: 1, unit: 'stück' as Unit, category: 'Allgemein', note: '' })

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()

    await shoppingApi.upsert({
      ...form,
      note: form.note || null,
      is_checked: false,
      is_purchased: false,
    })

    setForm({ name: '', quantity: 1, unit: 'stück', category: 'Allgemein', note: '' })
    await reload()
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Einkaufsliste</h1>
      </header>

      <form className="card form" onSubmit={onSubmit}>
        <h2>Artikel hinzufügen</h2>
        <div className="split">
          <input
            placeholder="Name"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            required
          />
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.quantity}
            onChange={(event) =>
              setForm((current) => ({ ...current, quantity: Number(event.target.value) }))
            }
            required
          />
          <select
            value={form.unit}
            onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value as Unit }))}
          >
            {units.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </div>
        <div className="split">
          <input
            placeholder="Kategorie"
            value={form.category}
            onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
          />
          <input
            placeholder="Notiz"
            value={form.note}
            onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
          />
        </div>
        <button className="button" type="submit">
          Hinzufügen
        </button>
      </form>

      {loading && <p>Lade Einkaufsliste …</p>}
      {error && <p className="error">{error}</p>}

      <section className="list-grid">
        {(data ?? []).map((item) => (
          <article className="card" key={item.id}>
            <h2>{item.name}</h2>
            <p>{item.quantity} {item.unit}</p>
            <p>{item.category}</p>
            <div className="row">
              <button
                type="button"
                className="button ghost"
                onClick={async () => {
                  await shoppingApi.upsert({
                    id: item.id,
                    name: item.name,
                    quantity: item.quantity,
                    unit: item.unit,
                    category: item.category,
                    note: item.note,
                    is_checked: !item.is_checked,
                    is_purchased: item.is_purchased,
                  })
                  await reload()
                }}
              >
                {item.is_checked ? 'Nicht erledigt' : 'Abhaken'}
              </button>
              <button
                type="button"
                className="button ghost"
                onClick={async () => {
                  await shoppingApi.remove(item.id)
                  await reload()
                }}
              >
                Entfernen
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
