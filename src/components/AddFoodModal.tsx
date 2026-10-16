import { useMemo, useState } from 'react'
import { Heart, Search, Star, Utensils } from 'lucide-react'
import { FOODS, getFood } from '../lib/foods'
import { dietAllows, macrosFor } from '../lib/nutrition'
import { toggleFavorite, useApp } from '../lib/store'
import type { DietPref, Food, Macros, MealSlot } from '../lib/types'
import { DIET_LABELS, MEAL_LABELS } from '../lib/types'
import { emojiFor } from './present'
import { Badge, Modal, Stepper, useToast } from './ui'

type SortKey = 'relevance' | 'protein' | 'kcal'

const FILTERS: { key: DietPref | 'all'; label: string }[] = [
  { key: 'all', label: 'Everything' },
  { key: 'vegan', label: 'Vegan' },
  { key: 'vegetarian', label: 'Vegetarian' },
  { key: 'non-veg', label: 'Non-veg' },
]

const EMPTY: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }

/** Search the food table, pick a portion, stage a few items, then log them into one meal. */
export function AddFoodModal({
  date,
  slot,
  diet,
  onClose,
  onAdd,
}: {
  date: string
  slot: MealSlot
  diet: DietPref
  onClose: () => void
  onAdd: (items: { foodId: string; grams: number }[]) => void
}) {
  const app = useApp()
  const toast = useToast()

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<DietPref | 'all'>('all')
  const [sort, setSort] = useState<SortKey>('relevance')
  const [selected, setSelected] = useState<Food | null>(null)
  const [grams, setGrams] = useState(100)
  const [basket, setBasket] = useState<{ foodId: string; grams: number }[]>([])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = FOODS.filter((f) => {
      if (filter !== 'all' && f.diet !== filter) return false
      if (!q) return true
      return f.name.toLowerCase().includes(q) || (f.tags ?? []).some((t) => t.includes(q))
    })
    if (sort === 'protein') list = [...list].sort((a, b) => b.per100.protein - a.per100.protein)
    else if (sort === 'kcal') list = [...list].sort((a, b) => a.per100.kcal - b.per100.kcal)
    else if (q)
      list = [...list].sort((a, b) => {
        const ap = a.name.toLowerCase().startsWith(q) ? 0 : 1
        const bp = b.name.toLowerCase().startsWith(q) ? 0 : 1
        return ap - bp || b.per100.protein - a.per100.protein
      })
    return list.slice(0, 60)
  }, [query, filter, sort])

  const preview: Macros | null = selected ? macrosFor(selected, grams) : null

  const basketItems = basket.flatMap((b) => {
    const food = getFood(b.foodId)
    return food ? [{ food, grams: b.grams }] : []
  })

  const basketTotals = basketItems.reduce<Macros>((acc, { food, grams: g }) => {
    const m = macrosFor(food, g)
    return {
      kcal: acc.kcal + m.kcal,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
      fiber: acc.fiber + m.fiber,
    }
  }, EMPTY)

  const stage = (food: Food, portion: number) => {
    setBasket((prev) => {
      const index = prev.findIndex((p) => p.foodId === food.id)
      if (index >= 0) {
        const next = [...prev]
        next[index] = { foodId: food.id, grams: next[index].grams + portion }
        return next
      }
      return [...prev, { foodId: food.id, grams: portion }]
    })
    toast(`${food.name} staged for ${MEAL_LABELS[slot].toLowerCase()}`)
    setSelected(null)
    setQuery('')
  }

  return (
    <Modal
      title={`Add to ${MEAL_LABELS[slot]}`}
      onClose={onClose}
      footer={
        <>
          <span className="tiny faint" style={{ marginRight: 'auto' }}>
            {basket.length > 0
              ? `${basket.length} staged · ${Math.round(basketTotals.kcal)} kcal · ${Math.round(basketTotals.protein)} g protein`
              : `${results.length} foods match`}
          </span>
          <button className="btn btn-ghost" onClick={onClose} type="button">
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              onAdd(basket)
              onClose()
            }}
            disabled={basket.length === 0}
            type="button"
          >
            <Utensils size={15} /> Log to {MEAL_LABELS[slot]}
          </button>
        </>
      }
    >
      <div className="input-wrap">
        <Search size={16} />
        <input
          className="input"
          placeholder="Search chicken, oats, paneer, dal…"
          value={query}
          autoFocus
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="between wrap" style={{ gap: 10 }}>
        <div className="chips">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`chip${filter === f.key ? ' is-active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="chips">
          <button type="button" className={`chip${sort === 'relevance' ? ' is-active' : ''}`} onClick={() => setSort('relevance')}>
            Best match
          </button>
          <button type="button" className={`chip${sort === 'protein' ? ' is-active' : ''}`} onClick={() => setSort('protein')}>
            High protein
          </button>
          <button type="button" className={`chip${sort === 'kcal' ? ' is-active' : ''}`} onClick={() => setSort('kcal')}>
            Low calorie
          </button>
        </div>
      </div>

      {selected && preview ? (
        <div
          className="card card-tight"
          style={{ background: 'rgba(74,222,128,0.06)', borderColor: 'rgba(74,222,128,0.3)' }}
        >
          <div className="between wrap" style={{ gap: 12 }}>
            <div>
              <div className="row-title">{selected.name}</div>
              <div className="row-sub tabular">
                {Math.round(preview.kcal)} kcal · P {preview.protein.toFixed(1)} · C {preview.carbs.toFixed(1)} · F{' '}
                {preview.fat.toFixed(1)} g
              </div>
            </div>
            <div className="inline wrap">
              <Stepper value={grams} min={1} max={1200} step={5} suffix="g" onChange={setGrams} />
              <button className="btn btn-primary btn-sm" type="button" onClick={() => stage(selected, grams)}>
                Add {grams} g
              </button>
            </div>
          </div>
          <div className="chips" style={{ marginTop: 12 }}>
            {[0.5, 1, 1.5, 2].map((mult) => (
              <button
                key={mult}
                type="button"
                className={`chip${grams === Math.round(selected.serving.grams * mult) ? ' is-active' : ''}`}
                onClick={() => setGrams(Math.round(selected.serving.grams * mult))}
              >
                {mult}× · {selected.serving.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {basketItems.length > 0 ? (
        <div className="stack-sm">
          <div className="label">Staged</div>
          <div className="rows">
            {basketItems.map(({ food, grams: g }) => (
              <div className="row" key={food.id}>
                <div className="thumb" aria-hidden>
                  {emojiFor(food)}
                </div>
                <div className="row-grow">
                  <div className="row-title">{food.name}</div>
                  <div className="row-sub tabular">{g} g</div>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  type="button"
                  onClick={() => setBasket((prev) => prev.filter((p) => p.foodId !== food.id))}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="food-list">
        {results.length === 0 ? (
          <div className="empty">Nothing matched “{query}”. Try a simpler word.</div>
        ) : (
          results.map((food) => {
            const fits = dietAllows(diet, food.diet)
            const isFav = app.favorites.includes(food.id)
            return (
              <div
                key={food.id}
                className={`food-item${selected?.id === food.id ? ' is-active' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setSelected(food)
                  setGrams(food.serving.grams)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelected(food)
                    setGrams(food.serving.grams)
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <div className="thumb" style={{ fontSize: 17 }} aria-hidden>
                  {emojiFor(food)}
                </div>
                <div className="row-grow">
                  <div className="row-title">
                    {food.name}
                    {isFav ? (
                      <Star size={12} style={{ color: 'var(--carbs)', marginLeft: 6, verticalAlign: -1 }} fill="currentColor" />
                    ) : null}
                  </div>
                  <div className="row-sub tabular">
                    {food.serving.label} · ~{Math.round((food.per100.kcal * food.serving.grams) / 100)} kcal · P{' '}
                    {Math.round((food.per100.protein * food.serving.grams) / 100)} g
                  </div>
                </div>
                <div className="row-right">
                  {!fits ? <Badge tone="warn">{DIET_LABELS[food.diet]}</Badge> : null}
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    title={isFav ? 'Remove favourite' : 'Add to favourites'}
                    aria-label={isFav ? 'Remove favourite' : 'Add to favourites'}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFavorite(food.id)
                    }}
                  >
                    <Heart size={15} fill={isFav ? 'currentColor' : 'none'} color={isFav ? 'var(--danger)' : undefined} />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      <p className="tiny faint">
        {date ? `Logging to ${MEAL_LABELS[slot]} on ${date}. ` : ''}Nutrient values per 100 g, as eaten.
      </p>
    </Modal>
  )
}
