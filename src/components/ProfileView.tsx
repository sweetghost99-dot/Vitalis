import { useMemo, useRef, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Beef,
  Download,
  Egg,
  Flame,
  Leaf,
  RotateCcw,
  Save,
  Scale,
  Target as TargetIcon,
  Upload,
  User,
} from 'lucide-react'
import { cmToIn, computeTargets, healthyWeightRange, inToCm, kgToLb, lbToKg, bmi, bmiBand } from '../lib/nutrition'
import { exportJSON, importJSON, resetAll, updateProfile, useApp } from '../lib/store'
import { ACTIVITY_LABELS, DIET_LABELS, GOAL_LABELS } from '../lib/types'
import type { Activity as ActivityLevel, DietPref, Goal, Pace, Sex, Units } from '../lib/types'
import { Badge, Card, CardHead, Segmented, Stepper, useToast } from './ui'

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  athlete: 1.9,
}

export function ProfileView({ onReset }: { onReset: () => void }) {
  const app = useApp()
  const toast = useToast()
  const profile = app.profile!
  const fileRef = useRef<HTMLInputElement>(null)

  const [draft, setDraft] = useState(profile)
  const [confirmReset, setConfirmReset] = useState(false)

  const targets = useMemo(() => computeTargets(draft), [draft])
  const dirty = JSON.stringify(draft) !== JSON.stringify(profile)

  const set = (patch: Partial<typeof draft>) => setDraft((d) => ({ ...d, ...patch }))

  const unit = draft.units === 'metric' ? 'kg' : 'lb'
  const heightUnit = draft.units === 'metric' ? 'cm' : 'in'
  const weightValue = draft.units === 'metric' ? draft.weightKg : Math.round(kgToLb(draft.weightKg) * 10) / 10
  const goalValue = draft.units === 'metric' ? draft.targetWeightKg : Math.round(kgToLb(draft.targetWeightKg) * 10) / 10
  const heightValue = draft.units === 'metric' ? draft.heightCm : Math.round(cmToIn(draft.heightCm) * 10) / 10

  const [lo, hi] = healthyWeightRange(draft.heightCm)
  const band = bmiBand(bmi(draft.weightKg, draft.heightCm))

  const download = () => {
    const blob = new Blob([exportJSON()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vitalis-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast('Backup downloaded')
  }

  const upload = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = importJSON(String(reader.result))
      if (result.ok) {
        toast('Backup restored')
        onReset()
      } else {
        toast(result.error ?? 'Import failed')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Profile &amp; targets</h1>
          <div className="page-sub">Everything recalculates the moment you save — targets, plans and macro splits.</div>
        </div>
        <div className="inline wrap">
          {dirty ? <Badge tone="warn">Unsaved changes</Badge> : null}
          <button
            className="btn btn-primary"
            type="button"
            disabled={!dirty}
            onClick={() => {
              updateProfile(draft)
              toast('Profile saved — targets updated')
            }}
          >
            <Save size={15} /> Save changes
          </button>
        </div>
      </div>

      <div className="grid grid-4">
        <div className="stat">
          <div className="stat-label"><Flame size={12} /> Daily energy</div>
          <div className="stat-value">{targets.kcal.toLocaleString()}<small> kcal</small></div>
          <div className="stat-note">{targets.delta === 0 ? 'maintenance' : `${targets.delta > 0 ? '+' : ''}${targets.delta} vs TDEE`}</div>
        </div>
        <div className="stat">
          <div className="stat-label"><Activity size={12} /> BMR / TDEE</div>
          <div className="stat-value">{targets.bmr.toLocaleString()}<small> / {targets.tdee.toLocaleString()}</small></div>
          <div className="stat-note">×{ACTIVITY_FACTORS[draft.activity]} activity</div>
        </div>
        <div className="stat">
          <div className="stat-label"><TargetIcon size={12} /> Macros</div>
          <div className="stat-value" style={{ fontSize: 17 }}>
            {targets.protein} / {targets.carbs} / {targets.fat}
          </div>
          <div className="stat-note">protein · carbs · fat (g)</div>
        </div>
        <div className="stat">
          <div className="stat-label"><Scale size={12} /> BMI</div>
          <div className="stat-value">{bmi(draft.weightKg, draft.heightCm).toFixed(1)}</div>
          <div className="stat-note">{band.label} · healthy {lo}–{hi} kg</div>
        </div>
      </div>

      <div className="grid grid-2">
        <Card>
          <CardHead title="About you" icon={<User size={15} />} />
          <div className="stack">
            <div className="field">
              <label className="label">Name</label>
              <input className="input" value={draft.name} onChange={(e) => set({ name: e.target.value })} />
            </div>
            <div className="field">
              <span className="label">Sex (used by the BMR formula)</span>
              <Segmented<Sex>
                options={[
                  { value: 'female', label: 'Female' },
                  { value: 'male', label: 'Male' },
                ]}
                value={draft.sex}
                onChange={(sex) => set({ sex })}
              />
            </div>
            <div className="grid grid-2" style={{ gap: 12 }}>
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
                  suffix={unit}
                  onChange={(v) =>
                    set({ weightKg: draft.units === 'metric' ? v : Math.round(lbToKg(v) * 10) / 10 })
                  }
                />
              </div>
              <div className="field">
                <label className="label">Goal weight</label>
                <Stepper
                  value={goalValue}
                  min={30}
                  max={300}
                  step={0.5}
                  suffix={unit}
                  onChange={(v) =>
                    set({ targetWeightKg: draft.units === 'metric' ? v : Math.round(lbToKg(v) * 10) / 10 })
                  }
                />
              </div>
            </div>
            <div className="field">
              <span className="label">Units</span>
              <Segmented<Units>
                options={[
                  { value: 'metric', label: 'Metric' },
                  { value: 'imperial', label: 'Imperial' },
                ]}
                value={draft.units}
                onChange={(units) => set({ units })}
              />
            </div>
          </div>
        </Card>

        <Card>
          <CardHead title="Goal & diet" icon={<TargetIcon size={15} />} />
          <div className="stack">
            <div className="field">
              <span className="label">Primary goal</span>
              <Segmented<Goal>
                options={[
                  { value: 'lose', label: 'Lose fat' },
                  { value: 'maintain', label: 'Maintain' },
                  { value: 'gain', label: 'Build muscle' },
                ]}
                value={draft.goal}
                onChange={(goal) => set({ goal })}
              />
            </div>
            {draft.goal !== 'maintain' ? (
              <div className="field">
                <span className="label">Pace</span>
                <Segmented<Pace>
                  options={[
                    { value: 'gentle', label: 'Gentle' },
                    { value: 'steady', label: 'Steady' },
                    { value: 'ambitious', label: 'Ambitious' },
                  ]}
                  value={draft.pace}
                  onChange={(pace) => set({ pace })}
                />
                <span className="hint">
                  {draft.goal === 'lose'
                    ? 'Gentle −12%, steady −20%, ambitious −25% of TDEE.'
                    : 'Gentle +8%, steady +14%, ambitious +20% of TDEE.'}
                </span>
              </div>
            ) : null}

            <div className="field">
              <span className="label">Activity level</span>
              <select
                className="select"
                value={draft.activity}
                onChange={(e) => set({ activity: e.target.value as ActivityLevel })}
              >
                {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((level) => (
                  <option key={level} value={level}>
                    {ACTIVITY_LABELS[level]}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <span className="label">Diet category</span>
              <div className="chips">
                {(['vegan', 'vegetarian', 'non-veg'] as DietPref[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`chip${draft.diet === d ? ' is-active' : ''}`}
                    onClick={() => set({ diet: d })}
                  >
                    {d === 'vegan' ? <Leaf size={12} style={{ verticalAlign: -2, marginRight: 5 }} /> : d === 'vegetarian' ? <Egg size={12} style={{ verticalAlign: -2, marginRight: 5 }} /> : <Beef size={12} style={{ verticalAlign: -2, marginRight: 5 }} />}
                    {DIET_LABELS[d]}
                  </button>
                ))}
              </div>
              <span className="hint">Vegetarian excludes meat and fish; vegan also excludes dairy and egg.</span>
            </div>

            <div className="field">
              <span className="label">Meals per day</span>
              <Segmented<3 | 4 | 5>
                options={[
                  { value: 3, label: '3' },
                  { value: 4, label: '4' },
                  { value: 5, label: '5' },
                ]}
                value={draft.mealsPerDay}
                onChange={(mealsPerDay) => set({ mealsPerDay })}
              />
            </div>

            <div className="inline wrap tiny faint" style={{ gap: 8 }}>
              <Badge>{GOAL_LABELS[draft.goal]}</Badge>
              <Badge>{DIET_LABELS[draft.diet]}</Badge>
              <Badge>{targets.protein} g protein</Badge>
              <Badge>{(targets.waterMl / 1000).toFixed(1)} L water</Badge>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHead title="Your data" hint="Everything is stored in this browser only — nothing is uploaded." />
        <div className="inline wrap">
          <button className="btn" type="button" onClick={download}>
            <Download size={15} /> Download backup
          </button>
          <button className="btn" type="button" onClick={() => fileRef.current?.click()}>
            <Upload size={15} /> Restore backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) upload(file)
              e.target.value = ''
            }}
          />
          <span className="faint tiny">
            {app.log.length} log entries · {app.weights.length} weigh-ins · {Object.keys(app.plans).length} plans
          </span>
          <div style={{ marginLeft: 'auto' }} className="inline">
            {confirmReset ? (
              <>
                <span className="tiny" style={{ color: 'var(--danger)' }}>
                  <AlertTriangle size={13} style={{ verticalAlign: -2 }} /> Erase everything?
                </span>
                <button
                  className="btn btn-danger"
                  type="button"
                  onClick={() => {
                    resetAll()
                    setConfirmReset(false)
                    onReset()
                  }}
                >
                  Yes, erase all data
                </button>
                <button className="btn btn-ghost" type="button" onClick={() => setConfirmReset(false)}>
                  Cancel
                </button>
              </>
            ) : (
              <button className="btn" type="button" onClick={() => setConfirmReset(true)}>
                <RotateCcw size={15} /> Reset app
              </button>
            )}
          </div>
        </div>
      </Card>

      <Card tight>
        <div className="inline wrap tiny faint" style={{ gap: 10 }}>
          <AlertTriangle size={14} />
          <span>
            Vitalis provides general nutrition information, not medical advice. Energy needs are estimates — adjust by
            how your weight actually responds over 2–3 weeks. If you have a medical condition, are pregnant or
            breastfeeding, or are under 18, check with a clinician first.
          </span>
        </div>
      </Card>
    </div>
  )
}
