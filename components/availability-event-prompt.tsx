"use client"

import Link from "next/link"
import { CalendarDays, X } from "lucide-react"
import { useState } from "react"
import type { EventSummary } from "@/components/event-card"
import { formatDateRange, formatTime } from "@/lib/dates"

export function AvailabilityEventPrompt({ event, matchingDate }: { event: EventSummary; matchingDate: string }) {
  const [open, setOpen] = useState(true)
  if (!open) return null

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
                <h2 className="mt-1 text-lg font-medium text-foreground">Want to attend {event.title}?</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Dismiss event suggestion">
                <X className="size-4" />
              </button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {formatDateRange(event.startDate, event.endDate ?? event.startDate)}{event.startTime ? ` · ${formatTime(event.startTime)}` : ""}
              {event.location ? ` · ${event.location}` : ""}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Your availability matches {matchingDate === event.startDate ? "this date" : matchingDate}.</p>
            <div className="mt-3 flex items-center gap-2">
              <Link href={`/events/${event.id}`} className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">View event</Link>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">Not now</button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
