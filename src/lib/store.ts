import { useSyncExternalStore } from 'react'
import { todayISO } from './dates'
import { getFood } from './foods'
import { macrosFor } from './nutrition'
import type { AppState, DayPlan, LogEntry, MealSlot, Profile, WeightEntry } from './types'

const KEY = 'vitalis.state.v1'

const EMPTY: AppState = {
  profile: null,
  log: [],
  weights: [],
  water: {},
  plans: {},
  favorites: [],
  onboarded: false,
}

function load(): AppState {
  if (typeof localStorage === 'undefined') return { ...EMPTY }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...EMPTY }
    const parsed = JSON.parse(raw) as Partial<AppState>
    return {
      profile: parsed.profile ?? null,
      log: Array.isArray(parsed.log) ? parsed.log : [],
      weights: Array.isArray(parsed.weights) ? parsed.weights : [],
      water: parsed.water && typeof parsed.water === 'object' ? parsed.water : {},
      plans: parsed.plans && typeof parsed.plans === 'object' ? parsed.plans : {},
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      onboarded: Boolean(parsed.onboarded),
    }
  } catch {
    return { ...EMPTY }
  }
}

let state: AppState = load()
const listeners = new Set<() => void>()

function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* storage full or blocked — the session still works in memory */
  }
}

function set(patch: Partial<AppState>): void {
  state = { ...state, ...patch }
  persist()
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useApp(): AppState {
  return useSyncExternalStore(subscribe, () => state, () => state)
}

export function getState(): AppState {
  return state
}

export function uid(prefix = 'e'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function saveProfile(profile: Profile): void {
  set({ profile, onboarded: true })
}

export function updateProfile(patch: Partial<Profile>): void {
  if (!state.profile) return
  set({ profile: { ...state.profile, ...patch } })
}

export function addLogEntry(entry: Omit<LogEntry, 'id' | 'addedAt'>): void {
  set({ log: [...state.log, { ...entry, id: uid('log'), addedAt: Date.now() }] })
}

export function addManyLogEntries(entries: Omit<LogEntry, 'id' | 'addedAt'>[]): void {
  const stamp = Date.now()
  set({
    log: [
      ...state.log,
      ...entries.map((e, i) => ({ ...e, id: uid('log'), addedAt: stamp + i })),
    ],
  })
}

export function removeLogEntry(id: string): void {
  set({ log: state.log.filter((e) => e.id !== id) })
}

export function clearDay(date: string): void {
  set({ log: state.log.filter((e) => e.date !== date) })
}

export function moveLogEntry(id: string, slot: MealSlot, grams: number): void {
  set({
    log: state.log.map((e) => (e.id === id ? { ...e, slot, grams } : e)),
  })
}

export function logPlan(plan: DayPlan): void {
  const entries: Omit<LogEntry, 'id' | 'addedAt'>[] = []
  for (const meal of plan.meals) {
    for (const item of meal.items) {
      entries.push({ date: plan.date, slot: meal.slot, foodId: item.foodId, grams: item.grams })
    }
  }
  addManyLogEntries(entries)
}

export function setPlan(plan: DayPlan): void {
  set({ plans: { ...state.plans, [plan.date]: plan } })
}

export function clearPlan(date: string): void {
  const next = { ...state.plans }
  delete next[date]
  set({ plans: next })
}

export function setWeight(kg: number, date = todayISO()): void {
  const others = state.weights.filter((w) => w.date !== date)
  const entry: WeightEntry = { date, kg: Math.round(kg * 10) / 10 }
  set({ weights: [...others, entry].sort((a, b) => a.date.localeCompare(b.date)) })
}

export function removeWeight(date: string): void {
  set({ weights: state.weights.filter((w) => w.date !== date) })
}

export function setWater(date: string, glasses: number): void {
  set({ water: { ...state.water, [date]: Math.max(0, Math.min(20, glasses)) } })
}

export function toggleFavorite(foodId: string): void {
  set({
    favorites: state.favorites.includes(foodId)
      ? state.favorites.filter((f) => f !== foodId)
      : [...state.favorites, foodId],
  })
}

export function resetAll(): void {
  state = { ...EMPTY, plans: {}, log: [], weights: [], water: {}, favorites: [] }
  persist()
  listeners.forEach((l) => l())
}

export function exportJSON(): string {
  return JSON.stringify(state, null, 2)
}

export function importJSON(raw: string): { ok: boolean; error?: string } {
  try {
    const parsed = JSON.parse(raw) as Partial<AppState>
    if (!parsed || typeof parsed !== 'object') return { ok: false, error: 'Not a Vitalis backup file.' }
    set({
      profile: parsed.profile ?? null,
      log: Array.isArray(parsed.log) ? parsed.log : [],
      weights: Array.isArray(parsed.weights) ? parsed.weights : [],
      water: parsed.water ?? {},
      plans: parsed.plans ?? {},
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      onboarded: Boolean(parsed.profile) || Boolean(parsed.onboarded),
    })
    return { ok: true }
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' }
  }
}

// ── Selectors ───────────────────────────────────────────────────────────────

export function entriesFor(date: string): LogEntry[] {
  return state.log.filter((e) => e.date === date).sort((a, b) => a.addedAt - b.addedAt)
}

export function dayTotals(date: string) {
  return entriesFor(date).reduce(
    (acc, entry) => {
      const food = getFood(entry.foodId)
      if (!food) return acc
      const m = macrosFor(food, entry.grams)
      return {
        kcal: acc.kcal + m.kcal,
        protein: acc.protein + m.protein,
        carbs: acc.carbs + m.carbs,
        fat: acc.fat + m.fat,
        fiber: acc.fiber + m.fiber,
      }
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  )
}

/** Consecutive days ending today with at least one logged entry. */
export function currentStreak(): number {
  const days = new Set(state.log.map((e) => e.date))
  let streak = 0
  let cursor = todayISO()
  // Today not logged yet should not break yesterday's streak.
  if (!days.has(cursor)) cursor = shift(cursor, -1)
  while (days.has(cursor)) {
    streak++
    cursor = shift(cursor, -1)
  }
  return streak
}

function shift(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function latestWeight(): number | null {
  if (state.weights.length === 0) return null
  return state.weights[state.weights.length - 1].kg
}
