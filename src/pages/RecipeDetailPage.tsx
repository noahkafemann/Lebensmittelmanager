import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Recipe, RecipeIngredient, RecipeStep } from '../types/domain'
import { recipeApi } from '../lib/api'

export const RecipeDetailPage = () => {
  const { recipeId } = useParams()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([])
  const [steps, setSteps] = useState<RecipeStep[]>([])

  useEffect(() => {
    if (!recipeId) {
      return
    }

    recipeApi.getById(recipeId).then((response) => {
      setRecipe(response.recipe)
      setIngredients(response.ingredients)
      setSteps(response.steps)
    })
  }, [recipeId])

  if (!recipe) {
    return <div className="page"><p>Lade Rezept …</p></div>
  }

  return (
    <div className="page">
      <header className="page-header row">
        <div>
          <h1>{recipe.title}</h1>
          <p>{recipe.description}</p>
        </div>
        <div className="row">
          <Link className="button ghost" to={`/recipes/${recipe.id}/edit`}>
            Bearbeiten
          </Link>
          <button
            type="button"
            className="button ghost"
            onClick={async () => {
              await recipeApi.remove(recipe.id)
              navigate('/recipes')
            }}
          >
            Löschen
          </button>
        </div>
      </header>

      <section className="card">
        <h2>Zutaten</h2>
        <ul>
          {ingredients.map((ingredient) => (
            <li key={ingredient.id}>
              {ingredient.name}: {ingredient.quantity} {ingredient.unit}
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Zubereitung</h2>
        <ol>
          {steps.map((step) => (
            <li key={step.id}>{step.instruction}</li>
          ))}
        </ol>
      </section>

      <Link className="button" to={`/cook/${recipe.id}`}>
        Jetzt kochen
      </Link>
    </div>
  )
}
