"use client"

import Link from "next/link"
import { CalendarDays, X } from "lucide-react"
import { useState, useTransition } from "react"
import type { EventSummary } from "@/components/event-card"
import { setPersonalAvailability } from "@/app/actions/personal-availability"
import { formatDateRange, formatTime } from "@/lib/dates"

type AvailabilitySuggestion = { event: EventSummary; matchingDate: string }

export function AvailabilityEventPrompt({ suggestions }: { suggestions: AvailabilitySuggestion[] }) {
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState(true)
  const [isPending, startTransition] = useTransition()
  const suggestion = suggestions[index]

  function advance() {
    if (index < suggestions.length - 1) setIndex((current) => current + 1)
    else setOpen(false)
  }

  function respond(status: "available" | "unavailable") {
    startTransition(async () => {
      await setPersonalAvailability(suggestion.matchingDate, status)
      advance()
    })
  }

  if (!open || !suggestion) return null
  const { event, matchingDate } = suggestion

  return (
    <aside className="fixed inset-x-4 bottom-4 z-50 sm:left-auto sm:right-6 sm:w-[min(28rem,calc(100vw-3rem))]" role="dialog" aria-label="Event availability suggestion">
      <div className="rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-2xl ring-1 ring-foreground/10">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent-foreground">
            <CalendarDays className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">You may be available</p>
                <h2 className="mt-1 text-lg font-medium tracking-normal text-foreground">Want to attend {event.title}?</h2>
              </div>
              <button type="button" onClick={advance} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Dismiss event suggestion">
                <X className="size-4" />
              </button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {formatDateRange(event.startDate, event.endDate ?? event.startDate)}{event.startTime ? ` · ${formatTime(event.startTime)}` : ""}
              {event.location ? ` · ${event.location}` : ""}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Your availability matches {matchingDate === event.startDate ? "this date" : matchingDate}.</p>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => respond("available")}
                disabled={isPending}
                className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => respond("unavailable")}
                disabled={isPending}
                className="rounded-lg border border-destructive/40 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-60"
              >
                No
              </button>
              <Link
                href={`/events/${event.id}`}
                onClick={advance}
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                View event
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
