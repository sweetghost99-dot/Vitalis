/** Local-date helpers. Everything is keyed by a plain yyyy-mm-dd string so the
 *  store never has to reason about time zones or Date objects. */

export function toISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayISO(): string {
  return toISO(new Date())
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function addDays(iso: string, days: number): string {
  const date = fromISO(iso)
  date.setDate(date.getDate() + days)
  return toISO(date)
}

/** The last `count` days ending today, oldest first. */
export function lastNDays(count: number): string[] {
  const today = todayISO()
  return Array.from({ length: count }, (_, i) => addDays(today, i - (count - 1)))
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function shortDate(iso: string): string {
  const d = fromISO(iso)
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()}`
}

export function weekdayLetter(iso: string): string {
  return WEEKDAYS[fromISO(iso).getDay()][0]
}

export function longDate(iso: string): string {
  const d = fromISO(iso)
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export function relativeDayLabel(iso: string): string {
  const today = todayISO()
  if (iso === today) return 'Today'
  if (iso === addDays(today, -1)) return 'Yesterday'
  if (iso === addDays(today, 1)) return 'Tomorrow'
  return longDate(iso)
}

export function isToday(iso: string): boolean {
  return iso === todayISO()
}
