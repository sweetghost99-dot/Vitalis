/**
 * Verifies the meal-plan engine end to end:
 *  - macro/energy accuracy against the computed targets
 *  - diet compliance (no non-vegetarian food in a vegetarian plan, no animal
 *    food in a vegan plan)
 *  - no duplicates inside a day, no empty meals, portions within bounds
 *
 * Run with:  npx esbuild scripts/planner-check.ts --bundle --platform=node --format=cjs --outfile=/tmp/planner-check.cjs && node /tmp/planner-check.cjs
 */
import { getFood } from '../src/lib/foods'
import { computeTargets, dietAllows } from '../src/lib/nutrition'
import { generateDayPlan } from '../src/lib/planner'
import type { DietPref, Goal, Profile } from '../src/lib/types'

const base: Profile = {
  name: 'Test',
  sex: 'female',
  age: 30,
  heightCm: 165,
  weightKg: 70,
  targetWeightKg: 62,
  activity: 'moderate',
  goal: 'lose',
  pace: 'steady',
  diet: 'vegetarian',
  mealsPerDay: 4,
  units: 'metric',
  createdAt: '2026-01-01T00:00:00.000Z',
}

const diets: DietPref[] = ['vegan', 'vegetarian', 'non-veg']
const goals: Goal[] = ['lose', 'maintain', 'gain']
const mealCounts = [3, 4, 5] as const

interface Row {
  label: string
  kcalTarget: number
  kcalErr: number
  proteinTarget: number
  proteinErr: number
  carbErr: number
  fatErr: number
  violations: string[]
  issues: string[]
}

const rows: Row[] = []
let failures = 0

for (const diet of diets) {
  for (const goal of goals) {
    for (const mealsPerDay of mealCounts) {
      const profile: Profile = { ...base, diet, goal, mealsPerDay }
      const targets = computeTargets(profile)

      // Several seeds so we test many draws, not one lucky plan.
      for (let seed = 1; seed <= 12; seed++) {
        const date = `2026-05-${String(seed).padStart(2, '0')}`
        const plan = generateDayPlan({ targets, diet, mealsPerDay, date, seed: seed * 7919 })
        const violations: string[] = []
        const issues: string[] = []
        const seen = new Set<string>()

        for (const meal of plan.meals) {
          if (meal.items.length === 0) issues.push(`empty meal ${meal.slot}`)
          for (const item of meal.items) {
            const food = getFood(item.foodId)
            if (!food) {
              issues.push(`unknown food ${item.foodId}`)
              continue
            }
            if (!dietAllows(diet, food.diet)) violations.push(`${food.name} (${food.diet}) in ${diet} plan`)
            if (seen.has(item.foodId)) issues.push(`duplicate ${food.name}`)
            seen.add(item.foodId)
            if (item.grams <= 0) issues.push(`zero portion ${food.name}`)
            if (item.grams > food.serving.grams * 4) issues.push(`huge portion ${food.name} ${item.grams}g`)
          }
        }

        const kcalErr = (plan.totals.kcal - targets.kcal) / targets.kcal
        const proteinErr = (plan.totals.protein - targets.protein) / targets.protein
        const carbErr = (plan.totals.carbs - targets.carbs) / targets.carbs
        const fatErr = (plan.totals.fat - targets.fat) / targets.fat

        rows.push({
          label: `${diet} / ${goal} / ${mealsPerDay}m / seed ${seed}`,
          kcalTarget: targets.kcal,
          kcalErr,
          proteinTarget: targets.protein,
          proteinErr,
          carbErr,
          fatErr,
          violations,
          issues,
        })
      }
    }
  }
}

const avg = (pick: (r: Row) => number) => rows.reduce((s, r) => s + Math.abs(pick(r)), 0) / rows.length
const signed = (pick: (r: Row) => number) => rows.reduce((s, r) => s + pick(r), 0) / rows.length
const pct = (n: number) => `${(n * 100).toFixed(1)}%`

const withinKcal = rows.filter((r) => Math.abs(r.kcalErr) <= 0.05).length
const withinProtein = rows.filter((r) => Math.abs(r.proteinErr) <= 0.1).length
const withViolations = rows.filter((r) => r.violations.length > 0)
const withIssues = rows.filter((r) => r.issues.length > 0)

console.log(`plans generated: ${rows.length}`)
console.log(`mean |error| — kcal ${pct(avg((r) => r.kcalErr))}, protein ${pct(avg((r) => r.proteinErr))}, carbs ${pct(avg((r) => r.carbErr))}, fat ${pct(avg((r) => r.fatErr))}`)
console.log(`mean signed — kcal ${pct(signed((r) => r.kcalErr))}, protein ${pct(signed((r) => r.proteinErr))} (positive = over target)`)
console.log(`within 5% of energy target:  ${withinKcal}/${rows.length}`)
console.log(`within 10% of protein target: ${withinProtein}/${rows.length}`)

const worst = [...rows].sort((a, b) => Math.abs(b.kcalErr) - Math.abs(a.kcalErr)).slice(0, 5)
console.log('\nworst energy misses:')
for (const r of worst) {
  console.log(
    `  ${r.label.padEnd(34)} target ${String(r.kcalTarget).padStart(5)} kcal → ${pct(r.kcalErr)} energy, ${pct(r.proteinErr)} protein`,
  )
}

if (withViolations.length > 0) {
  failures++
  console.log(`\nDIET VIOLATIONS in ${withViolations.length} plans:`)
  for (const r of withViolations.slice(0, 5)) console.log(`  ${r.label}: ${r.violations.slice(0, 3).join(', ')}`)
}

if (withIssues.length > 0) {
  failures++
  console.log(`\nSTRUCTURAL ISSUES in ${withIssues.length} plans:`)
  for (const r of withIssues.slice(0, 5)) console.log(`  ${r.label}: ${r.issues.slice(0, 3).join(', ')}`)
}

// Show one full sample plan so the output is human-checkable.
console.log(`\nsample — vegetarian / lose / 4m`)
const sampleProfile: Profile = { ...base, diet: 'vegetarian', goal: 'lose', mealsPerDay: 4 }
const sampleTargets = computeTargets(sampleProfile)
const samplePlan = generateDayPlan({ targets: sampleTargets, diet: 'vegetarian', mealsPerDay: 4, date: '2026-05-01', seed: 7919 })
for (const meal of samplePlan.meals) {
  console.log(`  ${meal.slot}: ${Math.round(meal.totals.kcal)} kcal, ${meal.totals.protein.toFixed(1)}g P`)
  for (const item of meal.items) {
    const f = getFood(item.foodId)!
    console.log(`     · ${item.grams}g ${f.name}`)
  }
}
console.log(`  TOTAL ${Math.round(samplePlan.totals.kcal)} / ${sampleTargets.kcal} kcal · ${samplePlan.totals.protein.toFixed(1)} / ${sampleTargets.protein} g protein`)

if (failures > 0) {
  console.log('\nFAILED')
  process.exit(1)
}
console.log('\nPASSED — no diet violations, no structural issues')
