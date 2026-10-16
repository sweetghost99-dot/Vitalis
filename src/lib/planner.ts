import { FOODS, getFood, proteinDensity } from './foods'
import { dietAllows, macrosFor, sumMacros } from './nutrition'
import type { DietPref, Food, FoodRole, Macros, MealSlot, PlanItem, PlanMeal, Targets, DayPlan } from './types'

/** Deterministic PRNG so a given (date, seed) always yields the same plan. */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const SLOT_ORDER: MealSlot[] = ['breakfast', 'snack', 'lunch', 'evening', 'dinner']

/** Which meal slots a day contains, and what share of the day's energy each gets. */
const DAY_LAYOUTS: Record<3 | 4 | 5, { slot: MealSlot; share: number }[]> = {
  3: [
    { slot: 'breakfast', share: 0.3 },
    { slot: 'lunch', share: 0.4 },
    { slot: 'dinner', share: 0.3 },
  ],
  4: [
    { slot: 'breakfast', share: 0.26 },
    { slot: 'lunch', share: 0.34 },
    { slot: 'snack', share: 0.12 },
    { slot: 'dinner', share: 0.28 },
  ],
  5: [
    { slot: 'breakfast', share: 0.22 },
    { slot: 'snack', share: 0.1 },
    { slot: 'lunch', share: 0.28 },
    { slot: 'evening', share: 0.1 },
    { slot: 'dinner', share: 0.3 },
  ],
}

/** Base role recipe per meal: which kinds of food belong on the plate. */
const RECIPES: Record<MealSlot, FoodRole[]> = {
  breakfast: ['protein', 'carb', 'fruit', 'fat'],
  lunch: ['protein', 'carb', 'vegetable', 'fat'],
  dinner: ['protein', 'carb', 'vegetable', 'fat'],
  snack: ['protein', 'fruit', 'nut'],
  evening: ['protein', 'fruit'],
}

/**
 * A big meal needs more levers than a small one: four foods can only be solved
 * for four targets exactly if nothing hits its portion bounds, and a "gaining"
 * day needs very large meals. Adding a calorie-dense extra keeps the energy
 * target reachable without pushing protein or carbohydrate off.
 */
function recipeFor(slot: MealSlot, mealKcal: number): FoodRole[] {
  const recipe = RECIPES[slot].slice()
  if (mealKcal > 600) recipe.push(slot === 'breakfast' ? 'carb' : 'fat')
  if (mealKcal > 880) recipe.push('carb')
  return recipe
}

/** Portions never shrink below this fraction of a normal serving. */
const MIN_FRACTION: Record<FoodRole, number> = {
  protein: 0.5,
  carb: 0.5,
  vegetable: 0.6,
  fruit: 0.5,
  fat: 0,
  nut: 0.35,
  dairy: 0.4,
  legume: 0.6,
  beverage: 1,
}

/** How strongly each nutrient is chased, and the instability guard for tiny targets. */
const NUTRIENT_WEIGHTS: { key: keyof Macros; weight: number; floor: number }[] = [
  { key: 'kcal', weight: 2.6, floor: 120 },
  { key: 'protein', weight: 1.2, floor: 15 },
  { key: 'carbs', weight: 0.7, floor: 20 },
  { key: 'fat', weight: 0.5, floor: 8 },
]

