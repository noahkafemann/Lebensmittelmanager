import type { PantryItem, Recipe, RecipeIngredient, RecipeMatch } from '../types/domain'
import { convertQuantity, isCompatibleUnit } from './units'
import { getExpiryBucket } from './expiry'

const pantryQuantityByIngredient = (
  ingredient: RecipeIngredient,
  pantryItems: PantryItem[],
): number => {
  return pantryItems
    .filter((item) => item.name.toLowerCase() === ingredient.name.toLowerCase())
    .reduce((sum, item) => {
      const converted = convertQuantity(item.quantity, item.unit, ingredient.unit)
      return converted === null ? sum : sum + converted
    }, 0)
}

export const calculateRecipeMatch = (
  recipe: Recipe,
  ingredients: RecipeIngredient[],
  pantryItems: PantryItem[],
): RecipeMatch => {
  const expiringIngredients: string[] = []
  const availableIngredients: string[] = []
  const partialIngredients: string[] = []
  const missingIngredients: RecipeMatch['missingIngredients'] = []

  let completeCount = 0

  for (const ingredient of ingredients) {
    const matchingItems = pantryItems.filter(
      (item) => item.name.toLowerCase() === ingredient.name.toLowerCase(),
    )

    const hasIncompatible = matchingItems.some(
      (item) => !isCompatibleUnit(item.unit, ingredient.unit),
    )

    if (hasIncompatible) {
      missingIngredients.push({
        ingredient,
        missingQuantity: ingredient.quantity,
      })
      continue
    }

    const availableQuantity = pantryQuantityByIngredient(ingredient, pantryItems)

    if (availableQuantity >= ingredient.quantity) {
      completeCount += 1
      availableIngredients.push(ingredient.name)

      const usesExpiring = matchingItems.some((item) => {
        const bucket = getExpiryBucket(item)
        return bucket === 'expired' || bucket === 'today' || bucket === 'next3'
      })

      if (usesExpiring) {
        expiringIngredients.push(ingredient.name)
      }
    } else if (availableQuantity > 0) {
      partialIngredients.push(ingredient.name)
      missingIngredients.push({
        ingredient,
        missingQuantity: Math.max(ingredient.quantity - availableQuantity, 0),
      })
    } else if (!ingredient.optional) {
      missingIngredients.push({
        ingredient,
        missingQuantity: ingredient.quantity,
      })
    }
  }

  const denominator = ingredients.filter((ingredient) => !ingredient.optional).length || 1

  return {
    recipe,
    coverageRatio: completeCount / denominator,
    expiringIngredients,
    availableIngredients,
    missingIngredients,
    partialIngredients,
  }
}
