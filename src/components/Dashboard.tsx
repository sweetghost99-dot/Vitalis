import { useMemo, useState } from 'react'
import {
  Activity,
  ArrowRight,
  CalendarCheck,
  Droplets,
  Flame,
  Plus,
  Scale,
  Target as TargetIcon,
  TrendingDown,
  TrendingUp,
  Trophy,
  Utensils,
  Zap,
} from 'lucide-react'
import { lastNDays, relativeDayLabel, shortDate, todayISO } from '../lib/dates'
import { getFood } from '../lib/foods'
import { bmi, bmiBand, computeTargets, round1 } from '../lib/nutrition'
import { addManyLogEntries, currentStreak, dayTotals, entriesFor, setWater, setWeight, useApp } from '../lib/store'
import { MEAL_LABELS } from '../lib/types'
import type { MealSlot } from '../lib/types'
import { emojiFor, MealIcon } from './present'
import { Badge, Card, CardHead, ColumnChart, MacroBar, Ring, SplitBar, Stat, Stepper, useToast } from './ui'

export function Dashboard({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const app = useApp()
  const toast = useToast()
  const profile = app.profile!
  const targets = useMemo(() => computeTargets(profile), [profile])

  const today = todayISO()
  const totals = useMemo(() => dayTotals(today), [app, today])
  const entries = useMemo(() => entriesFor(today), [app, today])
  const streak = useMemo(() => currentStreak(), [app])

  const [weightInput, setWeightInput] = useState(
    profile.units === 'metric'
      ? profile.weightKg
      : Math.round(profile.weightKg * 2.2046226 * 10) / 10,
  )

  const unit = profile.units === 'metric' ? 'kg' : 'lb'
  const chart = useMemo(
    () =>
      lastNDays(7).map((d) => ({
        label: shortDate(d).slice(-2),
        value: dayTotals(d).kcal,
        highlight: d === today,
      })),
    [app],
  )

  const remaining = targets.kcal - totals.kcal
  const waterGlasses = app.water[today] ?? 0
  const waterTarget = Math.max(6, Math.round(targets.waterMl / 250))

  const nextSlot: MealSlot | null = useMemo(() => {
    const order: MealSlot[] = ['breakfast', 'snack', 'lunch', 'evening', 'dinner']
    const slots = order.filter((s) => {
      if (profile.mealsPerDay === 3) return s === 'breakfast' || s === 'lunch' || s === 'dinner'
      if (profile.mealsPerDay === 4) return s !== 'evening'
      return true
    })
    const logged = new Set(entries.map((e) => e.slot))
    const hour = new Date().getHours()
    const timeHint: MealSlot = hour < 11 ? 'breakfast' : hour < 15 ? 'lunch' : hour < 18 ? 'snack' : 'dinner'
    return slots.find((s) => s === timeHint && !logged.has(s)) ?? slots.find((s) => !logged.has(s)) ?? null
  }, [entries, profile.mealsPerDay])

  const plan = app.plans[today]
  const plannedMeal = plan?.meals.find((m) => m.slot === nextSlot)

  const goalProgress = useMemo(() => {
    const start = profile.weightKg
    const end = profile.targetWeightKg
    const current = app.weights.length > 0 ? app.weights[app.weights.length - 1].kg : start
    const span = end - start
    if (Math.abs(span) < 0.4) return null
    const done = (current - start) / span
    return { start, end, current, pct: Math.max(0, Math.min(1, done)), remaining: Math.abs(end - current) }
  }, [app.weights, profile])

  const band = bmiBand(bmi(profile.weightKg, profile.heightCm))

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Hey {profile.name} 👋</h1>
          <div className="page-sub">
            {relativeDayLabel(today)} · {targets.kcal.toLocaleString()} kcal target ·{' '}
            {targets.delta === 0
              ? 'maintenance'
              : `${targets.delta > 0 ? 'surplus' : 'deficit'} of ${Math.abs(targets.delta)} kcal`}
          </div>
        </div>
        <div className="inline wrap">
          <Badge tone={streak > 0 ? 'ok' : 'neutral'} icon={<Trophy size={12} />}>
            {streak} day streak
          </Badge>
          <Badge tone="info" icon={<TargetIcon size={12} />}>{profile.goal === 'lose' ? 'Fat loss' : profile.goal === 'gain' ? 'Muscle gain' : 'Maintenance'}</Badge>
        </div>
      </div>

      <div className="grid hero-grid">
        <Card>
          <CardHead title="Calories today" icon={<Flame size={15} />} hint={`BMR ${targets.bmr} · TDEE ${targets.tdee}`} />
          <div className="inline" style={{ gap: 26, alignItems: 'center', flexWrap: 'wrap' }}>
            <Ring value={totals.kcal / Math.max(targets.kcal, 1)} size={186} thickness={14}>
              <div className="ring-big">{Math.round(totals.kcal).toLocaleString()}</div>
              <div className="ring-label">{remaining >= 0 ? 'remaining' : 'over target'}</div>
              <div className="tabular" style={{ fontSize: 13, fontWeight: 650, marginTop: 4, color: remaining < 0 ? 'var(--warn)' : 'var(--kcal)' }}>
                {Math.abs(Math.round(remaining)).toLocaleString()}
              </div>
            </Ring>
            <div className="stack" style={{ flex: 1, minWidth: 220 }}>
              <div className="grid grid-2" style={{ gap: 10 }}>
                <Stat label="Logged" value={entries.length} note="food items" icon={<Utensils size={12} />} />
                <Stat
                  label="Plan fit"
                  value={plan ? `${Math.max(0, Math.round((1 - Math.abs(plan.totals.kcal - targets.kcal) / targets.kcal) * 100))}%` : '—'}
                  note={plan ? 'energy accuracy' : 'no plan yet'}
                  icon={<Zap size={12} />}
                />
              </div>
              <SplitBar
                parts={[
                  { value: totals.protein * 4, color: 'var(--protein)', label: 'protein' },
                  { value: totals.carbs * 4, color: 'var(--carbs)', label: 'carbs' },
                  { value: totals.fat * 9, color: 'var(--fat)', label: 'fat' },
                ]}
              />
              <div className="legend">
                <span><i style={{ background: 'var(--protein)' }} />Protein {Math.round((totals.protein * 4) / Math.max(totals.kcal, 1) * 100)}%</span>
                <span><i style={{ background: 'var(--carbs)' }} />Carbs {Math.round((totals.carbs * 4) / Math.max(totals.kcal, 1) * 100)}%</span>
                <span><i style={{ background: 'var(--fat)' }} />Fat {Math.round((totals.fat * 9) / Math.max(totals.kcal, 1) * 100)}%</span>
              </div>
              <button className="btn btn-primary" type="button" onClick={() => onNavigate('diary')}>
                <Plus size={15} /> Log food
              </button>
            </div>
          </div>
        </Card>

        <Card>
          <CardHead title="Macros" icon={<Activity size={15} />} hint="Remaining to hit your target" />
          <div className="stack">
            <MacroBar name="Protein" color="var(--protein)" value={totals.protein} target={targets.protein} />
            <MacroBar name="Carbohydrate" color="var(--carbs)" value={totals.carbs} target={targets.carbs} />
            <MacroBar name="Fat" color="var(--fat)" value={totals.fat} target={targets.fat} />
            <MacroBar name="Fibre" color="var(--fiber)" value={totals.fiber} target={targets.fiber} />
          </div>
          <div className="divider" style={{ margin: '16px 0 14px' }} />
          <div className="between wrap" style={{ gap: 10 }}>
            <div>
              <div className="label">Water</div>
              <div className="tiny faint">
                {waterGlasses * 250} / {targets.waterMl} ml
              </div>
            </div>
            <div className="water-row">
              {Array.from({ length: waterTarget }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`glass${i < waterGlasses ? ' is-filled' : ''}`}
                  aria-label={`Set water to ${i + 1} glasses`}
                  onClick={() => setWater(today, i + 1 === waterGlasses ? i : i + 1)}
                />
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-2">
        <Card>
          <CardHead
            title={nextSlot ? `Next up · ${MEAL_LABELS[nextSlot]}` : 'All meals logged'}
            icon={<MealIcon slot={nextSlot ?? 'snack'} />}
            right={
              <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('plan')} type="button">
                Plans <ArrowRight size={13} />
              </button>
            }
          />
          {plannedMeal && plannedMeal.items.length > 0 ? (
            <>
              <div className="stack-sm">
                {plannedMeal.items.map((item) => {
                  const food = getFood(item.foodId)
                  if (!food) return null
                  return (
                    <div className="inline" key={item.foodId} style={{ gap: 10 }}>
                      <span aria-hidden>{emojiFor(food)}</span>
                      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 560 }}>{food.name}</span>
                      <span className="tiny faint tabular">{item.grams} g</span>
                      <span className="tiny faint tabular">
                        {Math.round((food.per100.kcal * item.grams) / 100)} kcal
                      </span>
                    </div>
                  )
                })}
              </div>
              <button
                className="btn btn-block"
                style={{ marginTop: 14 }}
                type="button"
                onClick={() => {
                  addManyLogEntries(
                    plannedMeal.items.map((item) => ({
                      date: today,
                      slot: plannedMeal.slot,
                      foodId: item.foodId,
                      grams: item.grams,
                    })),
                  )
                  toast(`${MEAL_LABELS[plannedMeal.slot]} logged`)
                }}
              >
                <Utensils size={15} /> Log this meal
              </button>
            </>
          ) : nextSlot === null ? (
            <div className="empty">
              <CalendarCheck size={20} style={{ marginBottom: 8 }} />
              <div>Every meal is logged. Nicely done.</div>
            </div>
          ) : (
            <div className="empty">
              <div style={{ marginBottom: 10 }}>No plan built for today yet.</div>
              <button className="btn btn-sm" onClick={() => onNavigate('plan')} type="button">
                Build a plan
              </button>
            </div>
          )}
        </Card>

        <Card>
          <CardHead title="Weight" icon={<Scale size={15} />} hint={`${unit === 'kg' ? profile.weightKg.toFixed(1) : (profile.weightKg * 2.2046).toFixed(1)} ${unit} at last profile edit`} />
          <div className="inline" style={{ gap: 10, marginBottom: 14 }}>
            <Stepper
              value={weightInput}
              step={0.1}
              min={30}
              max={300}
              onChange={setWeightInput}
            />
            <button
              className="btn btn-sm"
              type="button"
              onClick={() => {
                const kg = profile.units === 'metric' ? weightInput : weightInput / 2.2046226
                setWeight(Math.round(kg * 10) / 10)
                toast(`Weight logged: ${weightInput} ${unit}`)
              }}
            >
              Log
            </button>
          </div>
          {goalProgress ? (
            <>
              <div className="between tiny" style={{ marginBottom: 6 }}>
                <span className="faint">
                  {goalProgress.start.toFixed(1)} → {goalProgress.end.toFixed(1)} {unit}
                </span>
                <span style={{ color: 'var(--kcal)', fontWeight: 650 }}>{Math.round(goalProgress.pct * 100)}%</span>
              </div>
              <div className="bar">
                <span style={{ width: `${goalProgress.pct * 100}%`, background: 'linear-gradient(90deg, var(--kcal), #22a854)' }} />
              </div>
              <div className="tiny faint" style={{ marginTop: 8 }}>
                {goalProgress.remaining.toFixed(1)} {unit} to go
                {targets.projectedWeeks ? ` · ~${targets.projectedWeeks} weeks at this pace` : ''}
              </div>
            </>
          ) : (
            <div className="tiny faint">Set a goal weight in your profile to see progress.</div>
          )}
          <div className="divider" style={{ margin: '14px 0 12px' }} />
          <div className="inline wrap" style={{ gap: 8 }}>
            <Badge tone={band.tone === 'ok' ? 'ok' : band.tone === 'warn' ? 'warn' : 'info'}>
              BMI {bmi(profile.weightKg, profile.heightCm).toFixed(1)} · {band.label}
            </Badge>
            <span className="tiny faint">
              {profile.goal === 'lose' ? <TrendingDown size={12} style={{ verticalAlign: -1 }} /> : <TrendingUp size={12} style={{ verticalAlign: -1 }} />}{' '}
              {targets.protein} g protein target
            </span>
          </div>
        </Card>
      </div>

      <Card>
        <CardHead
          title="Last 7 days"
          icon={<Flame size={15} />}
          hint={`Dashed line marks your ${targets.kcal.toLocaleString()} kcal target`}
          right={
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('progress')} type="button">
              Full history <ArrowRight size={13} />
            </button>
          }
        />
        <ColumnChart data={chart} target={targets.kcal} format={(v) => `${Math.round(v)} kcal`} />
      </Card>

      <Card tight>
        <div className="inline wrap tiny faint" style={{ gap: 10 }}>
          <Droplets size={14} />
          <span>
            Today you have {round1(totals.protein)} g protein, {round1(totals.carbs)} g carbohydrate and{' '}
            {round1(totals.fat)} g fat logged — {Math.round((totals.kcal / Math.max(targets.kcal, 1)) * 100)}% of your
            energy target.
          </span>
        </div>
      </Card>
    </div>
  )
}
