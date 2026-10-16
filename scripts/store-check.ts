/**
 * Verifies the persistence layer without a browser: installs a localStorage
 * shim, drives the store through a realistic session, then checks the stored
 * JSON and the selectors.
 *
 * Run: npx esbuild scripts/store-check.ts --bundle --platform=node --format=cjs --outfile=.tmp/store-check.cjs && node .tmp/store-check.cjs
 */
let failures = 0
function check(name: string, condition: boolean, detail = '') {
  if (condition) {
    console.log(`  ok   ${name}`)
  } else {
    failures++
    console.log(` FAIL  ${name} ${detail}`)
  }
}

async function main() {
  // Minimal localStorage shim, installed before the store module is evaluated.
  const memory = new Map<string, string>()
  ;(globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => void memory.set(k, v),
    removeItem: (k: string) => void memory.delete(k),
    clear: () => memory.clear(),
    key: (i: number) => [...memory.keys()][i] ?? null,
    get length() {
      return memory.size
    },
  } as Storage

  const store = await import('../src/lib/store')
  const { computeTargets } = await import('../src/lib/nutrition')
  const today = (await import('../src/lib/dates')).todayISO()

  const profile = {
    name: 'Sam',
    sex: 'male' as const,
    age: 34,
    heightCm: 180,
    weightKg: 86,
    targetWeightKg: 78,
    activity: 'active' as const,
    goal: 'lose' as const,
    pace: 'steady' as const,
    diet: 'non-veg' as const,
    mealsPerDay: 4 as const,
    units: 'metric' as const,
    createdAt: '2026-01-01T00:00:00.000Z',
  }

  check('starts empty', store.getState().profile === null)
  store.saveProfile(profile)
  check('profile saved', store.getState().profile?.name === 'Sam')

  store.addLogEntry({ date: today, slot: 'breakfast', foodId: 'oats', grams: 80 })
  store.addLogEntry({ date: today, slot: 'lunch', foodId: 'chicken-breast', grams: 180 })
  store.addManyLogEntries([
    { date: today, slot: 'dinner', foodId: 'brown-rice', grams: 200 },
    { date: today, slot: 'dinner', foodId: 'broccoli', grams: 150 },
  ])
  check('four entries logged', store.getState().log.length === 4)

  const totals = store.dayTotals(today)
  // 80g oats + 180g chicken breast + 200g brown rice + 150g broccoli
  const expected = {
    kcal: (389 * 0.8) + (165 * 1.8) + (123 * 2) + (35 * 1.5),
    protein: (16.9 * 0.8) + (31 * 1.8) + (2.7 * 2) + (2.4 * 1.5),
  }
  check(
    'day totals match hand calculation',
    Math.abs(totals.kcal - expected.kcal) < 1 && Math.abs(totals.protein - expected.protein) < 0.5,
    `got ${totals.kcal.toFixed(1)} kcal / ${totals.protein.toFixed(1)} g, expected ${expected.kcal.toFixed(1)} / ${expected.protein.toFixed(1)}`,
  )

  check('streak counts today', store.currentStreak() === 1)

  const yesterday = (await import('../src/lib/dates')).addDays(today, -1)
  store.setWeight(88.4, yesterday)
  store.setWeight(85.1)
  store.setWeight(84.6)
  store.setWater(today, 5)
  store.toggleFavorite('oats')
  store.toggleFavorite('oats')
  store.toggleFavorite('paneer')
  check('favourites toggle', store.getState().favorites.join() === 'paneer')
  check('water clamped', store.getState().water[today] === 5)
  check('latest weight is the newest date', store.latestWeight() === 84.6)

  // Logging again on the same day replaces that day rather than duplicating it.
  store.setWeight(84.2)
  check(
    'same-day weight replaces',
    store.getState().weights.filter((w) => w.date === today).length === 1 &&
      store.getState().weights.length === 2,
    `total ${store.getState().weights.length}`,
  )
  check('weights sorted oldest first', store.getState().weights[0].date === yesterday)

  // The stored payload must be valid JSON with everything intact.
  const raw = memory.get('vitalis.state.v1')
  check('state persisted', typeof raw === 'string' && raw.length > 100)
  const parsed = JSON.parse(raw ?? '{}')
  check('persisted profile survives', parsed.profile?.name === 'Sam')
  check('persisted log survives', Array.isArray(parsed.log) && parsed.log.length === 4)
  check(
    'persisted weights survive',
    Array.isArray(parsed.weights) && parsed.weights.length === 2,
    `got ${parsed.weights?.length}`,
  )

  // Export/import round-trip.
  const backup = store.exportJSON()
  check('export is valid JSON', (() => {
    try {
      JSON.parse(backup)
      return true
    } catch {
      return false
    }
  })())

  store.resetAll()
  check('reset clears everything', store.getState().profile === null && store.getState().log.length === 0)
  const restored = store.importJSON(backup)
  check('import reports success', restored.ok)
  check('import restores log', store.getState().log.length === 4)
  check('import restores profile', store.getState().profile?.name === 'Sam')
  check('import restores targets', (() => {
    const p = store.getState().profile
    return p ? computeTargets(p).kcal > 1500 : false
  })())
  check('garbage import rejected', store.importJSON('not json').ok === false)

  // Selector: entries are ordered by insertion.
  const ordered = store.entriesFor(today)
  check('entries ordered', ordered[0].foodId === 'oats' && ordered[3].foodId === 'broccoli')

  console.log(failures === 0 ? '\nPASSED' : `\n${failures} CHECK(S) FAILED`)
  if (failures > 0) process.exit(1)
}

main().catch((error) => {
  console.error('threw:', error)
  process.exit(1)
})
