export type Sex = 'male' | 'female'
export type Goal = 'lose' | 'maintain' | 'gain'
export type DietPref = 'vegan' | 'vegetarian' | 'non-veg'
export type Activity = 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete'
export type Pace = 'gentle' | 'steady' | 'ambitious'
export type Units = 'metric' | 'imperial'
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'evening'
export type FoodRole =
  | 'protein'
  | 'carb'
  | 'fat'
  | 'vegetable'
  | 'fruit'
  | 'dairy'
  | 'legume'
  | 'nut'
  | 'beverage'

export interface Profile {
  name: string
  sex: Sex
  age: number
  heightCm: number
  weightKg: number
  activity: Activity
  goal: Goal
  pace: Pace
  diet: DietPref
  mealsPerDay: 3 | 4 | 5
  targetWeightKg: number
  units: Units
  createdAt: string
}

export interface Macros {
  kcal: number
  protein: number
  carbs: number
  fat: number
  fiber: number
}

export interface Targets extends Macros {
  bmr: number
  tdee: number
  waterMl: number
  /** kcal/day change, negative for a deficit */
  delta: number
  projectedWeeks: number | null
}

export interface Food {
  id: string
  name: string
  /** Who may eat it, on the vegan → vegetarian → non-veg axis. See dietAllows(). */
  diet: DietPref
  role: FoodRole
  /** meal slots this food belongs in */
  meals: MealSlot[]
  /** default portion label + weight in grams */
  serving: { label: string; grams: number }
  per100: Macros
  tags?: string[]
}

export interface PlanItem {
  foodId: string
  grams: number
}

export interface PlanMeal {
  slot: MealSlot
  items: PlanItem[]
  totals: Macros
}

export interface DayPlan {
  /** iso date yyyy-mm-dd */
  date: string
  seed: number
  meals: PlanMeal[]
  totals: Macros
  diet: DietPref
}

export interface LogEntry {
  id: string
  date: string
  slot: MealSlot
  foodId: string
  grams: number
  addedAt: number
}

export interface WeightEntry {
  date: string
  kg: number
}

export interface AppState {
  profile: Profile | null
  log: LogEntry[]
  weights: WeightEntry[]
  water: Record<string, number>
  plans: Record<string, DayPlan>
  favorites: string[]
  onboarded: boolean
}

export const MEAL_LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
  evening: 'Evening',
}

export const GOAL_LABELS: Record<Goal, string> = {
  lose: 'Lose fat',
  maintain: 'Maintain',
  gain: 'Build muscle',
}

export const DIET_LABELS: Record<DietPref, string> = {
  vegan: 'Vegan',
  vegetarian: 'Vegetarian',
  'non-veg': 'Non-vegetarian',
}

export const ACTIVITY_LABELS: Record<Activity, string> = {
  sedentary: 'Sedentary · desk job, little exercise',
  light: 'Lightly active · 1–3 sessions / week',
  moderate: 'Moderately active · 3–5 sessions / week',
  active: 'Very active · 6–7 sessions / week',
  athlete: 'Athlete · twice daily / hard labour',
}
