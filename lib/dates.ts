/** All dates are handled as YYYY-MM-DD strings to avoid timezone drift. */

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Parse a YYYY-MM-DD string into a local Date (no timezone shift). */
export function parseISODate(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number)
  return new Date(y, m - 1, d)
}

/** Inclusive list of ISO date strings between start and end. */
export function dateRange(startISO: string, endISO: string): string[] {
  const out: string[] = []
  const start = parseISODate(startISO)
  const end = parseISODate(endISO)
  const cur = new Date(start)
  let guard = 0
  while (cur <= end && guard < 366) {
    out.push(toISODate(cur))
    cur.setDate(cur.getDate() + 1)
    guard++
  }
  return out
}

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTH = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

export function formatWeekday(iso: string): string {
  return WEEKDAY[parseISODate(iso).getDay()]
}

export function formatDayMonth(iso: string): string {
  const d = parseISODate(iso)
  return `${MONTH[d.getMonth()]} ${d.getDate()}`
}

export function formatFullDate(iso: string): string {
  const d = parseISODate(iso)
  return `${WEEKDAY[d.getDay()]}, ${MONTH[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

export function formatDateRange(startISO: string, endISO: string): string {
  const s = parseISODate(startISO)
  const e = parseISODate(endISO)
  if (startISO === endISO) return formatFullDate(startISO)
  const sameYear = s.getFullYear() === e.getFullYear()
  const sameMonth = sameYear && s.getMonth() === e.getMonth()
  if (sameMonth) {
    return `${MONTH[s.getMonth()]} ${s.getDate()}–${e.getDate()}, ${e.getFullYear()}`
  }
  if (sameYear) {
    return `${MONTH[s.getMonth()]} ${s.getDate()} – ${MONTH[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`
  }
  return `${formatDayMonth(startISO)}, ${s.getFullYear()} – ${formatDayMonth(endISO)}, ${e.getFullYear()}`
}

/** Format a 24-hour "HH:MM" time string as a 12-hour AM/PM label. */
export function formatTime(time: string): string {
  const [hStr, mStr] = time.split(":")
  const h = Number(hStr)
  const m = Number(mStr)
  if (Number.isNaN(h) || Number.isNaN(m)) return time
  const period = h >= 12 ? "PM" : "AM"
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`
}

export function isWeekend(iso: string): boolean {
  const day = parseISODate(iso).getDay()
  return day === 0 || day === 6
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function addDaysISO(iso: string, days: number): string {
  const date = parseISODate(iso)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

export function getRecurringDates(
  type: string,
  startISO: string,
  weekday: number | null,
  ordinal: string | null,
  count = 3,
): string[] {
  if (weekday == null || !["weekly", "monthly"].includes(type)) return []
  const today = parseISODate(todayISO())
  const anchor = parseISODate(startISO) > today ? parseISODate(startISO) : today
  const dates: string[] = []

  if (type === "weekly") {
    const first = new Date(anchor)
    first.setDate(first.getDate() + ((weekday - first.getDay() + 7) % 7))
    for (let i = 0; i < count; i++) {
      const next = new Date(first)
      next.setDate(first.getDate() + i * 7)
      dates.push(toISODate(next))
    }
    return dates
  }

  const ordinalIndex = ordinal === "first" ? 1 : ordinal === "second" ? 2 : ordinal === "third" ? 3 : ordinal === "fourth" ? 4 : -1
  const cursor = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  while (dates.length < count) {
    if (ordinalIndex === -1) {
      const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
      last.setDate(last.getDate() - ((last.getDay() - weekday + 7) % 7))
      if (last >= anchor) dates.push(toISODate(last))
    } else {
      const first = new Date(cursor)
      first.setDate(1 + ((weekday - first.getDay() + 7) % 7) + (ordinalIndex - 1) * 7)
      if (first.getMonth() === cursor.getMonth() && first >= anchor) dates.push(toISODate(first))
    }
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return dates
}

export function formatRecurrence(type: string, weekday: number | null, ordinal: string | null): string | null {
  if (type === "weekly" && weekday != null) return `Every ${WEEKDAY_FULL[weekday]}`
  if (type === "monthly" && weekday != null && ordinal) return `${capitalize(ordinal)} ${WEEKDAY_FULL[weekday]} of every month`
  return null
}

const WEEKDAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
function capitalize(value: string): string { return value.charAt(0).toUpperCase() + value.slice(1) }
