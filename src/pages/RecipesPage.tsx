import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { pantryApi, recipeApi } from '../lib/api'
import { useAsyncData } from '../hooks/useAsyncData'
import { calculateRecipeMatch } from '../utils/recipeMatching'

export const RecipesPage = () => {
  const recipes = useAsyncData(recipeApi.list)
  const pantry = useAsyncData(pantryApi.list)
  const [onlyComplete, setOnlyComplete] = useState(false)
  const [favoritesOnly, setFavoritesOnly] = useState(false)

  const matches = useMemo(() => {
    if (!recipes.data) {
      return []
    }

    const pantryItems = pantry.data ?? []

    return recipes.data
      .map((recipe) => calculateRecipeMatch(recipe, recipe.recipe_ingredients, pantryItems))
      .filter((match) => (onlyComplete ? match.missingIngredients.length === 0 : true))
      .filter((match) => (favoritesOnly ? match.recipe.is_favorite : true))
      .sort((a, b) => b.coverageRatio - a.coverageRatio)
  }, [favoritesOnly, onlyComplete, pantry.data, recipes.data])

  return (
    <div className="page">
      <header className="page-header row">
        <div>
          <h1>Rezepte</h1>
          <p>Sortierung nach verfügbaren Zutaten.</p>
        </div>
        <Link className="button" to="/recipes/new">
          Rezept erstellen
        </Link>
      </header>

      <section className="card row">
        <label>
          <input
            type="checkbox"
            checked={onlyComplete}
            onChange={(event) => setOnlyComplete(event.target.checked)}
          />{' '}
          Nur vollständig vorhanden
        </label>
        <label>
          <input
            type="checkbox"
            checked={favoritesOnly}
            onChange={(event) => setFavoritesOnly(event.target.checked)}
          />{' '}
          Nur Favoriten
        </label>
      </section>

      <section className="list-grid">
        {matches.map((match) => (
          <article className="card" key={match.recipe.id}>
            <h2>{match.recipe.title}</h2>
            <p>{match.recipe.category} · {match.recipe.prep_minutes} min</p>
            <p>{Math.round(match.coverageRatio * 100)}% verfügbar</p>
            <p>Fehlend: {match.missingIngredients.length}</p>
            {match.expiringIngredients.length > 0 && (
              <p className="warning">Bald ablaufend: {match.expiringIngredients.join(', ')}</p>
            )}
            <div className="row">
              <Link className="button ghost" to={`/recipes/${match.recipe.id}`}>
                Details
              </Link>
              <Link className="button" to={`/cook/${match.recipe.id}`}>
                Jetzt kochen
              </Link>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
