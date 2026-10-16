import { useEffect, useMemo, useState } from 'react'
import {
  Beef,
  CalendarDays,
  ClipboardList,
  Copy,
  Egg,
  Leaf,
  Printer,
  RefreshCw,
  ShoppingBasket,
  Sparkles,
  Target as TargetIcon,
  Utensils,
} from 'lucide-react'
import { addDays, relativeDayLabel, todayISO, weekdayLetter } from '../lib/dates'
import { getFood } from '../lib/foods'
import { computeTargets, round1 } from '../lib/nutrition'
import { generateDayPlan, portionLabel, ROLE_LABELS, shoppingList, swapMeal } from '../lib/planner'
import { addManyLogEntries, logPlan, setPlan, useApp } from '../lib/store'
import { DIET_LABELS, MEAL_LABELS } from '../lib/types'
import type { DayPlan, DietPref, MealSlot } from '../lib/types'
import { emojiFor, MealIcon } from './present'
import { Badge, Card, CardHead, Segmented, useToast } from './ui'

const DIETS: { value: DietPref; label: string; icon: React.ReactNode }[] = [
  { value: 'vegetarian', label: 'Vegetarian', icon: <Egg size={14} /> },
  { value: 'non-veg', label: 'Non-vegetarian', icon: <Beef size={14} /> },
  { value: 'vegan', label: 'Vegan', icon: <Leaf size={14} /> },
]

