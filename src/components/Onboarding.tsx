import { useMemo, useState } from 'react'
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Beef,
  Check,
  Dumbbell,
  Egg,
  Flame,
  Leaf,
  Ruler,
  Scale,
  Sparkles,
  TrendingDown,
  TrendingUp,
  User,
  Target as TargetIcon,
} from 'lucide-react'
import { saveProfile } from '../lib/store'
import { computeTargets, cmToIn, inToCm, kgToLb, lbToKg } from '../lib/nutrition'
import type { Activity as ActivityLevel, DietPref, Goal, Pace, Profile, Sex, Units } from '../lib/types'
import { ACTIVITY_LABELS, GOAL_LABELS } from '../lib/types'
import { Badge, Card, Segmented, Stepper } from './ui'

const ACTIVITY_ICONS: Record<ActivityLevel, string> = {
  sedentary: '🪑',
  light: '🚶',
  moderate: '🏃',
  active: '🏋️',
  athlete: '🔥',
}

const PACE_COPY: Record<Goal, Record<Pace, string>> = {
  lose: {
    gentle: 'about 0.25 kg / week',
    steady: 'about 0.5 kg / week',
    ambitious: 'about 0.7 kg / week',
  },
  gain: {
    gentle: 'about 0.15 kg / week',
    steady: 'about 0.3 kg / week',
    ambitious: 'about 0.4 kg / week',
  },
  maintain: { gentle: 'recomposition', steady: 'recomposition', ambitious: 'recomposition' },
}

const DIET_OPTIONS: { value: DietPref; title: string; desc: string; icon: React.ReactNode }[] = [
  {
    value: 'vegan',
    title: 'Vegan',
    desc: 'Plants only — no dairy, egg, meat or fish.',
    icon: <Leaf size={17} />,
  },
  {
    value: 'vegetarian',
    title: 'Vegetarian',
    desc: 'Plants, dairy and eggs. No meat or fish.',
    icon: <Egg size={17} />,
  },
  {
    value: 'non-veg',
    title: 'Non-vegetarian',
    desc: 'Everything, including poultry, fish and red meat.',
    icon: <Beef size={17} />,
  },
]

function defaultProfile(): Profile {
  return {
    name: '',
    sex: 'female',
    age: 28,
    heightCm: 168,
    weightKg: 68,
    targetWeightKg: 62,
    activity: 'light',
    goal: 'lose',
    pace: 'steady',
    diet: 'vegetarian',
    mealsPerDay: 4,
    units: 'metric',
    createdAt: new Date().toISOString(),
  }
}

