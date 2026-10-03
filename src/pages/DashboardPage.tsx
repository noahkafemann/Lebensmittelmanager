import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { useAsyncData } from '../hooks/useAsyncData'
import { householdApi, pantryApi, recipeApi, shoppingApi } from '../lib/api'
import { getExpiryBucket } from '../utils/expiry'
import { calculateRecipeMatch } from '../utils/recipeMatching'

export const DashboardPage = () => {
  const household = useAsyncData(householdApi.getCurrentHousehold)
  const pantry = useAsyncData(pantryApi.list)
  const recipes = useAsyncData(recipeApi.list)
  const shopping = useAsyncData(shoppingApi.list)

  const expiringCounts = useMemo(() => {
    const items = pantry.data ?? []
    const soon = items.filter((item) => ['today', 'next3'].includes(getExpiryBucket(item))).length
    const expired = items.filter((item) => getExpiryBucket(item) === 'expired').length
    const lowStock = items.filter((item) => item.quantity <= 1).length

    return { soon, expired, lowStock }
  }, [pantry.data])

  const suggestions = useMemo(() => {
    if (!recipes.data) {
      return []
    }

    const pantryItems = pantry.data ?? []

    return recipes.data
      .map((recipe) =>
        calculateRecipeMatch(recipe, recipe.recipe_ingredients, pantryItems),
      )
      .sort((a, b) => b.coverageRatio - a.coverageRatio)
      .slice(0, 3)
  }, [pantry.data, recipes.data])

  if (household.loading || pantry.loading || recipes.loading || shopping.loading) {
    return <div className="page"><p>Lade Dashboard …</p></div>
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Dashboard</h1>
        <p>{household.data ? `Haushalt: ${household.data.name}` : 'Noch kein Haushalt vorhanden.'}</p>
      </header>

      {!household.data && (
        <section className="card">
          <h2>Haushalt einrichten</h2>
          <p>Erstelle in den Einstellungen zuerst einen Haushalt oder nutze einen Einladungslink.</p>
          <Link className="button" to="/settings">
            Zu Einstellungen
          </Link>
        </section>
      )}

      <section className="stats-grid">
        <article className="card"><h2>Lebensmittel</h2><p>{pantry.data?.length ?? 0}</p></article>
        <article className="card"><h2>Bald ablaufend</h2><p>{expiringCounts.soon}</p></article>
        <article className="card"><h2>Abgelaufen</h2><p>{expiringCounts.expired}</p></article>
        <article className="card"><h2>Niedriger Bestand</h2><p>{expiringCounts.lowStock}</p></article>
      </section>

      <section className="card">
        <h2>Aktuelle Einkaufsliste</h2>
        <ul>
          {(shopping.data ?? []).slice(0, 5).map((item) => (
            <li key={item.id}>{item.name} · {item.quantity} {item.unit}</li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Rezeptvorschläge</h2>
        {suggestions.length === 0 ? (
          <p>Lege Rezepte mit Zutaten an, um Vorschläge zu sehen.</p>
        ) : (
          <ul>
            {suggestions.map((suggestion) => (
              <li key={suggestion.recipe.id}>
                <Link to={`/recipes/${suggestion.recipe.id}`}>{suggestion.recipe.title}</Link>{' '}
                ({Math.round(suggestion.coverageRatio * 100)}% verfügbar)
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
