import { useMemo, useState } from 'react'
import { Activity, CalendarDays, Flame, Scale, Target as TargetIcon, Trash2, TrendingDown } from 'lucide-react'
import { lastNDays, shortDate, todayISO } from '../lib/dates'
import { computeTargets, round1 } from '../lib/nutrition'
import { dayTotals, removeWeight, setWeight, useApp } from '../lib/store'
import { Badge, Card, CardHead, ColumnChart, LineChart, MacroBar, Stat, Stepper, useToast } from './ui'

export function Progress() {
  const app = useApp()
  const toast = useToast()
  const profile = app.profile!
  const targets = useMemo(() => computeTargets(profile), [profile])

  const [entry, setEntry] = useState(
    app.weights.length > 0
      ? app.weights[app.weights.length - 1].kg
      : profile.weightKg,
  )

  const unit = profile.units === 'metric' ? 'kg' : 'lb'
  const toDisplay = (kg: number) => (profile.units === 'metric' ? kg : Math.round(kg * 2.2046226 * 10) / 10)

  const weightPoints = useMemo(
    () => app.weights.map((w) => ({ x: shortDate(w.date).slice(4), y: toDisplay(w.kg) })),
    [app.weights, profile.units],
  )

  const series = useMemo(
    () =>
      lastNDays(14).map((d) => ({
        date: d,
        label: shortDate(d).slice(-2),
        kcal: dayTotals(d).kcal,
        protein: dayTotals(d).protein,
        carbs: dayTotals(d).carbs,
        fat: dayTotals(d).fat,
        highlight: d === todayISO(),
      })),
    [app],
  )

  const logged = series.filter((s) => s.kcal > 0)
  const avg = (pick: (row: (typeof series)[number]) => number) =>
    logged.length === 0 ? 0 : logged.reduce((sum, row) => sum + pick(row), 0) / logged.length

  const avgKcal = avg((r) => r.kcal)
  const avgProtein = avg((r) => r.protein)
  const avgCarbs = avg((r) => r.carbs)
  const avgFat = avg((r) => r.fat)

  const inTargetDays = logged.filter((r) => Math.abs(r.kcal - targets.kcal) <= targets.kcal * 0.1).length
  const proteinDays = logged.filter((r) => r.protein >= targets.protein * 0.9).length

  const first = app.weights[0]
  const latest = app.weights[app.weights.length - 1]
  const change = first && latest ? latest.kg - first.kg : 0

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Progress</h1>
          <div className="page-sub">Weight trend, energy consistency and protein adherence over the last two weeks.</div>
        </div>
        <Badge tone={Math.abs(avgKcal - targets.kcal) <= targets.kcal * 0.1 ? 'ok' : 'warn'} icon={<TargetIcon size={12} />}>
          {logged.length} of 14 days logged
        </Badge>
      </div>

      <div className="grid grid-4">
        <Stat
          label="Avg energy"
          value={Math.round(avgKcal).toLocaleString()}
          unit="kcal"
          note={logged.length ? `${Math.round((avgKcal / targets.kcal) * 100)}% of target` : 'no data yet'}
          icon={<Flame size={12} />}
        />
        <Stat
          label="Avg protein"
          value={Math.round(avgProtein)}
          unit="g"
          note={logged.length ? `${(avgProtein / profile.weightKg).toFixed(1)} g per kg` : 'no data yet'}
          icon={<Activity size={12} />}
        />
        <Stat
          label="Days on target"
          value={`${inTargetDays}/${logged.length || 0}`}
          note="within ±10% of energy goal"
          icon={<CalendarDays size={12} />}
        />
        <Stat
          label="Weight change"
          value={app.weights.length < 2 ? '—' : `${change > 0 ? '+' : ''}${change.toFixed(1)}`}
          unit={app.weights.length < 2 ? undefined : unit}
          note={app.weights.length < 2 ? 'log two readings' : `since ${shortDate(first.date)}`}
          icon={<TrendingDown size={12} />}
        />
      </div>

      <Card>
        <CardHead
          title="Weight trend"
          icon={<Scale size={15} />}
          hint={app.weights.length === 0 ? 'Log a reading to start the chart' : `Goal ${toDisplay(profile.targetWeightKg)} ${unit}`}
        />
        <div className="between wrap" style={{ gap: 14, marginBottom: 16 }}>
          <div className="inline wrap">
            <Stepper value={entry} step={0.1} min={30} max={300} suffix="kg" onChange={setEntry} />
            <button
              className="btn"
              type="button"
              onClick={() => {
                setWeight(entry)
                toast(`Logged ${entry.toFixed(1)} kg`)
              }}
            >
              Log today
            </button>
          </div>
          <span className="tiny faint">Readings are stored per day — adding again replaces the same day.</span>
        </div>

        {weightPoints.length > 0 ? (
          <LineChart
            points={weightPoints}
            color="var(--kcal)"
            targetValue={toDisplay(profile.targetWeightKg)}
            format={(v) => `${Math.round(v * 10) / 10}`}
            yLabel="Weight trend"
          />
        ) : (
          <div className="empty">No weigh-ins yet. One reading a week is plenty.</div>
        )}

        {app.weights.length > 0 ? (
          <div className="rows" style={{ marginTop: 16 }}>
            {[...app.weights].reverse().slice(0, 6).map((w) => (
              <div className="row" key={w.date}>
                <div className="row-grow">
                  <div className="row-title">{shortDate(w.date)}</div>
                  <div className="row-sub tabular">
                    {toDisplay(w.kg)} {unit}
                  </div>
                </div>
                <button className="btn btn-ghost btn-icon" aria-label="Delete weight" onClick={() => removeWeight(w.date)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </Card>

      <Card>
        <CardHead
          title="Energy, last 14 days"
          icon={<Flame size={15} />}
          hint={`Dashed line = ${targets.kcal.toLocaleString()} kcal target`}
        />
        <ColumnChart
          data={series.map((s) => ({ label: s.label, value: s.kcal, highlight: s.highlight }))}
          target={targets.kcal}
          format={(v) => `${Math.round(v)} kcal`}
        />
      </Card>

      <div className="grid grid-2">
        <Card>
          <CardHead title="Average macros" icon={<Activity size={15} />} hint="Across logged days only" />
          <div className="stack">
            <MacroBar name="Protein" color="var(--protein)" value={avgProtein} target={targets.protein} />
            <MacroBar name="Carbohydrate" color="var(--carbs)" value={avgCarbs} target={targets.carbs} />
            <MacroBar name="Fat" color="var(--fat)" value={avgFat} target={targets.fat} />
          </div>
        </Card>

        <Card>
          <CardHead title="Consistency" icon={<TargetIcon size={15} />} />
          <div className="stack-sm">
            <div className="between">
              <span className="muted" style={{ fontSize: 13 }}>Days within ±10% of energy goal</span>
              <strong className="tabular">{logged.length ? Math.round((inTargetDays / logged.length) * 100) : 0}%</strong>
            </div>
            <div className="between">
              <span className="muted" style={{ fontSize: 13 }}>Days at 90%+ of protein goal</span>
              <strong className="tabular">{logged.length ? Math.round((proteinDays / logged.length) * 100) : 0}%</strong>
            </div>
            <div className="between">
              <span className="muted" style={{ fontSize: 13 }}>Average daily fibre</span>
              <strong className="tabular">
                {Math.round(logged.reduce((sum, s) => sum + dayTotals(s.date).fiber, 0) / Math.max(logged.length, 1))} g
              </strong>
            </div>
            <div className="divider" />
            <p className="tiny faint" style={{ lineHeight: 1.6 }}>
              Consistency beats perfection. Hitting your energy target on most days — and protein almost every day — is
              what actually moves body composition. One off day changes nothing.
            </p>
          </div>
        </Card>
      </div>

      <Card tight>
        <div className="inline wrap tiny faint" style={{ gap: 10 }}>
          <TargetIcon size={14} />
          <span>
            Target {targets.kcal.toLocaleString()} kcal · {targets.protein} g protein · {targets.carbs} g carbohydrate ·{' '}
            {targets.fat} g fat. A 14-day average of {round1(avgKcal)} kcal puts you{' '}
            {avgKcal === 0 ? '—' : avgKcal > targets.kcal ? 'above' : 'below'} target by{' '}
            {Math.abs(Math.round(avgKcal - targets.kcal))} kcal/day.
          </span>
        </div>
      </Card>
    </div>
  )
}
