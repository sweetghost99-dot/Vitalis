/**
 * Food-table integrity.
 *
 * Hard failures: duplicate ids, non-positive serving weights, foods that no
 * meal slot can use (they would be dead weight in the planner), unknown roles.
 *
 * Also cross-checks stated energy against the energy the macro figures imply
 * at 4/4/9 kcal per gram. That sum is only an approximation in both
 * directions, so the band has to be wide to stay useful:
 *   - it OVERestimates high-fibre plants (fibre is counted as carbohydrate but
 *     yields far less energy) — up to ~30 % on leafy vegetables;
 *   - it UNDERestimates animal protein and fat, where the Atwater factors are
 *     nearer 4.3 and 9.0 kcal/g — around 3-6 % on meat and fish.
 * A typo in a macro figure moves energy by far more than that, so only a large
 * underestimate (macros imply under 88 % of the stated energy) is a failure.
 *
 * Run: npx esbuild scripts/data-check.ts --bundle --platform=node --format=cjs --outfile=.tmp/data-check.cjs && node .tmp/data-check.cjs
 */
import { FOODS } from '../src/lib/foods'
import type { FoodRole } from '../src/lib/types'

const VALID_ROLES: FoodRole[] = [
  'protein',
  'carb',
  'fat',
  'vegetable',
  'fruit',
  'dairy',
  'legume',
  'nut',
  'beverage',
]

let failures = 0
const problems: string[] = []

const ids = new Set<string>()
const diets = new Map<string, number>()
const roles = new Set<string>()

for (const food of FOODS) {
  if (ids.has(food.id)) problems.push(`duplicate id: ${food.id}`)
  ids.add(food.id)
  diets.set(food.diet, (diets.get(food.diet) ?? 0) + 1)
  roles.add(food.role)

  if (!(food.serving.grams > 0)) problems.push(`${food.id}: non-positive serving weight`)
  if (food.meals.length === 0) problems.push(`${food.id}: no meal slot, unreachable by the planner`)
  if (!VALID_ROLES.includes(food.role)) problems.push(`${food.id}: unknown role ${food.role}`)

  for (const key of ['kcal', 'protein', 'carbs', 'fat', 'fiber'] as const) {
    const value = food.per100[key]
    if (!Number.isFinite(value) || value < 0) problems.push(`${food.id}: bad ${key} (${value})`)
  }
  // Mass balance. Fibre is part of carbohydrate, so it is NOT added here.
  // A small overshoot is tolerated for rounded published values.
  if (food.per100.protein + food.per100.carbs + food.per100.fat > 101) {
    problems.push(`${food.id}: protein + carbs + fat exceed 100 g per 100 g`)
  }
  if (food.per100.fiber > food.per100.carbs) {
    problems.push(`${food.id}: fibre (${food.per100.fiber}) exceeds total carbohydrate (${food.per100.carbs})`)
  }

  // Typos only: real food never implies this much less energy than published.
  const implied = food.per100.protein * 4 + food.per100.carbs * 4 + food.per100.fat * 9
  if (food.per100.kcal >= 20 && implied < food.per100.kcal * 0.88) {
    problems.push(
      `${food.id}: stated ${food.per100.kcal} kcal but macros imply only ${implied.toFixed(0)} — check the macro figures`,
    )
  }
}

const counts = {
  vegan: diets.get('vegan') ?? 0,
  vegetarian: diets.get('vegetarian') ?? 0,
  'non-veg': diets.get('non-veg') ?? 0,
}

console.log(`foods: ${FOODS.length}`)
console.log(`  vegan ${counts.vegan} · vegetarian ${counts.vegetarian} · non-veg ${counts['non-veg']}`)
console.log(`  roles: ${[...roles].sort().join(', ')}`)

// Each diet must be able to build a real plan: enough protein, carb and
// vegetable choices to fill every meal slot.
for (const diet of ['vegan', 'vegetarian', 'non-veg'] as const) {
  const usable = FOODS.filter((f) =>
    diet === 'non-veg' ? true : diet === 'vegetarian' ? f.diet !== 'non-veg' : f.diet === 'vegan',
  )
  const proteins = usable.filter((f) => f.role === 'protein' || f.role === 'legume').length
  const carbs = usable.filter((f) => f.role === 'carb').length
  const veg = usable.filter((f) => f.role === 'vegetable').length
  console.log(`  ${diet}: ${usable.length} foods (${proteins} protein, ${carbs} carb, ${veg} veg)`)
  if (proteins < 6) problems.push(`${diet}: only ${proteins} protein sources — plans will be repetitive`)
  if (carbs < 5) problems.push(`${diet}: only ${carbs} carbohydrate sources`)
  if (veg < 4) problems.push(`${diet}: only ${veg} vegetables`)
}

if (problems.length > 0) {
  failures = problems.length
  console.log(`\n${problems.length} problem(s):`)
  for (const problem of problems) console.log(`  - ${problem}`)
}

console.log(failures === 0 ? '\nPASSED' : `\nFAILED (${failures})`)
process.exit(failures === 0 ? 0 : 1)
