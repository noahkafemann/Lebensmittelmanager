import { describe, expect, it } from 'vitest'
import { calculateRecipeMatch } from '../recipeMatching'

const recipe = {
  id: 'r1',
  household_id: 'h1',
  title: 'Porridge',
  description: '',
  servings: 2,
  prep_minutes: 10,
  category: 'Frühstück',
  image_url: null,
  tags: [],
  is_favorite: false,
  created_at: '',
  updated_at: '',
}

const ingredients = [
  { id: 'i1', recipe_id: 'r1', name: 'Haferflocken', quantity: 100, unit: 'g' as const, optional: false },
  { id: 'i2', recipe_id: 'r1', name: 'Milch', quantity: 0.5, unit: 'l' as const, optional: false },
]

const pantry = [
  {
    id: 'p1',
    household_id: 'h1',
    name: 'Haferflocken',
    category: 'Getreide',
    quantity: 0.15,
    unit: 'kg' as const,
    storage_location: 'Schrank',
    best_before_date: null,
    use_by_date: null,
    purchase_date: null,
    note: null,
    created_at: '',
    archived_at: null,
  },
]

describe('recipe matching', () => {
  it('detects missing ingredients and conversion', () => {
    const result = calculateRecipeMatch(recipe, ingredients, pantry)

    expect(result.availableIngredients).toContain('Haferflocken')
    expect(result.missingIngredients).toHaveLength(1)
    expect(result.missingIngredients[0].ingredient.name).toBe('Milch')
  })
})
