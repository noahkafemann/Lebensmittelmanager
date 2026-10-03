import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { recipeApi } from '../lib/api'
import type { Unit } from '../types/domain'

const unitOptions: Unit[] = ['g', 'kg', 'ml', 'l', 'stück', 'tl', 'el']

export const RecipeFormPage = () => {
  const { recipeId } = useParams()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [servings, setServings] = useState(2)
  const [prepMinutes, setPrepMinutes] = useState(20)
  const [category, setCategory] = useState('Abendessen')
  const [tags, setTags] = useState('')
  const [isFavorite, setIsFavorite] = useState(false)
  const [ingredients, setIngredients] = useState([
    { name: '', quantity: 1, unit: 'stück' as Unit, optional: false },
  ])
  const [steps, setSteps] = useState([{ instruction: '' }])

  useEffect(() => {
    if (!recipeId) {
      return
    }

    recipeApi.getById(recipeId).then(({ recipe, ingredients, steps }) => {
      setTitle(recipe.title)
      setDescription(recipe.description)
      setServings(recipe.servings)
      setPrepMinutes(recipe.prep_minutes)
      setCategory(recipe.category)
      setTags(recipe.tags.join(', '))
      setIsFavorite(recipe.is_favorite)
      setIngredients(
        ingredients.map((ingredient) => ({
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          optional: ingredient.optional,
        })),
      )
      setSteps(steps.map((step) => ({ instruction: step.instruction })))
    })
  }, [recipeId])

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()

    await recipeApi.upsert({
      id: recipeId,
      title,
      description,
      servings,
      prep_minutes: prepMinutes,
      category,
      image_url: null,
      tags: tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      is_favorite: isFavorite,
      ingredients: ingredients.filter((ingredient) => ingredient.name.trim().length > 0),
      steps: steps.filter((step) => step.instruction.trim().length > 0),
    })

    navigate('/recipes')
  }

  return (
    <div className="page">
      <form className="card form" onSubmit={onSubmit}>
        <h1>{recipeId ? 'Rezept bearbeiten' : 'Rezept erstellen'}</h1>

        <label>
          Titel
          <input value={title} onChange={(event) => setTitle(event.target.value)} required />
        </label>
        <label>
          Beschreibung
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <div className="split">
          <label>
            Portionen
            <input
              type="number"
              min="1"
              value={servings}
              onChange={(event) => setServings(Number(event.target.value))}
            />
          </label>
          <label>
            Zeit (Min)
            <input
              type="number"
              min="1"
              value={prepMinutes}
              onChange={(event) => setPrepMinutes(Number(event.target.value))}
            />
          </label>
        </div>

        <label>
          Kategorie
          <input value={category} onChange={(event) => setCategory(event.target.value)} />
        </label>

        <label>
          Tags (kommagetrennt)
          <input value={tags} onChange={(event) => setTags(event.target.value)} />
        </label>

        <label>
          <input type="checkbox" checked={isFavorite} onChange={(event) => setIsFavorite(event.target.checked)} /> Favorit
        </label>

        <section>
          <h2>Zutaten</h2>
          {ingredients.map((ingredient, index) => (
            <div className="split" key={`ingredient-${index}`}>
              <input
                placeholder="Name"
                value={ingredient.name}
                onChange={(event) => {
                  const next = [...ingredients]
                  next[index].name = event.target.value
                  setIngredients(next)
                }}
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={ingredient.quantity}
                onChange={(event) => {
                  const next = [...ingredients]
                  next[index].quantity = Number(event.target.value)
                  setIngredients(next)
                }}
              />
              <select
                value={ingredient.unit}
                onChange={(event) => {
                  const next = [...ingredients]
                  next[index].unit = event.target.value as Unit
                  setIngredients(next)
                }}
              >
                {unitOptions.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <button
            type="button"
            className="button ghost"
            onClick={() =>
              setIngredients((current) => [...current, { name: '', quantity: 1, unit: 'stück', optional: false }])
            }
          >
            Zutat hinzufügen
          </button>
        </section>

        <section>
          <h2>Schritte</h2>
          {steps.map((step, index) => (
            <textarea
              key={`step-${index}`}
              placeholder={`Schritt ${index + 1}`}
              value={step.instruction}
              onChange={(event) => {
                const next = [...steps]
                next[index].instruction = event.target.value
                setSteps(next)
              }}
            />
          ))}
          <button
            type="button"
            className="button ghost"
            onClick={() => setSteps((current) => [...current, { instruction: '' }])}
          >
            Schritt hinzufügen
          </button>
        </section>

        <button type="submit" className="button">
          Speichern
        </button>
      </form>
    </div>
  )
}