export function MealPlanView() {
  const app = useApp()
  const toast = useToast()
  const profile = app.profile!

  const [diet, setDiet] = useState<DietPref>(profile.diet)
  const [date, setDate] = useState(todayISO())
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  const targets = useMemo(() => computeTargets(profile), [profile])
  const existing = app.plans[date]

  // Build a plan for the selected day whenever one is missing or the diet changed.
  useEffect(() => {
    if (existing && existing.diet === diet) return
    const request = {
      targets,
      diet,
      mealsPerDay: profile.mealsPerDay,
      date,
      favorites: app.favorites,
    }
    setPlan(generateDayPlan(request))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, diet, targets, profile.mealsPerDay, existing?.diet, existing?.seed])

  const plan: DayPlan | undefined = app.plans[date]
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(todayISO(), i)), [])

  const fit = useMemo(() => {
    if (!plan) return null
    const pairs: [number, number][] = [
      [plan.totals.kcal, targets.kcal],
      [plan.totals.protein, targets.protein],
      [plan.totals.carbs, targets.carbs],
      [plan.totals.fat, targets.fat],
    ]
    const error =
      pairs.reduce((sum, [actual, target]) => sum + Math.abs(actual - target) / Math.max(target, 1), 0) / pairs.length
    return { score: Math.max(0, Math.round((1 - error) * 100)), error }
  }, [plan, targets])

  const regenerate = () => {
    setPlan(
      generateDayPlan({
        targets,
        diet,
        mealsPerDay: profile.mealsPerDay,
        date,
        seed: Math.floor(Math.random() * 1_000_000),
        favorites: app.favorites,
      }),
    )
    toast('New meal plan generated')
  }

  const shuffleMeal = (slot: MealSlot) => {
    if (!plan) return
    setPlan(
      swapMeal(plan, slot, {
        targets,
        diet,
        mealsPerDay: profile.mealsPerDay,
        seed: Math.floor(Math.random() * 1_000_000),
        favorites: app.favorites,
      }),
    )
  }

  const shopping = useMemo(() => (plan ? shoppingList(plan) : []), [plan])

  const ratio = (actual: number, target: number) => (target > 0 ? actual / target : 0)

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Meal plans</h1>
          <div className="page-sub">
            Built from your {targets.kcal.toLocaleString()} kcal / {targets.protein} g protein target — pick a diet
            category and the engine re-solves every portion.
          </div>
        </div>
        <div className="inline wrap no-print">
          <Segmented<DietPref>
            options={DIETS.map((d) => ({ value: d.value, label: d.label, icon: d.icon }))}
            value={diet}
            onChange={setDiet}
          />
        </div>
      </div>

      <Card tight className="no-print">
        <div className="between wrap" style={{ gap: 14 }}>
          <div className="inline" style={{ gap: 10 }}>
            <CalendarDays size={17} className="faint" />
            <div>
              <div style={{ fontWeight: 640, fontSize: 14 }}>{relativeDayLabel(date)}</div>
              <div className="tiny faint">
                {DIET_LABELS[diet]} plan · {profile.mealsPerDay} meals
              </div>
            </div>
          </div>
          <div className="inline wrap">
            <button className="btn" onClick={regenerate} type="button">
              <RefreshCw size={15} /> Regenerate day
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => {
                if (plan) {
                  logPlan(plan)
                  toast('Whole day logged to your diary')
                }
              }}
              disabled={!plan}
            >
              <Copy size={15} /> Log this day
            </button>
            <button className="btn" type="button" onClick={() => window.print()}>
              <Printer size={15} /> Print
            </button>
          </div>
        </div>
        <div className="day-strip" style={{ marginTop: 14 }}>
          {days.map((d) => (
            <button
              key={d}
              type="button"
              className={`day-pill${d === date ? ' is-active' : ''}`}
              onClick={() => setDate(d)}
            >
              <span className="dp-dow">{weekdayLetter(d)}</span>
              <span className="dp-num">{Number(d.slice(-2))}</span>
            </button>
          ))}
        </div>
      </Card>

      {plan ? (
        <>
          <div className="grid grid-4">
            <TargetStat label="Energy" value={plan.totals.kcal} target={targets.kcal} unit="kcal" color="var(--kcal)" />
            <TargetStat label="Protein" value={plan.totals.protein} target={targets.protein} unit="g" color="var(--protein)" />
            <TargetStat label="Carbs" value={plan.totals.carbs} target={targets.carbs} unit="g" color="var(--carbs)" />
            <TargetStat label="Fat" value={plan.totals.fat} target={targets.fat} unit="g" color="var(--fat)" />
          </div>

          <div className="between wrap">
            <div className="inline wrap" style={{ gap: 8 }}>
              <Badge tone={fit && fit.score >= 90 ? 'ok' : fit && fit.score >= 78 ? 'warn' : 'danger'} icon={<TargetIcon size={12} />}>
                {fit ? `${fit.score}% macro fit` : ''}
              </Badge>
              <span className="tiny faint">
                {plan.totals.kcal < targets.kcal ? 'under' : 'over'} your energy target by{' '}
                {Math.abs(Math.round(plan.totals.kcal - targets.kcal))} kcal · fibre {Math.round(plan.totals.fiber)} g
              </span>
            </div>
            <span className="tiny faint inline">
              <Sparkles size={13} /> Portions solved to your macros, rounded to 5 g
            </span>
          </div>

          <div className="grid grid-2">
            {plan.meals.map((meal) => (
              <div className="meal-block" key={meal.slot}>
                <div className="meal-head">
                  <div className="meal-head-left">
                    <div className="meal-icon">
                      <MealIcon slot={meal.slot} />
                    </div>
                    <div>
                      <div className="meal-name">{MEAL_LABELS[meal.slot]}</div>
                      <div className="meal-meta tabular">
                        {Math.round(meal.totals.kcal)} kcal · P {round1(meal.totals.protein)} · C{' '}
                        {round1(meal.totals.carbs)} · F {round1(meal.totals.fat)}
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm no-print" onClick={() => shuffleMeal(meal.slot)} type="button">
                    <RefreshCw size={13} /> Shuffle
                  </button>
                </div>
                <div className="meal-body">
                  {meal.items.length === 0 ? (
                    <div className="empty">No suitable foods for this slot.</div>
                  ) : (
                    <div className="rows">
                      {meal.items.map((item) => {
                        const food = getFood(item.foodId)
                        if (!food) return null
                        return (
                          <div className="row" key={item.foodId}>
                            <div className="thumb" aria-hidden>
                              {emojiFor(food)}
                            </div>
                            <div className="row-grow">
                              <div className="row-title">{food.name}</div>
                              <div className="row-sub">
                                <span className="tabular">{item.grams} g</span> · {portionLabel(food, item.grams)}
                              </div>
                            </div>
                            <div className="row-right">
                              <div className="macro-inline">
                                <span>P <b>{round1((food.per100.protein * item.grams) / 100)}</b></span>
                                <span>C <b>{round1((food.per100.carbs * item.grams) / 100)}</b></span>
                                <span>F <b>{round1((food.per100.fat * item.grams) / 100)}</b></span>
                              </div>
                              <span className="kcal-tag">{Math.round((food.per100.kcal * item.grams) / 100)} kcal</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div className="meal-foot">
                  <span className="tiny faint">
                    {Math.round((meal.totals.kcal / targets.kcal) * 100)}% of daily energy ·{' '}
                    {Math.round(ratio(meal.totals.protein, targets.protein) * 100)}% of protein
                  </span>
                  <button
                    className="btn btn-sm no-print"
                    type="button"
                    onClick={() => {
                      addManyLogEntries(
                        meal.items.map((item) => ({ date, slot: meal.slot, foodId: item.foodId, grams: item.grams })),
                      )
                      toast(`${MEAL_LABELS[meal.slot]} logged`)
                    }}
                  >
                    <Utensils size={13} /> Log meal
                  </button>
                </div>
              </div>
            ))}
          </div>

          <Card>
            <CardHead
              title="Shopping list"
              icon={<ShoppingBasket size={15} />}
              hint={`Everything needed for ${relativeDayLabel(date).toLowerCase()}, grouped by aisle`}
              right={
                <span className="tiny faint">
                  {shopping.reduce((sum, g) => sum + g.lines.length, 0)} items
                </span>
              }
            />
            <div className="shopping">
              {shopping.map((group) => (
                <div className="shop-group" key={group.role}>
                  <h4>{ROLE_LABELS[group.role]}</h4>
                  {group.lines.map((line) => {
                    const key = `${date}:${line.food.id}`
                    return (
                      <label className="check" key={line.food.id}>
                        <input
                          type="checkbox"
                          checked={Boolean(checked[key])}
                          onChange={(e) => setChecked((prev) => ({ ...prev, [key]: e.target.checked }))}
                        />
                        <span>
                          {line.food.name} <em>· {Math.round(line.grams)} g</em>
                        </span>
                      </label>
                    )
                  })}
                </div>
              ))}
            </div>
          </Card>

          <Card tight>
            <div className="inline wrap tiny faint" style={{ gap: 10 }}>
              <ClipboardList size={14} />
              <span>
                Plan figures use standard composition tables (USDA / IFCT). Cooked weights unless the item says dry.
                Treat a {fit?.score ?? 0}% fit as “on target”, not a guarantee.
              </span>
            </div>
          </Card>
        </>
      ) : (
        <Card>
          <div className="empty">Generating your plan…</div>
        </Card>
      )}
    </div>
  )
}

function TargetStat({
  label,
  value,
  target,
  unit,
  color,
}: {
  label: string
  value: number
  target: number
  unit: string
  color: string
}) {
  const pct = target > 0 ? value / target : 0
  return (
    <div className="stat">
      <div className="stat-label">
        <i className="macro-dot" style={{ background: color }} />
        {label}
      </div>
      <div className="stat-value">
        {Math.round(value)}
        <small> / {Math.round(target)} {unit}</small>
      </div>
      <div className="bar" style={{ marginTop: 3 }}>
        <span style={{ width: `${Math.min(100, pct * 100)}%`, background: color }} />
      </div>
    </div>
  )
}
