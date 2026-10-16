import { useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Flame,
  Minus,
  Plus,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react'
import { addDays, relativeDayLabel, todayISO } from '../lib/dates'
import { getFood } from '../lib/foods'
import { computeTargets, macrosFor, round1 } from '../lib/nutrition'
import { addManyLogEntries, clearDay, entriesFor, logPlan, moveLogEntry, removeLogEntry, setPlan, useApp } from '../lib/store'
import { MEAL_LABELS } from '../lib/types'
import type { Food, MealSlot, PlanMeal } from '../lib/types'
import { generateDayPlan } from '../lib/planner'
import { AddFoodModal } from './AddFoodModal'
import { emojiFor, MealIcon } from './present'
import { Badge, Card, CardHead, MacroBar, Ring, useToast } from './ui'

const SLOT_SEQUENCE: MealSlot[] = ['breakfast', 'snack', 'lunch', 'evening', 'dinner']

export function Diary({ focusDate }: { focusDate?: string }) {
  const app = useApp()
  const toast = useToast()
  const [date, setDate] = useState(focusDate ?? todayISO())
  const [adding, setAdding] = useState<MealSlot | null>(null)

  const profile = app.profile
  const targets = useMemo(() => (profile ? computeTargets(profile) : null), [profile])

  const entries = useMemo(() => entriesFor(date), [app, date])
  const totals = useMemo(
    () =>
      entries.reduce(
        (acc, e) => {
          const food = getFood(e.foodId)
          if (!food) return acc
          const m = macrosFor(food, e.grams)
          return {
            kcal: acc.kcal + m.kcal,
            protein: acc.protein + m.protein,
            carbs: acc.carbs + m.carbs,
            fat: acc.fat + m.fat,
            fiber: acc.fiber + m.fiber,
          }
        },
        { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      ),
    [entries],
  )

  const slots: MealSlot[] = useMemo(() => {
    if (!profile) return ['breakfast', 'lunch', 'dinner']
    if (profile.mealsPerDay === 3) return ['breakfast', 'lunch', 'dinner']
    if (profile.mealsPerDay === 4) return ['breakfast', 'lunch', 'snack', 'dinner']
    return SLOT_SEQUENCE
  }, [profile])

  if (!profile || !targets) return null

  const plan = app.plans[date]
  const remaining = targets.kcal - totals.kcal

  const copyPlanIntoDiary = () => {
    const existing = app.plans[date] ?? generateDayPlan({
      targets,
      diet: profile.diet,
      mealsPerDay: profile.mealsPerDay,
      date,
      favorites: app.favorites,
    })
    if (!app.plans[date]) setPlan(existing)
    logPlan(existing)
    toast('Plan logged into your diary')
  }

  const mealsWithContent = slots.map((slot) => ({
    slot,
    entries: entries.filter((e) => e.slot === slot),
  }))

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Food diary</h1>
          <div className="inline" style={{ marginTop: 8, gap: 6 }}>
            <button className="btn btn-ghost btn-icon" onClick={() => setDate((d) => addDays(d, -1))} aria-label="Previous day">
              <ChevronLeft size={17} />
            </button>
            <div style={{ minWidth: 150, textAlign: 'center' }}>
              <div style={{ fontWeight: 650 }}>{relativeDayLabel(date)}</div>
              <div className="tiny faint">{date}</div>
            </div>
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => setDate((d) => addDays(d, 1))}
              disabled={date >= todayISO()}
              aria-label="Next day"
            >
              <ChevronRight size={17} />
            </button>
            {date !== todayISO() ? (
              <button className="btn btn-sm" onClick={() => setDate(todayISO())}>
                Today
              </button>
            ) : null}
          </div>
        </div>
        <div className="inline wrap">
          <button className="btn" onClick={copyPlanIntoDiary} type="button">
            <Copy size={15} /> Log today&apos;s plan
          </button>
          <button
            className="btn btn-danger"
            type="button"
            onClick={() => {
              clearDay(date)
              toast('Day cleared')
            }}
            disabled={entries.length === 0}
          >
            <Trash2 size={15} /> Clear day
          </button>
        </div>
      </div>

      <div className="grid hero-grid">
        <Card>
          <CardHead title="Energy" icon={<Flame size={15} />} hint={`Target ${targets.kcal.toLocaleString()} kcal`} />
          <div className="inline" style={{ gap: 26, alignItems: 'center', flexWrap: 'wrap' }}>
            <Ring value={totals.kcal / Math.max(targets.kcal, 1)} size={172} thickness={13}>
              <div className="ring-big">{Math.round(totals.kcal).toLocaleString()}</div>
              <div className="ring-label">of {targets.kcal.toLocaleString()} kcal</div>
            </Ring>
            <div className="stack" style={{ flex: 1, minWidth: 200 }}>
              <div>
                <div className="stat-label">Remaining today</div>
                <div className="stat-value" style={{ color: remaining < 0 ? 'var(--warn)' : 'var(--kcal)' }}>
                  {Math.abs(Math.round(remaining)).toLocaleString()}
                  <small> kcal {remaining < 0 ? 'over' : 'left'}</small>
                </div>
              </div>
              <div className="grid grid-2" style={{ gap: 10 }}>
                <div className="stat" style={{ padding: 11 }}>
                  <div className="stat-label">Logged</div>
                  <div className="stat-value" style={{ fontSize: 17 }}>{entries.length}<small> items</small></div>
                </div>
                <div className="stat" style={{ padding: 11 }}>
                  <div className="stat-label">TDEE</div>
                  <div className="stat-value" style={{ fontSize: 17 }}>{targets.tdee.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHead title="Macros" icon={<UtensilsCrossed size={15} />} hint="Targets adjust to your goal" />
          <div className="stack">
            <MacroBar name="Protein" color="var(--protein)" value={totals.protein} target={targets.protein} />
            <MacroBar name="Carbohydrate" color="var(--carbs)" value={totals.carbs} target={targets.carbs} />
            <MacroBar name="Fat" color="var(--fat)" value={totals.fat} target={targets.fat} />
            <MacroBar name="Fibre" color="var(--fiber)" value={totals.fiber} target={targets.fiber} />
          </div>
          <div className="divider" style={{ margin: '16px 0 12px' }} />
          <div className="inline wrap tiny faint" style={{ gap: 8 }}>
            <Badge tone={totals.protein >= targets.protein * 0.9 ? 'ok' : 'neutral'}>
              Protein {Math.round((totals.protein / Math.max(targets.protein, 1)) * 100)}%
            </Badge>
            <Badge tone={Math.abs(totals.kcal - targets.kcal) < targets.kcal * 0.1 ? 'ok' : 'warn'}>
              Energy {Math.round((totals.kcal / Math.max(targets.kcal, 1)) * 100)}%
            </Badge>
            <span>Dairy-free? Vegan plans skip it automatically.</span>
          </div>
        </Card>
      </div>

      {mealsWithContent.map(({ slot, entries: slotEntries }) => {
        const slotKcal = slotEntries.reduce((sum, e) => {
          const food = getFood(e.foodId)
          return sum + (food ? (food.per100.kcal * e.grams) / 100 : 0)
        }, 0)
        const planned = plan?.meals.find((m) => m.slot === slot)

        return (
          <div className="meal-block" key={slot}>
            <div className="meal-head">
              <div className="meal-head-left">
                <div className="meal-icon">
                  <MealIcon slot={slot} />
                </div>
                <div>
                  <div className="meal-name">{MEAL_LABELS[slot]}</div>
                  <div className="meal-meta">
                    {slotEntries.length === 0 ? 'Nothing logged' : `${slotEntries.length} item${slotEntries.length > 1 ? 's' : ''} · ${round1(slotKcal)} kcal`}
                  </div>
                </div>
              </div>
              <div className="inline">
                {planned && slotEntries.length === 0 ? (
                  <button
                    className="btn btn-sm"
                    type="button"
                    onClick={() => {
                      addManyLogEntries(
                        planned.items.map((item) => ({ date, slot, foodId: item.foodId, grams: item.grams })),
                      )
                      toast(`${MEAL_LABELS[slot]} logged from your plan`)
                    }}
                  >
                    <Copy size={14} /> Use plan
                  </button>
                ) : null}
                <button className="btn btn-primary btn-sm" type="button" onClick={() => setAdding(slot)}>
                  <Plus size={14} /> Add food
                </button>
              </div>
            </div>

            {slotEntries.length > 0 ? (
              <div className="meal-body">
                <div className="rows">
                  {slotEntries.map((entry) => {
                    const food = getFood(entry.foodId)
                    if (!food) return null
                    const m = macrosFor(food, entry.grams)
                    return (
                      <div className="row" key={entry.id}>
                        <div className="thumb" aria-hidden>
                          {emojiFor(food)}
                        </div>
                        <div className="row-grow">
                          <div className="row-title">{food.name}</div>
                          <div className="row-sub tabular">
                            {entry.grams} g · {Math.round(m.kcal)} kcal
                          </div>
                        </div>
                        <div className="row-right">
                          <div className="macro-inline">
                            <span>P <b>{round1(m.protein)}</b></span>
                            <span>C <b>{round1(m.carbs)}</b></span>
                            <span>F <b>{round1(m.fat)}</b></span>
                          </div>
                          <div className="inline" style={{ gap: 3 }}>
                            <button
                              className="btn btn-ghost btn-icon"
                              aria-label="Decrease portion"
                              onClick={() => moveLogEntry(entry.id, entry.slot, Math.max(5, entry.grams - 10))}
                            >
                              <Minus size={13} />
                            </button>
                            <button
                              className="btn btn-ghost btn-icon"
                              aria-label="Increase portion"
                              onClick={() => moveLogEntry(entry.id, entry.slot, entry.grams + 10)}
                            >
                              <Plus size={13} />
                            </button>
                            <button
                              className="btn btn-ghost btn-icon"
                              aria-label="Remove entry"
                              onClick={() => removeLogEntry(entry.id)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="meal-body">
                <PlanPeek planned={planned} />
              </div>
            )}
          </div>
        )
      })}

      {adding ? (
        <AddFoodModal
          date={date}
          slot={adding}
          diet={profile.diet}
          onClose={() => setAdding(null)}
          onAdd={(items) => {
            addManyLogEntries(items.map((item) => ({ date, slot: adding, foodId: item.foodId, grams: item.grams })))
          }}
        />
      ) : null}
    </div>
  )
}

/** When nothing is logged for a meal, show what the plan suggests there. */
function PlanPeek({ planned }: { planned?: PlanMeal }) {
  if (!planned || planned.items.length === 0) {
    return <div className="empty" style={{ padding: 16 }}>No plan for this meal yet — build one in the Plans tab.</div>
  }
  return (
    <div className="stack-sm" style={{ padding: '6px 0' }}>
      <div className="tiny faint">From today&apos;s plan</div>
      {planned.items.map((item) => {
        const food = getFood(item.foodId) as Food | undefined
        if (!food) return null
        return (
          <div className="inline wrap" key={item.foodId} style={{ gap: 8 }}>
            <span aria-hidden>{emojiFor(food)}</span>
            <span style={{ fontWeight: 560, fontSize: 13 }}>{food.name}</span>
            <span className="tiny faint tabular">{item.grams} g</span>
          </div>
        )
      })}
    </div>
  )
}
