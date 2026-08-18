"use client"

import { useMemo, useState, useTransition } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { listPersonalAvailability, setPersonalAvailability, type PersonalAvailabilityStatus } from "@/app/actions/personal-availability"
import { Button } from "@/components/ui/button"

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export function PersonalAvailabilityCalendar({
  initialMonth,
  initialStatuses = {},
}: {
  initialMonth?: string
  initialStatuses?: Record<string, PersonalAvailabilityStatus>
}) {
  const [month, setMonth] = useState(() => {
    const [year, monthNumber] = (initialMonth ?? monthKey(new Date())).split("-").map(Number)
    return new Date(year, monthNumber - 1, 1)
  })
  const [statuses, setStatuses] = useState<Record<string, PersonalAvailabilityStatus>>(initialStatuses)
  const [isPending, startTransition] = useTransition()
  const monthLabel = month.toLocaleDateString(undefined, { month: "long", year: "numeric" })

  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1)
    const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    return Array.from({ length: first.getDay() + total }, (_, index) => {
      if (index < first.getDay()) return null
      return new Date(month.getFullYear(), month.getMonth(), index - first.getDay() + 1)
    })
  }, [month])

  function changeMonth(offset: number) {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1)
    setMonth(next)
    startTransition(async () => {
      const rows = await listPersonalAvailability(monthKey(next))
      setStatuses(Object.fromEntries(rows.map((row) => [row.date, row.status as PersonalAvailabilityStatus])))
    })
  }

  function toggleDate(date: Date) {
    const key = isoDate(date)
    const nextStatus = statuses[key] === "available" ? "unavailable" : "available"
    setStatuses((current) => ({ ...current, [key]: nextStatus }))
    startTransition(() => setPersonalAvailability(key, nextStatus))
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Your availability</h2>
          <p className="text-sm text-muted-foreground">Tap a date to mark yourself available or unavailable.</p>
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" aria-label="Previous month" onClick={() => changeMonth(-1)} disabled={isPending}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Next month" onClick={() => changeMonth(1)} disabled={isPending}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
      <div className="mb-3 text-center text-sm font-medium text-foreground">{monthLabel}</div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        {weekdays.map((day) => <div key={day} className="py-2">{day}</div>)}
        {days.map((date, index) => date ? (
          <button
            key={isoDate(date)}
            type="button"
            onClick={() => toggleDate(date)}
            aria-label={`${date.toLocaleDateString(undefined, { month: "long", day: "numeric" })}: ${statuses[isoDate(date)] ?? "unmarked"}`}
            className={`min-h-11 rounded-lg border text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${statuses[isoDate(date)] === "available" ? "border-primary bg-primary/15 text-primary" : statuses[isoDate(date)] === "unavailable" ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-transparent bg-muted/40 text-foreground hover:bg-muted"}`}
          >
            {date.getDate()}
          </button>
        ) : <div key={`empty-${index}`} aria-hidden="true" />)}
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-primary" />Available</span>
        <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-destructive" />Unavailable</span>
      </div>
    </div>
  )
}
