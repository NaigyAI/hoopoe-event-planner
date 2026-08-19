"use client"

import { useMemo, useState, useTransition } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { listPersonalAvailability, setPersonalAvailability, type PersonalAvailabilityStatus } from "@/app/actions/personal-availability"
import { Button } from "@/components/ui/button"
import type { EventSummary } from "@/components/event-card"
import { formatDateRange, formatTime, getRecurringDates } from "@/lib/dates"

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
  events = [],
}: {
  initialMonth?: string
  initialStatuses?: Record<string, PersonalAvailabilityStatus>
  events?: EventSummary[]
}) {
  const [month, setMonth] = useState(() => {
    const [year, monthNumber] = (initialMonth ?? monthKey(new Date())).split("-").map(Number)
    return new Date(year, monthNumber - 1, 1)
  })
  const [statuses, setStatuses] = useState<Record<string, PersonalAvailabilityStatus>>(initialStatuses)
  const [isPending, startTransition] = useTransition()

  const monthLabel = month.toLocaleDateString(undefined, { month: "long", year: "numeric" })
  const visibleEvents = useMemo(() => {
    const monthStart = isoDate(new Date(month.getFullYear(), month.getMonth(), 1))
    const monthEnd = isoDate(new Date(month.getFullYear(), month.getMonth() + 1, 0))
    return events.filter((event) => {
      if (event.recurrenceType !== "none") {
        return getRecurringDates(event.recurrenceType, event.startDate, event.recurrenceWeekday, event.recurrenceOrdinal, 12)
          .some((date) => date >= monthStart && date <= monthEnd)
      }
      return event.startDate <= monthEnd && (event.endDate ?? event.startDate) >= monthStart
    })
  }, [events, month])
  const eventDates = useMemo(() => {
    const dates = new Set<string>()
    for (const event of visibleEvents) {
      if (event.recurrenceType !== "none") {
        getRecurringDates(event.recurrenceType, event.startDate, event.recurrenceWeekday, event.recurrenceOrdinal, 12).forEach((date) => dates.add(date))
      } else {
        const start = new Date(`${event.startDate}T12:00:00`)
        const end = new Date(`${event.endDate ?? event.startDate}T12:00:00`)
        for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) dates.add(isoDate(cursor))
      }
    }
    return dates
  }, [visibleEvents])

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
    const currentStatus = statuses[key]
    const nextStatus: PersonalAvailabilityStatus | null =
      currentStatus === undefined
        ? "available"
        : currentStatus === "available"
          ? "maybe"
          : currentStatus === "maybe"
            ? "unavailable"
            : null
    setStatuses((current) => {
      const next = { ...current }
      if (nextStatus) next[key] = nextStatus
      else delete next[key]
      return next
    })
    startTransition(() => setPersonalAvailability(key, nextStatus))
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-medium tracking-normal">Your availability</h2>
          <p className="text-sm text-muted-foreground">Tap a date to cycle through available, maybe, unavailable and neutral.</p>
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
            className={`flex min-h-11 flex-col items-center justify-center rounded-lg border text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${statuses[isoDate(date)] === "available" ? "border-primary bg-primary/15 text-primary" : statuses[isoDate(date)] === "unavailable" ? "border-destructive/40 bg-destructive/10 text-destructive" : statuses[isoDate(date)] === "maybe" ? "border-yellow-500/50 bg-yellow-400/20 text-yellow-700 dark:text-yellow-300" : "border-transparent bg-muted/40 text-foreground hover:bg-muted"}`}
          >
            <span>{date.getDate()}</span>
            {eventDates.has(isoDate(date)) ? <span className="mt-1 size-1.5 rounded-full bg-accent" aria-label="Event scheduled" /> : null}
          </button>
        ) : <div key={`empty-${index}`} aria-hidden="true" />)}
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-primary" />Available</span>
        <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-yellow-400" />Maybe</span>
        <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-destructive" />Unavailable</span>
        <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-accent" />Event</span>
      </div>
      {visibleEvents.length > 0 ? (
        <div className="mt-6 border-t border-border pt-4">
          <h3 className="text-sm font-medium text-foreground">Upcoming events</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {visibleEvents.map((event) => (
              <div key={event.id} className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                <p className="truncate text-sm font-medium text-foreground">{event.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDateRange(event.startDate, event.endDate ?? event.startDate)}{event.startTime ? ` · ${formatTime(event.startTime)}` : ""}
                </p>
                {event.location ? <p className="truncate text-xs text-muted-foreground">{event.location}</p> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