export function Onboarding() {
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<Profile>(defaultProfile)

  const set = (patch: Partial<Profile>) => setDraft((d) => ({ ...d, ...patch }))
  const targets = useMemo(() => computeTargets(draft), [draft])

  const update = (patch: Partial<Profile>) => {
    setDraft((d) => {
      const next = { ...d, ...patch }
      // Keep the goal weight on the right side of the current weight.
      if (patch.goal === 'lose' && next.targetWeightKg >= next.weightKg) {
        next.targetWeightKg = Math.round((next.weightKg - 5) * 10) / 10
      }
      if (patch.goal === 'gain' && next.targetWeightKg <= next.weightKg) {
        next.targetWeightKg = Math.round((next.weightKg + 5) * 10) / 10
      }
      if (patch.weightKg !== undefined) {
        const goalDelta = next.goal === 'lose' ? -5 : next.goal === 'gain' ? 5 : 0
        if (goalDelta !== 0) next.targetWeightKg = Math.round((patch.weightKg + goalDelta) * 10) / 10
      }
      return next
    })
  }

  const weightUnit = draft.units === 'metric' ? 'kg' : 'lb'
  const heightUnit = draft.units === 'metric' ? 'cm' : 'in'
  const weightValue = draft.units === 'metric' ? draft.weightKg : Math.round(kgToLb(draft.weightKg) * 10) / 10
  const goalWeightValue =
    draft.units === 'metric' ? draft.targetWeightKg : Math.round(kgToLb(draft.targetWeightKg) * 10) / 10
  const heightValue = draft.units === 'metric' ? draft.heightCm : Math.round(cmToIn(draft.heightCm) * 10) / 10

  const steps = [
    {
      title: 'Welcome to Vitalis',
      subtitle: 'Your personal nutrition engine. Tell it who you are and it will handle the maths — energy, macros and meals.',
      body: (
        <div className="stack">
          <div className="field">
            <label className="label" htmlFor="ob-name">What should we call you?</label>
            <div className="input-wrap">
              <User size={16} />
              <input
                id="ob-name"
                className="input"
                placeholder="Your first name"
                value={draft.name}
                autoFocus
                onChange={(e) => set({ name: e.target.value })}
              />
            </div>
          </div>
          <div className="field">
            <span className="label">Units</span>
            <Segmented<Units>
              options={[
                { value: 'metric', label: 'Metric (kg, cm)' },
                { value: 'imperial', label: 'Imperial (lb, in)' },
              ]}
              value={draft.units}
              onChange={(units) => set({ units })}
            />
          </div>
          <div className="grid grid-3">
            {[
              { icon: <Flame size={17} />, title: 'Energy targets', desc: 'BMR & TDEE from Mifflin-St Jeor' },
              { icon: <TargetIcon size={17} />, title: 'Macro splits', desc: 'Protein-first, goal aware' },
              { icon: <Sparkles size={17} />, title: 'Meal plans', desc: 'Vegetarian & non-veg' },
            ].map((f) => (
              <div className="stat" key={f.title}>
                <div className="stat-label">{f.icon} {f.title}</div>
                <div className="stat-note" style={{ fontSize: 12, lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      ),
      valid: draft.name.trim().length > 0,
    },
    {
      title: 'What is your goal?',
      subtitle: 'This sets the direction of your calorie target. You can change it any time.',
      body: (
        <div className="stack">
          <div className="grid grid-3">
            {(['lose', 'maintain', 'gain'] as Goal[]).map((goal) => (
              <button
                key={goal}
                type="button"
                className={`option${draft.goal === goal ? ' is-active' : ''}`}
                onClick={() => update({ goal })}
                style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 9 }}
              >
                <span className="option-icon">
                  {goal === 'lose' ? <TrendingDown size={18} /> : goal === 'gain' ? <TrendingUp size={18} /> : <TargetIcon size={18} />}
                </span>
                <span>
                  <span className="option-title">{GOAL_LABELS[goal]}</span>
                  <span className="option-desc" style={{ display: 'block' }}>
                    {goal === 'lose'
                      ? 'A calorie deficit with high protein to keep muscle.'
                      : goal === 'gain'
                        ? 'A small surplus to add lean mass.'
                        : 'Eat at maintenance and improve body composition.'}
                  </span>
                </span>
              </button>
            ))}
          </div>

          {draft.goal !== 'maintain' ? (
            <div className="field">
              <span className="label">How fast?</span>
              <div className="stack-sm">
                {(['gentle', 'steady', 'ambitious'] as Pace[]).map((pace) => (
                  <button
                    key={pace}
                    type="button"
                    className={`option${draft.pace === pace ? ' is-active' : ''}`}
                    onClick={() => update({ pace })}
                  >
                    <span style={{ flex: 1 }}>
                      <span className="option-title" style={{ textTransform: 'capitalize' }}>{pace}</span>
                      <span className="option-desc" style={{ display: 'block' }}>
                        {PACE_COPY[draft.goal][pace]}
                        {pace === 'ambitious' ? ' — harder to sustain, more muscle risk' : ''}
                      </span>
                    </span>
                    {draft.pace === pace ? <Check size={16} style={{ color: 'var(--kcal)' }} /> : null}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ),
      valid: true,
    },
    {
      title: 'Your body',
      subtitle: 'Used for BMR, BMI and protein requirements. Everything stays on this device.',
      body: (
        <div className="stack">
          <div className="field">
            <span className="label">Sex (for metabolic formula)</span>
            <Segmented<Sex>
              options={[
                { value: 'female', label: 'Female' },
                { value: 'male', label: 'Male' },
              ]}
              value={draft.sex}
              onChange={(sex) => set({ sex })}
            />
          </div>

          <div className="grid grid-2" style={{ gap: 14 }}>
            <div className="field">
              <label className="label">Age</label>
              <Stepper value={draft.age} min={13} max={100} suffix="yrs" onChange={(age) => set({ age })} />
            </div>
            <div className="field">
              <label className="label">Height</label>
              <Stepper
                value={heightValue}
                min={draft.units === 'metric' ? 120 : 48}
                max={draft.units === 'metric' ? 220 : 87}
                step={draft.units === 'metric' ? 1 : 0.5}
                suffix={heightUnit}
                onChange={(v) => set({ heightCm: Math.round(draft.units === 'metric' ? v : inToCm(v)) })}
              />
            </div>
            <div className="field">
              <label className="label">Current weight</label>
              <Stepper
                value={weightValue}
                min={30}
                max={300}
                step={0.5}
                suffix={weightUnit}
                onChange={(v) => update({ weightKg: draft.units === 'metric' ? v : Math.round(lbToKg(v) * 10) / 10 })}
              />
            </div>
            <div className="field">
              <label className="label">Goal weight</label>
              <Stepper
                value={goalWeightValue}
                min={30}
                max={300}
                step={0.5}
                suffix={weightUnit}
                onChange={(v) => set({ targetWeightKg: draft.units === 'metric' ? v : Math.round(lbToKg(v) * 10) / 10 })}
              />
            </div>
          </div>
        </div>
      ),
      valid: draft.age >= 13 && draft.heightCm >= 120 && draft.weightKg >= 30,
    },
    {
      title: 'How active are you?',
      subtitle: 'Count a normal week, not your best week. This multiplies your BMR into daily energy needs.',
      body: (
        <div className="stack-sm">
          {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((level) => (
            <button
              key={level}
              type="button"
              className={`option${draft.activity === level ? ' is-active' : ''}`}
              onClick={() => set({ activity: level })}
            >
              <span className="option-icon" style={{ fontSize: 16 }}>{ACTIVITY_ICONS[level]}</span>
              <span style={{ flex: 1 }}>
                <span className="option-title" style={{ textTransform: 'capitalize' }}>{level}</span>
                <span className="option-desc" style={{ display: 'block' }}>
                  {ACTIVITY_LABELS[level].split('·')[1]?.trim()}
                </span>
              </span>
              <span className="faint tiny tabular" style={{ alignSelf: 'center' }}>
                ×{({ sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, athlete: 1.9 } as const)[level]}
              </span>
            </button>
          ))}
        </div>
      ),
      valid: true,
    },
    {
      title: 'How do you eat?',
      subtitle: 'Vitalis keeps a separate recipe pool per diet, so every suggested meal actually fits your kitchen.',
      body: (
        <div className="stack">
          <div className="stack-sm">
            {DIET_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`option${draft.diet === option.value ? ' is-active' : ''}`}
                onClick={() => set({ diet: option.value })}
              >
                <span className="option-icon">{option.icon}</span>
                <span style={{ flex: 1 }}>
                  <span className="option-title">{option.title}</span>
                  <span className="option-desc" style={{ display: 'block' }}>{option.desc}</span>
                </span>
                {draft.diet === option.value ? <Check size={16} style={{ color: 'var(--kcal)', alignSelf: 'center' }} /> : null}
              </button>
            ))}
          </div>

          <div className="field">
            <span className="label">Meals per day</span>
            <Segmented<3 | 4 | 5>
              options={[
                { value: 3, label: '3 meals' },
                { value: 4, label: '3 + 1 snack' },
                { value: 5, label: '3 + 2 snacks' },
              ]}
              value={draft.mealsPerDay}
              onChange={(mealsPerDay) => set({ mealsPerDay })}
            />
            <span className="hint">Total calories matter far more than meal timing — pick what you can stick to.</span>
          </div>
        </div>
      ),
      valid: true,
    },
    {
      title: `Your plan, ${draft.name.trim() || 'friend'}`,
      subtitle: 'Daily energy and macro targets, calculated from your profile.',
      body: (
        <div className="stack">
          <div className="summary-grid">
            <div className="stat">
              <div className="stat-label"><Flame size={13} /> Daily energy</div>
              <div className="stat-value">{targets.kcal.toLocaleString()}<small> kcal</small></div>
              <div className="stat-note">
                {targets.delta === 0 ? 'at maintenance' : `${targets.delta > 0 ? '+' : ''}${targets.delta} vs TDEE`}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label"><Activity size={13} /> BMR → TDEE</div>
              <div className="stat-value">{targets.bmr.toLocaleString()}<small> / {targets.tdee.toLocaleString()}</small></div>
              <div className="stat-note">Mifflin-St Jeor</div>
            </div>
            <div className="stat">
              <div className="stat-label"><Dumbbell size={13} /> Protein</div>
              <div className="stat-value">{targets.protein}<small> g</small></div>
              <div className="stat-note">{(targets.protein / draft.weightKg).toFixed(1)} g per kg</div>
            </div>
            <div className="stat">
              <div className="stat-label"><Scale size={13} /> Water</div>
              <div className="stat-value">{(targets.waterMl / 1000).toFixed(1)}<small> L</small></div>
              <div className="stat-note">35 ml per kg + baseline</div>
            </div>
          </div>

          <Card tight>
            <div className="between wrap" style={{ gap: 14 }}>
              <div>
                <div className="label" style={{ marginBottom: 4 }}>Macro split each day</div>
                <div className="inline wrap">
                  <Badge tone="info">Protein {targets.protein} g · {Math.round((targets.protein * 4 * 100) / targets.kcal)}%</Badge>
                  <Badge tone="warn">Carbs {targets.carbs} g · {Math.round((targets.carbs * 4 * 100) / targets.kcal)}%</Badge>
                  <Badge>Fat {targets.fat} g · {Math.round((targets.fat * 9 * 100) / targets.kcal)}%</Badge>
                  <Badge>Fibre {targets.fiber} g</Badge>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="label" style={{ marginBottom: 4 }}>
                  <Ruler size={12} style={{ verticalAlign: -1 }} /> {draft.goal === 'maintain' ? 'Goal' : 'Projected'}
                </div>
                <div className="tabular" style={{ fontSize: 15, fontWeight: 650 }}>
                  {draft.goal === 'maintain'
                    ? 'Hold body weight'
                    : targets.projectedWeeks
                      ? `${draft.targetWeightKg} ${weightUnit} in ~${targets.projectedWeeks} weeks`
                      : 'Set a goal weight'}
                </div>
              </div>
            </div>
          </Card>

          <p className="tiny faint" style={{ lineHeight: 1.6 }}>
            Vitalis gives general nutrition guidance, not medical advice. If you are pregnant, breastfeeding, managing a
            chronic condition or under 18, speak to a clinician before changing your diet.
          </p>
        </div>
      ),
      valid: true,
    },
  ]

  const current = steps[step]
  const isLast = step === steps.length - 1

  const finish = () => {
    saveProfile({ ...draft, name: draft.name.trim() || 'Friend', createdAt: new Date().toISOString() })
  }

  return (
    <div className="onboard">
      <div className="onboard-card">
        <div className="onboard-head">
          <div className="brand-mark" style={{ margin: '0 auto', width: 46, height: 46, borderRadius: 15 }}>
            <Sparkles size={22} />
          </div>
          <h1 className="onboard-title">{current.title}</h1>
          <p className="onboard-sub">{current.subtitle}</p>
        </div>

        <div className="steps">
          {steps.map((_, i) => (
            <div key={i} className={`step-pip${i <= step ? ' is-done' : ''}`} />
          ))}
        </div>

        <div className="step-body">{current.body}</div>

        <div className="onboard-foot">
          <button
            className="btn btn-ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            type="button"
          >
            <ArrowLeft size={15} /> Back
          </button>
          <span className="tiny faint">Step {step + 1} of {steps.length}</span>
          {isLast ? (
            <button className="btn btn-primary" onClick={finish} type="button">
              <Check size={16} /> Start tracking
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={() => setStep((s) => s + 1)}
              disabled={!current.valid}
              type="button"
            >
              Continue <ArrowRight size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