function shuffle<T>(list: T[], rng: () => number): T[] {
  const out = list.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function candidates(diet: DietPref, slot: MealSlot, role: FoodRole, used: Set<string>): Food[] {
  const allowed = FOODS.filter((f) => dietAllows(diet, f.diet))
  const passes = (f: Food, checkSlot: boolean) =>
    f.role === role && (!checkSlot || f.meals.includes(slot)) && !used.has(f.id)

  let pool = allowed.filter((f) => passes(f, true))
  if (pool.length === 0) pool = allowed.filter((f) => passes(f, false))
  if (pool.length === 0) pool = allowed.filter((f) => f.meals.includes(slot) && !used.has(f.id))
  return pool
}

/** Rank so that the "right kind" of food wins for a role, then pick among the best few for variety. */
function rankFor(food: Food, role: FoodRole, neededProtein: number): number {
  if (role === 'protein') {
    // A dense source is useless if a normal portion cannot carry the meal's
    // protein. Weight density by how much of the target the food can actually
    // deliver at its maximum sensible portion (3.5× a serving).
    const capacity = 3.5 * food.serving.grams * (food.per100.protein / 100)
    const coverage = Math.min(1, capacity / Math.max(neededProtein, 1))
    return proteinDensity(food) * (0.3 + 0.7 * coverage) + (food.tags?.includes('high-protein') ? 3 : 0)
  }
  if (role === 'vegetable') return food.per100.fiber * 4 - food.per100.kcal * 0.05
  if (role === 'fruit') return food.per100.fiber * 3 + food.per100.carbs * 0.2
  if (role === 'carb') return food.per100.fiber * 3 + (food.tags?.includes('indian') ? 2 : 0)
  if (role === 'fat' || role === 'nut') return food.per100.fat
  return 0
}

function pickFood(
  diet: DietPref,
  slot: MealSlot,
  role: FoodRole,
  used: Set<string>,
  rng: () => number,
  neededProtein = 0,
): Food | null {
  const pool = candidates(diet, slot, role, used)
  if (pool.length === 0) return null
  const ranked = shuffle(pool, rng)
    .map((food) => ({ food, score: rankFor(food, role, neededProtein) }))
    .sort((a, b) => b.score - a.score)

  // Weighted draw from the top of the ranking: good options stay common, but
  // the plan is not identical every time. Protein is biased harder toward the
  // top, because a weak protein source makes the meal's target unreachable.
  const window = ranked.slice(0, Math.min(role === 'protein' ? 3 : 4, ranked.length))
  const weights = window.map((_, i) => 1 / (i + 1))
  const total = weights.reduce((a, b) => a + b, 0)
  let roll = rng() * total
  for (let i = 0; i < window.length; i++) {
    roll -= weights[i]
    if (roll <= 0) return window[i].food
  }
  return window[window.length - 1].food
}

/** Weighted, scale-free squared error of a portion vector against a target. */
function planError(items: Food[], grams: number[], target: Macros): number {
  let error = 0
  for (const { key, weight, floor } of NUTRIENT_WEIGHTS) {
    const scale = Math.max(target[key], floor)
    let actual = 0
    for (let i = 0; i < items.length; i++) actual += (items[i].per100[key] / 100) * grams[i]
    const delta = (actual - target[key]) / scale
    error += weight * delta * delta
  }
  return error
}

/**
 * Solve portion sizes for one meal.
 *
 * Coordinate descent: holding every other item fixed, the portion that best
 * matches the meal's nutrient targets can be written down in closed form,
 * because the error is quadratic in the portion. A light pull toward each
 * food's natural serving keeps portions realistic ("2 rotis", not "137 g of
 * spinach"). Repeated sweeps converge in a handful of iterations.
 */
function solvePortions(items: Food[], target: Macros): number[] {
  const natural = items.map((f) => Math.max(f.serving.grams, 1))
  const x = items.map((f) => Math.min(f.serving.grams, 100))
  const rates: Record<keyof Macros, number>[] = items.map((f) => ({
    kcal: f.per100.kcal / 100,
    protein: f.per100.protein / 100,
    carbs: f.per100.carbs / 100,
    fat: f.per100.fat / 100,
    fiber: f.per100.fiber / 100,
  }))

  const mins = items.map((f) => MIN_FRACTION[f.role] * f.serving.grams)
  const maxs = items.map((f) => 3.5 * f.serving.grams)

  // If the mandatory minimums already blow the meal's budget, scale them back.
  const minKcal = items.reduce((sum, f, i) => sum + (mins[i] * f.per100.kcal) / 100, 0)
  const budget = target.kcal * 0.85
  if (minKcal > budget) {
    const factor = budget / minKcal
    for (let i = 0; i < mins.length; i++) mins[i] = Math.max(0, mins[i] * factor)
  }

  const REG = 0.04

  for (let sweep = 0; sweep < 14; sweep++) {
    for (let i = 0; i < items.length; i++) {
      let numerator = 0
      let denominator = 0

      for (const { key, weight, floor } of NUTRIENT_WEIGHTS) {
        const scale = Math.max(target[key], floor)
        const rate = rates[i][key]
        if (rate <= 0 && target[key] <= 0) continue

        let others = 0
        for (let j = 0; j < items.length; j++) {
          if (j !== i) others += rates[j][key] * x[j]
        }
        const w = weight / (scale * scale)
        numerator += w * rate * (target[key] - others)
        denominator += w * rate * rate
      }

      // Keep portions near a natural size.
      numerator += (REG * natural[i]) / (natural[i] * natural[i])
      denominator += REG / (natural[i] * natural[i])

      let value = denominator > 0 ? numerator / denominator : x[i]
      if (!Number.isFinite(value)) value = x[i]
      x[i] = Math.min(maxs[i], Math.max(mins[i], value))
    }
  }

  // Snap to 5 g so the numbers read like a recipe, then hill-climb in 5 g
  // steps until no single move improves the fit. Rounding alone can drift the
  // meal off target; this recovers almost all of it.
  const grams = x.map((g) => Math.round(g / 5) * 5)
  let current = planError(items, grams, target)

  for (let pass = 0; pass < 60; pass++) {
    let improved = false
    for (let i = 0; i < items.length; i++) {
      for (const step of [5, -5]) {
        const next = grams[i] + step
        if (next < mins[i] || next > maxs[i]) continue
        const previous = grams[i]
        grams[i] = next
        const value = planError(items, grams, target)
        if (value < current - 1e-12) {
          current = value
          improved = true
        } else {
          grams[i] = previous
        }
      }
    }
    if (!improved) break
  }

  return grams
}

export interface PlanRequest {
  targets: Targets
  diet: DietPref
  mealsPerDay: 3 | 4 | 5
  date: string
  seed?: number
  /** Foods to always leave out (allergies, dislikes). */
  exclude?: string[]
  /** Foods to prefer, e.g. what is already in the kitchen. */
  favorites?: string[]
}

export function generateDayPlan(req: PlanRequest): DayPlan {
  const { targets, diet, mealsPerDay, date } = req
  const layout = DAY_LAYOUTS[mealsPerDay] ?? DAY_LAYOUTS[3]
  const baseSeed = req.seed ?? hashString(date)
  const rng = mulberry32(baseSeed)
  const excluded = new Set(req.exclude ?? [])
  const favorites = new Set(req.favorites ?? [])
  const used = new Set<string>()

  const meals: PlanMeal[] = []

  for (const { slot, share } of layout) {
    const mealTarget: Macros = {
      kcal: targets.kcal * share,
      protein: targets.protein * share,
      carbs: targets.carbs * share,
      fat: targets.fat * share,
      fiber: targets.fiber * share,
    }

    const recipe = recipeFor(slot, mealTarget.kcal)
    const chosen: Food[] = []
    for (const role of recipe) {
      const preferred = candidates(diet, slot, role, used).filter(
        (f) => favorites.has(f.id) && !excluded.has(f.id),
      )
      const food =
        (preferred.length > 0 && rng() < 0.75 ? preferred[Math.floor(rng() * preferred.length)] : null) ??
        pickFood(diet, slot, role, used, rng, mealTarget.protein * 0.75)
      // Never pick something excluded, even via the fallback chain.
      if (food && !excluded.has(food.id)) {
        chosen.push(food)
        used.add(food.id)
      }
    }

    if (chosen.length === 0) {
      meals.push({ slot, items: [], totals: { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 } })
      continue
    }

    const grams = solvePortions(chosen, mealTarget)
    const items: PlanItem[] = []
    for (let i = 0; i < chosen.length; i++) {
      if (grams[i] <= 0) continue
      items.push({ foodId: chosen[i].id, grams: grams[i] })
    }

    const totals = sumMacros(
      items.map((it) => {
        const food = getFood(it.foodId)
        return food ? macrosFor(food, it.grams) : { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
      }),
    )

    meals.push({ slot, items, totals })
  }

  return {
    date,
    seed: baseSeed,
    diet,
    meals,
    totals: sumMacros(meals.map((m) => m.totals)),
  }
}

/** Replace a single meal with a fresh pick, leaving the rest of the day intact. */
export function swapMeal(plan: DayPlan, slot: MealSlot, req: Omit<PlanRequest, 'date'>): DayPlan {
  const fresh = generateDayPlan({ ...req, date: plan.date, seed: (req.seed ?? plan.seed) + 7919 })
  const replacement = fresh.meals.find((m) => m.slot === slot)
  if (!replacement) return plan
  const meals = plan.meals.map((m) => (m.slot === slot ? replacement : m))
  return { ...plan, meals, totals: sumMacros(meals.map((m) => m.totals)), seed: fresh.seed }
}

export function hashString(value: string): number {
  let h = 2166136261
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export interface ShoppingLine {
  food: Food
  grams: number
  role: FoodRole
}

/** Aggregate every item in a plan into a shopping list, grouped by aisle. */
export function shoppingList(plan: DayPlan): { role: FoodRole; lines: ShoppingLine[] }[] {
  const totals = new Map<string, number>()
  for (const meal of plan.meals) {
    for (const item of meal.items) {
      totals.set(item.foodId, (totals.get(item.foodId) ?? 0) + item.grams)
    }
  }

  const groups = new Map<FoodRole, ShoppingLine[]>()
  for (const [foodId, grams] of totals) {
    const food = getFood(foodId)
    if (!food) continue
    const list = groups.get(food.role) ?? []
    list.push({ food, grams, role: food.role })
    groups.set(food.role, list)
  }

  return [...groups.entries()]
    .map(([role, lines]) => ({ role, lines: lines.sort((a, b) => b.grams - a.grams) }))
    .sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role))
}

const ROLE_ORDER: FoodRole[] = [
  'protein',
  'legume',
  'dairy',
  'carb',
  'vegetable',
  'fruit',
  'nut',
  'fat',
  'beverage',
]

export const ROLE_LABELS: Record<FoodRole, string> = {
  protein: 'Protein',
  legume: 'Beans & lentils',
  dairy: 'Dairy',
  carb: 'Grains & starches',
  vegetable: 'Vegetables',
  fruit: 'Fruit',
  nut: 'Nuts & seeds',
  fat: 'Oils & fats',
  beverage: 'Drinks',
}

/** Human portion hint, e.g. "≈ 1.5 × 1 cup". */
export function portionLabel(food: Food, grams: number): string {
  const ratio = grams / food.serving.grams
  if (ratio <= 0.12) return `${grams} g`
  const pretty = ratio >= 1.75 ? `${Math.round(ratio * 10) / 10}×` : `${Math.round(ratio * 100) / 100}×`
  return `≈ ${pretty} ${food.serving.label}`
}
