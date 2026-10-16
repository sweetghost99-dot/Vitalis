/**
 * Renders every view to static HTML to catch render-time crashes without a
 * browser. Effects and event handlers do not run during renderToString, so this
 * exercises the pure render path — which is where most layout/typing bugs land.
 *
 * Run: npx esbuild scripts/ssr-smoke.tsx --bundle --platform=node --format=cjs --jsx=automatic --outfile=/tmp/ssr.cjs && node /tmp/ssr.cjs
 */
import { renderToString } from 'react-dom/server'
import { createElement as h } from 'react'
import App from '../src/App'
import { Dashboard } from '../src/components/Dashboard'
import { Diary } from '../src/components/Diary'
import { MealPlanView } from '../src/components/MealPlanView'
import { Progress } from '../src/components/Progress'
import { ProfileView } from '../src/components/ProfileView'
import { AddFoodModal } from '../src/components/AddFoodModal'
import { ToastProvider } from '../src/components/ui'
import { generateDayPlan } from '../src/lib/planner'
import { computeTargets } from '../src/lib/nutrition'
import { addLogEntry, saveProfile, setPlan, setWater, setWeight, toggleFavorite } from '../src/lib/store'
import { todayISO } from '../src/lib/dates'
import type { Profile } from '../src/lib/types'

const profile: Profile = {
  name: 'Priya',
  sex: 'female',
  age: 29,
  heightCm: 166,
  weightKg: 68,
  targetWeightKg: 61,
  activity: 'moderate',
  goal: 'lose',
  pace: 'steady',
  diet: 'vegetarian',
  mealsPerDay: 4,
  units: 'metric',
  createdAt: '2026-01-01T00:00:00.000Z',
}

const checks: [string, string][] = []
let failures = 0

/** React SSR splits interpolated text with comment markers and escapes entities. */
function normalize(html: string): string {
  return html
    .replace(/<!-- -->/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
}

function render(name: string, node: React.ReactNode, expect: string[]) {
  try {
    const html = normalize(renderToString(h(ToastProvider, null, node)))
    const missing = expect.filter((needle) => !html.includes(needle))
    if (missing.length > 0) {
      failures++
      checks.push([name, `MISSING TEXT: ${missing.join(' | ')}`])
    } else {
      checks.push([name, `ok (${html.length} chars)`])
    }
  } catch (error) {
    failures++
    checks.push([name, `THREW: ${(error as Error).message}`])
  }
}

// 1. Onboarding (no profile yet)
render('Onboarding', h(App), ['Vitalis', 'Welcome to Vitalis', 'Continue'])

// 2. Seed a full state and render every tab
saveProfile(profile)
const today = todayISO()
const targets = computeTargets(profile)
const plan = generateDayPlan({
  targets,
  diet: profile.diet,
  mealsPerDay: profile.mealsPerDay,
  date: today,
  favorites: [],
})
setPlan(plan)
setWater(today, 3)
setWeight(66.4, today)
addLogEntry({ date: today, slot: 'breakfast', foodId: 'oats', grams: 60 })
addLogEntry({ date: today, slot: 'breakfast', foodId: 'greek-yogurt-0', grams: 170 })
addLogEntry({ date: today, slot: 'lunch', foodId: 'paneer', grams: 120 })
toggleFavorite('paneer')
render('Dashboard', h(Dashboard, { onNavigate: () => {} }), ['Hey Priya', 'Calories today', 'Macros', 'Water'])
render('Diary', h(Diary), ['Food diary', 'Breakfast', 'Rolled oats', 'Add food'])
render('MealPlanView', h(MealPlanView), ['Meal plans', 'Vegetarian', 'Non-vegetarian', 'Vegan', 'Shopping list'])
render('Progress', h(Progress), ['Progress', 'Weight trend', 'Energy, last 14 days', 'Average macros'])
render('ProfileView', h(ProfileView, { onReset: () => {} }), ['Profile', 'About you', 'Goal & diet', 'Your data'])
render('AddFoodModal', h(AddFoodModal, {
  date: today,
  slot: 'dinner' as const,
  diet: 'vegetarian' as const,
  onClose: () => {},
  onAdd: () => {},
}), ['Add to Dinner', 'Search chicken, oats, paneer, dal…'])

for (const [name, result] of checks) {
  console.log(`${result.startsWith('ok') ? '  ok  ' : ' FAIL '} ${name.padEnd(16)} ${result}`)
}

if (failures > 0) {
  console.log(`\n${failures} view(s) failed to render`)
  process.exit(1)
}
console.log('\nAll views rendered')
