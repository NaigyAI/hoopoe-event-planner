"use client"

import Link from "next/link"
import { CalendarDays, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import type { EventSummary } from "@/components/event-card"
import { setPersonalAvailabilityForDates } from "@/app/actions/personal-availability"
import { formatDateRange, formatTime } from "@/lib/dates"

type AvailabilitySuggestion = { event: EventSummary; matchingDates: string[] }

export function AvailabilityEventPrompt({ suggestions }: { suggestions: AvailabilitySuggestion[] }) {
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [isAnimating, setIsAnimating] = useState(false)
  const suggestion = suggestions[index]

  function advance() {
    if (isAnimating) return
    setIsAnimating(true)
    window.setTimeout(() => {
      if (index < suggestions.length - 1) {
        setIndex((current) => current + 1)
        setIsAnimating(false)
      } else {
        setOpen(false)
      }
    }, 180)
  }

  function respond(status: "available" | "unavailable") {
    advance()
    startTransition(async () => {
      await setPersonalAvailabilityForDates(suggestion.matchingDates, status)
      router.refresh()
    })
  }

  if (!open || !suggestion) return null
  const { event } = suggestion

  return (
    <aside className="fixed inset-x-4 bottom-4 z-50 sm:left-auto sm:right-6 sm:w-[min(28rem,calc(100vw-3rem))]" role="dialog" aria-label="Event availability suggestion">
      <div className={`rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-2xl ring-1 ring-foreground/10 transition-all duration-200 ease-out ${isAnimating ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100"}`}>
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
              <button type="button" onClick={advance} disabled={isAnimating} className="rounded-md p-1 disabled:opacity-50 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Dismiss event suggestion">
                <X className="size-4" />
              </button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {formatDateRange(event.startDate, event.endDate ?? event.startDate)}{event.startTime ? ` · ${formatTime(event.startTime)}` : ""}
              {event.location ? ` · ${event.location}` : ""}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Your availability matches {suggestion.matchingDates.length === 1 ? "this date" : `${suggestion.matchingDates.length} dates`}.</p>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => respond("available")}
                disabled={isPending || isAnimating}
                className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => respond("unavailable")}
                disabled={isPending || isAnimating}
                className="rounded-lg border border-destructive/40 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-60"
              >
                No
              </button>
              <Link
                href={`/events/${event.id}`}
                onClick={advance}
                aria-disabled={isAnimating}
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                View event
              </Link>
              <button
                type="button"
                onClick={advance}
                disabled={isAnimating}
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
