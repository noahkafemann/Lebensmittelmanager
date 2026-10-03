export type HouseholdRole = 'admin' | 'member'

export type Unit =
  | 'g'
  | 'kg'
  | 'ml'
  | 'l'
  | 'stück'
  | 'tl'
  | 'el'

export interface Household {
  id: string
  name: string
  created_at: string
}

export interface HouseholdMember {
  id: string
  household_id: string
  user_id: string
  role: HouseholdRole
  email: string
  created_at: string
}

export interface PantryItem {
  id: string
  household_id: string
  name: string
  category: string
  quantity: number
  unit: Unit
  storage_location: string
  best_before_date: string | null
  use_by_date: string | null
  purchase_date: string | null
  note: string | null
  created_at: string
  archived_at: string | null
}

export interface Recipe {
  id: string
  household_id: string
  title: string
  description: string
  servings: number
  prep_minutes: number
  category: string
  image_url: string | null
  tags: string[]
  is_favorite: boolean
  created_at: string
  updated_at: string
}

export interface RecipeIngredient {
  id: string
  recipe_id: string
  name: string
  quantity: number
  unit: Unit
  optional: boolean
}

export interface RecipeStep {
  id: string
  recipe_id: string
  step_order: number
  instruction: string
}

export interface ShoppingItem {
  id: string
  household_id: string
  name: string
  quantity: number
  unit: Unit
  category: string
  note: string | null
  is_checked: boolean
  is_purchased: boolean
  created_at: string
  updated_at: string
}

export interface Invite {
  id: string
  household_id: string
  email: string
  role: HouseholdRole
  token: string
  expires_at: string
  accepted_at: string | null
}

export interface RecipeMatch {
  recipe: Recipe
  coverageRatio: number
  expiringIngredients: string[]
  availableIngredients: string[]
  missingIngredients: Array<{
    ingredient: RecipeIngredient
    missingQuantity: number
  }>
  partialIngredients: string[]
}
