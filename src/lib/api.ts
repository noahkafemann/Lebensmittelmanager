import type {
  Household,
  HouseholdMember,
  PantryItem,
  Recipe,
  RecipeIngredient,
  RecipeStep,
  ShoppingItem,
  Unit,
} from '../types/domain'
import { supabase } from './supabase'

export const authApi = {
  signIn: (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password }),

  signUp: (email: string, password: string) =>
    supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + import.meta.env.BASE_URL,
      },
    }),

  resetPassword: (email: string) =>
    supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + import.meta.env.BASE_URL + 'reset-password',
    }),

  signOut: () => supabase.auth.signOut(),
}

const requireData = <T>(data: T | null, error: { message: string } | null): T => {
  if (error) {
    throw new Error(error.message)
  }

  if (data === null) {
    throw new Error('Keine Daten verfügbar')
  }

  return data
}

export const householdApi = {
  getCurrentHousehold: async (): Promise<Household | null> => {
    const { data, error } = await supabase
      .from('household_members')
      .select('household:households(*)')
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(error.message)
    }

    return data?.household ?? null
  },

  createHousehold: async (name: string): Promise<string> => {
    const { data, error } = await supabase.rpc('create_household_with_admin', {
      p_household_name: name,
    })

    if (error) {
      throw new Error(error.message)
    }

    return data
  },

  listMembers: async (): Promise<HouseholdMember[]> => {
    const { data, error } = await supabase
      .from('household_members')
      .select('*')
      .order('created_at', { ascending: true })

    return requireData(data, error)
  },

  createInvite: async (email: string, role: 'admin' | 'member') => {
    const { data, error } = await supabase.rpc('create_household_invite', {
      p_email: email,
      p_role: role,
    })

    if (error) {
      throw new Error(error.message)
    }

    return data as { token: string; expires_at: string }
  },

  acceptInvite: async (token: string) => {
    const { error } = await supabase.rpc('accept_household_invite', {
      p_token: token,
    })

    if (error) {
      throw new Error(error.message)
    }
  },
}

export const pantryApi = {
  list: async (): Promise<PantryItem[]> => {
    const { data, error } = await supabase
      .from('pantry_items')
      .select('*')
      .is('archived_at', null)
      .order('created_at', { ascending: false })

    return requireData(data, error)
  },

  upsert: async (item: Omit<PantryItem, 'id' | 'created_at' | 'household_id' | 'archived_at'> & { id?: string }) => {
    if (item.id) {
      const { error } = await supabase.from('pantry_items').update(item).eq('id', item.id)
      if (error) {
        throw new Error(error.message)
      }
      return
    }

    const { error } = await supabase.from('pantry_items').insert(item)
    if (error) {
      throw new Error(error.message)
    }
  },

  archive: async (id: string) => {
    const { error } = await supabase
      .from('pantry_items')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      throw new Error(error.message)
    }
  },

  consume: async (
    recipeId: string,
    targetServings: number,
    consumption: Array<{ pantry_item_id: string; quantity: number; unit: Unit }>,
    missing: Array<{ name: string; quantity: number; unit: Unit }>,
  ) => {
    const { error } = await supabase.rpc('complete_cooking', {
      p_recipe_id: recipeId,
      p_target_servings: targetServings,
      p_consumption: consumption,
      p_missing_items: missing,
    })

    if (error) {
      throw new Error(error.message)
    }
  },
}

