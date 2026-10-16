import type { Activity, Food, Goal, Macros, Pace, Profile, Targets } from './types'

export const KCAL_PER_KG_FAT = 7700

/** Diet hierarchy: non-veg eaters may eat everything, vegetarians add dairy/eggs, vegans are plant-only. */
export function dietAllows(eater: Profile['diet'], food: Food['diet']): boolean {
  if (eater === 'non-veg') return true
  if (eater === 'vegetarian') return food !== 'non-veg'
  return food === 'vegan'
}

const ACTIVITY_FACTORS: Record<Activity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  athlete: 1.9,
}

export function bmrMifflin(sex: Profile['sex'], weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return sex === 'male' ? base + 5 : base - 161
}

/** Deficit / surplus as a fraction of TDEE, before safety floors. */
const PACE_FRACTION: Record<Goal, Record<Pace, number>> = {
  lose: { gentle: 0.12, steady: 0.2, ambitious: 0.25 },
  gain: { gentle: 0.08, steady: 0.14, ambitious: 0.2 },
  maintain: { gentle: 0, steady: 0, ambitious: 0 },
}

/** Never prescribe below these intakes — the plan always stays safe. */
const KCAL_FLOOR: Record<Profile['sex'], number> = { male: 1500, female: 1200 }

export function proteinPerKg(goal: Goal): number {
  // Higher protein in a deficit protects lean mass; a surplus only needs enough to build.
  if (goal === 'lose') return 2.0
  if (goal === 'gain') return 1.8
  return 1.6
}

export function computeTargets(profile: Profile): Targets {
  const bmr = bmrMifflin(profile.sex, profile.weightKg, profile.heightCm, profile.age)
  const tdee = bmr * ACTIVITY_FACTORS[profile.activity]
  const fraction = PACE_FRACTION[profile.goal][profile.pace]

  let kcal = profile.goal === 'lose' ? tdee * (1 - fraction) : tdee * (1 + fraction)
  // A deficit is never allowed to drop below the safe minimum intake for the sex.
  kcal = Math.max(kcal, KCAL_FLOOR[profile.sex])

  const delta = kcal - tdee

  // Protein, capped so it never crowds out fat and carbohydrate entirely.
  let proteinG = profile.weightKg * proteinPerKg(profile.goal)
  const proteinCeiling = (kcal * 0.4) / 4
  proteinG = Math.min(proteinG, proteinCeiling)
  proteinG = Math.max(proteinG, (kcal * 0.15) / 4)

  // Fat at ~27% of energy, with a hormonal-health floor.
  let fatG = Math.max((kcal * 0.27) / 9, profile.weightKg * 0.6)
  fatG = Math.min(fatG, (kcal * 0.4) / 9)

  const carbKcal = kcal - proteinG * 4 - fatG * 9
  const carbsG = Math.max(carbKcal / 4, 0)

  const fiberG = Math.max(25, Math.min(45, (kcal / 1000) * 14))
  const waterMl = Math.round((profile.weightKg * 35 + 500) / 50) * 50

  let projectedWeeks: number | null = null
  const toGo = Math.abs(profile.targetWeightKg - profile.weightKg)
  if (profile.goal !== 'maintain' && toGo > 0.2 && Math.abs(delta) > 50) {
    const kgPerWeek = Math.abs(delta) / KCAL_PER_KG_FAT * 7
    projectedWeeks = kgPerWeek > 0.02 ? toGo / kgPerWeek : null
  }

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    kcal: Math.round(kcal / 10) * 10,
    protein: Math.round(proteinG),
    carbs: Math.round(carbsG),
    fat: Math.round(fatG),
    fiber: Math.round(fiberG),
    waterMl,
    delta: Math.round(delta),
    projectedWeeks: projectedWeeks === null ? null : Math.max(1, Math.round(projectedWeeks)),
  }
}

export const EMPTY_MACROS: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }

export function addMacros(a: Macros, b: Macros): Macros {
  return {
    kcal: a.kcal + b.kcal,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
    fiber: a.fiber + b.fiber,
  }
}

export function macrosFor(food: Food, grams: number): Macros {
  const f = grams / 100
  return {
    kcal: food.per100.kcal * f,
    protein: food.per100.protein * f,
    carbs: food.per100.carbs * f,
    fat: food.per100.fat * f,
    fiber: food.per100.fiber * f,
  }
}

export function sumMacros(list: Macros[]): Macros {
  return list.reduce(addMacros, { ...EMPTY_MACROS })
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/** Calories implied by the macro split — used to show that the numbers are self-consistent. */
export function kcalFromMacros(m: Macros): number {
  return m.protein * 4 + m.carbs * 4 + m.fat * 9
}

export function macroSplit(m: Macros): { protein: number; carbs: number; fat: number } {
  const total = Math.max(kcalFromMacros(m), 1)
  return {
    protein: Math.round((m.protein * 4 * 100) / total),
    carbs: Math.round((m.carbs * 4 * 100) / total),
    fat: Math.round((m.fat * 9 * 100) / total),
  }
}

export function kgToLb(kg: number): number {
  return kg * 2.2046226218
}

export function lbToKg(lb: number): number {
  return lb / 2.2046226218
}

export function cmToIn(cm: number): number {
  return cm / 2.54
}

export function inToCm(inches: number): number {
  return inches * 2.54
}

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100
  return weightKg / (m * m)
}

export function bmiBand(value: number): { label: string; tone: 'low' | 'ok' | 'warn' | 'high' } {
  if (value < 18.5) return { label: 'Underweight', tone: 'low' }
  if (value < 25) return { label: 'Healthy', tone: 'ok' }
  if (value < 30) return { label: 'Overweight', tone: 'warn' }
  return { label: 'Obese', tone: 'high' }
}

/** Healthy weight window from a BMI of 18.5–24.9. */
export function healthyWeightRange(heightCm: number): [number, number] {
  const m = heightCm / 100
  return [Math.round(18.5 * m * m * 10) / 10, Math.round(24.9 * m * m * 10) / 10]
}
