import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { pantryApi, recipeApi, shoppingApi } from '../lib/api'
import type { PantryItem, Recipe, RecipeIngredient, RecipeStep, Unit } from '../types/domain'
import { clampPositive, convertQuantity } from '../utils/units'

interface NeedResult {
  ingredient: RecipeIngredient
  required: number
  available: number
  missing: number
  allocations: Array<{ pantry_item_id: string; quantity: number; unit: Unit }>
}

const computeNeed = (
  ingredient: RecipeIngredient,
  pantryItems: PantryItem[],
  factor: number,
): NeedResult => {
  const required = ingredient.quantity * factor
  const matching = pantryItems
    .filter((item) => item.name.toLowerCase() === ingredient.name.toLowerCase())
    .sort((a, b) => {
      const ad = a.use_by_date ?? a.best_before_date ?? '9999-12-31'
      const bd = b.use_by_date ?? b.best_before_date ?? '9999-12-31'
      return ad.localeCompare(bd)
    })

  let available = 0
  let remaining = required
  const allocations: NeedResult['allocations'] = []

  for (const item of matching) {
    const converted = convertQuantity(item.quantity, item.unit, ingredient.unit)
    if (converted === null || remaining <= 0) {
      continue
    }

    const useInIngredientUnit = Math.min(converted, remaining)
    remaining -= useInIngredientUnit
    available += useInIngredientUnit

    const useInPantryUnit = convertQuantity(useInIngredientUnit, ingredient.unit, item.unit) ?? 0
    allocations.push({ pantry_item_id: item.id, quantity: useInPantryUnit, unit: item.unit })
  }

  return {
    ingredient,
    required,
    available,
    missing: clampPositive(required - available),
    allocations,
  }
}

export const CookModePage = () => {
  const { recipeId } = useParams()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([])
  const [steps, setSteps] = useState<RecipeStep[]>([])
  const [pantry, setPantry] = useState<PantryItem[]>([])
  const [targetServings, setTargetServings] = useState(1)

  useEffect(() => {
    if (!recipeId) {
      return
    }

    Promise.all([recipeApi.getById(recipeId), pantryApi.list()]).then(([recipeData, pantryData]) => {
      setRecipe(recipeData.recipe)
      setIngredients(recipeData.ingredients)
      setSteps(recipeData.steps)
      setPantry(pantryData)
      setTargetServings(recipeData.recipe.servings)
    })
  }, [recipeId])

  const factor = recipe ? targetServings / recipe.servings : 1

  const needs = useMemo(
    () => ingredients.map((ingredient) => computeNeed(ingredient, pantry, factor)),
    [factor, ingredients, pantry],
  )

  if (!recipe) {
    return <div className="page"><p>Lade Kochmodus …</p></div>
  }

  const missingItems = needs
    .filter((need) => need.missing > 0)
    .map((need) => ({
      name: need.ingredient.name,
      quantity: Number(need.missing.toFixed(2)),
      unit: need.ingredient.unit,
      category: 'Rezept',
      note: `Fehlt für Rezept ${recipe.title}`,
      is_checked: false,
      is_purchased: false,
    }))

  const consumption = needs.flatMap((need) => need.allocations)

  return (
    <div className="page">
      <header className="page-header">
        <h1>Jetzt kochen: {recipe.title}</h1>
        <p>Portionen flexibel anpassen und Bestand konsistent abbuchen.</p>
      </header>

      <section className="card">
        <label>
          Gewünschte Portionen
          <input
            type="number"
            min="1"
            value={targetServings}
            onChange={(event) => setTargetServings(Number(event.target.value))}
          />
        </label>
      </section>

      <section className="card">
        <h2>Zutatenstatus</h2>
        <ul>
          {needs.map((need) => (
            <li key={need.ingredient.id}>
              {need.ingredient.name}: benötigt {need.required.toFixed(2)} {need.ingredient.unit}, vorhanden{' '}
              {need.available.toFixed(2)} {need.ingredient.unit}, fehlend {need.missing.toFixed(2)}{' '}
              {need.ingredient.unit}
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

      <div className="row">
        <button
          className="button ghost"
          type="button"
          onClick={async () => {
            for (const item of missingItems) {
              await shoppingApi.upsert(item)
            }
            navigate('/shopping')
          }}
        >
          Fehlende Zutaten einkaufen
        </button>

        <button
          className="button"
          type="button"
          onClick={async () => {
            await pantryApi.consume(
              recipe.id,
              targetServings,
              consumption,
              missingItems.map((item) => ({
                name: item.name,
                quantity: item.quantity,
                unit: item.unit,
              })),
            )
            navigate('/pantry')
          }}
        >
          Kochen abschließen
        </button>
      </div>
    </div>
  )
}