export const recipeApi = {
  list: async (): Promise<(Recipe & { recipe_ingredients: RecipeIngredient[] })[]> => {
    const { data, error } = await supabase
      .from('recipes')
      .select('*, recipe_ingredients(*)')
      .order('updated_at', { ascending: false })

    return requireData(data, error)
  },

  getById: async (
    id: string,
  ): Promise<{ recipe: Recipe; ingredients: RecipeIngredient[]; steps: RecipeStep[] }> => {
    const [recipeRes, ingredientRes, stepRes] = await Promise.all([
      supabase.from('recipes').select('*').eq('id', id).single(),
      supabase
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', id)
        .order('name', { ascending: true }),
      supabase
        .from('recipe_steps')
        .select('*')
        .eq('recipe_id', id)
        .order('step_order', { ascending: true }),
    ])

    return {
      recipe: requireData(recipeRes.data, recipeRes.error),
      ingredients: requireData(ingredientRes.data, ingredientRes.error),
      steps: requireData(stepRes.data, stepRes.error),
    }
  },

  remove: async (id: string) => {
    const { error } = await supabase.from('recipes').delete().eq('id', id)
    if (error) {
      throw new Error(error.message)
    }
  },

  upsert: async (input: {
    id?: string
    title: string
    description: string
    servings: number
    prep_minutes: number
    category: string
    image_url: string | null
    tags: string[]
    is_favorite: boolean
    ingredients: Omit<RecipeIngredient, 'id' | 'recipe_id'>[]
    steps: Omit<RecipeStep, 'id' | 'recipe_id'>[]
  }) => {
    let recipeId = input.id

    if (recipeId) {
      const { error } = await supabase
        .from('recipes')
        .update({
          title: input.title,
          description: input.description,
          servings: input.servings,
          prep_minutes: input.prep_minutes,
          category: input.category,
          image_url: input.image_url,
          tags: input.tags,
          is_favorite: input.is_favorite,
        })
        .eq('id', recipeId)

      if (error) {
        throw new Error(error.message)
      }

      await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId)
      await supabase.from('recipe_steps').delete().eq('recipe_id', recipeId)
    } else {
      const { data, error } = await supabase
        .from('recipes')
        .insert({
          title: input.title,
          description: input.description,
          servings: input.servings,
          prep_minutes: input.prep_minutes,
          category: input.category,
          image_url: input.image_url,
          tags: input.tags,
          is_favorite: input.is_favorite,
        })
        .select('id')
        .single()

      if (error) {
        throw new Error(error.message)
      }
      recipeId = data.id
    }

    const ingredients = input.ingredients.map((ingredient) => ({
      ...ingredient,
      recipe_id: recipeId,
    }))

    const steps = input.steps.map((step, index) => ({
      ...step,
      recipe_id: recipeId,
      step_order: index + 1,
    }))

    if (ingredients.length > 0) {
      const { error } = await supabase.from('recipe_ingredients').insert(ingredients)
      if (error) {
        throw new Error(error.message)
      }
    }

    if (steps.length > 0) {
      const { error } = await supabase.from('recipe_steps').insert(steps)
      if (error) {
        throw new Error(error.message)
      }
    }
  },
}

export const shoppingApi = {
  list: async (): Promise<ShoppingItem[]> => {
    const { data, error } = await supabase
      .from('shopping_items')
      .select('*')
      .order('is_checked', { ascending: true })
      .order('updated_at', { ascending: false })

    return requireData(data, error)
  },

  upsert: async (
    input: Omit<ShoppingItem, 'id' | 'household_id' | 'created_at' | 'updated_at'> & {
      id?: string
    },
  ) => {
    if (input.id) {
      const { error } = await supabase.from('shopping_items').update(input).eq('id', input.id)
      if (error) {
        throw new Error(error.message)
      }
      return
    }

    const { error } = await supabase.from('shopping_items').insert(input)
    if (error) {
      throw new Error(error.message)
    }
  },

  remove: async (id: string) => {
    const { error } = await supabase.from('shopping_items').delete().eq('id', id)
    if (error) {
      throw new Error(error.message)
    }
  },

  movePurchasedToPantry: async (payload: {
    shopping_item_id: string
    quantity: number
    unit: Unit
    best_before_date?: string
    purchase_date?: string
  }) => {
    const { error } = await supabase.rpc('purchase_item_to_pantry', {
      p_shopping_item_id: payload.shopping_item_id,
      p_quantity: payload.quantity,
      p_unit: payload.unit,
      p_best_before_date: payload.best_before_date ?? null,
      p_purchase_date: payload.purchase_date ?? null,
    })

    if (error) {
      throw new Error(error.message)
    }
  },
}
